package com.csfundamentals.aiexample;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class EvaluationDatasetTests {
    private static final String VALID = """
        {"id":"case-1","slice":"ordinary","text":"Refund ORD-1234","expected":{"category":"billing","priority":"normal","orderId":"ORD-1234"}}
        """;
    private void read(String text) { EvaluateTickets.readCases(new ObjectMapper(), text.getBytes(StandardCharsets.UTF_8)); }
    @Test void acceptsDeclaredNullAndBlankLinesWithoutChangingCaseIdentity() {
        var cases = EvaluateTickets.readCases(new ObjectMapper(), ("\n" + VALID.replace("\"orderId\":\"ORD-1234\"", "\"orderId\":null") + "\n").getBytes(StandardCharsets.UTF_8));
        assertEquals(1, cases.size()); assertEquals("case-1", cases.get(0).path("id").asString());
    }
    @Test void rejectsDuplicateOrMissingIdsBeforeAnyModelCalls() {
        assertThrows(IllegalArgumentException.class, () -> read(VALID + VALID));
        assertThrows(IllegalArgumentException.class, () -> read(VALID.replace("\"id\":\"case-1\",", "")));
    }
    @Test void rejectsInvalidExpectationsAndOversizedInputsInsteadOfCountingThemAsModelFailures() {
        assertThrows(IllegalArgumentException.class, () -> read(VALID.replace("billing", "unlisted")));
        assertThrows(IllegalArgumentException.class, () -> read(VALID.replace("\"orderId\":\"ORD-1234\"", "\"orderId\":7")));
        assertThrows(IllegalArgumentException.class, () -> read(VALID.replace("Refund ORD-1234", "x".repeat(8193))));
        assertThrows(IllegalArgumentException.class, () -> read("  \n\n"));
    }
}
