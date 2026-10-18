package com.csfundamentals.aiexample;

/** Completion is a transport result, never proof of a useful or safe answer. */
public record StreamingOllamaResult(Status status, Failure failure, String content, String finishReason,
                                   Long inputTokens, Long cachedInputTokens, Long outputTokens,
                                   ProviderTiming providerTiming, Long firstContentMs, long totalMs, int frames, int bodyBytes,
                                   Integer httpStatus, boolean requestStarted) {
    public StreamingOllamaResult {
        if (status == null || failure == null || content == null || totalMs < 0 || frames < 0 || bodyBytes < 0
                || (firstContentMs != null && (firstContentMs < 0 || firstContentMs > totalMs))
                || invalidCount(inputTokens) || invalidCount(cachedInputTokens) || invalidCount(outputTokens))
            throw new IllegalArgumentException("invalid_streaming_result");
    }
    public record ProviderTiming(Long totalNs, Long loadNs, Long promptEvaluationNs, Long generationNs) {
        public ProviderTiming {
            for (Long value : new Long[]{totalNs, loadNs, promptEvaluationNs, generationNs})
                if (value != null && (value < 0 || value > 86_400_000_000_000L))
                    throw new IllegalArgumentException("invalid_provider_duration");
        }
    }
    private static boolean invalidCount(Long count) { return count != null && (count < 0 || count > 1_000_000_000L); }
    public enum Status { COMPLETE, REFUSED, INCOMPLETE, FAILED, CANCELLED }
    public enum Failure { NONE, DEADLINE, CALL_BUDGET, CAPACITY, CLIENT_CLOSED, HTTP_STATUS, RATE_LIMITED,
        CONTENT_TYPE, BODY_LIMIT, FRAME_LIMIT, FRAME_COUNT_LIMIT, CONTENT_LIMIT, INVALID_UTF8,
        MALFORMED_JSON, PROTOCOL, PROVIDER_ERROR, USAGE_METADATA, TRANSPORT, CANCELLED }
    public boolean transportComplete() { return status == Status.COMPLETE; }
}
