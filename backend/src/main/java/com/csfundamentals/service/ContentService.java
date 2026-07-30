package com.csfundamentals.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ContentService {

    private Path contentDir;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public ContentService() {
        List<Path> candidates = List.of(
            Paths.get("content/os"),
            Paths.get("../content/os"),
            Paths.get(".").resolve("content/os")
        );
        contentDir = candidates.stream()
            .filter(Files::isDirectory)
            .findFirst()
            .map(Path::toAbsolutePath)
            .map(Path::normalize)
            .orElse(null);
    }

    public String getContent(String topicId) {
        if (contentDir == null) return "Content directory not found";
        return cache.computeIfAbsent(topicId, this::loadContent);
    }

    private String loadContent(String topicId) {
        try {
            Path file = findFile(topicId);
            if (file != null) {
                return Files.readString(file);
            }
            return "Content not found for: " + topicId;
        } catch (IOException e) {
            return "Error loading content: " + e.getMessage();
        }
    }

    private Path findFile(String topicId) {
        try (var files = Files.list(contentDir)) {
            return files
                .filter(f -> f.getFileName().toString().contains(topicId))
                .findFirst()
                .orElse(null);
        } catch (IOException e) {
            return null;
        }
    }
}
