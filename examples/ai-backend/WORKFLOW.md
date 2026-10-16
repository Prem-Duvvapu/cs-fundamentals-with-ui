# Milestone C1: explicit approval and bounded read-only tools

Start with the [setup](README.md) and [knowledge baseline](KNOWLEDGE.md). These examples use a local
fake support-order mutation, never a payment provider. A model may help investigate, but the
application alone decides what the authenticated principal can read or change.

## Read, propose, approve, reconcile

Alice owns synthetic `ORD-1001`; Bob owns `ORD-2001`. The mapping is fixed in teaching code.

1. POST `/api/investigate` with orderId/question. At most three model steps and six seconds are
   allowed; each model HTTP call also has its own deadline/call cap. Only `lookup_order`,
   `search_policy` and `finish` are understood. A model-proposed refund is rejected.
2. POST `/api/refund-proposals` with requestKey, orderId and amountCents. The application checks
   identity, ownership, positive amount ≤1000 cents and the order's current state. It stores a
   proposal and returns its exact action, resource version, expiry and approval token. No mutation
   has happened. The client should display these details for an explicit decision.
3. POST `/api/refund-proposals/{id}/approve` with approvalToken. The HMAC binds tenant, principal,
   operation, order, amount, resource version and expiry. The application checks token/expiry and
   locks the order before applying its single local transaction.
4. GET `/api/operations/{id}` to reconcile an uncertain result. Replaying the same approval after
   commit returns the existing result. The order version increments once.

The API is a teaching boundary for explicit approval, not proof that a human actually read a screen.
The model-facing tool set never receives the approval token or exposes the approval endpoint.
A production UI must show the exact action clearly; existing business permission checks remain
necessary even after approval. HTTP Basic/CSRF session handling follows the common example.

`AI_APPROVAL_SECRET` must be an explicit, private value of at least 32 characters. The automated
smoke generates it per run; interactive examples have no committed password/approval defaults.
Changing it invalidates old tokens. Preserve it securely across a file-backed restart exercise.

## Crash and duplicate exercise

The default in-memory database intentionally resets on restart. For persistence use an explicit
file JDBC URL as described in KNOWLEDGE.md, with the same approval secret after restart.

- Propose once using request key `demo-1` and amount 100.
- Repeating the same proposal returns the same operation/token. Reusing its request key with a
  different amount returns 409, because a retry cannot silently change business arguments.
- Approve, then pretend the HTTP response was lost. Read operation status or replay the same
  approval. The result stays completed and the order version stays 2.
- Create two proposals before approval. Once the first changes the order, the second has a stale
  version and must be re-evaluated; it cannot act with old approval.
- Advance the test Clock beyond five minutes. An unused expired token cannot mutate the order.

`RefundWorkflowTests` reproduces wrong-tenant arguments, changed actions, expiry, duplicate request
keys, actual file-backed reconstruction after commit, and simultaneous duplicate approvals.
The transaction covers this one local database only. A real remote provider requires its own
idempotency/outbox/reconciliation contract; this is not a universal exactly-once guarantee.

## A bounded agent is still application code

`ReadOnlyAgent` parses the proposed action and validates scope on every step. Tool outputs are
untrusted observations, not instructions. Unknown tools and changed order scope fail closed.
It caps steps, source text, per-request time and concurrent model calls (two workers with no queue).
A deadline cancels an outstanding model future. The HTTP model adapter cooperates with interruption.
No mutation occurs on deadline or step exhaustion. Returned explanatory text is untrusted and
needs evaluation; tool execution correctness does not prove the explanation is true.

`ReadOnlyAgentTests` checks normal lookup/finish, mutation rejection, cross-tenant scope changes,
repetitive-tool loops and interruption of a stalled model. The deterministic fixture exercises the
same HTTP model path in `verify_http.py`; no live-agent task success is claimed from fixture results.

## Real local MCP, with a separate authorization boundary

After Maven verify completes:

```bash
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar \
  --mcp-check examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar
```

The host uses official Java MCP SDK 2.0.0, spawns its own server over stdio, negotiates protocol
version, lists tools, performs an allowed lookup, checks cross-tenant denial and confirms the
connection still works afterward. The command prints the actual negotiated version; do not infer
support for a newer specification merely from SDK/library release numbering.

Only one tool is advertised. The **host process** chooses Alice as the principal; model arguments
cannot replace that identity. The `readOnlyHint` is descriptive metadata, while the Java handler
actually enforces scope and contains no mutation path. Stdio trust is local process trust; it does
not demonstrate remote OAuth, user consent or safe installation of arbitrary third-party servers.
Standard output contains only protocol messages in server mode; application logs go to stderr.
The client closes its transport and owns/cleans up the child. The packaged HTTP smoke runs this
MCP check too, separately from its fixture-provider calls.

Primary references: [MCP Java SDK](https://github.com/modelcontextprotocol/java-sdk),
[protocol architecture](https://modelcontextprotocol.io/docs/learn/architecture).
