package com.csfundamentals.aiexample;

import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import static org.junit.jupiter.api.Assertions.*;

class RetrievalEvaluationTests {
    private final Path fixtures = Path.of("fixtures/rag");
    private EvaluateKnowledge.Dataset data(String split) throws Exception {
        return EvaluateKnowledge.read(fixtures.resolve("corpus-v1.json"), fixtures.resolve(split + "-v1.jsonl"));
    }
    @Test void authoredSplitsHaveDisjointIdsAndEachCaseExecutesRealRetrieval() throws Exception {
        var dev = data("development"); var held = data("held-out");
        assertEquals(30, dev.cases().size()); assertEquals(20, held.cases().size());
        var ids = new HashSet<String>();
        for (var dataset : List.of(dev, held)) for (var row : dataset.cases()) {
            assertTrue(ids.add(row.path("id").asString()));
            var result = EvaluateKnowledge.evaluate(dataset, row, null);
            assertEquals(row.path("id").asString(), result.get("id"));
            assertTrue(((Number) result.get("retrievalMs")).doubleValue() >= 0);
            assertTrue(((Number) result.get("totalMs")).doubleValue() > 0);
        }
    }
    @Test void retrievalMissAndWrongGenerationHaveDifferentEvidence() throws Exception {
        var dev = data("development");
        var miss = EvaluateKnowledge.evaluate(dev, dev.cases().stream().filter(row -> row.path("id").asString().equals("dev-paraphrase")).findFirst().orElseThrow(), null);
        assertEquals(0.0, miss.get("recallAt3")); assertEquals(false, miss.get("expectedFactsMatch"));
        var wrong = EvaluateKnowledge.evaluate(dev, dev.cases().stream().filter(row -> row.path("id").asString().equals("dev-wrong-answer")).findFirst().orElseThrow(), null);
        assertEquals(1.0, wrong.get("recallAt3")); assertEquals(false, wrong.get("expectedFactsMatch"));
        assertEquals("answer", wrong.get("outcome")); assertEquals(1.0, wrong.get("citationPrecision"));
        assertEquals("injected-fault", wrong.get("generationEvidence"));
    }
    @Test void emptyRetrievalAbstainsWithoutCallingModel() throws Exception {
        var dev = data("development");
        var row = dev.cases().stream().filter(value -> value.path("id").asString().equals("dev-no-evidence")).findFirst().orElseThrow();
        var result = EvaluateKnowledge.evaluate(dev, row, prompt -> { fail("Must not call model for empty retrieval"); return null; });
        assertEquals("abstain", result.get("outcome")); assertEquals(true, result.get("expectedFactsMatch"));
        assertEquals(0, result.get("modelCalls")); assertEquals("not-called", result.get("generationEvidence"));
        assertNull(result.get("recallAt3")); assertEquals(List.of(), result.get("retrieved"));
    }
    @Test void rejectedCitationProviderFailureAndRevocationStayDistinct() throws Exception {
        var dev = data("development");
        var expected = Map.of("dev-bad-citation", "invalid-answer", "dev-provider-down", "provider-error", "dev-revoke", "rejected-source");
        for (var row : dev.cases()) if (expected.containsKey(row.path("id").asString())) {
            var result = EvaluateKnowledge.evaluate(dev, row, null);
            assertEquals(expected.get(row.path("id").asString()), result.get("outcome"));
            assertEquals(true, result.get("outcomeMatches")); assertEquals(false, result.get("expectedFactsMatch"));
        }
    }
    @Test void metricsUseRankAndFailureInclusiveFactDenominators() {
        var answer = new KnowledgeService.Answer("14 days", List.of("refund:v1"), "fixture");
        var good = RetrievalEvaluation.score(List.of("refund:v1", "shipping:v1"), List.of("noise:v1", "refund:v1"), answer.citations(), List.of("14 days"), List.of("99 days"), false, answer);
        assertEquals(0.5, good.get("recallAt3")); assertEquals(0.5, good.get("reciprocalRankAt3"));
        good.put("slice", "normal"); good.put("outcomeMatches", true);
        var failed = RetrievalEvaluation.score(List.of("refund:v1"), List.of(), List.of(), List.of("14 days"), List.of(), false, null);
        failed.put("slice", "failed"); failed.put("outcomeMatches", false);
        var summary = RetrievalEvaluation.summarize(List.of(good, failed));
        assertEquals(0.25, summary.get("recallAt3")); assertEquals(0.5, summary.get("expectedFactsMatchRate"));
        assertEquals(2, summary.get("recallAt3Denominator"));
        good.put("modelMs", 10.0); failed.put("modelMs", 100.0);
        assertEquals(100.0, RetrievalEvaluation.summarize(List.of(good, failed)).get("modelMsP95"));
        assertNull(RetrievalEvaluation.summarize(List.of()).get("expectedFactsMatchRate"));
    }
    @Test void malformedOrUnauthorizedLabelsFailBeforeModelCalls(@TempDir Path temp) throws Exception {
        var dev = data("development");
        Path cases = temp.resolve("cases.jsonl");
        String original = dev.cases().get(0).toString();
        Files.writeString(cases, original + "\n" + original);
        assertThrows(IllegalArgumentException.class, () -> EvaluateKnowledge.read(fixtures.resolve("corpus-v1.json"), cases));
        Files.write(cases, new byte[]{(byte) 0xc3, (byte) 0x28});
        assertThrows(java.nio.charset.CharacterCodingException.class, () -> EvaluateKnowledge.read(fixtures.resolve("corpus-v1.json"), cases));
        Files.write(cases, new byte[1024 * 1024 + 1]);
        assertThrows(IllegalArgumentException.class, () -> EvaluateKnowledge.read(fixtures.resolve("corpus-v1.json"), cases));
        Files.writeString(cases, original.replace("refund:v1", "private:v1"));
        assertThrows(IllegalArgumentException.class, () -> EvaluateKnowledge.read(fixtures.resolve("corpus-v1.json"), cases));
    }
}
