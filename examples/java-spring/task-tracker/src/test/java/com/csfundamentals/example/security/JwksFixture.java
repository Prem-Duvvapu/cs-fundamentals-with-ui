package com.csfundamentals.example.security;

import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.JWSAlgorithm;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public final class JwksFixture implements AutoCloseable {
    public final RSAKey first=key("first"),second=key("second"),untrusted=key("untrusted");
    public final AtomicReference<String> body=new AtomicReference<>(new JWKSet(first.toPublicJWK()).toString());
    public final AtomicInteger calls=new AtomicInteger(), untrustedCalls=new AtomicInteger();
    public volatile int responseStatus=200;
    public volatile long delayMillis;
    private final HttpServer server;
    private final ExecutorService workers=Executors.newFixedThreadPool(2);
    public JwksFixture() throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),4); server.setExecutor(workers);
        server.createContext("/jwks",exchange->{
            calls.incrementAndGet();
            byte[] bytes=body.get().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.getResponseHeaders().set("Location",untrustedUri().toString());
            try {
                exchange.sendResponseHeaders(responseStatus,bytes.length);
                if(delayMillis>0)Thread.sleep(delayMillis);
                exchange.getResponseBody().write(bytes);
            } catch(InterruptedException exception) { Thread.currentThread().interrupt(); }
            catch(java.io.IOException ignored) { /* A bounded caller can cancel before the fixture writes. */ }
            finally { exchange.close(); }
        });
        server.createContext("/untrusted",exchange->{
            untrustedCalls.incrementAndGet(); byte[] bytes="{}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200,bytes.length); exchange.getResponseBody().write(bytes); exchange.close();
        });
        server.start();
    }
    private static RSAKey key(String id) {
        try { return new RSAKeyGenerator(2048).keyID(id).algorithm(JWSAlgorithm.RS256).keyUse(KeyUse.SIGNATURE).generate(); }
        catch(Exception exception) { throw new IllegalStateException(exception); }
    }
    public URI uri() { return URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/jwks"); }
    public URI untrustedUri() { return URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/untrusted"); }
    @Override public void close() throws InterruptedException { server.stop(0); workers.shutdownNow(); workers.awaitTermination(3,TimeUnit.SECONDS); }
}
