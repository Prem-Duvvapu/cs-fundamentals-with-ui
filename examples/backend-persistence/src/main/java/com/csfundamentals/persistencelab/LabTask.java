package com.csfundamentals.persistencelab;

import jakarta.persistence.*;

@Entity @Table(name="tasks")
public class LabTask {
    @Id private long id;
    @Column(nullable=false) private String title;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="project_id",nullable=false) private LabProject project;
    protected LabTask() {}
    public String title() { return title; }
}
