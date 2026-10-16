package com.csfundamentals.aiexample;

import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.transport.*;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.transport.StdioServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.json.jackson3.JacksonMcpJsonMapper;
import java.nio.file.Path;
import java.time.*;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import tools.jackson.databind.json.JsonMapper;

final class ReadOnlyMcpDemo {
    static void server(String principal) throws Exception {
        KnowledgeStore.tenant(principal); // Host chooses the principal; tool arguments cannot choose it.
        var mapper = new JacksonMcpJsonMapper(JsonMapper.builder().build());
        var workflow = new RefundWorkflow(System.getenv().getOrDefault("AI_JDBC_URL", "jdbc:h2:mem:mcp;DB_CLOSE_DELAY=-1"),
                System.getenv().getOrDefault("AI_JDBC_USER", "sa"), System.getenv().getOrDefault("AI_JDBC_PASSWORD", ""), UUID.randomUUID().toString(), Clock.systemUTC());
        var tool = McpSchema.Tool.builder().name("lookup_order").description("Read an order allowed for this host principal; cannot issue refunds")
                .inputSchema(Map.of("type", "object", "properties", Map.of("orderId", Map.of("type", "string")), "required", List.of("orderId"), "additionalProperties", false))
                .annotations(McpSchema.ToolAnnotations.builder().readOnlyHint(true).destructiveHint(false).openWorldHint(false).build()).build();
        var transport = new StdioServerTransportProvider(mapper);
        var server = McpServer.sync(transport).serverInfo("support-read-only", "1.0.0")
                .capabilities(McpSchema.ServerCapabilities.builder().tools(false).build())
                .toolCall(tool, (exchange, request) -> {
                    try {
                        if (!request.arguments().keySet().equals(Set.of("orderId")) || !(request.arguments().get("orderId") instanceof String id))
                            throw new IllegalArgumentException("invalid_arguments");
                        var order = workflow.lookup(principal, id);
                        return McpSchema.CallToolResult.builder().addTextContent(mapper.writeValueAsString(order)).isError(false).build();
                    } catch (Exception e) {
                        return McpSchema.CallToolResult.builder().addTextContent("order_not_authorized_or_invalid").isError(true).build();
                    }
                }).build();
        Runtime.getRuntime().addShutdownHook(new Thread(server::close));
        new CountDownLatch(1).await();
    }
    static void check(String jar) {
        var mapper = new JacksonMcpJsonMapper(JsonMapper.builder().build());
        var parameters = ServerParameters.builder(Path.of(System.getProperty("java.home"), "bin", "java").toString())
                .args("-jar", Path.of(jar).toAbsolutePath().toString(), "--mcp-server", "alice").build();
        var transport = new StdioClientTransport(parameters, mapper);
        try (var client = McpClient.sync(transport).requestTimeout(Duration.ofSeconds(15)).build()) {
            var initialized = client.initialize();
            var tools = client.listTools().tools();
            if (tools.size() != 1 || !tools.get(0).name().equals("lookup_order")) throw new IllegalStateException("unexpected_tool_inventory");
            var allowed = client.callTool(new McpSchema.CallToolRequest("lookup_order", Map.of("orderId", "ORD-1001")));
            if (Boolean.TRUE.equals(allowed.isError())) throw new IllegalStateException("authorized_lookup_failed");
            var denied = client.callTool(new McpSchema.CallToolRequest("lookup_order", Map.of("orderId", "ORD-2001")));
            if (!Boolean.TRUE.equals(denied.isError())) throw new IllegalStateException("cross_tenant_lookup_succeeded");
            var again = client.callTool(new McpSchema.CallToolRequest("lookup_order", Map.of("orderId", "ORD-1001")));
            if (Boolean.TRUE.equals(again.isError())) throw new IllegalStateException("connection_failed_after_denial");
            System.out.println("Real local MCP stdio negotiation=" + initialized.protocolVersion() + "; discovery, allowed lookup and cross-tenant denial passed");
        }
    }
}
