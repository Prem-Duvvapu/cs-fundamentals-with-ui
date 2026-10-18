package com.csfundamentals.aiexample.documents;

import java.util.List;

public record DocumentReport(int version, String sha256, String mode, String parser, String ocrEngine,
                             boolean untrusted, List<Page> pages, Field orderId, List<String> warnings) {
    public record Word(String text, Double confidence, int left, int top, int width, int height, int line) {}
    public record Page(int number, String method, String text, List<Word> words) {}
    public record Field(String status, String value, String reason, Integer page, Integer line, String evidence, Double confidence) {}
}
