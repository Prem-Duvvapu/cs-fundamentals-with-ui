package com.csfundamentals.aiexample.documents;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named = "documents.ocr", matches = "true")
@Timeout(45)
class DocumentOcrTests {
    @TempDir Path directory;
    @BeforeAll static void requireRealEngine() throws Exception { assertTrue(DocumentWorker.tesseractVersion().startsWith("tesseract 5."), "An enabled OCR suite requires a real Tesseract 5 engine"); }
    private Path fixtures() throws Exception { Path path = directory.resolve("fixtures"); DocumentFixtures.generate(path); return path; }
    private DocumentReport extract(String mode, Path input, String evidence) throws Exception {
        DocumentReport report = DocumentCommand.extract(mode, input, directory.resolve(evidence + ".json"));
        Files.createDirectories(Path.of("target"));
        Files.write(Path.of("target", "document-ocr-" + evidence + ".json"), DocumentWorker.JSON.writeValueAsBytes(Map.of("engine", report.ocrEngine(), "sha256", report.sha256(), "mode", report.mode(), "untrusted", report.untrusted(), "orderId", report.orderId(), "warnings", report.warnings())));
        return report;
    }
    @Test void realTesseractReadsBothOriginalImageAndScannedPdfWithPageProvenance() throws Exception {
        Path fixtures = fixtures();
        for (String mode : new String[]{"image", "ocr"}) {
            var report = extract(mode, fixtures.resolve(mode.equals("image") ? "scanned-ticket.png" : "scanned-ticket.pdf"), mode);
            assertEquals("ORD-1001", report.orderId().value()); assertEquals("LITERAL_CANDIDATE", report.orderId().status()); assertEquals(1, report.orderId().page());
            assertTrue(report.orderId().confidence() >= 70); assertFalse(report.pages().get(0).words().isEmpty()); assertEquals("OCR", report.pages().get(0).method()); assertTrue(report.untrusted());
        }
    }
    @Test void imageInstructionsRemainDataAndCannotAuthorizeTheLiteralId() throws Exception {
        var report = extract("image", fixtures().resolve("adversarial-note.png"), "adversarial");
        assertTrue(report.pages().get(0).text().contains("IGNORE PREVIOUS")); assertEquals("ORD-9999", report.orderId().value());
        assertTrue(report.untrusted()); assertEquals("NOT_BUSINESS_AUTHORIZATION", report.orderId().reason()); assertTrue(report.warnings().contains("EXTRACTED_CONTENT_IS_UNTRUSTED"));
    }
    @Test void ocrMissingValueStaysUnknownWithoutInventingAnOrder() throws Exception {
        var report = extract("image", fixtures().resolve("missing-value.png"), "missing");
        assertEquals("UNKNOWN", report.orderId().status()); assertNull(report.orderId().value()); assertEquals("MISSING_LITERAL", report.orderId().reason());
        assertTrue(report.warnings().contains("OCR_CONFIDENCE_IS_NOT_A_CALIBRATED_PROBABILITY"));
    }
}
