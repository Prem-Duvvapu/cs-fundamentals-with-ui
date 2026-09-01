package com.csfundamentals.model;

import java.util.List;

public record InterviewQuestionResponse(
    String category,
    String difficulty,
    int total,
    int offset,
    int limit,
    List<InterviewQuestion> questions
) {
    public InterviewQuestionResponse {
        questions = List.copyOf(questions);
    }
}
