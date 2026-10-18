package com.csfundamentals.aiexample;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

public final class VectorKnowledgeRetrieval implements KnowledgeRetrieval {
    private final KnowledgeStore store;
    private final EmbeddingProvider embeddings;
    private final PgVectorKnowledgeIndex index;
    private final PgVectorKnowledgeIndex.Mode mode;
    private final AtomicBoolean rebuilding = new AtomicBoolean();
    public VectorKnowledgeRetrieval(KnowledgeStore store, EmbeddingProvider embeddings, PgVectorKnowledgeIndex index, PgVectorKnowledgeIndex.Mode mode) {
        if (!embeddings.space().equals(index.space())) throw new IllegalArgumentException("embedding_provider_space_mismatch");
        this.store = store; this.embeddings = embeddings; this.index = index; this.mode = Objects.requireNonNull(mode);
    }
    @Override public Result retrieve(String principal, String question) {
        KnowledgeStore.tenant(principal);
        var status = index.status(principal);
        if (!status.ready()) throw new Unavailable("vector_index_missing_or_stale");
        if (status.chunks() == 0) return new Result(mode == PgVectorKnowledgeIndex.Mode.EXACT ? "pgvector-exact" : "pgvector-ann", List.of());
        var vectors = embeddings.embed(List.of(question));
        if (vectors.size() != 1) throw new EmbeddingProvider.Failure("embedding_invalid_batch");
        return index.search(principal, embeddings.space().validate(vectors.get(0)), mode, 3);
    }
    public PgVectorKnowledgeIndex.Status status(String principal) { return index.status(principal); }
    public PgVectorKnowledgeIndex.Status rebuild(String principal) {
        KnowledgeStore.tenant(principal);
        if (!rebuilding.compareAndSet(false, true)) throw new Unavailable("vector_rebuild_in_progress");
        try {
            long expires = System.nanoTime() + Duration.ofSeconds(30).toNanos();
            var snapshot = store.visible(principal).stream().sorted(Comparator.comparing(KnowledgeStore.Document::id)).toList();
            var chunks = KnowledgeChunks.split(snapshot);
            var vectors = new ArrayList<PgVectorKnowledgeIndex.EmbeddedChunk>();
            for (int offset = 0; offset < chunks.size(); offset += 16) {
                if (System.nanoTime() >= expires) throw new Unavailable("vector_rebuild_deadline");
                var batch = chunks.subList(offset, Math.min(offset + 16, chunks.size()));
                var embedded = embeddings.embed(batch.stream().map(KnowledgeChunks.Chunk::text).toList());
                if (embedded.size() != batch.size()) throw new EmbeddingProvider.Failure("embedding_invalid_batch");
                for (int i = 0; i < batch.size(); i++) vectors.add(new PgVectorKnowledgeIndex.EmbeddedChunk(batch.get(i), embeddings.space().validate(embedded.get(i))));
            }
            if (System.nanoTime() >= expires) throw new Unavailable("vector_rebuild_deadline");
            return index.publish(principal, snapshot, vectors);
        } finally { rebuilding.set(false); }
    }
}
