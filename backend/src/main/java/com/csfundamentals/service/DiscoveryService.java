package com.csfundamentals.service;

import com.csfundamentals.model.InterviewQuestion;
import com.csfundamentals.model.InterviewQuestionResponse;
import com.csfundamentals.model.SearchResponse;
import com.csfundamentals.model.SearchResult;
import com.csfundamentals.model.Topic;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DiscoveryService {

    private static final Pattern MARKDOWN_HEADING = Pattern.compile("^#{1,6}\\s+(.+?)\\s*$");
    private static final Pattern INTERVIEW_HEADING = Pattern.compile("^ {0,3}###[\\t ]+Interview Questions[\\t ]*$");
    private static final Pattern SECTION_BOUNDARY = Pattern.compile("^ {0,3}#{1,3}(?:[\\t ]+|$)");
    private static final Pattern QUESTION_LINE = Pattern.compile(
        "^ {0,3}\\*\\*Q(\\d+)\\.[\\t ]+(.+?)\\*\\*[\\t ]*`?\\[(easy|medium|hard)]`?[\\t ]*$",
        Pattern.CASE_INSENSITIVE
    );
    private static final int MAX_SEARCH_RESULTS = 50;
    private static final int MAX_QUESTION_RESULTS = 500;

    private final List<SearchDocument> documents;
    private final List<InterviewQuestion> interviewQuestions;

    public DiscoveryService(TopicService topicService, ContentService contentService, ObjectMapper objectMapper) {
        Map<String, List<String>> coverageTags = readCoverageTags(contentService.getCoverageManifest(), objectMapper);
        List<SearchDocument> indexedDocuments = new ArrayList<>();
        List<InterviewQuestion> indexedQuestions = new ArrayList<>();

        for (Topic topic : topicService.getAllTopics()) {
            String markdown = contentService.getContent(topic.category(), topic.id());
            ParsedContent parsed = parseContent(markdown);
            List<String> tags = coverageTags.getOrDefault(topic.id(), List.of());
            indexedDocuments.add(SearchDocument.from(topic, parsed, tags));
            indexedQuestions.addAll(parseInterviewQuestions(topic, markdown));
        }

        documents = List.copyOf(indexedDocuments);
        interviewQuestions = List.copyOf(indexedQuestions);
    }

    public SearchResponse search(String rawQuery, String rawCategory, int requestedLimit) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        String normalizedQuery = normalize(query);
        String category = normalizeFilter(rawCategory);
        int limit = Math.max(1, Math.min(MAX_SEARCH_RESULTS, requestedLimit));

        if (normalizedQuery.isBlank()) {
            return new SearchResponse(query, category, 0, List.of());
        }

        List<String> terms = queryTerms(normalizedQuery);
        List<SearchResult> matches = documents.stream()
            .filter(document -> category == null || document.topic().category().equals(category))
            .map(document -> toSearchResult(document, normalizedQuery, terms))
            .filter(result -> result.score() > 0)
            .sorted(Comparator.comparingInt(SearchResult::score).reversed()
                .thenComparing(SearchResult::title)
                .thenComparing(SearchResult::topicId))
            .toList();

        return new SearchResponse(query, category, matches.size(), matches.stream().limit(limit).toList());
    }

    public InterviewQuestionResponse getInterviewQuestions(
        String rawCategory,
        String rawDifficulty,
        int requestedOffset,
        int requestedLimit
    ) {
        String category = normalizeFilter(rawCategory);
        String difficulty = normalizeFilter(rawDifficulty);
        int offset = Math.max(0, requestedOffset);
        int limit = Math.max(1, Math.min(MAX_QUESTION_RESULTS, requestedLimit));

        List<InterviewQuestion> filtered = interviewQuestions.stream()
            .filter(question -> category == null || question.category().equals(category))
            .filter(question -> difficulty == null || question.difficulty().equals(difficulty))
            .toList();
        int fromIndex = Math.min(offset, filtered.size());
        int toIndex = Math.min(fromIndex + limit, filtered.size());

        return new InterviewQuestionResponse(
            category,
            difficulty,
            filtered.size(),
            offset,
            limit,
            filtered.subList(fromIndex, toIndex)
        );
    }

    int indexedTopicCount() {
        return documents.size();
    }

    int indexedQuestionCount() {
        return interviewQuestions.size();
    }

    private SearchResult toSearchResult(SearchDocument document, String phrase, List<String> terms) {
        int score = 0;
        score += contains(document.normalizedTitle(), phrase) ? 160 : 0;
        score += contains(document.normalizedHeadings(), phrase) ? 70 : 0;
        score += contains(document.normalizedTags(), phrase) ? 55 : 0;
        score += contains(document.normalizedSummary(), phrase) ? 45 : 0;
        score += contains(document.normalizedBody(), phrase) ? 12 : 0;

        List<String> matchedTerms = new ArrayList<>();
        for (String term : terms) {
            boolean matched = contains(document.searchable(), term);
            if (!matched) continue;
            matchedTerms.add(term);
            score += contains(document.normalizedTitle(), term) ? 28 : 0;
            score += contains(document.normalizedHeadings(), term) ? 18 : 0;
            score += contains(document.normalizedTags(), term) ? 14 : 0;
            score += contains(document.normalizedSummary(), term) ? 10 : 0;
            score += contains(document.normalizedBody(), term) ? 2 : 0;
        }
        if (!terms.isEmpty() && matchedTerms.size() == terms.size()) score += 30;

        String matchedHeading = document.headings().stream()
            .filter(heading -> contains(normalize(heading), phrase) || terms.stream().anyMatch(term -> contains(normalize(heading), term)))
            .findFirst()
            .orElse(null);

        return new SearchResult(
            document.topic().id(),
            document.topic().title(),
            document.topic().category(),
            document.topic().level(),
            document.topic().summary(),
            matchedHeading,
            excerpt(document, phrase, terms),
            matchedTerms,
            score
        );
    }

    private String excerpt(SearchDocument document, String phrase, List<String> terms) {
        if (contains(document.normalizedSummary(), phrase)
            || terms.stream().anyMatch(term -> contains(document.normalizedSummary(), term))) {
            return document.topic().summary();
        }

        String normalizedBody = document.normalizedBody();
        int position = normalizedBody.indexOf(phrase);
        if (position < 0) {
            position = terms.stream().mapToInt(normalizedBody::indexOf).filter(index -> index >= 0).min().orElse(0);
        }

        String body = document.plainText();
        int start = Math.max(0, position - 80);
        int end = Math.min(body.length(), Math.max(position + phrase.length() + 120, start + 220));
        if (start > 0) {
            int nextSpace = body.indexOf(' ', start);
            if (nextSpace >= 0 && nextSpace < end) start = nextSpace + 1;
        }
        if (end < body.length()) {
            int previousSpace = body.lastIndexOf(' ', end);
            if (previousSpace > start) end = previousSpace;
        }
        String value = body.substring(start, end).trim();
        return (start > 0 ? "…" : "") + value + (end < body.length() ? "…" : "");
    }

    private static ParsedContent parseContent(String markdown) {
        List<String> headings = new ArrayList<>();
        List<String> bodyLines = new ArrayList<>();
        Fence fence = null;

        for (String line : normalizedLines(markdown)) {
            if (fence != null) {
                if (closesFence(line, fence)) fence = null;
                continue;
            }
            Fence opening = openingFence(line);
            if (opening != null) {
                fence = opening;
                continue;
            }

            Matcher heading = MARKDOWN_HEADING.matcher(line.trim());
            if (heading.matches()) headings.add(cleanMarkdown(heading.group(1)));
            String plainLine = cleanMarkdown(line);
            if (!plainLine.isBlank()) bodyLines.add(plainLine);
        }

        return new ParsedContent(List.copyOf(headings), String.join(" ", bodyLines).replaceAll("\\s+", " ").trim());
    }

    private static List<InterviewQuestion> parseInterviewQuestions(Topic topic, String markdown) {
        String[] lines = normalizedLines(markdown);
        List<InterviewQuestion> questions = new ArrayList<>();
        boolean inSection = false;
        Fence fence = null;
        QuestionDraft current = null;

        for (String line : lines) {
            if (fence != null) {
                if (inSection && current != null) current.answerLines().add(line);
                if (closesFence(line, fence)) fence = null;
                continue;
            }

            Fence opening = openingFence(line);
            if (opening != null) {
                fence = opening;
                if (inSection && current != null) current.answerLines().add(line);
                continue;
            }

            if (!inSection) {
                if (INTERVIEW_HEADING.matcher(line).matches()) inSection = true;
                continue;
            }
            if (SECTION_BOUNDARY.matcher(line).find()) break;

            Matcher question = QUESTION_LINE.matcher(line);
            if (question.matches()) {
                if (current != null) questions.add(current.toQuestion(topic));
                current = new QuestionDraft(
                    Integer.parseInt(question.group(1)),
                    question.group(2).trim(),
                    question.group(3).toLowerCase(Locale.ROOT),
                    new ArrayList<>()
                );
            } else if (current != null) {
                current.answerLines().add(line);
            }
        }
        if (current != null) questions.add(current.toQuestion(topic));
        return questions;
    }

    private static Map<String, List<String>> readCoverageTags(String manifest, ObjectMapper objectMapper) {
        Map<String, List<String>> tagsByTopic = new HashMap<>();
        try {
            JsonNode entries = objectMapper.readTree(manifest).path("entries");
            for (JsonNode entry : entries) {
                String topicId = entry.path("topicId").asText();
                if (topicId.isBlank()) continue;
                List<String> tags = tagsByTopic.computeIfAbsent(topicId, ignored -> new ArrayList<>());
                collectText(entry.path("requiredTerms"), tags);
            }
        } catch (Exception ignored) {
            return Map.of();
        }
        Map<String, List<String>> immutable = new HashMap<>();
        tagsByTopic.forEach((topicId, tags) -> immutable.put(topicId, List.copyOf(new LinkedHashSet<>(tags))));
        return Map.copyOf(immutable);
    }

    private static void collectText(JsonNode node, List<String> destination) {
        if (node.isTextual()) {
            destination.add(node.asText());
        } else if (node.isArray()) {
            node.forEach(child -> collectText(child, destination));
        }
    }

    private static String[] normalizedLines(String content) {
        if (content == null) return new String[0];
        return content.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1);
    }

    private static Fence openingFence(String line) {
        Matcher matcher = Pattern.compile("^ {0,3}(`{3,}|~{3,})(.*)$").matcher(line);
        if (!matcher.matches()) return null;
        String marker = matcher.group(1);
        if (marker.charAt(0) == '`' && matcher.group(2).contains("`")) return null;
        return new Fence(marker.charAt(0), marker.length());
    }

    private static boolean closesFence(String line, Fence fence) {
        String trimmed = line.stripLeading().stripTrailing();
        if (trimmed.isEmpty() || trimmed.charAt(0) != fence.character()) return false;
        int markerLength = 0;
        while (markerLength < trimmed.length() && trimmed.charAt(markerLength) == fence.character()) markerLength++;
        return markerLength >= fence.length() && trimmed.substring(markerLength).isBlank();
    }

    private static String cleanMarkdown(String value) {
        return value
            .replaceAll("!\\[([^]]*)]\\([^)]*\\)", "$1")
            .replaceAll("\\[([^]]+)]\\([^)]*\\)", "$1")
            .replaceAll("^\\s*(?:>|[-+*]|\\d+[.)])\\s+", "")
            .replaceAll("[*_~`|]", "")
            .replaceAll("<[^>]+>", "")
            .trim();
    }

    private static List<String> queryTerms(String normalizedQuery) {
        return Arrays.stream(normalizedQuery.split("[^\\p{L}\\p{N}+#./-]+"))
            .filter(term -> !term.isBlank())
            .distinct()
            .toList();
    }

    private static String normalize(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFKD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("\\s+", " ")
            .trim();
    }

    private static String normalizeFilter(String value) {
        String normalized = normalize(value);
        return normalized.isBlank() ? null : normalized;
    }

    private static boolean contains(String value, String query) {
        return query != null && !query.isBlank() && value.contains(query);
    }

    private record ParsedContent(List<String> headings, String plainText) {
    }

    private record Fence(char character, int length) {
    }

    private record QuestionDraft(int number, String prompt, String difficulty, List<String> answerLines) {
        InterviewQuestion toQuestion(Topic topic) {
            int start = 0;
            int end = answerLines.size();
            while (start < end && answerLines.get(start).isBlank()) start++;
            while (end > start && answerLines.get(end - 1).isBlank()) end--;
            String answer = String.join("\n", answerLines.subList(start, end));
            return new InterviewQuestion(
                topic.id() + "-q" + number,
                topic.id(),
                topic.title(),
                topic.category(),
                number,
                "Q" + number + ". " + prompt,
                difficulty,
                answer
            );
        }
    }

    private record SearchDocument(
        Topic topic,
        List<String> headings,
        String plainText,
        String normalizedTitle,
        String normalizedSummary,
        String normalizedHeadings,
        String normalizedTags,
        String normalizedBody,
        String searchable
    ) {
        static SearchDocument from(Topic topic, ParsedContent content, List<String> tags) {
            String title = normalize(topic.title());
            String summary = normalize(topic.summary());
            String headings = normalize(String.join(" ", content.headings()));
            String coverage = normalize(String.join(" ", tags));
            String body = normalize(content.plainText());
            return new SearchDocument(
                topic,
                content.headings(),
                content.plainText(),
                title,
                summary,
                headings,
                coverage,
                body,
                String.join(" ", title, summary, headings, coverage, body)
            );
        }
    }
}
