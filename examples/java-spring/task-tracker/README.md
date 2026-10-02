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
adds JPA and local H2 storage. The final local milestone below adds versioned migrations, project/task relationships,
owner-scoped security, pagination, caching and operational endpoints.

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

Flyway now owns schema creation and upgrades: V1 creates tasks; V2 adds projects and the nullable
foreign key. Hibernate validates the migrated schema and never rewrites it. The next milestone
uses these relationships through a separate owner-scoped API.

The Maven parent manages Spring Boot 4.1.1, Hibernate 7.4.5.Final, Spring Framework 7.0.9 and
H2 2.4.240 on Java 17. See the [JPA lesson](../../../content/java-spring/04-jpa-hibernate-lifecycle.md)
and its primary-source references for the contract behind each assertion.


## Milestone 3: migrations and related resources

The `production` teaching profile activates `persistence`, `secure` and `cached`. It is a runnable
operations exercise, not a claim that an H2 file and three in-memory users form a deployable
production service. Bind locally for these HTTP Basic examples; a real remote deployment needs
TLS termination, managed identities, a database/backup strategy and load/failure validation.

Start from the example directory. Provide your own nonempty teaching passwords:

```sh
export TASK_TRACKER_ALICE_PASSWORD='choose-a-local-alice-password'
export TASK_TRACKER_BOB_PASSWORD='choose-a-local-bob-password'
export TASK_TRACKER_VIEWER_PASSWORD='choose-a-local-viewer-password'
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=production --server.port=9191"
```

For a fresh database, Flyway applies V1 then V2. Existing tasks created by the previous `schema.sql`
release have no migration history. Stop that release, back up its H2 file, and confirm its schema
matches V1 before running this **one-time** adoption command:

```sh
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=persistence --server.port=9191 --spring.flyway.baseline-on-migrate=true --spring.flyway.baseline-version=1"
```

Stop it after successful migration and restart with the normal command. Do not leave automatic
baselining enabled: accepting an unknown nonempty schema would conceal mistakes. `MigrationUpgradeTest`
proves V2 preserves a legacy task on H2; it does not prove arbitrary historical schemas are compatible.
Never edit an applied migration to change its checksum; add V3 for the next schema change.
Legacy tasks retain a null project rather than receiving an invented owner. They remain accessible
through the old teaching persistence profile; the secure profile denies that unowned API.

### Obtain a CSRF token and create one project

These commands need curl and Python 3. The temporary cookie file ties the returned CSRF token to
the same HTTP session. Use the actual resource Location, not a guessed ID.

```sh
cookies=$(mktemp)
trap 'rm -f "$cookies"' EXIT
csrf=$(curl --fail --silent -c "$cookies" -u "alice:$TASK_TRACKER_ALICE_PASSWORD" http://localhost:9191/api/csrf | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')
curl -i -b "$cookies" -u "alice:$TASK_TRACKER_ALICE_PASSWORD" -H "X-CSRF-TOKEN: $csrf" -H 'Content-Type: application/json' -d '{"name":"Interview preparation"}' http://localhost:9191/api/projects
```

POST returns 201, a Location such as `/api/projects/1`, and `id`, `name`, `version`. Alice's principal
supplies ownership; the JSON request cannot select Bob's identity. For the following requests,
replace `/1` with the returned ID.

```sh
curl --fail -b "$cookies" -u "alice:$TASK_TRACKER_ALICE_PASSWORD" -H "X-CSRF-TOKEN: $csrf" -H 'Content-Type: application/json' -d '{"title":"Explain transactions"}' http://localhost:9191/api/projects/1/tasks
curl --fail -u "alice:$TASK_TRACKER_ALICE_PASSWORD" 'http://localhost:9191/api/projects/1/tasks?page=0&size=2'
curl --fail -u "alice:$TASK_TRACKER_ALICE_PASSWORD" 'http://localhost:9191/api/projects?page=0&size=2'
```

A page has `items`, zero-based `page`, `size`, and `total`. ID ordering is deterministic;
size must be 1–100 and page 0–100000. Count and item queries are separate statements, so concurrent
changes can affect the count/content under the database's isolation. This example uses offset
pagination; large offsets and changing datasets need a considered keyset/snapshot design.

`ProjectEntity.tasks` is lazy; `TaskEntity.project` owns the foreign key. Adding a task maintains
both Java sides and persists the child. Listing tasks selects only the requested page and converts
to immutable records inside the transaction. It does not serialize entities, keep OSIV open or
fetch-join an entire collection before applying a page. Project deletion cascades to its tasks;
that can be expensive for a very large collection and needs a separate bulk-deletion policy.

### Update and delete, with explicit version behavior

Read the project's current version before renaming. Use the task ID returned by POST.

```sh
curl -i -X PUT -b "$cookies" -u "alice:$TASK_TRACKER_ALICE_PASSWORD" -H "X-CSRF-TOKEN: $csrf" -H 'Content-Type: application/json' -d '{"name":"Updated name","version":0}' http://localhost:9191/api/projects/1
curl -i -X PUT -b "$cookies" -u "alice:$TASK_TRACKER_ALICE_PASSWORD" -H "X-CSRF-TOKEN: $csrf" -H 'Content-Type: application/json' -d '{"title":"Explain a rollback","completed":true}' http://localhost:9191/api/projects/1/tasks/1
curl -i -X DELETE -b "$cookies" -u "alice:$TASK_TRACKER_ALICE_PASSWORD" -H "X-CSRF-TOKEN: $csrf" http://localhost:9191/api/projects/1/tasks/1
curl -i -X DELETE -b "$cookies" -u "alice:$TASK_TRACKER_ALICE_PASSWORD" -H "X-CSRF-TOKEN: $csrf" http://localhost:9191/api/projects/1
```

A stale project version returns 409; reload and reconsider the proposed change. Task PUT is a
complete state update, with no client-supplied version precondition: its JPA version detects overlapping
transactions but does not prevent a later stale client from overwriting already committed state.
DELETE returns 204. A missing resource or another owner's project returns 404.

### Predict the security failures

- No credentials: 401 for protected endpoints. Authentication establishes identity, not ownership.
- Alice's POST without the same-session CSRF token: 403. HTTP Basic can be sent automatically by browsers;
  it is not a justification for disabling CSRF. This example retains normal session behavior.
- Viewer can list its own projects but cannot write or access metrics: 403 for those operations.
- Bob requesting Alice's project or its task: 404. Service queries constrain the parent owner before children.
- Authenticated calls to legacy `/api/tasks`: 403 in this profile.
- Invalid name, page size or version: 400; a stale project version: 409.

### Cache and production signals

Project-list pages use a bounded Caffeine cache (256 entries, 60-second expiry), keyed by owner,
page and size. Project create/rename/delete evicts cached pages **after transaction commit**.
Transaction-aware cache writes and evictions do not publish rolled-back work. A transaction that
changes a project and reads its cached page before committing can still see the old entry; this
example does not promise transaction-local cache coherence or multi-process invalidation.
External database writers and additional replicas require their own invalidation/coherence design.

```sh
curl --fail http://localhost:9191/actuator/health/liveness
curl --fail http://localhost:9191/actuator/health/readiness
curl --fail -u "alice:$TASK_TRACKER_ALICE_PASSWORD" http://localhost:9191/actuator/metrics/tasktracker.projects.created
```

Health responses contain status without details. Metrics require the learner role. The created
counter increments after commit, survives neither restart nor metric-process loss, and is not a
business audit ledger. Readiness reports configured contributors, not a full dependency/traffic
experiment. SIGTERM enables graceful shutdown with a 20-second phase timeout; it is not a guarantee
that every slow request completes.

The Dockerfile packages this example as a nonroot Java 17 process. From the repository root:

```sh
docker build -t task-tracker-learning examples/java-spring/task-tracker
docker run --rm -p 127.0.0.1:9191:9191 -e TASK_TRACKER_ALICE_PASSWORD -e TASK_TRACKER_BOB_PASSWORD -e TASK_TRACKER_VIEWER_PASSWORD -v task-tracker-data:/app/data task-tracker-learning
```

Stop the named process with SIGTERM; do not share one H2 file between concurrent replicas. The
named volume persists the teaching database; keep it when restarting. Container packaging is
separate from disaster recovery, TLS, autoscaling and production capacity certification.

### Executable milestones and transfer exercises

`mvn test` covers the original twelve scenarios plus migrations, project/task CRUD, owner/role/CSRF
rejection, bounded page queries, cascading deletion, version conflict, cache reuse/rollback/eviction,
post-commit metrics, and endpoint exposure. The paged task assertion checks exactly three prepared
statements on this runtime, with no collection fetch, rather than claiming LAZY annotations alone
solve N+1. `browserStyleCsrfTokenFromTheSameSessionAllowsTheWrite` fetches the real token instead of
only injecting a test CSRF marker. Database-close/reopen tests still verify file persistence.

```sh
mvn package
python3 verify_http.py
```

The HTTP smoke launches its own packaged server on an OS-selected loopback port in a temporary
directory, verifies the actual CSRF/session exchange and failures, then sends SIGTERM and checks
clean exit. CI also builds the nonroot container and checks readiness plus shutdown. Local Docker
verification requires a running Docker daemon; the JVM/socket checks do not.

1. **Predict:** roll back a project creation. The row, metric increment and eviction must not publish.
2. **Change:** add a third migration with a new nullable field. Predict behavior on a fresh and existing database.
3. **Debug:** remove the owner predicate. Explain how a valid identity could then read another user's data; restore it.
4. **Transfer:** replace offset pagination with keyset pagination. Define the cursor, ordering and deletion behavior first.
5. **Interview:** distinguish authentication, role permission and row ownership with one failing request for each.

Primary sources: [Boot database initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html),
[Spring request authorization](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html),
[Spring caching](https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html), and
[Actuator endpoint exposure](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html).
