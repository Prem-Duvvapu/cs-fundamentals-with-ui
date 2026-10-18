package com.csfundamentals.aiexample.documents;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.jar.JarFile;

public final class DocumentCommand {
    static final int INPUT_LIMIT = 2 * 1024 * 1024, OUTPUT_LIMIT = 256 * 1024;
    private DocumentCommand() {}
    public static void run(String[] args) throws Exception {
        if (args.length == 2 && args[0].equals("--document-fixtures")) { DocumentFixtures.generate(Path.of(args[1])); return; }
        if (args.length == 4 && args[0].equals("--document-worker")) { DocumentWorker.run(args[1], Path.of(args[2]), Path.of(args[3])); return; }
        if (args.length != 4 || !args[0].equals("--documents")) throw new IllegalArgumentException("Usage: --documents digital|ocr|image INPUT OUTPUT.json");
        try { extract(args[1], Path.of(args[2]), Path.of(args[3])); System.out.println("Document report written; extracted content remains untrusted."); }
        catch (DocumentFailure failure) { System.err.println("Document extraction failed: " + failure.code()); throw failure; }
    }
    public static DocumentReport extract(String mode, Path input, Path output) throws Exception {
        return extract(mode, input, output, Path.of(System.getProperty("java.io.tmpdir")));
    }
    static DocumentReport extract(String mode, Path input, Path output, Path temporaryRoot) throws Exception {
        if (!Set.of("digital", "ocr", "image").contains(mode)) throw new DocumentFailure(DocumentFailure.Code.INVALID_INPUT);
        byte[] source = readInput(input);
        Path owned = Files.createTempDirectory(temporaryRoot, "cs-document-");
        try {
            Path copy = owned.resolve(mode.equals("image") ? "source.image" : "source.pdf"), report = owned.resolve("result.json");
            Files.write(copy, source);
            List<String> command = workerCommand(owned);
            command.addAll(List.of("--document-worker", mode, copy.toString(), report.toString()));
            String status = new String(OwnedProcess.run(command, Duration.ofSeconds(30), 128, DocumentFailure.Code.WORKER_FAILED, DocumentFailure.Code.WORKER_TIMEOUT), StandardCharsets.UTF_8).strip();
            if (status.startsWith("FAIL:")) {
                try { throw new DocumentFailure(DocumentFailure.Code.valueOf(status.substring(5))); }
                catch (IllegalArgumentException unknown) { throw new DocumentFailure(DocumentFailure.Code.WORKER_FAILED); }
            }
            if (!status.equals("OK") || !Files.isRegularFile(report) || Files.size(report) > OUTPUT_LIMIT) throw new DocumentFailure(DocumentFailure.Code.WORKER_FAILED);
            byte[] json = Files.readAllBytes(report); DocumentReport result = DocumentWorker.JSON.readValue(json, DocumentReport.class);
            Path parent = output.toAbsolutePath().getParent();
            if (!Files.isDirectory(parent)) throw new DocumentFailure(DocumentFailure.Code.INVALID_INPUT);
            Path temporary = Files.createTempFile(parent, ".document-report-", ".json");
            try { Files.write(temporary, json); Files.move(temporary, output.toAbsolutePath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
            finally { Files.deleteIfExists(temporary); }
            return result;
        } finally {
            try (var files = Files.walk(owned)) { for (Path path : files.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path); }
        }
    }
    static byte[] readInput(Path input) throws IOException, DocumentFailure {
        if (!Files.isRegularFile(input, LinkOption.NOFOLLOW_LINKS) || Files.size(input) > INPUT_LIMIT) throw new DocumentFailure(DocumentFailure.Code.INPUT_LIMIT);
        try (var stream = Files.newInputStream(input, LinkOption.NOFOLLOW_LINKS)) {
            byte[] bytes = stream.readNBytes(INPUT_LIMIT + 1);
            if (bytes.length == 0 || bytes.length > INPUT_LIMIT) throw new DocumentFailure(DocumentFailure.Code.INPUT_LIMIT);
            return bytes;
        }
    }
    static List<String> workerCommand(Path owned) throws IOException {
        List<String> command = new ArrayList<>(List.of(Path.of(System.getProperty("java.home"), "bin", "java").toString(), "-Xmx128m", "-Djava.awt.headless=true", "-Dpdfbox.fontcache=" + owned));
        String classpath = System.getProperty("java.class.path");
        boolean bootJar = false;
        if (!classpath.contains(System.getProperty("path.separator")) && Files.isRegularFile(Path.of(classpath))) {
            try (JarFile jar = new JarFile(classpath)) { bootJar = "org.springframework.boot.loader.launch.JarLauncher".equals(jar.getManifest().getMainAttributes().getValue("Main-Class")); }
        }
        command.addAll(bootJar ? List.of("-jar", classpath) : List.of("-cp", classpath, "com.csfundamentals.aiexample.AiBackendApplication"));
        return command;
    }
}
