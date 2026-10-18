package com.csfundamentals.aiexample.documents;

public final class DocumentFailure extends Exception {
    public enum Code { INPUT_LIMIT, INVALID_INPUT, PAGE_LIMIT, PIXEL_LIMIT, TEXT_LIMIT, OUTPUT_LIMIT, ENCRYPTED_PDF, WORKER_TIMEOUT, WORKER_FAILED, OCR_UNAVAILABLE, OCR_TIMEOUT, OCR_FAILED, INVALID_OCR_OUTPUT }
    private final Code code;
    public DocumentFailure(Code code) { super(code.name()); this.code = code; }
    public Code code() { return code; }
}
