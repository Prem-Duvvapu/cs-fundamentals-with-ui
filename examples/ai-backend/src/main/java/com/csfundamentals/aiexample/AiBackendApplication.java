package com.csfundamentals.aiexample;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AiBackendApplication {
    public static void main(String[] args) throws Exception {
        if (args.length > 0 && java.util.Set.of("--documents", "--document-worker", "--document-fixtures").contains(args[0])) { com.csfundamentals.aiexample.documents.DocumentCommand.run(args); return; }
        if (args.length > 0 && args[0].equals("--stream-check")) { StreamingOllamaDemo.run(args); return; }
        if (args.length > 0 && args[0].equals("--evaluate-workflow")) { EvaluateWorkflow.run(args); return; }
        if (args.length > 0 && args[0].equals("--evaluate-rag")) { EvaluateKnowledge.run(args); return; }
        if (args.length > 0 && (args[0].equals("--evaluate") || args[0].equals("--evaluate-rules"))) { EvaluateTickets.run(args); return; }
        if (args.length == 2 && args[0].equals("--mcp-server")) { ReadOnlyMcpDemo.server(args[1]); return; }
        if (args.length == 2 && args[0].equals("--mcp-check")) { ReadOnlyMcpDemo.check(args[1]); return; }
        SpringApplication.run(AiBackendApplication.class, args);
    }
}
