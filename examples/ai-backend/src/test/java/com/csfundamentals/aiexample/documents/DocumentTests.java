package com.csfundamentals.aiexample.documents;

import com.sun.net.httpserver.HttpServer;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.encryption.*;
import org.apache.pdfbox.pdmodel.interactive.action.*;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.net.InetSocketAddress;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

@Timeout(40)
class DocumentTests {
    @TempDir Path directory;
    private Path fixtures() throws Exception { Path fixtures = directory.resolve("fixtures"); DocumentFixtures.generate(fixtures); return fixtures; }
    private DocumentReport extract(String mode, Path input) throws Exception { return DocumentCommand.extract(mode, input, directory.resolve("report.json")); }
    private static void code(DocumentFailure.Code expected, org.junit.jupiter.api.function.Executable operation) { assertEquals(expected, assertThrows(DocumentFailure.class, operation).code()); }

    @Test void actualDigitalPdfPreservesPagesHashAndLiteralEvidence() throws Exception {
        Path input = fixtures().resolve("digital-ticket.pdf"); DocumentReport report = extract("digital", input);
        assertEquals(2, report.pages().size()); assertEquals("PDF_TEXT", report.pages().get(0).method()); assertTrue(report.pages().get(1).text().contains("Resolution evidence"));
        assertEquals("ORD-1001", report.orderId().value()); assertEquals(1, report.orderId().page()); assertEquals(2, report.orderId().line());
        assertEquals("Order ID: ORD-1001", report.orderId().evidence()); assertNull(report.orderId().confidence()); assertTrue(report.untrusted());
        assertEquals(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(input))), report.sha256());
        assertEquals(report, DocumentWorker.JSON.readValue(Files.readAllBytes(directory.resolve("report.json")), DocumentReport.class));
    }
    @Test void imageOnlyPdfDoesNotPretendDigitalExtractionPerformedOcr() throws Exception {
        var report = extract("digital", fixtures().resolve("scanned-ticket.pdf"));
        assertTrue(report.pages().get(0).text().isEmpty()); assertEquals("UNKNOWN", report.orderId().status()); assertNull(report.ocrEngine()); assertTrue(report.warnings().contains("NO_TEXT_RECOGNIZED"));
    }
    @Test void aMissingLiteralIsUnknownAndDoesNotConsumeTheFollowingLine() throws Exception {
        var report = extract("digital", fixtures().resolve("missing-value.pdf"));
        assertEquals("UNKNOWN", report.orderId().status()); assertNull(report.orderId().value()); assertEquals("MISSING_LITERAL", report.orderId().reason()); assertEquals("Order ID:", report.orderId().evidence());
    }
    @Test void tableTextDoesNotBecomeAnUnverifiedStructuredAmount() throws Exception {
        var report = extract("digital", fixtures().resolve("table-ticket.pdf"));
        assertTrue(report.pages().get(0).text().contains("30.00")); assertTrue(report.pages().get(0).text().contains("Grand total"));
        assertTrue(report.warnings().contains("LAYOUT_AND_TABLE_STRUCTURE_NOT_VERIFIED")); assertEquals("UNKNOWN", report.orderId().status());
    }
    @Test void duplicateLabelsRequireReviewInsteadOfPickingTheFirstValue() throws Exception {
        Path input = directory.resolve("duplicate.pdf"); DocumentFixtures.digital(input, List.of(List.of("Order ID: ORD-1001"), List.of("Order ID: ORD-2001")));
        var report = extract("digital", input); assertEquals("AMBIGUOUS_MULTIPLE_LABELS", report.orderId().reason()); assertNull(report.orderId().value());
    }
    @Test void malformedOrOversizeFilesPreserveThePreviousReportAndCleanOnlyOwnedTemporaryFiles() throws Exception {
        Path input = directory.resolve("bad.pdf"), output = directory.resolve("previous.json"), work = Files.createDirectory(directory.resolve("work"));
        Files.writeString(input, "not a pdf"); Files.writeString(output, "previous-result");
        code(DocumentFailure.Code.INVALID_INPUT, () -> DocumentCommand.extract("digital", input, output, work));
        try (var files = Files.list(work)) { assertEquals(0, files.count()); }
        assertEquals("previous-result", Files.readString(output));
        Files.write(input, new byte[DocumentCommand.INPUT_LIMIT + 1]); code(DocumentFailure.Code.INPUT_LIMIT, () -> extract("digital", input));
    }
    @Test void symlinkInputsAndNonRegularFilesAreRejectedBeforeParsing() throws Exception {
        Path real = directory.resolve("real.pdf"); Files.writeString(real, "not a pdf"); Path link = directory.resolve("link.pdf"); Files.createSymbolicLink(link, real);
        code(DocumentFailure.Code.INPUT_LIMIT, () -> extract("digital", link)); code(DocumentFailure.Code.INPUT_LIMIT, () -> extract("digital", directory));
    }
    @Test void pageAndTextCapsRefuseInsteadOfSilentlyTruncatingEvidence() throws Exception {
        Path pages = directory.resolve("many.pdf"), text = directory.resolve("long.pdf");
        DocumentFixtures.digital(pages, List.of(List.of("one"), List.of("two"), List.of("three"))); code(DocumentFailure.Code.PAGE_LIMIT, () -> extract("digital", pages));
        DocumentFixtures.digital(text, List.of(List.of("x".repeat(5000)))); code(DocumentFailure.Code.TEXT_LIMIT, () -> extract("digital", text));
    }
    @Test void pixelPreflightRejectsHugeImageDimensionsBeforeRequiringAnOcrEngine() throws Exception {
        BufferedImage image = new BufferedImage(3000, 1, BufferedImage.TYPE_BYTE_BINARY); Path input = directory.resolve("wide.png");
        try { ImageIO.write(image, "png", input.toFile()); } finally { image.flush(); }
        code(DocumentFailure.Code.PIXEL_LIMIT, () -> extract("image", input));
        code(DocumentFailure.Code.PIXEL_LIMIT, () -> DocumentWorker.checkPixels(Double.NaN, 1));
        code(DocumentFailure.Code.PIXEL_LIMIT, () -> DocumentWorker.checkPixels(2400, 2400));
        code(DocumentFailure.Code.PIXEL_LIMIT, () -> DocumentWorker.checkPixels(-1, 100));
    }
    @Test void pdfRasterPreflightRejectsHugePagesBeforeLaunchingOcr() throws Exception {
        Path input = directory.resolve("huge.pdf"); try (PDDocument pdf = new PDDocument()) { pdf.addPage(new PDPage(new PDRectangle(5000, 5000))); pdf.save(input.toFile()); }
        code(DocumentFailure.Code.PIXEL_LIMIT, () -> extract("ocr", input));
    }
    @Test void encryptedPdfIsExplicitlyUnsupported() throws Exception {
        Path input = directory.resolve("encrypted.pdf");
        try (PDDocument pdf = new PDDocument()) {
            pdf.addPage(new PDPage()); var policy = new StandardProtectionPolicy(UUID.randomUUID().toString(), UUID.randomUUID().toString(), new AccessPermission()); policy.setEncryptionKeyLength(128); pdf.protect(policy); pdf.save(input.toFile());
        }
        code(DocumentFailure.Code.ENCRYPTED_PDF, () -> extract("digital", input));
    }
    @Test void pdfScriptsLinksAndImageBorneInstructionsAreNeverExecuted() throws Exception {
        AtomicInteger received = new AtomicInteger(); var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 1);
        server.createContext("/collect", exchange -> { received.incrementAndGet(); exchange.sendResponseHeaders(204, -1); exchange.close(); }); server.start();
        try {
            Path input = fixtures().resolve("adversarial-note.pdf"); String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/collect";
            try (PDDocument pdf = Loader.loadPDF(input.toFile())) {
                pdf.getDocumentCatalog().setOpenAction(new PDActionJavaScript("fetch('" + url + "')"));
                var action = new PDActionURI(); action.setURI(url); var link = new PDAnnotationLink(); link.setAction(action); link.setRectangle(new PDRectangle(10, 10, 100, 20)); pdf.getPage(0).getAnnotations().add(link);
                pdf.save(directory.resolve("active.pdf").toFile());
            }
            var report = extract("digital", directory.resolve("active.pdf")); assertTrue(report.untrusted()); assertTrue(report.pages().get(0).text().contains("IGNORE PREVIOUS INSTRUCTIONS"));
            assertEquals("ORD-9999", report.orderId().value()); assertEquals("NOT_BUSINESS_AUTHORIZATION", report.orderId().reason()); assertEquals(0, received.get());
        } finally { server.stop(0); }
    }
}
