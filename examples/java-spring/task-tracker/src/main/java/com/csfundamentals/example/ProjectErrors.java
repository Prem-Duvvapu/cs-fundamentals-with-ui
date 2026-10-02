package com.csfundamentals.example;
import jakarta.persistence.OptimisticLockException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestControllerAdvice(assignableTypes = ProjectController.class)
public class ProjectErrors {
    @ExceptionHandler(IllegalArgumentException.class) ProblemDetail invalid(IllegalArgumentException error) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, error.getMessage());
    }
    @ExceptionHandler({ProjectConflictException.class, OptimisticLockException.class, OptimisticLockingFailureException.class})
    ProblemDetail conflict(RuntimeException error) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Project changed. Reload before retrying.");
    }
}
