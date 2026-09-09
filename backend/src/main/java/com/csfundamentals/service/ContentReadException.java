package com.csfundamentals.service;

public class ContentReadException extends RuntimeException {
    public ContentReadException(String message, Throwable cause) {
        super(message, cause);
    }
}
