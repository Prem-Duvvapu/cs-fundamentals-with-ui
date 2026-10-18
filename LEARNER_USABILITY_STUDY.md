# Formative learner study

Status: protocol prepared; no real learner session has been conducted or claimed. Automated browser
checks establish mechanical behavior, not comprehension. Use this study after the reviewed branch
is running. Invite a basic-programming beginner and an experienced backend candidate initially;
five to eight participants can reveal formative problems, without a statistical completeness claim.

## Conduct a session

1. Explain that the product is being tested, not the person. Obtain consent to record observations;
   record only anonymized participant codes, and do not publish answers/recordings without permission.
2. Let the learner choose light/dark theme, text size, keyboard or pointer. Record their environment.
3. Ask the tasks below one at a time. Do not explain the path first; observe confusion and recovery.
4. Ask the learner to think aloud and explain why an action/result makes sense. Distinguish correct
   reasoning from recognition after opening a model answer.
5. Stop a task if the learner is stuck; record the barrier and assistance. Avoid grading confidence as mastery.
6. Ask for one changed example and one next-day recall check. Use those results to revise the lesson or flow.
7. Retest the changed task with another learner or a new variation. Preserve failures in the report.

| Task | Prompt | Evidence to collect |
|---|---|---|
| Start Java | Find an appropriate starting point and explain prerequisites. | Starting choice, missing vocabulary, unprompted navigation. |
| Explain references | Predict what changes when two variables refer to one object; change one alias. | Initial reasoning and transfer to the changed example. |
| Trace Spring | Run a POST and explain controller/service/transaction/repository boundaries. | Successful run, setup errors, explanation of the returned state. |
| Diagnose failure | Compare checked/default rollback with an explicit rollback rule. | Prediction before observation; whether exception means rollback. |
| Protect data | Show a CSRF rejection and another owner's project rejection. | Distinguishes identity, role, ownership and CSRF. |
| Query correctness | Predict Ada's joined order total and repair payment fan-out. | Identifies the query grain and explains the corrected total. |
| Review later | Record an attempt, change its review date, export/import, revisit the exact question. | Draft/history preservation and understanding of selection reasons. |
| Reader access | Use keyboard and zoom to find a subsection, reveal an answer and compare attempts. | Visible focus, blocked control, overflow, loss of context. |

## Observation record

Copy one record per participant; do not fill it with synthetic success data.

- Participant code / experience band:
- Date / environment / app commit:
- Task / completion unaided, assisted, blocked:
- Time to find the action (observation, not an automatic success threshold):
- Explanation before revealing the answer:
- Changed-example explanation:
- Navigation or vocabulary barrier:
- Assistance provided:
- Suggested correction / owner / retest task:
- Next-day recall observation:

## Synthesis and closure

Group repeated barriers by task, not by participant. Report counts with the small sample size,
including failures and contradictory preferences. Prioritize blocked access, incorrect conceptual
models, lost work and unclear next steps. Mark the learner-validation item complete only after
real observations have informed a revision and the changed task has been retested. A prepared
protocol, an automated axe pass or an AI-generated persona does not close it.

## AI beginner and backend practice extension — October 18

This adds the practical AI plan's real-person acceptance tasks. Status remains **not run**.
Use at least one person with no AI background and one backend engineer; record actual experience
rather than assigning a generated persona. An engineer can be new to AI too. Do not infer that a
successful command proves an explanation was understood.

Start the AI beginner at [the vocabulary and tiny training example](docs/BACKEND_AI_LEARNING_PATH.md),
then let them find the next step without facilitator directions. Use a 30–45 minute session;
choose one explanation, one build/run and one debugging task rather than rushing through all rows.
Ask for an initial prediction before opening a solution. Record which prerequisite was missing.
Use synthetic inputs and existing fixture mode; a paid API or model download is not necessary.

| Task | Ask the participant | Independent observation / transfer check |
|---|---|---|
| AI vocabulary | A rule checks words, a model was trained yesterday, and a ticket arrives today. Which step changes learned parameters? | Distinguishes training from inference; new ticket does not automatically train the model. Ask what changes when a prompt is edited. |
| Evaluation | Of three proposed escalations, two were correct; three tickets actually needed escalation. Explain precision and recall. | Both equal 2/3 here for different reasons. Change the actual-needed count to four; recall becomes 2/4 while precision stays 2/3. |
| First AI boundary | Run Project A's fixture, trace one request and explain why a well-formed invented order ID is rejected. | Separates parsing, schema, source-ID checks and ownership. Ask why a source ID still does not authorize a refund. |
| RAG diagnosis | A tenant receives no answer even though a similar document exists. What evidence would you inspect first? | Checks principal/ACL, ingestion/version/filter and retrieval before changing a prompt. Does not remove tenant filtering to improve recall. |
| Partial stream | Observe a fixture that emits text and closes without a final marker. Is it safe to call this a finished answer or a free request? | Keeps incomplete status and unknown usage. Ask why cancel does not prove remote work stopped. |
| Durable action | A response times out after a committed action. Explain what a retry should inspect. | Looks up durable operation/receipt binding before retrying; distinguishes idempotency from blanket exactly-once claims. |
| Performance reasoning | A small local run has a lower average but more failed requests. Should it replace the baseline? | Keeps failures in denominators, inspects tail latency and load/resource assumptions; does not infer production capacity. |

Use the existing observation record for each chosen task. Keep original reasoning separate from
post-hint answers. Add the exact lesson/guide commit, command attempted, error observed and the
participant's changed-example explanation. Do not store personal data, credentials, raw private
work tickets or recordings in the repository.

The facilitator may clarify task wording, but should record a hint as assistance. Once a specific
barrier is found, revise the owning explanation or navigation, link the actual change and run a
fresh variation. Record next-day recall where feasible. Completion needs explain/build/debug
observations and a real revision/retest; a prepared protocol or passing fixture is insufficient.

Related access work uses [the manual accessibility journey](docs/MANUAL_ACCESSIBILITY_PROTOCOL.md).
