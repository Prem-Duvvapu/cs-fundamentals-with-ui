package com.csfundamentals.aiexample.documents;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.*;

final class OwnedProcess {
    private OwnedProcess() {}
    static byte[] run(List<String> command, Duration deadline, int outputLimit, DocumentFailure.Code unavailable, DocumentFailure.Code timeout) throws DocumentFailure, InterruptedException {
        Process process;
        try {
            ProcessBuilder builder = new ProcessBuilder(command).redirectError(ProcessBuilder.Redirect.DISCARD);
            builder.environment().put("OMP_THREAD_LIMIT", "1");
            process = builder.start();
        } catch (IOException missing) { throw new DocumentFailure(unavailable); }
        ExecutorService reader = Executors.newSingleThreadExecutor(task -> { Thread thread = new Thread(task, "owned-document-output"); thread.setDaemon(true); return thread; });
        Future<byte[]> output = reader.submit(() -> {
            try (var stream = process.getInputStream()) {
                byte[] bytes = stream.readNBytes(outputLimit + 1);
                if (bytes.length > outputLimit) { stop(process); throw new DocumentFailure(DocumentFailure.Code.OUTPUT_LIMIT); }
                return bytes;
            }
        });
        try {
            if (!process.waitFor(deadline.toMillis(), TimeUnit.MILLISECONDS)) throw new DocumentFailure(timeout);
            byte[] bytes;
            try { bytes = output.get(1, TimeUnit.SECONDS); }
            catch (ExecutionException failure) { if (failure.getCause() instanceof DocumentFailure known) throw known; throw new DocumentFailure(DocumentFailure.Code.WORKER_FAILED); }
            catch (TimeoutException stuckReader) { throw new DocumentFailure(timeout); }
            if (process.exitValue() != 0) throw new DocumentFailure(timeout == DocumentFailure.Code.OCR_TIMEOUT ? DocumentFailure.Code.OCR_FAILED : DocumentFailure.Code.WORKER_FAILED);
            return bytes;
        } finally { stop(process); output.cancel(true); reader.shutdownNow(); }
    }
    private static void stop(Process process) {
        process.descendants().forEach(ProcessHandle::destroyForcibly);
        if (process.isAlive()) process.destroyForcibly();
        try { process.waitFor(1, TimeUnit.SECONDS); } catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); }
    }
}
