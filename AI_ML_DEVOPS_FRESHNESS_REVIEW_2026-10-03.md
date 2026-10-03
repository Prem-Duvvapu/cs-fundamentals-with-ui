# AI/ML and DevOps freshness review — October 3, 2026

The seven AI/ML and five DevOps lessons have received a complete scoped technical review,
including their model interview answers, worked examples and diagrams. This closes the
twelve-lesson freshness queue after the [56 core reviews](CORE_ACCURACY_COMPLETION_2026-10-03.md).
All **68 registered lessons** now have a scoped review; this is not a certification of
every provider/version combination, workload performance or learner comprehension.

The learning sequence remains beginner → intermediate → expert, with concrete examples
for a backend engineer starting without AI/ML or DevOps knowledge. All existing question
prompts remain unchanged. The corpus has **33,450 lines, 295 diagrams, 953 interview
questions and 56 authored rubrics**. Six diagram sources changed; both theme assets were
regenerated. The remaining 897 answers still use the deck's general self-assessment guidance.

## Review steps and scope

1. Read each complete lesson, its examples and all interview answers.
2. Check version-sensitive contracts against primary project documentation on this date.
3. Replace incorrect guarantees, unsupported benchmark claims and ambiguous denominators.
4. Add small prediction exercises where they clarify a difficult distinction.
5. Preserve question identity, tier headings and topic registration; correct diagrams when
   they teach the wrong mechanism rather than preserving a false visual for cache convenience.
6. Execute applicable arithmetic, Python and PostgreSQL examples; check rendering, parsing,
   content coverage, migration evidence and both diagram themes.
7. Record exactly what was demonstrated and what still needs a live environment or real learner.

## AI/ML findings and corrections

| Lesson | Corrections and clearer teaching examples | Primary evidence |
|---|---|---|
| [ML fundamentals](content/aiml/07-ml-fundamentals.md) | Entity/time split depends on intended deployment. ROC AUC gives ties half credit. A 100-ticket confusion matrix contrasts a useful classifier with a high-accuracy always-negative baseline. Transformer training parallelism differs from autoregressive decoding; FlashAttention avoids materializing the full matrix without removing dense attention's pairwise arithmetic. MAE is an average, not a median. | [Evaluation definitions](https://scikit-learn.org/stable/modules/model_evaluation.html), [leakage guidance](https://scikit-learn.org/stable/common_pitfalls.html), original [FlashAttention paper](https://arxiv.org/abs/2205.14135). |
| [Embeddings/vector search](content/aiml/01-embeddings-vector-db.md) | Cosine measures direction, not vector equality or calibrated relevance. Exact search need not sort the entire corpus. HNSW has no universal logarithmic work, fixed latency or guaranteed exact filtered results. Correct raw-vector/PQ storage scope and squared-L2 lookup arithmetic. Shortened embeddings require model support. Use pgvector bounded iterative scans and Qdrant's current query API. Measure product relevance separately from ANN overlap. | [pgvector](https://github.com/pgvector/pgvector), current [Qdrant client source](https://github.com/qdrant/qdrant-client/blob/master/qdrant_client/qdrant_client.py), [Qdrant filtering](https://qdrant.tech/documentation/search/filtering/). |
| [RAG](content/aiml/02-rag-architecture.md) | “At least one relevant passage” is hit rate, not general multi-passage recall. Apply authorization before text leaves the boundary for reranking/context; retain permission/version checks for parents, citations and cache reuse. Work through current authorized, other-tenant and withdrawn policies. Faithfulness assessment does not guarantee source truth or prevent hallucination. Complete version publication needs an actual gate. | [Ragas recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/), [faithfulness](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/), [Azure retrieval access control](https://learn.microsoft.com/en-us/azure/search/search-query-access-control-rbac-enforcement). |
| [LLM parameters/tools](content/aiml/04-llm-parameters.md) | Sampling controls are not universal across model families. Top-p concentration is not confidence. Reasoning may consume charged output budget without visible text. An invented-rate calculation yields $5.60 per 1,000 attempts and $0.007 per accepted result at 800 acceptances. MCP defines interfaces and transport authorization but does not supply business authorization; enforce token audience and action scope. | [Claude thinking](https://platform.claude.com/docs/en/build-with-claude/thinking), [tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), [MCP server specification](https://modelcontextprotocol.io/specification/2026-07-28/server), [MCP security guidance](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices). |
| [Serving](content/aiml/03-model-serving.md) | Count retained input plus generated tokens in KV memory; demonstrate MHA versus GQA. Separate model context/output limits and client/server timing boundaries. The example request is an application-owned contract, not an invented provider API. Exact speculative algorithms preserve a distribution under assumptions, not an identical sampled trace. Prefix reuse saves prefill, not all generation; isolate cache trust groups. Note TGI maintenance status. | [vLLM speculation](https://docs.vllm.ai/en/latest/features/speculative_decoding/), [prefix-cache design](https://docs.vllm.ai/en/latest/design/prefix_caching/), [TGI documentation](https://huggingface.co/docs/text-generation-inference/index). |
| [Feature stores/MLOps](content/aiml/05-feature-stores.md) | Event-time lookup and actual serving replay are different contracts. A 09:55 event available at 10:08 cannot describe serving at 10:00. Use a portable window-query excerpt with explicit availability and deterministic tie-breaking. Stage p99 values do not add into endpoint p99. Declare PSI zero-bucket smoothing and renormalization. Shadow work can affect capacity and writes. | [Feast point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins), [source timestamps](https://docs.feast.dev/reference/data-sources/overview), [MLflow registry](https://mlflow.org/docs/latest/ml/model-registry/). |
| [Recommendations](content/aiml/06-recommendation-systems.md) | Separate exact-neighbor overlap from task relevance. Explain score magnitude and non-probabilistic dot products. Eligibility constraints override a higher expected margin; filtering inventory does not reserve it. A/B assignment, interference and off-policy support matter. Latency allocations are plans, not sums of measured percentiles. | Original [YouTube recommendation paper](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/), [TensorFlow retrieval tutorial](https://www.tensorflow.org/recommenders/examples/basic_retrieval), [serving tutorial](https://www.tensorflow.org/recommenders/examples/efficient_serving). |

## DevOps findings and corrections

| Lesson | Corrections and clearer teaching examples | Primary evidence |
|---|---|---|
| [Docker](content/devops/01-docker-fundamentals.md) | Limits require configuration; namespaces do not hide configured mounts/network access. Current image-store default differs from legacy overlay2. Refresh supported image examples and label size comparisons illustrative. Publish locally on loopback. Supply Compose database initialization and a health-gated dependency. Local volumes need transfer/shared storage for portability; tmpfs can swap. UID 0, rootless privilege limits, stop signals, OOM evidence and orphan versus living-parent reaping are qualified. Push an image, not a container. | [Engine image store](https://docs.docker.com/engine/storage/containerd/), [resource controls](https://docs.docker.com/engine/containers/resource_constraints/), [tmpfs](https://docs.docker.com/engine/storage/tmpfs/), [Compose readiness](https://docs.docker.com/compose/how-tos/startup-order/), [rootless](https://docs.docker.com/engine/security/rootless/), [PID namespaces](https://man7.org/linux/man-pages/man7/pid_namespaces.7.html). |
| [Kubernetes](content/devops/02-kubernetes-fundamentals.md) | Correct 10-replica/25% surge from two to **three**. Default unavailable capacity can permit old-Pod removal before equivalent new availability; readiness is not a no-outage guarantee. CPU requests affect runtime weight and the HPA denominator. Explain real node-failure detection/eviction, partitioned-writer fencing, configurable Service exposure, metrics/bounds and pending capacity. Keep version-scoped Service-proxy and restart-backoff facts. | [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), [resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/), [HPA algorithm](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/), [Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/). |
| [Nginx](content/devops/03-nginx-reverse-proxy.md) | For an empty bucket and 25 exactly simultaneous requests, burst=20 permits one plus 20 excess requests and rejects four; this is not a ten-request fixed-window allowance. Response buffering need not wait for the complete response. Read timeout is inactivity, not total duration. Cache freshness has eligibility/headers/eviction conditions. Forwarded headers require a trusted chain. Graceful reload and retry do not guarantee no interruptions or safe repeated writes. | [Limiter reference](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html), [limiter implementation](https://github.com/nginx/nginx/blob/master/src/http/modules/ngx_http_limit_req_module.c), [proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html), [reload](https://nginx.org/en/docs/control.html), [upstream state](https://nginx.org/en/docs/http/ngx_http_upstream_module.html), [HTTP core](https://nginx.org/en/docs/http/ngx_http_core_module.html). |
| [CI/CD](content/devops/04-cicd-pipelines-deployment-strategies.md) | Scope the example to local validation rather than an unauthenticated registry push on every event; set Node explicitly, reduce permissions and separate trusted publication. Source tags are mutable; record digest/provenance. Rolling updates also expose real traffic, canaries add deliberate measured exposure. Blue-green routing and flags do not undo completed effects. npm caching does not skip installation. Git is desired-state history, not a complete observed-deployment audit. Inconclusive metrics do not prove success. | Current [checkout](https://github.com/actions/checkout) and [Node setup](https://github.com/actions/setup-node), [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use), [OpenGitOps](https://opengitops.dev/), [Argo analysis](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/). |
| [Cloud operations](content/devops/05-cloud-native-operations.md) | Terraform is normally invoked, not an automatic continuous controller. State binds resources; saved plans and sensitive flags do not guarantee safe execution or encrypted files. Explain native S3 lock files and deprecated DynamoDB locking. Managed platforms can meet multi-host needs without self-managed Kubernetes. Shared responsibility depends on service. Aggregate compatible histograms, do not average p99s; nested spans are not additive or proof of root cause. HPA can request unschedulable replicas. | [Terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan), [sensitive data](https://developer.hashicorp.com/terraform/language/manage-sensitive-data), [S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3), [OpenTelemetry propagation](https://opentelemetry.io/docs/concepts/context-propagation/), [Prometheus histograms](https://prometheus.io/docs/practices/histograms/). |

## Version boundaries

- Docker Engine **29+ fresh installations** default to the containerd image store;
  upgrades can retain legacy storage. Rootful user-namespace remapping is optional.
- Example images use Node **24**, Go **1.27** and Alpine **3.24** maintained lines;
  [Go downloads](https://go.dev/dl/) and [Alpine support](https://alpinelinux.org/releases/)
  were checked. These are explanatory excerpts, not a claim that the repository contains
  their npm/Go application inputs or that their image sizes were benchmarked.
- Kubernetes current documentation exposes **1.37**. Its default Linux proxy remains
  iptables; restart delays can change with feature gates and kubelet configuration.
- pgvector **0.8.0+** supplies iterative scans; bounded strict ordering does not establish
  exact nearest-neighbor recall. Qdrant client excerpts use `query_points(...).points`.
- MCP server discussion is checked against **2026-07-28**. Business-action permission
  remains an application responsibility even when transport authorization is correct.
- GitHub's current action READMEs show checkout/setup-node **v7**. Lesson tags are readable
  references; a real deployment should pin reviewed action SHAs and meet runner requirements.
- Prices, model rankings and latency figures are not asserted to be current market benchmarks.
  The cost example explicitly uses invented rates; API capabilities require provider/model checks.

## Reproducible verification

The [lab guide](examples/labs/README.md) includes prediction → run → explain → change steps.

- Six new Python checks, plus the two existing OS/network checks, pass: binary confusion
  metrics, tied/reversed ROC AUC, invalid inputs and multi-passage recall versus hit rate.
  The fixture uses synthetic labels and no model/network/paid API.
- PostgreSQL **16.15** passes four feature-availability assertions: 0.18 serving replay
  versus 0.32 corrected event history, retained NULL when missing, and 0.45 timestamp-tie
  resolution. The transaction rolls back; CI executes the same fixture in its labs job.
- Independent arithmetic checks pass for 61.44 GB raw vector storage, MHA/GQA KV memory,
  25% rollout rounding, HPA's simplified recommendation and invented-rate accepted cost.
  Python lesson excerpts parse; this does not claim their external SDK/server execution.
- All twelve original question-prompt sets and diagram counts are preserved. Six corrected
  diagram sources generate twelve changed theme SVGs plus the updated manifest.
- Backend: **60 tests pass**. The **109/109** simulator migration gate passes.

Reader/Markdown/interview parsing: **223 tests pass**, including every lesson and all
56 rubric blocks. The **295-entry/590-asset** manifest check and browser decode pass;
the production frontend build and two diagram-character-set regression tests pass.
The final content gate passes all **68 lessons, 83 mappings and 295 real Mermaid sources**.
The PostgreSQL fixture contains the exact window query from the feature-store lesson.
The prior feedback package's [push run](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/actions/runs/37109023971)
and [PR run](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/actions/runs/37109007093)
both pass all jobs; they are baseline evidence, not verification of this new package.

## Still required for the broader learning roadmap

1. More question-specific rubrics and guided exercises, prioritized by difficult concepts.
2. Live AI/DevOps capstones with declared versions, dependencies, budgets and safe failure tasks;
   no Qdrant/Feast/vLLM/Kubernetes/Terraform workload execution is claimed by this source pass.
3. Real participant sessions using [the usability study protocol](LEARNER_USABILITY_STUDY.md).
   Automated checks and authored personas do not demonstrate actual beginner understanding.
4. Periodic rechecks of upstream defaults and model/tool contracts; a dated review is not an
   indefinite “latest” guarantee. Actual Nginx burst arrivals vary from the idealized source trace.
