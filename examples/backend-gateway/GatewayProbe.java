import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/** Fixed diagnostic fixture only; never reflects credentials, cookies or arbitrary endpoints. */
public final class GatewayProbe {
    private static String quote(String value) {
        if (value == null) return "\"\"";
        if (value.length() > 512) throw new IllegalArgumentException("diagnostic_header_limit");
        StringBuilder result = new StringBuilder("\"");
        for (char character : value.toCharArray()) {
            if (character == '\\' || character == '"') result.append('\\');
            if (character < 32) result.append(String.format("\\u%04x", (int)character));
            else result.append(character);
        }
        return result.append('"').toString();
    }
    public static void main(String[] args) throws Exception {
        if (args.length != 1) throw new IllegalArgumentException("fixed_server_or_direct_mode_required");
        if (args[0].equals("direct")) {
            HttpRequest request = HttpRequest.newBuilder(URI.create("http://task:9191/api/projects"))
                .timeout(Duration.ofSeconds(3)).header("X-User", "alice").header("X-Forwarded-User", "alice")
                .header("X-Forwarded-For", "198.51.100.77").GET().build();
            int status = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build()
                .send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            if (status != 401) throw new IllegalStateException("direct_service_authentication_bypass");
            System.out.println("{\"directServiceStatus\":401}");
            return;
        }
        if (!args[0].equals("server")) throw new IllegalArgumentException("fixed_server_or_direct_mode_required");
        AtomicInteger calls = new AtomicInteger();
        ThreadPoolExecutor executor = new ThreadPoolExecutor(2,2,0,TimeUnit.SECONDS,new ArrayBlockingQueue<>(4),new ThreadPoolExecutor.AbortPolicy());
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0",9292),8);
        server.setExecutor(executor);
        server.createContext("/headers", exchange -> {
            try {
                if (!exchange.getRequestMethod().equals("GET") || !exchange.getRequestURI().toString().equals("/headers") || calls.incrementAndGet()>64) {
                    exchange.sendResponseHeaders(400,-1); return;
                }
                String[] keys = {"Host","X-Real-IP","X-Forwarded-For","X-Forwarded-Proto","Forwarded","X-Forwarded-Host","X-Forwarded-Port","X-Forwarded-Prefix","X-User","X-Auth-Request-User","X-Forwarded-User"};
                StringBuilder json = new StringBuilder("{\"calls\":"+calls.get());
                for(String key:keys) json.append(',').append(quote(key)).append(':').append(quote(exchange.getRequestHeaders().getFirst(key)));
                byte[] body=json.append('}').toString().getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type","application/json");
                exchange.sendResponseHeaders(200,body.length); exchange.getResponseBody().write(body);
            } finally { exchange.close(); }
        });
        server.start();
        try { Thread.sleep(300_000); }
        finally { server.stop(0); executor.shutdownNow(); executor.awaitTermination(3,TimeUnit.SECONDS); }
    }
}
