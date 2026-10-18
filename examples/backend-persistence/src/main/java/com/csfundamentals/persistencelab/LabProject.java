package com.csfundamentals.persistencelab;

import jakarta.persistence.*;
import java.util.*;

@Entity @Table(name="projects")
public class LabProject {
    @Id private long id;
    @Column(nullable=false) private String name;
    @OneToMany(mappedBy="project",fetch=FetchType.LAZY) private List<LabTask> tasks=new ArrayList<>();
    protected LabProject() {}
    public long id() { return id; }
    public String name() { return name; }
    public List<LabTask> tasks() { return tasks; }
}
