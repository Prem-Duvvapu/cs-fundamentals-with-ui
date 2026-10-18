package com.csfundamentals.webhooks;

import java.nio.*;
import java.nio.charset.*;
import java.util.Set;
import tools.jackson.core.*;
import tools.jackson.core.json.JsonFactory;
import tools.jackson.databind.*;
import tools.jackson.databind.json.JsonMapper;

record Payload(String eventId, int schemaVersion, int amountMinor) {
    private static final ObjectMapper JSON = JsonMapper.builder(JsonFactory.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .streamReadConstraints(StreamReadConstraints.builder().maxNestingDepth(4).maxStringLength(256).maxNumberLength(12).build()).build()).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    static Payload parse(byte[] raw, int maximumSchema) {
        try {
            var text = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(raw)).toString();
            var node = JSON.readTree(text);
            if (!node.isObject() || !node.path("schemaVersion").isInt() || !node.path("eventId").isString()
                    || !node.path("type").isString() || !node.path("amountMinor").isInt()) throw invalid();
            int version = node.path("schemaVersion").asInt();
            if (version < 1 || version > maximumSchema) throw invalid();
            Set<String> allowed = version == 1 ? Set.of("schemaVersion", "eventId", "type", "amountMinor")
                    : Set.of("schemaVersion", "eventId", "type", "amountMinor", "deliveryHint");
            for (String property : node.propertyNames()) if (!allowed.contains(property)) throw invalid();
            if (node.has("deliveryHint") && (!node.path("deliveryHint").isString() || node.path("deliveryHint").asString().length() > 40)) throw invalid();
            var id = node.path("eventId").asString(); int amount = node.path("amountMinor").asInt();
            if (!id.matches("evt-[a-z0-9-]{1,60}") || !node.path("type").asString().equals("credit") || amount < 1 || amount > 1000) throw invalid();
            return new Payload(id, version, amount);
        } catch (Failure failure) { throw failure; }
        catch (Exception invalid) { throw invalid(); }
    }
    private static Failure invalid() { return new Failure(422, "payload_invalid"); }
}
