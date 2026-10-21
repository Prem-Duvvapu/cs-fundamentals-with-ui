package com.csfundamentals.websocketlab;

import com.csfundamentals.example.TaskTrackerApplication;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.MapPropertySource;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.core.json.JsonFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

class WebSocketTransportTest {
    private static final JsonMapper JSON = JsonMapper.builder(JsonFactory.builder()
        .disable(StreamReadFeature.INCLUDE_SOURCE_IN_LOCATION).build()).build();
    private static final ProxySelector DIRECT = new ProxySelector() {
        @Override public List<Proxy> select(URI uri) { return List.of(Proxy.NO_PROXY); }
        @Override public void connectFailed(URI uri, SocketAddress address, IOException failure) { }
    };
    @TempDir Path temporary;
    private final List<String> passed = new ArrayList<>();
    private final List<Peer> peers = new ArrayList<>();
    private final ExecutorService clients = Executors.newFixedThreadPool(4);
    private final Map<String, String> passwords = Map.of("alice", secret(), "bob", secret(), "viewer", secret());
    private String base, origin;
    private EchoRegistry registry;

    @Test @Timeout(120)
    void actualAuthenticatedWebSocketLifecycleAndLimits() throws Exception {
        assertEquals(17, Runtime.version().feature(), "This receipt requires an actual Java 17 child runtime");
        Map<String, Object> ordinary, expiry;
        boolean ordinaryClosed = false, expiryClosed = false;
        try {
            ConfigurableApplicationContext context = start("ordinary", 120, 2500);
            try {
                Browser anonymous = new Browser();
                handshake(anonymous, 401, List.of(origin), "");
                record("anonymous_upgrade_401");
                Browser alice = new Browser();
                JsonNode csrf = alice.csrf();
                String beforeLogin = alice.cookie;
                assertEquals(403, alice.form("/lab/session/login", Map.of("username", "alice", "password", passwords.get("alice"))).statusCode(), "Login CSRF");
                assertEquals(401, alice.login("alice", "wrong-generated-fixture", csrf).statusCode(), "Wrong password");
                Browser stranger = new Browser(); stranger.csrf();
                assertEquals(403, stranger.login("alice", passwords.get("alice"), csrf).statusCode(), "Cross-session CSRF");
                assertEquals(204, alice.login("alice", passwords.get("alice"), alice.csrf()).statusCode(), "Real form login");
                assertFalse(beforeLogin.equals(alice.cookie), "Login must rotate actual session cookie");
                assertEquals(403, alice.form("/lab/session/logout", Map.of(csrf.get("parameter").asString(), csrf.get("token").asString())).statusCode(), "Pre-login CSRF invalidated");
                Browser old = new Browser(); old.cookie = beforeLogin;
                handshake(old, 401, List.of(origin), "");
                assertEquals(200, alice.get("/lab/session/me").statusCode(), "Cookie alone authenticates HTTP");
                record("form_login_csrf_password_cross_session_and_fixation");
                Browser bob = authenticated("bob"), viewer = authenticated("viewer");
                handshake(viewer, 403, List.of(origin), "");
                record("authenticated_viewer_upgrade_403");
                for (List<String> origins : List.of(List.<String>of(), List.of("null"), List.of("http://foreign.invalid"), List.of(origin, origin)))
                    handshake(alice, 403, origins, "");
                handshake(alice, 403, List.of(origin), "?token=forbidden-fixture");
                record("missing_null_cross_duplicate_origins_and_query_rejected");
                for (int attempt = 0; attempt < 5; attempt++) {
                    failedProtocolUpgrade(alice);
                    awaitEmpty();
                }
                record("failed_upgrade_releases_pre101_admission");
                Peer a = connect(alice), b = connect(bob);
                a.send(echo("a-1", "<script>teaching only</script>"));
                b.send(echo("b-1", "separate connection"));
                assertEcho(a.next(), "a-1", "alice", "<script>teaching only</script>");
                assertEcho(b.next(), "b-1", "bob", "separate connection");
                a.ack("a-1"); b.ack("b-1");
                assertTrue(a.messages.isEmpty() && b.messages.isEmpty(), "No cross-connection echo");
                record("cookie_only_principal_and_same_connection_json_echo");
                String fragmented = echo("fragments", "one logical message");
                a.socket.sendText(fragmented.substring(0, 15), false).get(2, TimeUnit.SECONDS);
                a.socket.sendText(fragmented.substring(15), true).get(2, TimeUnit.SECONDS);
                assertEcho(a.next(), "fragments", "alice", "one logical message"); a.ack("fragments");
                record("actual_fragmented_text_reassembled_once");
                a.finish(); b.finish(); awaitEmpty();
                try (Peer reconnected = connect(alice)) {
                    reconnected.send(echo("reconnected", "new connection"));
                    assertEcho(reconnected.next(), "reconnected", "alice", "new connection"); reconnected.ack("reconnected");
                }
                awaitEmpty(); record("graceful_disconnect_and_authenticated_reconnect");
                try (Peer a1 = connect(alice); Peer a2 = connect(alice); Peer b1 = connect(bob)) {
                    handshake(alice, 429, List.of(origin), "");
                    handshake(bob, 429, List.of(origin), "");
                }
                awaitEmpty();
                try (Peer recovered = connect(bob)) { assertEquals(1, registry.active(), "Admission capacity recovered"); }
                awaitEmpty(); record("global_and_principal_connection_caps_recover");
                for (String invalid : List.of("{\"type\":\"echo\",\"id\":\"x\",\"text\":\"a\",\"text\":\"b\"}",
                        "{\"type\":\"echo\",\"id\":\"x\",\"text\":\"a\",\"recipient\":\"bob\"}",
                        "{\"type\":\"echo\",\"id\":\"x\",\"text\":{}}", "{}{}", "{\"type\":\"ack\",\"id\":\"unknown\"}")) {
                    try (Peer bad = connect(alice)) { bad.send(invalid); assertEquals(1008, bad.closed.get(3, TimeUnit.SECONDS), "Strict protocol rejection"); }
                    awaitEmpty();
                }
                record("strict_schema_duplicate_unknown_nested_trailing_and_ack_rejected");
                try (Peer binary = connect(alice)) {
                    binary.socket.sendBinary(ByteBuffer.wrap(new byte[]{1}), true).get(2, TimeUnit.SECONDS);
                    assertEquals(1003, binary.closed.get(3, TimeUnit.SECONDS), "Binary unsupported");
                }
                awaitEmpty(); record("binary_message_rejected");
                try (Peer oversized = connect(alice)) {
                    oversized.send("x".repeat(1100));
                    assertEquals(1009, oversized.closed.get(3, TimeUnit.SECONDS), "Actual oversized message");
                }
                awaitEmpty();
                try (Peer oversized = connect(alice)) {
                    oversized.socket.sendText("x".repeat(600), false).get(2, TimeUnit.SECONDS);
                    oversized.socket.sendText("x".repeat(600), true).get(2, TimeUnit.SECONDS);
                    assertEquals(1009, oversized.closed.get(3, TimeUnit.SECONDS), "Actual fragmented total cap");
                }
                awaitEmpty(); record("whole_and_fragmented_message_buffer_limits");
                try (Peer slow = connect(alice)) {
                    for (int index = 0; index < 4; index++) { slow.send(echo("slow-"+index, "bounded")); slow.next(); }
                    slow.send(echo("overflow", "bounded"));
                    assertEquals(1013, slow.closed.get(3, TimeUnit.SECONDS), "Unacknowledged credit cap");
                }
                awaitEmpty(); record("actual_unacknowledged_application_pressure");
                try (Peer slow = connect(alice)) {
                    slow.send(echo("deadline", "bounded")); slow.next();
                    assertEquals(1013, slow.closed.get(4, TimeUnit.SECONDS), "ACK deadline");
                }
                awaitEmpty(); record("actual_ack_deadline");
                try (Peer idle = connect(alice)) { assertEquals(1008, idle.closed.get(4, TimeUnit.SECONDS), "Application idle limit"); }
                awaitEmpty(); record("actual_socket_idle_deadline");
                try (Peer finite = connect(alice)) {
                    for (int index = 0; index < 16; index++) { finite.send(echo("count-"+index, "bounded")); finite.next(); finite.ack("count-"+index); }
                    finite.send(echo("exhausted", "bounded"));
                    assertEquals(1008, finite.closed.get(3, TimeUnit.SECONDS), "Total command count");
                }
                awaitEmpty(); record("finite_per_connection_command_count");
                Peer oldIdentity = connect(alice);
                assertEquals(204, alice.login("bob", passwords.get("bob"), alice.csrf()).statusCode(), "Actual reauthentication");
                assertEquals(1008, oldIdentity.closed.get(3, TimeUnit.SECONDS), "Session ID change closes previous identity socket");
                awaitEmpty();
                try (Peer currentIdentity = connect(alice)) {
                    currentIdentity.send(echo("current", "new principal"));
                    assertEcho(currentIdentity.next(), "current", "bob", "new principal"); currentIdentity.ack("current");
                }
                awaitEmpty();
                assertEquals(204, alice.login("alice", passwords.get("alice"), alice.csrf()).statusCode(), "Restore fixture identity");
                record("reauthentication_rotation_closes_old_identity_socket");
                var gate = context.getBean(AdmissionGate.class);
                var pause = new PausedRequest();
                assertTrue(gate.next.compareAndSet(null, pause));
                var pending = alice.client.newWebSocketBuilder().connectTimeout(Duration.ofSeconds(2))
                    .header("Origin", origin).header("Cookie", alice.cookie)
                    .buildAsync(URI.create(base.replace("http:", "ws:")+"/lab/ws/echo"), new Peer());
                try {
                    assertEquals("alice", pause.entered.get(2, TimeUnit.SECONDS), "Actual request authenticated before pause");
                    assertEquals(204, alice.login("bob", passwords.get("bob"), alice.csrf()).statusCode(), "Rotate identity during held upgrade");
                } finally { pause.release.countDown(); }
                ExecutionException rejected = assertThrows(ExecutionException.class, () -> pending.get(3, TimeUnit.SECONDS));
                assertTrue(rejected.getCause() instanceof WebSocketHandshakeException);
                assertEquals(401, ((WebSocketHandshakeException)rejected.getCause()).getResponse().statusCode(), "Captured old principal must not enter new identity's session");
                awaitEmpty();
                try (Peer current = connect(alice)) {
                    current.send(echo("after-race", "current session"));
                    assertEcho(current.next(), "after-race", "bob", "current session"); current.ack("after-race");
                }
                awaitEmpty();
                assertEquals(204, alice.login("alice", passwords.get("alice"), alice.csrf()).statusCode(), "Restore fixture after positioned race");
                record("held_authenticated_upgrade_rejected_after_concurrent_reauthentication");
                Peer loggingOut = connect(alice);
                assertEquals(403, alice.form("/lab/session/logout", Map.of()).statusCode(), "Logout CSRF");
                JsonNode logoutCsrf = alice.csrf();
                String authenticatedCookie = alice.cookie;
                assertEquals(204, alice.form("/lab/session/logout", Map.of(logoutCsrf.get("parameter").asString(), logoutCsrf.get("token").asString())).statusCode(), "Actual logout");
                assertEquals(1008, loggingOut.closed.get(3, TimeUnit.SECONDS), "Logout closes associated socket");
                Browser loggedOut = new Browser(); loggedOut.cookie = authenticatedCookie;
                handshake(loggedOut, 401, List.of(origin), "");
                awaitEmpty(); record("csrf_logout_invalidates_cookie_closes_socket_releases_capacity");
                originalRestBoundary();
                Peer shutdown = connect(bob);
                context.close(); ordinaryClosed = !context.isActive();
                assertEquals(1001, shutdown.closed.get(3, TimeUnit.SECONDS), "Application shutdown closes owned sockets");
                assertEquals(0, registry.active(), "No admission retained after shutdown");
                ordinary = registry.evidence();
                record("application_shutdown_socket_and_registry_cleanup");
            } finally { context.close(); }

            ConfigurableApplicationContext shortSession = start("expiry", 2, 10000);
            try {
                Browser expiring = authenticated("alice");
                Peer socket = connect(expiring);
                Thread.sleep(2300); // Fixed short operator policy; no other limit case uses this session interval.
                assertEquals(401, expiring.get("/lab/session/me").statusCode(), "Actual container expired session on next HTTP request");
                assertEquals(1008, socket.closed.get(3, TimeUnit.SECONDS), "Session destruction closes associated socket");
                handshake(expiring, 401, List.of(origin), "");
                awaitEmpty(); expiry = registry.evidence(); record("independent_actual_servlet_idle_expiry_and_socket_consequence");
            } finally { shortSession.close(); expiryClosed = !shortSession.isActive(); }
            Map<String, Object> report = new LinkedHashMap<>();
            report.put("schemaVersion", 1); report.put("mode", "actual-loopback-spring-websocket"); report.put("passedCases", passed);
            report.put("childJavaFeature", Runtime.version().feature()); report.put("childJavaRuntimeVersion", Runtime.version().toString());
            report.put("compilerRelease", 17); report.put("springBoot", org.springframework.boot.SpringBootVersion.getVersion());
            report.put("springFramework", org.springframework.core.SpringVersion.getVersion());
            report.put("tomcat", org.apache.catalina.util.ServerInfo.getServerNumber());
            report.put("ordinaryLimits", ordinary); report.put("expiryLimits", expiry);
            report.put("applicationContextsClosed", ordinaryClosed && expiryClosed); report.put("directProxyPolicy", true);
            report.put("limits", Map.of("globalConnections", 3, "perPrincipalConnections", 2, "messageBytes", 1024,
                "pendingAcks", 4, "outboundQueueBytes", 4096, "ackDeadlineMillis", 2000, "commandsPerConnection", 32,
                "blockingAndCloseTimeoutMillis", 500, "authLeaseMillis", 30000));
            Path directory = Path.of("target/evidence"); Files.createDirectories(directory);
            String encoded = JSON.writeValueAsString(report);
            assertTrue(encoded.length() < 16384, "Sanitized receipt bound");
            Files.writeString(directory.resolve("transport.json"), encoded+"\n");
        } finally {
            for (Peer peer : peers) peer.close();
            clients.shutdownNow(); assertTrue(clients.awaitTermination(3, TimeUnit.SECONDS), "Owned client executor stopped");
        }
    }
    private ConfigurableApplicationContext start(String name, int sessionIdle, int socketIdle) {
        var app = new SpringApplication(TaskTrackerApplication.class, WebSocketLab.class, PositionedAdmission.class);
        app.addInitializers(context -> context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("owned-test-runtime", Map.of(
            "TASK_TRACKER_ALICE_PASSWORD", passwords.get("alice"), "TASK_TRACKER_BOB_PASSWORD", passwords.get("bob"),
            "TASK_TRACKER_VIEWER_PASSWORD", passwords.get("viewer"), "spring.datasource.password", secret(),
            "spring.datasource.url", "jdbc:h2:file:"+temporary.resolve(name).toAbsolutePath(),
            "lab.session-idle-seconds", sessionIdle, "lab.socket-idle-millis", socketIdle))));
        ConfigurableApplicationContext context = app.run("--spring.profiles.active=production", "--server.address=127.0.0.1", "--server.port=0",
            "--spring.main.banner-mode=off", "--logging.level.root=OFF", "--server.tomcat.threads.max=8", "--server.tomcat.threads.min-spare=1",
            "--server.tomcat.max-connections=16", "--server.tomcat.accept-count=8", "--spring.lifecycle.timeout-per-shutdown-phase=2s",
            "--server.tomcat.connection-timeout=2s", "--server.tomcat.keep-alive-timeout=2s", "--server.max-http-request-header-size=4KB",
            "--server.tomcat.max-http-form-post-size=2KB", "--server.tomcat.max-parameter-count=8", "--server.servlet.session.cookie.same-site=lax");
        base = "http://127.0.0.1:"+((WebServerApplicationContext)context).getWebServer().getPort(); origin = base;
        registry = context.getBean(EchoRegistry.class);
        var tomcat = ((org.springframework.boot.tomcat.TomcatWebServer)((WebServerApplicationContext)context).getWebServer()).getTomcat();
        var manager = (org.apache.catalina.session.StandardManager)((org.apache.catalina.Context)tomcat.getHost().findChildren()[0]).getManager();
        assertEquals(32, manager.getMaxActiveSessions(), "Actual container HTTP session cap");
        assertNull(manager.getPathname(), "No session persistence outside owned workspace");
        return context;
    }
    private static String secret() { byte[] bytes = new byte[24]; new SecureRandom().nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    static final class PausedRequest {
        final CompletableFuture<String> entered = new CompletableFuture<>();
        final CountDownLatch release = new CountDownLatch(1);
    }
    static final class AdmissionGate implements Filter {
        final AtomicReference<PausedRequest> next = new AtomicReference<>();
        @Override public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
            if (request instanceof HttpServletRequest http && http.getRequestURI().equals("/lab/ws/echo")) {
                PausedRequest pause = next.getAndSet(null);
                if (pause != null) {
                    pause.entered.complete(http.getUserPrincipal() == null ? "anonymous" : http.getUserPrincipal().getName());
                    try {
                        if (!pause.release.await(5, TimeUnit.SECONDS)) throw new ServletException("Owned positioned request deadline");
                    } catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new ServletException("Owned request interrupted"); }
                }
            }
            chain.doFilter(request, response);
        }
    }
    @TestConfiguration(proxyBeanMethods = false)
    static class PositionedAdmission {
        @Bean AdmissionGate admissionGate() { return new AdmissionGate(); }
        @Bean FilterRegistrationBean<AdmissionGate> positionedFilter(AdmissionGate gate) {
            var registration = new FilterRegistrationBean<>(gate);
            registration.setOrder(-90); // After the security proxy (-100), before the endpoint interceptor.
            return registration;
        }
    }
    private void record(String name) { passed.add(name); }
    private Browser authenticated(String user) throws Exception {
        Browser browser = new Browser(); assertEquals(204, browser.login(user, passwords.get(user), browser.csrf()).statusCode(), "Authenticated fixture session"); return browser;
    }
    private static String echo(String id, String text) { return JSON.writeValueAsString(Map.of("type", "echo", "id", id, "text", text)); }
    private static void assertEcho(String value, String id, String principal, String text) {
        JsonNode node = JSON.readTree(value);
        assertTrue(node.size() == 4 && node.get("id").asString().equals(id) && node.get("principal").asString().equals(principal)
            && node.get("text").asString().equals(text) && node.get("type").asString().equals("echo"), "Exact same-connection JSON/principal contract");
    }
    private void awaitEmpty() throws InterruptedException {
        long deadline = System.nanoTime()+TimeUnit.SECONDS.toNanos(3);
        while (registry.active() != 0 && System.nanoTime() < deadline) Thread.sleep(10);
        assertEquals(0, registry.active(), "Admission release deadline");
    }
    private Peer connect(Browser browser) throws Exception {
        Peer peer = new Peer(); peers.add(peer);
        peer.socket = browser.client.newWebSocketBuilder().connectTimeout(Duration.ofSeconds(2)).header("Origin", origin)
            .header("Cookie", browser.cookie).buildAsync(URI.create(base.replace("http:", "ws:")+"/lab/ws/echo"), peer).get(3, TimeUnit.SECONDS);
        return peer;
    }
    private void handshake(Browser browser, int expected, List<String> origins, String suffix) throws Exception {
        var builder = browser.client.newWebSocketBuilder().connectTimeout(Duration.ofSeconds(2));
        if (!browser.cookie.isEmpty()) builder.header("Cookie", browser.cookie);
        for (String value : origins) builder.header("Origin", value);
        try { WebSocket unexpected = builder.buildAsync(URI.create(base.replace("http:", "ws:")+"/lab/ws/echo"+suffix), new Peer()).get(3, TimeUnit.SECONDS); unexpected.abort(); fail("Expected rejected upgrade"); }
        catch (ExecutionException failure) {
            assertTrue(failure.getCause() instanceof WebSocketHandshakeException, "Actual HTTP handshake rejection");
            assertEquals(expected, ((WebSocketHandshakeException)failure.getCause()).getResponse().statusCode(), "Expected handshake status");
        }
    }
    private void failedProtocolUpgrade(Browser browser) throws Exception {
        URI target = URI.create(base);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("127.0.0.1", target.getPort()), 2000); socket.setSoTimeout(2000);
            String request = "GET /lab/ws/echo HTTP/1.1\r\nHost: 127.0.0.1:"+target.getPort()+"\r\nOrigin: "+origin
                +"\r\nCookie: "+browser.cookie+"\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 12\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n";
            socket.getOutputStream().write(request.getBytes(StandardCharsets.US_ASCII));
            ByteArrayOutputStream response = new ByteArrayOutputStream();
            while (response.size() < 4096) {
                int value = socket.getInputStream().read(); if (value < 0) break; response.write(value);
                if (response.toString(StandardCharsets.US_ASCII).endsWith("\r\n\r\n")) break;
            }
            assertTrue(response.toString(StandardCharsets.US_ASCII).startsWith("HTTP/1.1 426"), "Actual failed protocol upgrade");
        }
    }
    private void originalRestBoundary() throws Exception {
        Browser alice = new Browser(); String basic = basic("alice");
        HttpResponse<String> token = alice.request("/api/csrf", "GET", "", Map.of("Authorization", basic));
        assertEquals(200, token.statusCode(), "Existing Basic API"); JsonNode csrf = JSON.readTree(token.body());
        String payload = "{\"name\":\"Owned original project\"}";
        assertEquals(403, alice.request("/api/projects", "POST", payload, Map.of("Authorization", basic, "Content-Type", "application/json")).statusCode(), "Original mutation still CSRF protected");
        HttpResponse<String> created = alice.request("/api/projects", "POST", payload,
            Map.of("Authorization", basic, "Content-Type", "application/json", csrf.get("headerName").asString(), csrf.get("token").asString()));
        assertEquals(201, created.statusCode(), "Original project business operation");
        String location = created.headers().firstValue("Location").orElseThrow();
        assertEquals(404, new Browser().request(location, "GET", "", Map.of("Authorization", basic("bob"))).statusCode(), "Original owner constraint");
        record("unchanged_task_tracker_basic_csrf_and_owner_contract");
    }
    private String basic(String user) { return "Basic "+Base64.getEncoder().encodeToString((user+":"+passwords.get(user)).getBytes(StandardCharsets.UTF_8)); }
    private final class Browser {
        final HttpClient client = HttpClient.newBuilder().proxy(DIRECT).executor(clients).connectTimeout(Duration.ofSeconds(2))
            .followRedirects(HttpClient.Redirect.NEVER).version(HttpClient.Version.HTTP_1_1).build();
        String cookie = "";
        HttpResponse<String> request(String path, String method, String body, Map<String, String> headers) throws Exception {
            URI target = URI.create(path.startsWith("http:") ? path : base+path);
            assertEquals(URI.create(base).getAuthority(), target.getAuthority(), "Only owned HTTP target");
            var builder = HttpRequest.newBuilder(target).timeout(Duration.ofSeconds(3)).method(method, HttpRequest.BodyPublishers.ofString(body));
            if (!cookie.isEmpty()) builder.header("Cookie", cookie);
            headers.forEach(builder::header);
            HttpResponse<String> response = client.sendAsync(builder.build(), info -> new BoundedBody()).get(4, TimeUnit.SECONDS);
            assertTrue(response.body().length() <= 16384, "Owned fixture HTTP response bound");
            for (String value : response.headers().allValues("Set-Cookie")) if (value.startsWith("JSESSIONID=")) cookie = value.substring(0, value.indexOf(';'));
            return response;
        }
        HttpResponse<String> get(String path) throws Exception { return request(path, "GET", "", Map.of()); }
        JsonNode csrf() throws Exception { HttpResponse<String> response = get("/lab/session/csrf"); assertEquals(200, response.statusCode(), "CSRF endpoint"); return JSON.readTree(response.body()); }
        HttpResponse<String> form(String path, Map<String, String> values) throws Exception {
            StringJoiner encoded = new StringJoiner("&"); values.forEach((key, value) -> encoded.add(URLEncoder.encode(key, StandardCharsets.UTF_8)+"="+URLEncoder.encode(value, StandardCharsets.UTF_8)));
            return request(path, "POST", encoded.toString(), Map.of("Content-Type", "application/x-www-form-urlencoded"));
        }
        HttpResponse<String> login(String user, String password, JsonNode csrf) throws Exception {
            return form("/lab/session/login", Map.of("username", user, "password", password, csrf.get("parameter").asString(), csrf.get("token").asString()));
        }
    }
    private static final class BoundedBody implements HttpResponse.BodySubscriber<String> {
        final CompletableFuture<String> result = new CompletableFuture<>();
        final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        Flow.Subscription subscription;
        @Override public CompletionStage<String> getBody() { return result; }
        @Override public void onSubscribe(Flow.Subscription subscription) { this.subscription = subscription; subscription.request(1); }
        @Override public void onNext(List<ByteBuffer> buffers) {
            for (ByteBuffer buffer : buffers) {
                if (bytes.size()+buffer.remaining() > 16384) { subscription.cancel(); result.completeExceptionally(new IOException("HTTP fixture body limit")); return; }
                while (buffer.hasRemaining()) bytes.write(buffer.get());
            }
            subscription.request(1);
        }
        @Override public void onError(Throwable failure) { result.completeExceptionally(new IOException("Owned HTTP body failure")); }
        @Override public void onComplete() { result.complete(bytes.toString(StandardCharsets.UTF_8)); }
    }
    private static final class Peer implements WebSocket.Listener, AutoCloseable {
        WebSocket socket;
        final ArrayBlockingQueue<String> messages = new ArrayBlockingQueue<>(8);
        final CompletableFuture<Integer> closed = new CompletableFuture<>();
        final StringBuilder partial = new StringBuilder();
        @Override public void onOpen(WebSocket socket) { socket.request(1); }
        @Override public CompletionStage<?> onText(WebSocket socket, CharSequence value, boolean last) {
            if (partial.length()+value.length() > 2048) { socket.abort(); closed.completeExceptionally(new AssertionError("Client frame bound")); return null; }
            partial.append(value);
            if (last) { if (!messages.offer(partial.toString())) { socket.abort(); closed.completeExceptionally(new AssertionError("Client queue bound")); } partial.setLength(0); }
            socket.request(1); return null;
        }
        @Override public CompletionStage<?> onClose(WebSocket socket, int code, String reason) { closed.complete(code); return null; }
        @Override public void onError(WebSocket socket, Throwable failure) { closed.completeExceptionally(new AssertionError("Owned WebSocket transport failure")); }
        void send(String value) throws Exception { socket.sendText(value, true).get(2, TimeUnit.SECONDS); }
        void ack(String id) throws Exception { send(JSON.writeValueAsString(Map.of("type", "ack", "id", id))); }
        String next() throws Exception { String value = messages.poll(2, TimeUnit.SECONDS); assertNotNull(value, "Bounded expected reply"); return value; }
        void finish() throws Exception { if (!closed.isDone()) { socket.sendClose(1000, "done").get(2, TimeUnit.SECONDS); assertEquals(1000, closed.get(3, TimeUnit.SECONDS), "Graceful close"); } }
        @Override public void close() { if (socket != null) { if (!closed.isDone()) { try { finish(); } catch (Exception failure) { socket.abort(); } } socket.abort(); } }
    }
}
