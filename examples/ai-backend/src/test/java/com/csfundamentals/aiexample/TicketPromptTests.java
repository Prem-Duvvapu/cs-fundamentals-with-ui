package com.csfundamentals.aiexample;

import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.*;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.prompt.Prompt;
import static org.junit.jupiter.api.Assertions.*;

class TicketPromptTests {
    private ExtractionService extractor(TicketPrompts choice, AtomicReference<Prompt> observed, String answer) {
        ChatModel model = prompt -> {
            observed.set(prompt);
            return new ChatResponse(List.of(new Generation(new AssistantMessage(answer))));
        };
        return choice == null ? new ExtractionService(ChatClient.create(model))
                : new ExtractionService(ChatClient.create(model), choice);
    }
    private static final String VALID = """
        {"category":"billing","priority":"normal","summary":"Invoice question","orderId":"ORD-9876"}
        """;
    @Test void defaultAndExplicitBaselineHaveIdenticalInstructionsAndSeparateUserData() {
        var baseline = new AtomicReference<Prompt>(); var original = new AtomicReference<Prompt>();
        extractor(null, original, VALID).extract("Invoice question for ORD-9876");
        extractor(TicketPrompts.BASELINE, baseline, VALID).extract("Invoice question for ORD-9876");
        assertEquals(original.get().getContents(), baseline.get().getContents());
        assertEquals(2, original.get().getInstructions().size());
        assertEquals(TicketPrompts.BASELINE.system(), original.get().getInstructions().get(0).getText());
        assertEquals("Invoice question for ORD-9876", original.get().getInstructions().get(1).getText());
        assertEquals(ExtractionService.PROMPT_VERSION, TicketPrompts.BASELINE.version());
    }
    @Test void fewShotChangesOnlySystemInstructionAndPreservesSourceValidation() {
        var observed = new AtomicReference<Prompt>();
        var service = extractor(TicketPrompts.FEW_SHOT, observed, VALID);
        service.extract("Invoice question for ORD-9876");
        assertEquals(TicketPrompts.FEW_SHOT.system(), observed.get().getInstructions().get(0).getText());
        assertEquals("Invoice question for ORD-9876", observed.get().getInstructions().get(1).getText());
        assertNotEquals(TicketPrompts.BASELINE.sha256(), TicketPrompts.FEW_SHOT.sha256());
        assertEquals("unsupported_order_id", assertThrows(IllegalArgumentException.class,
                () -> service.extract("Invoice question without an order")).getMessage());
    }
    @Test void experimentalPromptStillRejectsUnknownFieldsAndInvalidTypes() {
        var observed = new AtomicReference<Prompt>();
        for (String invalid : List.of(VALID.replace("\"normal\"", "7"),
                VALID.stripTrailing().replace("}", ",\"approved\":true}"))) {
            assertEquals("invalid_schema", assertThrows(IllegalArgumentException.class,
                    () -> extractor(TicketPrompts.FEW_SHOT, observed, invalid).extract("Invoice ORD-9876")).getMessage());
        }
        assertSame(TicketPrompts.FEW_SHOT, TicketPrompts.fromVersion("ticket-examples-v2"));
        assertThrows(IllegalArgumentException.class, () -> TicketPrompts.fromVersion("unreviewed"));
    }
}
