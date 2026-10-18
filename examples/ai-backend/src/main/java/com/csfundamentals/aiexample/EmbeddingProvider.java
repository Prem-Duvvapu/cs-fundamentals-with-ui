package com.csfundamentals.aiexample;

import java.util.List;

public interface EmbeddingProvider {
    EmbeddingSpace space();
    List<float[]> embed(List<String> inputs);
    final class Failure extends RuntimeException {
        public Failure(String code) { super(code); }
    }
}
