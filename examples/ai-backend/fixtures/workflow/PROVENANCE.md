# Workflow evaluation provenance

`cases.jsonl` is the single canonical 50-row inventory: `dev-01`–`dev-30` are development;
`held-01`–`held-20` are held-out. Both were originally authored on October 18, 2026 from this
repository's `ReadOnlyAgent` and `RefundWorkflow` application contracts. “Held-out” means a fixed
separate scoring slice for learner experiments, not unseen independent production samples or a
statistical certification. The initial fixture was implemented with these known cases; evaluate a
live model on a fresh, independently reviewed set before making generalization claims.

Each row stores a distinct rationale, actual input and a separate expected result. The runner
passes only `input` to the proposal fixture. Raw proposed-action transcripts are fault inputs,
not actions chosen from expected labels. No external model, judge, customer data or paid service
generated these labels. Original synthetic source documents are constructed by the evaluator.

| Cases | Distinct boundaries |
| --- | --- |
| dev-01–05 | Alice lookup, Alice policy, Bob composed lookup/search, empty search, direct finish |
| dev-06–09 | Wrong tenant, unknown principal, empty question, oversized question; all before proposal |
| dev-10–14 | Invalid JSON, null, array, extra action field, numeric tool |
| dev-15–18 | Refund/deletion forbidden tools; foreign and missing order scope |
| dev-19–22 | Query size/type and final-answer type/size |
| dev-23–25 | One/three-step loops and first-call deadline cancellation |
| dev-26–30 | Minimum proposal, maximum approved amount, exact expiry boundary, modified HMAC, cross-tenant approval |
| held-01–03 | Bob lookup, malicious document/two-result cap, revoked current source |
| held-04–08 | Empty/string actions, missing query/answer, nonexistent alternate scoped resource |
| held-09–10 | Valid first read followed by forbidden action or deadline |
| held-11–14 | Zero/oversized amount, malformed key, cross-tenant proposal |
| held-15–17 | Token bound to another proposal, changed retry arguments, stale resource version |
| held-18–20 | Persisted proposal/approval replay, actual commit-before-socket-timeout then reconciliation, completed replay after expiry |

The report records SHA-256 of the exact dataset bytes. Changing a row invalidates comparison with
previous evidence unless the new digest is recorded. Do not silently tune expected labels until
the report passes. Keep expected labels/rationale outside any future model prompt, and record
such a model's exact prompt/runtime/model provenance separately from this fixture version.
