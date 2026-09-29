# Task Tracker: from Java objects to HTTP

This isolated learning application uses **Java 17 and Spring Boot 4.1.1**. It runs separately
from the CS Fundamentals backend. You need a JDK and Maven; Docker and a database are not needed.
The repository is the full source context for the Spring lesson excerpts.

From the repository root:

```sh
mvn test -f examples/java-spring/task-tracker/pom.xml
mvn -f examples/java-spring/task-tracker/pom.xml spring-boot:run -Dspring-boot.run.arguments=--server.port=9191
```

Stop the server with Ctrl+C. Tasks live in memory and disappear when the process stops.
This milestone teaches wiring and HTTP behavior. It does not implement persistence, authentication,
authorization, caching, or production deployment; do not infer those capabilities from the example.

## Work through the application

1. Read `Task.java`. A record groups an ID, title, and completion flag; each field is available
   through a same-named accessor such as `title()`.
2. Read `TaskRepository.java`. An interface describes the operations the service needs.
3. Run `TaskServiceTest`. It constructs a repository and service with `new`; Spring is not
   involved in these unit tests. Invalid input must not add a task.
4. Read `TaskTrackerApplication.java`. The two `@Bean` methods hand object creation to Spring.
   The parameter of `taskService` asks Spring to supply the registered repository.
5. Read `TaskController.java`. Its constructor receives the service, and mapping annotations
   select methods based on the HTTP request. Java method calls still perform the actual work.
6. Run the requests below, then read `TaskApiTest`. Those tests exercise the Spring application
   context, routing, request conversion, response conversion, and error status behavior.

## First request

```sh
curl -i -H 'Content-Type: application/json' -d '{"title":"Read about objects"}' http://localhost:9191/api/tasks
```

A fresh process returns HTTP 201, `Location: /api/tasks/1`, and a JSON object with
`id: 1`, `title: "Read about objects"`, and `completed: false`. JSON member order is not a contract.
Use the ID actually returned if you have already created other tasks.

```sh
curl -i http://localhost:9191/api/tasks/1
curl -i -X PUT -H 'Content-Type: application/json' -d '{"completed":true}' http://localhost:9191/api/tasks/1/completion
curl -i http://localhost:9191/api/tasks
```

The first request reads the task. The second returns the same ID/title with `completed: true`.
The third returns a list containing the task. The completion endpoint describes a resource state;
repeating the same PUT leaves that state unchanged.

## Failure, explained

```sh
curl -i -H 'Content-Type: application/json' -d '{"title":" "}' http://localhost:9191/api/tasks
curl -i http://localhost:9191/api/tasks/999999
```

A blank title receives HTTP 400 with a Problem Detail explaining the title constraint.
An unknown task receives HTTP 404. These failures happen at different boundaries: input validation
versus resource lookup. The service rejects an invalid title before calling `repository.add`.

## Predict, change, debug

- **Predict:** create two tasks with the same title. They have different IDs: title uniqueness
  is not a rule of this example. Explain where that rule would belong if requirements changed.
- **Change:** set a task's completion state back to false. Add an assertion that its title is unchanged.
- **Debug:** move the `@SpringBootApplication` class into a child package without configuring scanning.
  Explain why the controller may no longer be discovered. Restore the root package before continuing.
- **Trace:** follow a POST through `TaskController.create` → `TaskService.create` →
  `MemoryTaskRepository.add`, then follow the Task back into the HTTP response.

The repository synchronizes its operations to keep map access and ID allocation consistent across
request threads. The record values are immutable, and list queries return a copy. This local lock
is not a distributed transaction or a replacement for database concurrency control.
