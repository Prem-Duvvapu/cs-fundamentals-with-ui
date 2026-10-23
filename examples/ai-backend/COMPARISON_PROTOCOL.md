# Controlled ticket prompt comparison: frozen protocol

Prepared October 21, 2026. This is a teaching experiment, not a production release gate.

The task and deterministic extraction validation remain unchanged. The production teaching API
continues using ticket-v1. The experimental ticket-examples-v2 prompt adds explicit definitions and
four independently written examples based on the already-public development task. Both model
variants must use the same installed model/digest, runtime, JSON mode, temperature 0, context/output
limits, request deadline and input cases. Keep prompts/version hashes in the reports.

Development uses the existing 30 public cases. A separate agent authors 20 fresh synthetic cases
without inspecting the candidate or its outputs. Root freezes the candidate source commit before
opening those cases. Authorship by a separate AI agent is not human annotation, a real learner
session, representative sampling or a guarantee against ambiguous labels. Record revisions and
do not silently relabel failures after model results. Once inspected, the new set is regression
data, not a reusable blind benchmark.

Before running, freeze these classroom decision rules:

- Every attempted case remains in the denominator, including schema/provider/deadline failures.
- Compare category, priority and source order ID individually and as an exact three-field match.
  Summary faithfulness and human answer support remain explicitly unassessed.
- A variant needs at least 90% exact field matches and zero unsupported-order-ID rejections to
  meet this narrow automated field gate. The 90% is a declared exercise target, not an empirical
  production requirement or assurance from twenty examples.
- Recommend a candidate only if it meets the gate and improves exact matches over ticket-v1.
  Retain the baseline on a tie; if neither meets the gate, declare that no prompt is acceptable.
- Also run the deterministic rule on the same cases as a no-model task-fit reference. Its review
  cases count as unfinished tasks. A rule's fewer model calls do not erase maintenance/review cost.
- Never automatically change the application's default prompt from a comparison report.
- Record run order and include failed calls in latency. A sequential local run with caching and
  cold-start effects is not a controlled throughput, hosted-price or cost-saving benchmark.
- Raw ticket text, model output, provider messages and credentials cannot enter published reports.
  Keep only stable case IDs/slices, matches, fixed failure codes, versions, hashes and timings.
- Missing usage/billing information stays unknown. Do not derive tokens from characters or
  calculate a price from invented provider rates.

The candidate code commit is the freeze marker. After the separately authored set is opened,
further prompt changes need a new candidate/version and a newly separated evaluation before a
fresh-selection claim. Human review and learned-embedding/retrieval evaluation remain other tasks.

The comparison runner's opt-in cancellation scope also restores both caller handlers and outer
state if the first TERM/INT interrupts normal/error exit. Eight positioned caller/nested signal
subcases preserve the exact caller exception and mask; the full comparison guard suite has
16 tests. These are process/helper checks, not new inference, prompt quality or billing evidence.
