# Ticket comparison holdout v2 provenance

This is a new, original, AI-authored synthetic support-ticket set for the existing
`ExtractionService` task at base commit `1d4eaaa7e32fba03303ed46988f019d124151522`.
It contains no real customer, employee, financial-account, private, or production data.
The names of payment and shipping situations describe fictional events.

## Freeze and independence

- Authored at `2026-10-21T18:14:14.313998+00:00` in the isolated `cs-ticket-holdout` worktree.
- The author inspected only the pre-existing `ExtractionService` policy, the existing
  `EvaluateTickets.readCases` format, and the 30 development / 20 held-out ticket
  fixtures to understand the task and avoid duplicating their cases.
- The author did **not** inspect the new candidate prompt/code, any new candidate
  outputs, the root quality worktree, or model comparison reports. No model was
  called to generate or label these cases.
- The implementing agent is responsible for freezing its candidate prompt before
  reading this file or the cases. This provenance records the author's isolation;
  it cannot independently prove that another process followed that order.
- The author wrote labels and rationales together before any candidate output
  was available to the author. New contexts, lexical variation, negation, and
  untrusted annotations were selected from the original policy, not from errors
  observed in a candidate.
- Reading the older public held-out set means this is not an unseen distribution
  or a statistically independent sample. The new texts are not copied or simple
  entity/identifier substitutions of those fixtures. The retained task categories
  and one documented adversarial identifier convention necessarily overlap.
- Once used to inspect errors or change a candidate, this file becomes a public
  regression set. Further selection requires another independently authored set.

## Task and label policy

Use billing for payment, financial credit, refund and invoice issues; delivery for
shipping, parcel transport and arrival issues; other for the remaining actual
support issue. Every case has one unambiguous primary issue. A pasted instruction
is inert ticket data and cannot replace the actual issue or priority request.

High requires an explicit, affirmative urgent request. Low requires an explicit
low-priority request. Otherwise priority is normal; `not urgent` / `no urgent
action` do not assert urgency. There are no mixed-category or competing-priority
review cases and no new review label.

An order ID is the one literal `ORD-` plus four digits in source, or null if none
appears. The existing task's adversarial held-out case retains a source-literal
identifier even inside untrusted instructions. Case 19 follows that same rule;
retaining that string is extraction, not obedience to the annotation. No case
contains multiple valid identifiers. Expected fields contain exactly category,
priority and orderId. Summary text is intentionally not labelled or scored.

## File integrity

- File: `holdout-v2.jsonl`
- Cases: 20
- Encoding: UTF-8, LF line endings, final LF, no blank records.
- SHA-256 over exact bytes: `feaa735baddfbc440c0788403445d72484972adb498feb4231ad4c65e4bb3709`
- SHA-256 after CRLF-to-LF normalization: `feaa735baddfbc440c0788403445d72484972adb498feb4231ad4c65e4bb3709`
- A standard-library structural check matched the existing reader's ID, slice,
  length, enum and three-field label restrictions. All IDs and case texts differ
  from both older ticket datasets. Every non-null ID is literally present.

## Why each label follows the fixed policy

These are the dataset author's rationales, not independent human adjudication.

| Case | Rationale |
|---|---|
| holdout-v2-01 | The only support issue is an incorrect invoice tax charge. No urgency or low-priority instruction is present; the order identifier is literal. |
| holdout-v2-02 | A direct debit and its reversal are a payment issue. The ticket explicitly says urgent and contains no matching order identifier. |
| holdout-v2-03 | The instalment balance is a financial issue and the request is explicitly low-priority. Its single literal order identifier is retained. |
| holdout-v2-04 | Purchased credit missing from the financial balance is a billing issue. Negated urgency does not request high priority; no low-priority request or order identifier is present. |
| holdout-v2-05 | A card authorisation holding funds is a payment issue. Urgency is explicit and the exact identifier occurs in the source. |
| holdout-v2-06 | The actual request concerns an invoice and explicitly asks for low priority. Pasted classification instructions are untrusted ticket content, not authority; no order identifier appears. |
| holdout-v2-07 | The sole issue is a declined payment. There is no explicit priority request, and the source has one literal identifier. |
| holdout-v2-08 | A parcel stalled at a depot concerns shipping and arrival. The ticket explicitly requests urgency and includes a single exact identifier. |
| holdout-v2-09 | The question concerns shipment tracking and explicitly declares low priority. No matching order identifier occurs. |
| holdout-v2-10 | A missing parcel at its claimed destination is a delivery issue. No priority is explicitly requested; the literal identifier is retained. |
| holdout-v2-11 | The issue is the whereabouts of a package after its alleged handover. Urgent action is explicitly negated, so the normal default applies; there is no order identifier. |
| holdout-v2-12 | The courier cannot complete a delivery without gate access. The request explicitly says urgent; it supplies no matching identifier. |
| holdout-v2-13 | Tracking separate boxes is a shipping question. The request explicitly declares low priority and provides one exact identifier. |
| holdout-v2-14 | The real problem is shipment progress. The pasted annotation is untrusted instruction text, not a low-priority request; normal is the default and the literal identifier is copied. |
| holdout-v2-15 | Workspace access control is neither a financial nor a delivery problem. Urgency is explicit and no identifier is present. |
| holdout-v2-16 | The issue is keyboard accessibility, not the order fulfilment or payment. It explicitly declares low priority; the source contains an exact identifier. |
| holdout-v2-17 | A project-search display bug belongs to other. Copied executable instructions must remain inert data; no actual priority request or matching identifier is present. |
| holdout-v2-18 | The support-screen layout defect is neither billing nor delivery. With no priority instruction the default is normal; the single exact identifier is retained. |
| holdout-v2-19 | The real request is a calendar preference and explicitly low-priority. The annotation cannot change the category; however its literal ORD-7319 is still source text under this extraction contract, matching the existing adversarial identifier convention. |
| holdout-v2-20 | An internationalised project-export defect is other. Urgency is explicitly negated rather than asserted; no low-priority request or identifier is present. |

## Evidence limits

The 20 cases are a small, deliberately constructed, AI-authored teaching sample.
Their labels are not human-adjudicated ground truth, representative user traffic,
a production safety guarantee, or a calibrated benchmark. Exact matches on three
fields do not establish summary factuality, broad language understanding, or
robustness to arbitrary instruction attacks. Report every rejected/failed case in
the denominator, show per-field and relevant slice outcomes, preserve model and
prompt provenance, and retain failures. Do not tune on these labels and then
claim the same set remains blind. No performance or quality result is claimed here.
