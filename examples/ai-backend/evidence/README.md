# Local evaluation evidence

The first attempted 7B run (`qwen2.5-coder-16k:latest`, digest
`0533dd01f237c4ef66a5aedc0c7f191fef4bf4484e78e5ff2a984b5121f5441e`) was stopped:
its runner used about 4.9 GiB RSS in a 6.8 GiB WSL instance, leaving insufficient headroom
for concurrent browser verification. Ollama was 0.32.5; CPU was an Intel i5-1135G7 with four
logical CPUs visible to WSL. No complete quality report was produced and no passing score is claimed.
The pre-existing Ollama server was retained; only the experiment's evaluator/model load was stopped.

Future reports checkpoint each completed case atomically and retain `state: running` when interrupted.
Require a complete report and model/runtime provenance before drawing quality conclusions.
