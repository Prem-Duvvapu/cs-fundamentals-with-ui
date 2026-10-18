package com.csfundamentals.aiexample.documents;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

final class LiteralFields {
    private static final Pattern LABEL = Pattern.compile("^Order[ \\t]+ID[ \\t]*:[ \\t]*(.*)$", Pattern.CASE_INSENSITIVE);
    static DocumentReport.Field orderId(List<DocumentReport.Page> pages) {
        List<DocumentReport.Field> found = new ArrayList<>();
        for (var page : pages) {
            String[] lines = page.text().split("\\R", -1);
            for (int index = 0; index < lines.length; index++) {
                var match = LABEL.matcher(lines[index]); if (!match.matches()) continue;
                String value = match.group(1).strip(); int line = index + 1;
                List<Double> confidences = page.words().stream().filter(w -> w.line() == line).map(DocumentReport.Word::confidence).toList();
                Double confidence = confidences.isEmpty() || confidences.contains(null) ? null : confidences.stream().min(Double::compareTo).orElse(null);
                String evidence = lines[index].substring(0, Math.min(160, lines[index].length()));
                if (value.isEmpty()) found.add(unknown("MISSING_LITERAL", page.number(), line, evidence, confidence));
                else if (!value.matches("ORD-[0-9]{4}")) found.add(unknown("UNSUPPORTED_LITERAL", page.number(), line, evidence, confidence));
                else if (page.method().equals("OCR") && (confidence == null || confidence < 70)) found.add(unknown("LOW_OR_UNKNOWN_OCR_CONFIDENCE", page.number(), line, evidence, confidence));
                else found.add(new DocumentReport.Field("LITERAL_CANDIDATE", value, "NOT_BUSINESS_AUTHORIZATION", page.number(), line, evidence, confidence));
            }
        }
        if (found.size() > 1) return unknown("AMBIGUOUS_MULTIPLE_LABELS", null, null, "", null);
        return found.isEmpty() ? unknown("MISSING_LABEL", null, null, "", null) : found.get(0);
    }
    private static DocumentReport.Field unknown(String reason, Integer page, Integer line, String evidence, Double confidence) { return new DocumentReport.Field("UNKNOWN", null, reason, page, line, evidence, confidence); }
}
