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
