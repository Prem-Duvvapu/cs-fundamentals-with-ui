package com.csfundamentals.aiexample.documents;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class OcrContractTests {
    static final String HEADER = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n";
    static String word(int number, String text, String confidence) { return "5\t1\t1\t1\t1\t" + number + "\t10\t20\t40\t15\t" + confidence + "\t" + text + "\n"; }
    @Test void tsvCoordinatesAndExactLineEvidenceSurviveWithoutInventingConfidenceMeaning() throws Exception {
        var page = TsvWords.parse(HEADER + word(1, "Order", "96.5") + word(2, "ID:", "95") + word(3, "ORD-1001", "89"), 2);
        assertEquals("Order ID: ORD-1001", page.text()); assertEquals(10, page.words().get(2).left());
        var field = LiteralFields.orderId(List.of(page)); assertEquals("ORD-1001", field.value()); assertEquals(2, field.page()); assertEquals(89, field.confidence());
    }
    @Test void lowOrUnknownConfidenceRefusesToPromoteAnOcrId() throws Exception {
        for (String confidence : List.of("40", "-1")) {
            var page = TsvWords.parse(HEADER + word(1, "Order", "97") + word(2, "ID:", "97") + word(3, "ORD-1001", confidence), 1);
            var field = LiteralFields.orderId(List.of(page)); assertEquals("UNKNOWN", field.status()); assertNull(field.value()); assertEquals("LOW_OR_UNKNOWN_OCR_CONFIDENCE", field.reason());
        }
    }
    @Test void malformedTsvAndNonfiniteScoresAreRejected() {
        for (String tsv : List.of("not tsv", HEADER + word(1, "Order", "NaN"), HEADER + word(1, "Order", "101"))) {
            assertEquals(DocumentFailure.Code.INVALID_OCR_OUTPUT, assertThrows(DocumentFailure.class, () -> TsvWords.parse(tsv, 1)).code());
        }
    }
    @Test void unsupportedLiteralIsUnknownInsteadOfRepairingAPlausibleOcrError() throws Exception {
        var page = TsvWords.parse(HEADER + word(1, "Order", "99") + word(2, "ID:", "99") + word(3, "0RD-1001", "99"), 1);
        var field = LiteralFields.orderId(List.of(page)); assertEquals("UNSUPPORTED_LITERAL", field.reason()); assertNull(field.value());
    }
}
