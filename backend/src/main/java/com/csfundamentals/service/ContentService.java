package com.csfundamentals.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

@Service
public class ContentService {

    private final Path contentRootDir;
    private final Map<String, Path> topicFiles;

    public ContentService() {
        this(new TopicService(), "");
    }

    @Autowired
    public ContentService(TopicService topicService, @Value("${app.content-root:}") String configuredRoot) {
        List<Path> candidates = configuredRoot == null || configuredRoot.isBlank() ? List.of(
            Paths.get("content"),
            Paths.get("../content"),
            Paths.get(".").resolve("content")
        ) : List.of(Paths.get(configuredRoot));
        contentRootDir = candidates.stream()
            .filter(Files::isDirectory)
            .findFirst()
            .map(Path::toAbsolutePath)
            .map(Path::normalize)
            .orElseThrow(() -> new IllegalStateException("Curriculum content directory is unavailable"));
        topicFiles = buildTopicFileIndex(topicService);
        if (topicFiles.size() != topicService.getAllTopics().size()) {
            throw new IllegalStateException("Curriculum index is incomplete: expected "
                + topicService.getAllTopics().size() + " topics but found " + topicFiles.size());
        }
    }

    public String getContent(String category, String topicId) {
        Path file = findFile(category, topicId);
        if (file == null) throw new ContentNotFoundException(category, topicId);
        try {
            return Files.readString(file);
        } catch (IOException e) {
            throw new ContentReadException("Failed to read curriculum content", e);
        }
    }

    public boolean exists(String category, String topicId) {
        return findFile(category, topicId) != null;
    }

    public int indexedTopicCount() {
        return topicFiles.size();
    }

    public String getCoverageManifest() {
        try {
            Path manifest = contentRootDir.resolve("COVERAGE_MANIFEST.json").normalize();
            if (!manifest.startsWith(contentRootDir) || !Files.isRegularFile(manifest)) return "{}";
            return Files.readString(manifest);
        } catch (IOException e) {
            return "{}";
        }
    }

    private Path findFile(String category, String topicId) {
        if (category == null || category.isBlank() || topicId == null || topicId.isBlank()) return null;
        return topicFiles.get(category + "/" + topicId);
    }

    private Map<String, Path> buildTopicFileIndex(TopicService topicService) {
        Map<String, Path> filesByName = new HashMap<>();
        try (var categories = Files.list(contentRootDir)) {
            for (Path categoryDir : categories.filter(Files::isDirectory).toList()) {
                try (var files = Files.list(categoryDir)) {
                    for (Path file : files.filter(Files::isRegularFile).toList()) {
                        String relativeKey = categoryDir.getFileName() + "/" + stripPrefix(file.getFileName().toString()).replaceFirst("\\.md$", "");
                        filesByName.put(relativeKey, file.toAbsolutePath().normalize());
                    }
                }
            }
        } catch (IOException e) {
            throw new ContentReadException("Failed to index curriculum content", e);
        }

        Map<String, Path> registered = new HashMap<>();
        topicService.getAllTopics().forEach(topic -> {
            String key = topic.category() + "/" + topic.id();
            Path file = filesByName.get(key);
            if (file != null && file.startsWith(contentRootDir) && Files.isRegularFile(file)) registered.put(key, file);
        });
        return Map.copyOf(registered);
    }

    // Strips a leading "00-", "01b-", "05c-" style numeric+optional-letter prefix
    // so "01b-java-execution-pipeline.md" matches topicId "java-execution-pipeline".
    private String stripPrefix(String filename) {
        return filename.replaceFirst("^\\d+[a-z]?-", "");
    }
}
