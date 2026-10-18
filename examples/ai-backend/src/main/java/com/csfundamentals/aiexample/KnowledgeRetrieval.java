package com.csfundamentals.aiexample;

import java.util.*;

public interface KnowledgeRetrieval {
    record Evidence(KnowledgeStore.Document document, String citation, String text) {}
    record Result(String method, List<Evidence> sources) {
        public Result { sources = List.copyOf(sources); }
    }
    Result retrieve(String principal, String question);
    final class Unavailable extends RuntimeException {
        public Unavailable(String code) { super(code); }
    }
    static KnowledgeRetrieval lexical(KnowledgeStore store) {
        return (principal, question) -> {
            var terms = KnowledgeService.terms(question);
            var sources = store.visible(principal).stream()
                    .filter(doc -> !Collections.disjoint(terms, KnowledgeService.terms(doc.title() + " " + doc.text())))
                    .sorted(Comparator.<KnowledgeStore.Document>comparingLong(doc -> KnowledgeService.terms(doc.title() + " " + doc.text()).stream().filter(terms::contains).count()).reversed()
                            .thenComparing(KnowledgeStore.Document::id)).limit(3)
                    .map(doc -> new Evidence(doc, doc.citation(), doc.text().substring(0, Math.min(1200, doc.text().length())))).toList();
            return new Result("lexical-baseline", sources);
        };
    }
}
