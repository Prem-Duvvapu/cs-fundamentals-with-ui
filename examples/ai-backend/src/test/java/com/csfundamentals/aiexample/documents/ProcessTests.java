package com.csfundamentals.aiexample.documents;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import static org.junit.jupiter.api.Assertions.*;

@Timeout(10)
class ProcessTests {
    @TempDir Path directory;
    public static void main(String[] args) throws Exception {
        if (args[0].equals("flood")) System.out.print("x".repeat(100_000));
        else { Files.writeString(Path.of(args[1]), Long.toString(ProcessHandle.current().pid())); new CountDownLatch(1).await(); }
    }
    private List<String> command(String mode) {
        return new ArrayList<>(List.of(Path.of(System.getProperty("java.home"), "bin", "java").toString(), "-cp", System.getProperty("java.class.path"), ProcessTests.class.getName(), mode, directory.resolve("pid").toString()));
    }
    @Test void excessProcessOutputIsBoundedAndRejected() {
        var failure = assertThrows(DocumentFailure.class, () -> OwnedProcess.run(command("flood"), Duration.ofSeconds(3), 100, DocumentFailure.Code.WORKER_FAILED, DocumentFailure.Code.WORKER_TIMEOUT));
        assertEquals(DocumentFailure.Code.OUTPUT_LIMIT, failure.code());
    }
    @Test void aStalledOwnedChildIsKilledAtItsDeadline() throws Exception {
        var failure = assertThrows(DocumentFailure.class, () -> OwnedProcess.run(command("hang"), Duration.ofSeconds(2), 100, DocumentFailure.Code.WORKER_FAILED, DocumentFailure.Code.WORKER_TIMEOUT));
        assertEquals(DocumentFailure.Code.WORKER_TIMEOUT, failure.code());
        long pid = Long.parseLong(Files.readString(directory.resolve("pid"))); assertTrue(ProcessHandle.of(pid).isEmpty() || !ProcessHandle.of(pid).orElseThrow().isAlive());
    }
    @Test void missingOcrExecutableIsAnExplicitFailureNotAFakeSuccessfulResult() {
        var failure = assertThrows(DocumentFailure.class, () -> OwnedProcess.run(List.of(directory.resolve("missing-tesseract").toString()), Duration.ofSeconds(1), 100, DocumentFailure.Code.OCR_UNAVAILABLE, DocumentFailure.Code.OCR_TIMEOUT));
        assertEquals(DocumentFailure.Code.OCR_UNAVAILABLE, failure.code());
    }
}
