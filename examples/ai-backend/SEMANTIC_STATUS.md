# Paused semantic retrieval implementation — October 24

The user requested committing/pushing completed work and stopping new changes. This branch is a
checkpoint of unfinished implementation, not a released capability. Do not merge it as verified.

The model/protocol/corpus/30-development-case freeze is `aead9e1aed16851f3de672284abb84d77e551a9c`.
The separate independently authored 20-case holdout remains on its own branch and has not been
inspected by the implementer. Preserve that separation until an implementation/evaluation freeze.

Current unfinished files are `semantic_runtime.py`, `SemanticEvaluation.java` and its application
dispatch. The latest Maven package exited successfully in 5.577 seconds **with tests skipped**.
No semantic unit/regression suite, dedicated workflow or actual pgvector semantic evaluation has
been completed. Compilation is not retrieval quality, tenant-isolation or cleanup proof.

An earlier owned preflight observed Ollama 0.32.5, two actual 384-dimensional embeddings and
rejection beyond the configured 256-token context with truncation disabled. Its ignored runtime
receipt binds the runner version used then; it does not verify subsequent cleanup/publication edits.
The owned daemon/cache workspace was removed. Only verified public model blobs remain in ignored
`target/semantic-artifacts` (45,960,996 bytes); they are not committed. The preexisting shared
Ollama service and model store were not changed. No owned live process remains.

Resume only on a new user instruction. Remaining work includes reviewing/testing the current
runner and evaluator, pinned official CI runtime provisioning, actual pgvector/model execution,
frozen-code evaluation against the separate holdout and source-bound sanitized release evidence.
The lexical default and earlier frozen ticket prompts stay unchanged. No production or human
quality claim is made by this checkpoint.
