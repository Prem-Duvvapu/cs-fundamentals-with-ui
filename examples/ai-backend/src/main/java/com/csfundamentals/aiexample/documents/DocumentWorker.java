package com.csfundamentals.aiexample.documents;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import tools.jackson.databind.json.JsonMapper;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;

final class DocumentWorker {
    static final int PAGE_TEXT_LIMIT = 4000, PAGE_LIMIT = 2, MAX_SIDE = 2500;
    static final long MAX_PIXELS = 4_000_000;
    static final JsonMapper JSON = JsonMapper.builder().build();
    private static final class TextLimit extends IOException {}
    static void run(String mode, Path input, Path output) {
        try {
            DocumentReport report = extract(mode, input);
            byte[] encoded = JSON.writeValueAsBytes(report);
            if (encoded.length > DocumentCommand.OUTPUT_LIMIT) throw new DocumentFailure(DocumentFailure.Code.OUTPUT_LIMIT);
            Files.write(output, encoded); System.out.println("OK");
        } catch (DocumentFailure failure) { System.out.println("FAIL:" + failure.code()); }
        catch (Exception failure) { System.out.println("FAIL:INVALID_INPUT"); }
    }

    static DocumentReport extract(String mode, Path input) throws Exception {
        if (!Set.of("digital", "ocr", "image").contains(mode)) throw new DocumentFailure(DocumentFailure.Code.INVALID_INPUT);
        byte[] bytes = DocumentCommand.readInput(input);
        ImageIO.setUseCache(false);
        List<DocumentReport.Page> pages = new ArrayList<>();
        String engine = null;
        if (mode.equals("image")) { BufferedImage image = readImage(input); try { engine = tesseractVersion(); pages.add(ocr(image, input.getParent(), 1)); } finally { image.flush(); } }
        else {
            try (PDDocument document = Loader.loadPDF(bytes)) {
                if (document.isEncrypted()) throw new DocumentFailure(DocumentFailure.Code.ENCRYPTED_PDF);
                if (document.getNumberOfPages() < 1 || document.getNumberOfPages() > PAGE_LIMIT) throw new DocumentFailure(DocumentFailure.Code.PAGE_LIMIT);
                PDFTextStripper stripper = new PDFTextStripper(); stripper.setSortByPosition(true); stripper.setLineSeparator("\n");
                for (int index = 0; index < document.getNumberOfPages(); index++) {
                    if (mode.equals("digital")) {
                        stripper.setStartPage(index + 1); stripper.setEndPage(index + 1);
                        StringBuilder text = new StringBuilder();
                        stripper.writeText(document, new Writer() {
                            public void write(char[] chars, int offset, int count) throws IOException { if (count > PAGE_TEXT_LIMIT - text.length()) throw new TextLimit(); text.append(chars, offset, count); }
                            public void flush() {} public void close() {}
                        });
                        pages.add(new DocumentReport.Page(index + 1, "PDF_TEXT", text.toString().strip(), List.of()));
                    } else {
                        var page = document.getPage(index); var box = page.getCropBox(); double scale = 2 * Math.max(1, page.getUserUnit());
                        if (!Double.isFinite(scale) || !Float.isFinite(box.getWidth()) || !Float.isFinite(box.getHeight())) throw new DocumentFailure(DocumentFailure.Code.PIXEL_LIMIT);
                        checkPixels(Math.ceil(box.getWidth() * scale), Math.ceil(box.getHeight() * scale));
                        if (engine == null) engine = tesseractVersion();
                        BufferedImage image = new PDFRenderer(document).renderImageWithDPI(index, 144, ImageType.RGB);
                        checkPixels(image.getWidth(), image.getHeight());
                        try { pages.add(ocr(image, input.getParent(), index + 1)); } finally { image.flush(); }
                    }
                }
            } catch (InvalidPasswordException encrypted) { throw new DocumentFailure(DocumentFailure.Code.ENCRYPTED_PDF); }
            catch (TextLimit limit) { throw new DocumentFailure(DocumentFailure.Code.TEXT_LIMIT); }
            catch (IOException malformed) { throw new DocumentFailure(DocumentFailure.Code.INVALID_INPUT); }
        }
        List<String> warnings = new ArrayList<>(List.of("EXTRACTED_CONTENT_IS_UNTRUSTED", "LAYOUT_AND_TABLE_STRUCTURE_NOT_VERIFIED", "LITERAL_IS_NOT_AUTHORIZATION"));
        if (pages.stream().allMatch(page -> page.text().isBlank())) warnings.add("NO_TEXT_RECOGNIZED");
        if (engine != null) warnings.add("OCR_CONFIDENCE_IS_NOT_A_CALIBRATED_PROBABILITY");
        return new DocumentReport(1, HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)), mode, mode.equals("image") ? "JDK ImageIO + Tesseract TSV" : "Apache PDFBox " + org.apache.pdfbox.util.Version.getVersion(), engine, true, List.copyOf(pages), LiteralFields.orderId(pages), List.copyOf(warnings));
    }

    static void checkPixels(double width, double height) throws DocumentFailure {
        if (!Double.isFinite(width) || !Double.isFinite(height) || width <= 0 || height <= 0 || width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) throw new DocumentFailure(DocumentFailure.Code.PIXEL_LIMIT);
    }
    private static BufferedImage readImage(Path path) throws IOException, DocumentFailure {
        try (var stream = ImageIO.createImageInputStream(path.toFile())) {
            var readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) throw new DocumentFailure(DocumentFailure.Code.INVALID_INPUT);
            var reader = readers.next();
            try {
                if (!Set.of("PNG", "JPEG").contains(reader.getFormatName().toUpperCase(Locale.ROOT))) throw new DocumentFailure(DocumentFailure.Code.INVALID_INPUT);
                reader.setInput(stream, true, true); checkPixels(reader.getWidth(0), reader.getHeight(0)); return reader.read(0);
            } finally { reader.dispose(); }
        }
    }
    static String tesseractCommand() { return System.getenv().getOrDefault("TESSERACT_COMMAND", "tesseract"); }
    static String tesseractVersion() throws DocumentFailure, InterruptedException {
        String output = new String(OwnedProcess.run(List.of(tesseractCommand(), "--version"), Duration.ofSeconds(3), 4096, DocumentFailure.Code.OCR_UNAVAILABLE, DocumentFailure.Code.OCR_TIMEOUT), StandardCharsets.UTF_8);
        String version = output.lines().findFirst().orElse("").strip();
        if (!version.matches("tesseract 5\\.[0-9]+\\.[0-9]+.*")) throw new DocumentFailure(DocumentFailure.Code.OCR_UNAVAILABLE);
        return version;
    }
    private static DocumentReport.Page ocr(BufferedImage image, Path directory, int page) throws Exception {
        checkPixels(image.getWidth(), image.getHeight()); Path png = directory.resolve("page-" + page + ".png");
        try {
            ImageIO.write(image, "png", png.toFile());
            if (Files.size(png) > 16 * 1024 * 1024) throw new DocumentFailure(DocumentFailure.Code.OUTPUT_LIMIT);
            byte[] tsv = OwnedProcess.run(List.of(tesseractCommand(), png.toString(), "stdout", "-l", "eng", "--oem", "1", "--psm", "6", "tsv"), Duration.ofSeconds(10), 512 * 1024, DocumentFailure.Code.OCR_UNAVAILABLE, DocumentFailure.Code.OCR_TIMEOUT);
            return TsvWords.parse(new String(tsv, StandardCharsets.UTF_8), page);
        } finally { Files.deleteIfExists(png); }
    }
}
