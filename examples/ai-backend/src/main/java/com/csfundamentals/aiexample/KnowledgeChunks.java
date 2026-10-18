package com.csfundamentals.aiexample;

import java.util.*;

public final class KnowledgeChunks {
    private KnowledgeChunks() {}
    public record Chunk(KnowledgeStore.Document document, int ordinal, String text) {
        public String citation() { return document.citation() + ":c" + ordinal; }
    }
    public static List<Chunk> split(List<KnowledgeStore.Document> documents) {
        if (documents.size() > 32) throw new IllegalArgumentException("index_document_limit");
        var result = new ArrayList<Chunk>();
        for (var document : documents) {
            if (!document.enabled() || document.text() == null || document.text().isBlank() || document.text().length() > 8192)
                throw new IllegalArgumentException("invalid_index_document");
            int offset = 0, ordinal = 0;
            while (offset < document.text().length()) {
                int end = Math.min(offset + 1000, document.text().length());
                if (end < document.text().length() && Character.isHighSurrogate(document.text().charAt(end - 1))) end--;
                result.add(new Chunk(document, ordinal++, document.text().substring(offset, end)));
                if (result.size() > 128) throw new IllegalArgumentException("index_chunk_limit");
                if (end == document.text().length()) break;
                offset = end - 100;
                if (Character.isLowSurrogate(document.text().charAt(offset))) offset--;
            }
        }
        return List.copyOf(result);
    }
}
