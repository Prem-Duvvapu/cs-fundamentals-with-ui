package com.csfundamentals.model;

public record InterviewQuestion(
    String id,
    String topicId,
    String topicTitle,
    String category,
    int number,
    String question,
    String difficulty,
    String answerMarkdown
) {
}
