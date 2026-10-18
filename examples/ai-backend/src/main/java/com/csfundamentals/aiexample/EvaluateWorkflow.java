package com.csfundamentals.aiexample;

import java.nio.file.*;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import tools.jackson.databind.ObjectMapper;

public final class EvaluateWorkflow {
    private EvaluateWorkflow() {}
    public static void main(String[] args) throws Exception { run(args); }
    public static void run(String[] args) throws Exception {
        if (args.length != 3 || !args[0].equals("--evaluate-workflow"))
            throw new IllegalArgumentException("Usage: --evaluate-workflow <cases.jsonl> <report.json>");
        Path datasetPath = Path.of(args[1]).toAbsolutePath(), reportPath = Path.of(args[2]).toAbsolutePath();
        if (datasetPath.normalize().equals(reportPath.normalize()) || Files.isSymbolicLink(reportPath))
            throw new IllegalArgumentException("workflow_report_must_not_replace_dataset_or_symlink");
        var dataset = WorkflowEvaluationCases.read(datasetPath);
        var json = new ObjectMapper(); var results = new ArrayList<WorkflowEvaluation.Result>();
        var report = new LinkedHashMap<String, Object>();
        report.put("schemaVersion", 1); report.put("at", Instant.now().toString());
        report.put("evidence", "deterministic-proposal-fixture-with-actual-application-policy-and-owned-h2");
        report.put("fixtureVersion", WorkflowEvaluationFixture.VERSION); report.put("policyVersion", WorkflowEvaluation.POLICY_VERSION);
        report.put("datasetSha256", HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(dataset.bytes())));
        report.put("javaRuntime", Runtime.version().toString());
        report.put("scope", "No model, provider, MCP transport, controller authentication, remote payment or live-agent quality measured. Synthetic held-out labels are not blind production data.");
        report.put("bounds", Map.of("cases", 50, "datasetBytes", WorkflowEvaluationCases.MAX_BYTES, "runSeconds", 120,
                "agentSteps", 3, "agentDeadlineMs", 2000, "localHttpResponseTimeoutMs", 250,
                "localHttpWorkerSeconds", 3, "reportBytes", 256 * 1024, "paidCalls", 0, "subprocesses", 0));
        report.put("state", "running"); report.put("cases", results);
        Path owned = Files.createTempDirectory("workflow-evaluation-");
        long started = System.nanoTime();
        try {
            for (var item : dataset.cases()) {
                if (System.nanoTime() - started > WorkflowEvaluation.RUN_LIMIT_NANOS)
                    throw new IllegalStateException("workflow_run_deadline");
                results.add(WorkflowEvaluation.execute(item, owned));
                report.put("summary", summarize(results)); checkpoint(json, reportPath, report);
            }
            report.put("state", "complete");
        } catch (Exception error) {
            report.put("state", "failed"); report.put("harnessFailure", error.getClass().getSimpleName());
            throw error;
        } finally {
            try (var children = Files.list(owned)) {
                if (children.findAny().isPresent()) throw new IllegalStateException("owned_workflow_resources_remain");
            } finally { Files.delete(owned); }
            report.put("ownedResourcesRemoved", true); checkpoint(json, reportPath, report);
        }
        var summary = summarize(results);
        System.out.println("Workflow fixture cases=" + results.size() + " tasksCompleted=" + summary.get("tasksCompleted")
                + " expectedRejectionsObserved=" + summary.get("expectedRejectionsObserved")
                + " observedPolicyViolations=" + summary.get("observedPolicyViolations")
                + " contractFailures=" + summary.get("contractFailures"));
        if (results.stream().anyMatch(result -> !result.contractPassed())) throw new IllegalStateException("workflow_evaluation_contract_failed");
    }

    static Map<String, Object> summarize(List<WorkflowEvaluation.Result> results) {
        var summary = aggregate(results); var splits = new TreeMap<String, Object>(); var families = new TreeMap<String, Object>();
        for (String split : results.stream().map(WorkflowEvaluation.Result::split).distinct().toList())
            splits.put(split, aggregate(results.stream().filter(result -> result.split().equals(split)).toList()));
        for (String family : results.stream().map(WorkflowEvaluation.Result::family).distinct().toList())
            families.put(family, aggregate(results.stream().filter(result -> result.family().equals(family)).toList()));
        summary.put("splits", splits); summary.put("families", families); return summary;
    }
    private static Map<String, Object> aggregate(List<WorkflowEvaluation.Result> results) {
        var out = new LinkedHashMap<String, Object>();
        long eligible = results.stream().filter(WorkflowEvaluation.Result::taskEligible).count();
        long completed = results.stream().filter(WorkflowEvaluation.Result::taskCompleted).count();
        out.put("cases", results.size()); out.put("taskEligibleCases", eligible); out.put("tasksCompleted", completed);
        out.put("taskCompletionRateOverAllCases", results.isEmpty() ? null : (double) completed / results.size());
        out.put("taskCompletionRateOverEligibleCases", eligible == 0 ? null : (double) completed / eligible);
        out.put("expectedRejections", results.stream().filter(WorkflowEvaluation.Result::expectedRejection).count());
        out.put("expectedRejectionsObserved", results.stream().filter(result -> result.expectedRejection() && result.rejectionObserved()).count());
        out.put("unexpectedRejections", results.stream().filter(result -> !result.expectedRejection() && result.rejectionObserved()).count());
        out.put("boundedStops", results.stream().filter(result -> Set.of("deadline", "step_limit").contains(result.status())).count());
        out.put("observedPolicyViolations", results.stream().mapToInt(result -> result.observedPolicyViolations().size()).sum());
        out.put("contractFailures", results.stream().filter(result -> !result.contractPassed()).count());
        out.put("proposalCalls", results.stream().mapToInt(WorkflowEvaluation.Result::proposalCalls).sum());
        out.put("orderMutationsIncludingSetup", results.stream().mapToInt(WorkflowEvaluation.Result::orderMutations).sum());
        out.put("actionOrderMutations", results.stream().mapToInt(WorkflowEvaluation.Result::actionOrderMutations).sum());
        out.put("proposalRows", results.stream().mapToInt(WorkflowEvaluation.Result::proposalRows).sum());
        var times = results.stream().mapToLong(WorkflowEvaluation.Result::elapsedMs).sorted().toArray();
        out.put("localHarnessLatencyMs", Map.of("samples", times.length, "p50", times.length == 0 ? 0 : times[(int) Math.ceil(times.length * .50) - 1],
                "p95", times.length == 0 ? 0 : times[(int) Math.ceil(times.length * .95) - 1], "total", Arrays.stream(times).sum()));
        return out;
    }
    private static void checkpoint(ObjectMapper json, Path path, Map<String, Object> report) throws Exception {
        byte[] output = json.writerWithDefaultPrettyPrinter().writeValueAsBytes(report);
        if (output.length > 256 * 1024) throw new IllegalArgumentException("workflow_report_size_limit");
        Path pending = Files.createTempFile(path.getParent(), ".workflow-report-", ".json");
        try { Files.write(pending, output); Files.move(pending, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
        finally { Files.deleteIfExists(pending); }
    }
}
