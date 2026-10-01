# AI/ML and DevOps learning path for backend engineers

This path starts with no AI/ML or DevOps experience and aims at the practical and interview knowledge expected of a backend engineer with about two years of experience. Read the **Beginner** tier first, do the small exercise, then revisit the **Intermediate** and **Expert** tiers when the problem calls for them. The site’s category order follows the steps below.

## AI/ML: from vocabulary to a safe product feature

| Step | Lesson | Demonstrate before moving on |
|---|---|---|
| 1 | [ML fundamentals](content/aiml/07-ml-fundamentals.md) | Explain training versus inference, a simple baseline, data leakage, and why accuracy alone can mislead. |
| 2 | [LLM usage, tokens, and agents](content/aiml/04-llm-parameters.md) | Build a schema-validated classification endpoint; explain model output as untrusted input and why tool calls need authorization. |
| 3 | [Embeddings and vector search](content/aiml/01-embeddings-vector-db.md) | Compare keyword, exact-vector, and approximate-vector search using a small document set. |
| 4 | [RAG](content/aiml/02-rag-architecture.md) | Retrieve authorized, current documents; cite the source; test an unanswerable question and prompt injection in a retrieved document. |
| 5 | [Model serving](content/aiml/03-model-serving.md) | Diagnose whether latency comes from queueing, prefill, generation, a tool, or the network; decide whether managed inference is sufficient. |
| 6 | [Feature stores and MLOps](content/aiml/05-feature-stores.md) | Explain training/serving skew and point-in-time correctness for a prediction feature. |
| 7 | [Recommendations](content/aiml/06-recommendation-systems.md) | Start with a popular-items baseline; trace retrieval, ranking, filtering, impression logging, and online evaluation. |

For daily engineering work, use an AI assistant to explain unfamiliar code, draft tests, or compare options, then verify its claims in code, tests, and primary documentation. For product AI, keep a versioned evaluation set with normal, edge, and adversarial examples. Track quality, schema failures, latency, token use, and cost per accepted result. Restrict tool permissions in application code and require a human or explicit policy for irreversible actions.

**Capstone:** Add a support-ticket classifier to a small Spring Boot API. First implement a keyword baseline. Then integrate a model behind a deadline and a strict label schema, store the accepted label, allow a human correction, and rerun a fixed evaluation set before each prompt/model change. As an extension, retrieve authorized policy documents and return source-backed suggestions without granting the model refund permission.

**Interview rehearsal:** In two minutes, explain the baseline, request path, evaluation set, failure behavior, authorization boundary, and cost/latency trade-off. Then answer what changes if the model is wrong, unavailable, or sees malicious text. State what you would measure rather than claiming a model is “accurate” without a dataset.

## DevOps: from a process on a laptop to a safe release

| Step | Lesson | Demonstrate before moving on |
|---|---|---|
| 1 | [Docker](content/devops/01-docker-fundamentals.md) | Build and run a backend image, map a port, pass configuration, inspect logs, and explain what disappears when a container is replaced. |
| 2 | [CI/CD and deployment](content/devops/04-cicd-pipelines-deployment-strategies.md) | Trace a commit through tests, artifact build, promotion, deployment, health checks, and rollback. |
| 3 | [Nginx reverse proxy](content/devops/03-nginx-reverse-proxy.md) | Trace an HTTP request through the proxy and diagnose a 502 using upstream reachability and logs. |
| 4 | [Kubernetes](content/devops/02-kubernetes-fundamentals.md) | Explain Pod, Deployment, Service, readiness, and a rolling update; inspect a failing Pod before replacing it. |
| 5 | [Cloud and operations](content/devops/05-cloud-native-operations.md) | Read a Terraform plan, scope service identity, trace an error with logs/metrics/traces, and connect a release decision to an SLO. |

**Capstone:** Containerize the same Spring Boot API, build once in CI, run tests, promote the image to a staging deployment, put a reverse proxy in front, and document a rollback. A local Compose or small virtual-machine deployment is enough to learn the flow; Kubernetes is useful when orchestration requirements justify its complexity. Record a failing request’s route, status, trace or request ID, and logs so a teammate can reproduce the diagnosis.

**Interview rehearsal:** Draw the request and deployment paths separately. Explain where secrets enter, what readiness checks, how a bad image is rolled back, and which evidence tells you whether the failure is in the app, proxy, network, or orchestration layer. Give one trade-off for each technology choice.

The lessons link to their primary project or standards documentation where version-sensitive details matter. The Kubernetes Service proxy section and LLM tool-interface section were checked against current upstream docs on October 1, 2026; recheck them when preparing for a later interview or deployment.
