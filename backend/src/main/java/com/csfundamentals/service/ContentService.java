package com.csfundamentals.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class ContentService {

    private Path contentRootDir;

    public ContentService() {
        List<Path> candidates = List.of(
            Paths.get("content"),
            Paths.get("../content"),
            Paths.get(".").resolve("content")
        );
        contentRootDir = candidates.stream()
            .filter(Files::isDirectory)
            .findFirst()
            .map(Path::toAbsolutePath)
            .map(Path::normalize)
            .orElse(null);
    }

    public String getContent(String category, String topicId) {
        if (topicId == null || topicId.isBlank()) return "Content not found for: " + topicId;
        if (contentRootDir == null) return "Content directory not found";
        return loadContent(category, topicId);
    }

    public String getCoverageManifest() {
        if (contentRootDir == null) return "{}";
        try {
            Path manifest = contentRootDir.resolve("COVERAGE_MANIFEST.json").normalize();
            if (!manifest.startsWith(contentRootDir) || !Files.isRegularFile(manifest)) return "{}";
            return Files.readString(manifest);
        } catch (IOException e) {
            return "{}";
        }
    }

    private String loadContent(String category, String topicId) {
        try {
            Path file = findFile(category, topicId);
            if (file != null) {
                return Files.readString(file);
            }
            return "Content not found for: " + topicId;
        } catch (IOException e) {
            return "Error loading content: " + e.getMessage();
        }
    }

    private Path findFile(String category, String topicId) {
        if (category == null || category.isBlank() || topicId == null || topicId.isBlank()) return null;
        Path categoryDir = contentRootDir.resolve(category);
        if (!Files.isDirectory(categoryDir)) return null;
        String targetFilename = topicId + ".md";
        String prefixTarget = topicId + "-";
        try (var stream = Files.list(categoryDir)) {
            List<Path> files = stream.filter(Files::isRegularFile).toList();
            // 1. Try exact match after stripping numeric/letter prefix
            Path exact = files.stream()
                .filter(f -> stripPrefix(f.getFileName().toString()).equals(targetFilename))
                .findFirst()
                .orElse(null);
            if (exact != null) return exact;

            // 2. Fall back to prefix match after stripping numeric/letter prefix
            return files.stream()
                .filter(f -> stripPrefix(f.getFileName().toString()).startsWith(topicId))
                .findFirst()
                .orElse(null);
        } catch (IOException e) {
            return null;
        }
    }

    // Strips a leading "00-", "01b-", "05c-" style numeric+optional-letter prefix
    // so "01b-java-execution-pipeline.md" matches topicId "java-execution-pipeline".
    private String stripPrefix(String filename) {
        return filename.replaceFirst("^\\d+[a-z]?-", "");
    }
}
