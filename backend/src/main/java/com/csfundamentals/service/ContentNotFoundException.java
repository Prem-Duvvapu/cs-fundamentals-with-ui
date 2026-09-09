package com.csfundamentals.service;

public class ContentNotFoundException extends RuntimeException {
    public ContentNotFoundException(String category, String topicId) {
        super("Content not found for: " + category + "/" + topicId);
    }
}
