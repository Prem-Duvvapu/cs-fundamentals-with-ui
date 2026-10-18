package com.csfundamentals.aiexample;

import java.util.*;

/** Label-based diagnostics; citation membership is deliberately separate from answer truth. */
final class RetrievalEvaluation {
    static Map<String, Object> score(List<String> relevant, List<String> retrieved,
            List<String> citations, List<String> expectedFacts, List<String> forbiddenFacts,
            boolean expectAbstain, KnowledgeService.Answer answer) {
        if (new HashSet<>(relevant).size() != relevant.size() || new HashSet<>(retrieved).size() != retrieved.size())
            throw new IllegalArgumentException("duplicate_source_label");
        var wanted = new HashSet<>(relevant);
        long hits = retrieved.stream().filter(wanted::contains).count();
        Double recall = wanted.isEmpty() ? null : (double) hits / wanted.size();
        Double reciprocalRank = null;
        if (!wanted.isEmpty()) {
            reciprocalRank = 0.0;
            for (int i = 0; i < retrieved.size(); i++) if (wanted.contains(retrieved.get(i))) {
                reciprocalRank = 1.0 / (i + 1); break;
            }
        }
        boolean abstained = answer != null && answer.citations().isEmpty()
                && answer.answer().equals("Insufficient evidence");
        String text = answer == null ? "" : answer.answer().toLowerCase(Locale.ROOT);
        long facts = expectedFacts.stream().filter(fact -> text.contains(fact.toLowerCase(Locale.ROOT))).count();
        boolean forbiddenAbsent = forbiddenFacts.stream().noneMatch(fact -> text.contains(fact.toLowerCase(Locale.ROOT)));
        boolean factMatch = answer != null && (expectAbstain ? abstained
                : !abstained && facts == expectedFacts.size() && forbiddenAbsent);
        long citedRelevant = citations.stream().distinct().filter(wanted::contains).count();
        var result = new LinkedHashMap<String, Object>();
        result.put("recallAt3", recall); result.put("reciprocalRankAt3", reciprocalRank);
        result.put("retrieved", retrieved); result.put("relevant", relevant);
        result.put("citationPrecision", citations.isEmpty() ? null : (double) citedRelevant / citations.size());
        result.put("citationRecall", wanted.isEmpty() ? null : (double) citedRelevant / wanted.size());
        result.put("expectedFactCount", expectedFacts.size()); result.put("matchedFactCount", facts);
        result.put("forbiddenFactsAbsent", forbiddenAbsent); result.put("expectedFactsMatch", factMatch);
        result.put("abstained", abstained); result.put("abstentionCorrect", answer != null && abstained == expectAbstain);
        return result;
    }
    static Map<String, Object> summarize(List<Map<String, Object>> rows) {
        var result = new LinkedHashMap<String, Object>();
        result.put("cases", rows.size());
        for (String metric : List.of("recallAt3", "reciprocalRankAt3", "citationPrecision", "citationRecall")) {
            var values = rows.stream().map(row -> row.get(metric)).filter(Objects::nonNull)
                    .map(value -> ((Number) value).doubleValue()).toList();
            result.put(metric, values.isEmpty() ? null : values.stream().mapToDouble(Double::doubleValue).average().orElseThrow());
            result.put(metric + "Denominator", values.size());
        }
        for (String metric : List.of("expectedFactsMatch", "abstentionCorrect", "outcomeMatches")) {
            long passed = rows.stream().filter(row -> Boolean.TRUE.equals(row.get(metric))).count();
            result.put(metric + "Count", passed);
            result.put(metric + "Rate", rows.isEmpty() ? null : (double) passed / rows.size());
        }
        var slices = new TreeMap<String, List<Map<String, Object>>>();
        for (var row : rows) slices.computeIfAbsent((String) row.get("slice"), ignored -> new ArrayList<>()).add(row);
        var counts = new LinkedHashMap<String, Object>();
        slices.forEach((slice, cases) -> counts.put(slice, Map.of("cases", cases.size(),
                "expectedFactsMatch", cases.stream().filter(row -> Boolean.TRUE.equals(row.get("expectedFactsMatch"))).count(),
                "outcomeMatches", cases.stream().filter(row -> Boolean.TRUE.equals(row.get("outcomeMatches"))).count())));
        for (String stage : List.of("retrievalMs", "modelMs", "totalMs")) {
            var measured = rows.stream().map(row -> row.get(stage)).filter(Objects::nonNull)
                    .map(value -> ((Number) value).doubleValue()).sorted().toList();
            result.put(stage + "P50", measured.isEmpty() ? null : measured.get((int) Math.ceil(measured.size() * 0.50) - 1));
            result.put(stage + "P95", measured.isEmpty() ? null : measured.get((int) Math.ceil(measured.size() * 0.95) - 1));
            result.put(stage + "Denominator", measured.size());
        }
        result.put("slices", counts);
        return result;
    }
}
