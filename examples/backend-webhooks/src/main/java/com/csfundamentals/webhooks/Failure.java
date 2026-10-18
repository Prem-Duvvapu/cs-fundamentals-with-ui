package com.csfundamentals.webhooks;

final class Failure extends RuntimeException {
    final int status;
    final String code;
    Failure(int status, String code) { super(code, null, false, false); this.status = status; this.code = code; }
}
