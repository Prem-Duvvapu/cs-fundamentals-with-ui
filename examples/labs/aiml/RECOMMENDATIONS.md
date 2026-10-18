# Build and debug a tiny recommendation pipeline

This runnable Python exercise connects the [recommendation lesson](../../../content/aiml/06-recommendation-systems.md) to actual retrieval, ranking and policy code. Start here after the Beginner tier. You need basic lists, dictionaries and functions; you do not need ML training, a GPU, a vector database or a paid API.

The five items, two-dimensional vectors, click/purchase probabilities and relevance grades are **original authored fixtures**. The program computes exact cosine similarities and a business score from these numbers. It does not train a two-tower model, generate real embeddings, run approximate nearest-neighbour (ANN) search, establish calibrated probabilities or demonstrate live product quality.

## Run it

Use Python 3.10 or newer. Verified with Python 3.13; the standard library is sufficient. From the repository root:

```bash
python3 examples/labs/aiml/recommend.py
python3 -m unittest discover -s examples/labs -p 'test_recommendations.py' -v
```

The first command prints a JSON report. The second runs seven tests. No files, servers, external connections or persistent state are created; each run starts with fresh fixtures, so no reset step is needed.

Expected observations:

| Case | Candidates | Final selection | Meaning |
|---|---|---|---|
| Retrieval K=2 | a, b | b, a | Ranker prefers b, but cannot see c |
| Retrieval K=3 | a, b, c | c, b | Larger candidate pool makes c available |
| b becomes ineligible | a, b | a | Current metadata defeats stale index membership |
| Retrieval unavailable; b consumed | Editorial b, e | e | Fallback uses the same eligibility/history rules |
| Cold item d | Not indexed | Not selected | A high score is useless without candidate membership |

## Trace the numbers

For user vector `(1, 0)`, cosine similarity orders indexed items `a`, `b`, `c`, `e`. The implementation exhaustively compares every vector; an ID tie breaks alphabetically so replay is deterministic. Unlike the lesson's separate raw dot-product arithmetic example, this program normalizes through the cosine denominator.

`rank()` hydrates candidates from the **current catalog**, drops missing/ineligible/already-consumed items, and sorts by authored expected margin:

```text
score = p(click | impression) * p(purchase | click) * margin
    a = .16 * .08 * 25 = .32
    b = .12 * .20 * 15 = .36
    c = .20 * .50 * 20 = 2.00
```

Multiplication represents expected margin only under the stated conditional funnel and suitable calibration. Here these are invented probabilities for tracing arithmetic, not predictions learned from outcomes. Even a calibrated score would omit satisfaction, returns and long-term retention unless the objective addressed them.

`select()` checks the catalog again, removes duplicates and consumed items, and caps each creator at one item. It permits a short or empty list rather than padding with forbidden items. This sequential recheck illustrates policy enforcement; it does not atomically reserve inventory or prevent a change after the final read in a real concurrent service.

## Measure retrieval and ranking separately

The authored relevance judgments are `c: 3`, `b: 2`; other items have grade zero for this exercise. The relevance set is therefore `{b, c}`. It describes this illustrative user's judgments, not ground truth collected from actual users.

- With retrieval K=2, candidate Recall@2 is `1/2 = .5`; with K=3, Recall@3 is `2/2 = 1`.
- Ranking NDCG@2 is approximately `.337352` for `[b, a]`, and `1` for `[c, b]`.
- These comparisons change candidate K while keeping the final metric cutoff at 2. They explain a pipeline mechanism, not an improvement established by a trained-model benchmark or A/B experiment.

NDCG divides discounted cumulative gain by the best possible gain from the **whole judgment set** at the requested cutoff. Gain is `2**grade - 1`, discounted by `log2(position + 2)` for zero-based positions. The ideal at cutoff 2 is `[c, b]`, even if the service returns only one item. Computing the ideal from returned-list length would hide the missing second recommendation.

`recall_at_k()` rejects an empty relevance set; `ndcg_at_k()` rejects a judgment set with no positive gain. These cases are undefined for this lab rather than perfect scores. An empty result against defined positive judgments scores zero. Duplicate result IDs are rejected to prevent double-counting. Nonpositive/noninteger cutoffs, nonfinite vectors or grades, and invalid authored probabilities are rejected. Grades are deliberately bounded to 0–30 for this small teaching utility; it is not a general benchmark library. Missing judgments are treated as grade zero here, a simplifying assumption that is unsafe for incompletely judged production catalogs.

## Predict, change and debug

1. **Predict:** With K=2, can raising c's margin to 100 move it into the final list? **Answer:** No. Retrieval supplies only a and b. The ranker cannot inspect c until a candidate source supplies it.
2. **Change:** In `fixtures()`, change b's creator to `creator-x`, matching a. **Answer:** K=2 now returns only b because the creator cap excludes a. The list stays short; the cap is a hard rule. Increase candidate K deliberately if you want more eligible options, and inspect the recall/cost trade-off.
3. **Debug:** Item d has the highest authored score but no impressions. **Answer:** Check candidate membership before modifying the ranker. Add `index['d'] = (1, 0)` in a local experiment; d becomes a candidate and ranks first. In production, investigate ingestion, embedding/index compatibility, filters and source counts; adding an invented vector is not a valid production cold-start solution.
4. **Break a dependency:** Pass `retrieval_available=False` to `recommend()`. **Answer:** Source becomes `editorial-fallback`; consumed b is still excluded. Marking e unavailable then returns an empty list. Source attribution makes degraded operation visible instead of silently crediting the main ranking path.

## Interview checkpoint

Explain why “better ranker” cannot repair a missing candidate; distinguish retrieval recall from final ordering quality. Then explain why a recommendation response can be HTTP-successful while unhealthy: blocked-item leakage, stale metadata, narrowed creators or most traffic on fallback. Name the evidence you would collect before changing the model.

Production follow-ups remain outside this exercise: learned representations and ranking, approximate-index recall/latency, authenticated-user/tenant policy, independent judgment collection, exposure/position bias, propensity logging, controlled exploration, real deadlines/circuit breakers, stage telemetry and randomized online outcome validation. The canonical lesson explains these mechanisms; this lab proves only the small deterministic calculations and constraints above.
