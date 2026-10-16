package com.csfundamentals.aiexample;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AiBackendApplication {
    public static void main(String[] args) throws Exception {
        if (args.length > 0 && args[0].equals("--evaluate")) { EvaluateTickets.run(args); return; }
        if (args.length == 2 && args[0].equals("--mcp-server")) { ReadOnlyMcpDemo.server(args[1]); return; }
        if (args.length == 2 && args[0].equals("--mcp-check")) { ReadOnlyMcpDemo.check(args[1]); return; }
        SpringApplication.run(AiBackendApplication.class, args);
    }
}
