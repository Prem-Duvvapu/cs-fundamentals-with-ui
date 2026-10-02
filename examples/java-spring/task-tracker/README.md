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
The default milestone teaches wiring and HTTP behavior. The optional persistence milestone below
adds JPA and local H2 storage. Authentication, authorization, caching, database migrations and
production deployment remain later milestones.

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

## Next milestone: persistence and transaction boundaries

Keep the same controller, service interface and requests. The `persistence` profile selects
`JpaTaskRepository` instead of `MemoryTaskRepository`. `TaskEntity` is a mapped mutable class;
`Task` stays the immutable HTTP response record. The adapter converts the entity to that record
inside its transaction, and Open Session in View is disabled.

From the example directory, use a consistent working directory so restarts use the same file:

```sh
cd examples/java-spring/task-tracker
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=persistence --server.port=9191"
```

1. POST a task using the request above; keep its returned Location.
2. PUT completion to true, then GET the Location to inspect the result.
3. Stop with Ctrl+C and run the same command again from the same directory.
4. GET the same Location: the stored task and completion flag remain.
5. Run `mvn test` and read the assertions below before changing the implementation.

H2 writes to `data/task-tracker.mv.db` relative to the process working directory. The data
folder is ignored by Git. No external database installation is needed. This is a local teaching
configuration with an empty H2 password and no HTTP authentication; production deployment is a
separate milestone. Do not run two instances against the same file.

### Trace one update

1. `TaskService.complete` calls the selected repository.
2. Spring intercepts the repository's `@Transactional` method and opens/joins its transaction.
3. `find` returns a managed `TaskEntity`; `complete` changes its field.
4. Hibernate detects the mutation at flush and uses `@Version` to detect a stale writer.
5. The transaction commits before the caller receives the record result. There is no explicit
   `save` or `merge` call for the already managed object.

Each repository operation is a boundary in this small milestone. Multiple operations that must
succeed together need one service transaction; merely calling two repository methods consecutively
is not atomic. `readOnly = true` is an optimization hint, not authorization or a universal write ban.

### Predict each executable test

| Test | What it proves on this example's runtime |
|---|---|
| `TaskServiceTest`, `TaskApiTest` | The original memory path and HTTP validation still work. |
| `PersistenceApiTest` | POST/GET/completion and error responses work with JPA. |
| `JpaLifecycleTest` | Identity reuse, managed dirty updates, detached mutations, merge's returned copy, flush followed by rollback, removed state and stale-version failure. |
| `TransactionBoundaryTest` | Unchecked rollback, default checked commit, explicit checked rollback, intercepted entry, self-invocation and an existing outer transaction. |
| `FilePersistenceTest` | A committed task remains after closing and reopening independent application contexts on one temporary database file. |

The failure service exists only in test configuration; no API endpoint deliberately fails.
The tests use fresh transactions for observations and isolated memory databases or a temporary
file. They do not establish PostgreSQL/MySQL equivalence, process-crash durability, HTTP conflict
response policy, collection fetch performance, or cross-row invariant protection.

### Change and debug

- Remove `rollbackFor` from the checked-failure test service, predict the changed result, then run
  that test. Restore it after observing why a thrown checked exception can still commit data.
- Change the managed copy after `merge`, then change only its detached argument. Explain why the
  two mutations have different outcomes.
- Compare SQL at `flush` with the final row after rollback. SQL having executed is not proof of commit.
- Add a second business operation to a service method and explain where its shared transaction
  must start before implementing it.

`schema.sql` creates the initial table if missing; Hibernate validates that schema rather than
rewriting it. This is deliberately an initial schema, **not a migration system**: changing the entity
requires a planned schema evolution. Flyway/Liquibase, pagination, relationship fetching, stronger
input/domain constraints, safe optimistic-conflict responses, security and telemetry remain next.

The Maven parent manages Spring Boot 4.1.1, Hibernate 7.4.5.Final, Spring Framework 7.0.9 and
H2 2.4.240 on Java 17. See the [JPA lesson](../../../content/java-spring/04-jpa-hibernate-lifecycle.md)
and its primary-source references for the contract behind each assertion.
