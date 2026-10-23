package com.csfundamentals.websocketlab;

import java.nio.charset.StandardCharsets;
import java.util.*;
import tools.jackson.core.*;
import tools.jackson.core.json.JsonFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

final class Protocol {
    private static final JsonMapper JSON = JsonMapper.builder(JsonFactory.builder()
        .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
        .disable(StreamReadFeature.INCLUDE_SOURCE_IN_LOCATION)
        .streamReadConstraints(StreamReadConstraints.builder().maxNestingDepth(2)
            .maxStringLength(1024).maxNameLength(32).maxNumberLength(8).build()).build()).build();
    record Command(String type, String id, String text) { }
    static Command parse(String payload) {
        if (payload.getBytes(StandardCharsets.UTF_8).length > 1024) throw new IllegalArgumentException("oversize");
        try (var parser = JSON.createParser(payload)) {
            JsonNode node = JSON.readTree(parser);
            if (node == null || !node.isObject() || parser.nextToken() != null) throw new IllegalArgumentException("schema");
            String type = string(node, "type"), id = string(node, "id");
            if (!id.matches("[a-zA-Z0-9-]{1,32}")) throw new IllegalArgumentException("schema");
            if (type.equals("echo") && node.size() == 3) {
                String text = string(node, "text");
                if (text.length() > 128 || text.codePoints().anyMatch(code -> Character.isISOControl(code) || code >= 0xd800 && code <= 0xdfff))
                    throw new IllegalArgumentException("schema");
                return new Command(type, id, text);
            }
            if (type.equals("ack") && node.size() == 2) return new Command(type, id, null);
            throw new IllegalArgumentException("schema");
        } catch (RuntimeException failure) { throw new IllegalArgumentException("schema"); }
    }
    private static String string(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isString()) throw new IllegalArgumentException("schema");
        return value.asString();
    }
    static String echo(Command command, String principal) {
        return JSON.writeValueAsString(Map.of("type", "echo", "id", command.id(), "text", command.text(), "principal", principal));
    }
}
