package com.csfundamentals.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleInvalidRequest(IllegalArgumentException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
        problem.setTitle("Invalid simulation request");
        return problem;
    }
}
