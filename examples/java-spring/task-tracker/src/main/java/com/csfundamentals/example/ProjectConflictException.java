package com.csfundamentals.example;
public class ProjectConflictException extends RuntimeException {
    public ProjectConflictException() { super("Project changed. Reload before retrying."); }
}
