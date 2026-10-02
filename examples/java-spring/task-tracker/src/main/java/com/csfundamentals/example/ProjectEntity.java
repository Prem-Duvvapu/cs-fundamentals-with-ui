package com.csfundamentals.example;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "projects")
public class ProjectEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 120) private String name;
    @Column(name = "owner_name", nullable = false, length = 100) private String owner;
    @Version private Long version;
    @OneToMany(mappedBy = "project", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<TaskEntity> tasks = new ArrayList<>();
    protected ProjectEntity() { }
    public ProjectEntity(String owner, String name) { this.owner = owner; this.name = name; }
    public void rename(String name) { this.name = name; }
    public void add(TaskEntity task) { tasks.add(task); task.setProject(this); }
    public ProjectView view() { return new ProjectView(id, name, version); }
}
