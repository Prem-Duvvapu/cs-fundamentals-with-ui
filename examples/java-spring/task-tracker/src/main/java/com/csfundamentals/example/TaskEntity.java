package com.csfundamentals.example;

import jakarta.persistence.*;

@Entity
@Table(name = "tasks")
public class TaskEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String title;
    @Column(nullable = false)
    private boolean completed;
    @Version
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private ProjectEntity project;
    void setProject(ProjectEntity project) { this.project = project; }

    protected TaskEntity() { }
    public TaskEntity(String title) { this.title = title; }
    public Long id() { return id; }
    public Long version() { return version; }
    public String title() { return title; }
    public void rename(String title) { this.title = title; }
    public void complete(boolean completed) { this.completed = completed; }
    public Task toTask() { return new Task(id, title, completed); }
}
