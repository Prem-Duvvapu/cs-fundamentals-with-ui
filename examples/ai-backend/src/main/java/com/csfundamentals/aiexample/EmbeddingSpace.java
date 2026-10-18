package com.csfundamentals.aiexample;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Vectors are comparable only inside an immutable, explicitly identified space. */
public record EmbeddingSpace(String namespace, String model, String revision, int dimensions, String chunkPolicy) {
    public static final String CHUNK_POLICY = "chars1000-overlap100-v1";
    public EmbeddingSpace {
        if (namespace == null || !namespace.matches("[a-z][a-z0-9_]{0,31}")
                || model == null || !model.matches("[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}")
                || revision == null || !revision.matches("[a-f0-9]{64}")
                || dimensions < 1 || dimensions > 2000 || !CHUNK_POLICY.equals(chunkPolicy))
            throw new IllegalArgumentException("invalid_embedding_space");
    }
    public float[] validate(float[] vector) {
        if (vector == null || vector.length != dimensions) throw new IllegalArgumentException("embedding_dimension_mismatch");
        double squared = 0;
        for (float value : vector) {
            if (!Float.isFinite(value)) throw new IllegalArgumentException("embedding_nonfinite");
            squared += (double) value * value;
        }
        if (squared == 0) throw new IllegalArgumentException("embedding_zero_vector");
        return vector.clone();
    }
    public String literal(float[] values) {
        var checked = validate(values);
        var parts = new ArrayList<String>();
        for (float value : checked) parts.add(Float.toString(value));
        return "[" + String.join(",", parts) + "]";
    }
    public static String fingerprint(List<KnowledgeStore.Document> documents) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            for (var document : documents.stream().sorted(Comparator.comparing(KnowledgeStore.Document::id)).toList()) {
                for (String value : List.of(document.tenant(), document.id(), Long.toString(document.version()), document.title(), document.text())) {
                    byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
                    digest.update(java.nio.ByteBuffer.allocate(4).putInt(bytes.length).array());
                    digest.update(bytes);
                }
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
