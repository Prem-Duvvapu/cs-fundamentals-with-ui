package com.csfundamentals.example.security;

import com.nimbusds.jose.*;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.Flow;
import java.util.concurrent.locks.ReentrantLock;

/** A single operator-selected loopback source; JWT headers cannot supply fetch destinations. */
public final class BoundedJwkSource implements JWKSource<SecurityContext> {
    private final URI uri;
    private final long ttl;
    private final java.util.function.LongSupplier ticker;
    private final int maxCalls;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofMillis(500)).followRedirects(HttpClient.Redirect.NEVER).build();
    private final ReentrantLock lock=new ReentrantLock();
    private JWKSet cached;
    private long lastAttempt=Long.MIN_VALUE, lastSuccess;
    private int calls;
    public BoundedJwkSource(URI uri,Duration ttl) { this(uri,ttl,System::nanoTime,64); }
    BoundedJwkSource(URI uri,Duration ttl,java.util.function.LongSupplier ticker,int maxCalls) {
        if(uri==null || !"http".equals(uri.getScheme()) || !"127.0.0.1".equals(uri.getHost()) || uri.getPort()<1
                || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null)
            throw new IllegalArgumentException("Use an operator-selected loopback JWKS URI for this lab");
        if(ttl.compareTo(Duration.ofSeconds(2))<0 || ttl.compareTo(Duration.ofSeconds(30))>0)
            throw new IllegalArgumentException("JWKS cache duration must be 2 to 30 seconds");
        this.uri=uri; this.ttl=ttl.toNanos(); this.ticker=ticker;
        if(maxCalls<1 || maxCalls>64)throw new IllegalArgumentException("Invalid fetch budget");
        this.maxCalls=maxCalls;
    }
    @Override public List<JWK> get(JWKSelector selector,SecurityContext context) throws KeySourceException {
        boolean acquired=false;
        try {
            acquired=lock.tryLock(100,TimeUnit.MILLISECONDS);
            if(!acquired)throw new KeySourceException("JWKS source busy");
            long now=ticker.getAsLong();
            List<JWK> selected=cached==null?List.of():selector.select(cached);
            if(cached!=null && now-lastSuccess<ttl && !selected.isEmpty())return selected;
            if(lastAttempt!=Long.MIN_VALUE && now-lastAttempt<Duration.ofSeconds(1).toNanos())
                throw new KeySourceException("JWKS refresh throttled");
            if(calls>=maxCalls)throw new KeySourceException("JWKS process fetch budget exhausted");
            calls++; lastAttempt=now;
            JWKSet fetched=fetch();
            cached=fetched; lastSuccess=ticker.getAsLong();
            return selector.select(fetched);
        } catch(InterruptedException exception) {
            Thread.currentThread().interrupt(); throw new KeySourceException("JWKS lookup interrupted");
        } finally { if(acquired)lock.unlock(); }
    }
    private JWKSet fetch() throws KeySourceException {
        CompletableFuture<HttpResponse<byte[]>> future=client.sendAsync(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(1)).GET().build(),ignored->new LimitedBody());
        try {
            HttpResponse<byte[]> response=future.get(1200,TimeUnit.MILLISECONDS);
            if(response.statusCode()!=200 || !response.headers().firstValue("Content-Type").orElse("").startsWith("application/json"))
                throw new KeySourceException("JWKS response rejected");
            JWKSet result=JWKSet.parse(new String(response.body(),java.nio.charset.StandardCharsets.UTF_8));
            if(result.getKeys().isEmpty() || result.getKeys().size()>4)throw new KeySourceException("JWKS key count rejected");
            Set<String> identifiers=new HashSet<>();
            for(JWK key:result.getKeys()) {
                if(!(key instanceof RSAKey rsa) || rsa.size()<2048 || rsa.size()>4096 || key.isPrivate() || key.getKeyID()==null
                        || key.getKeyID().isBlank() || key.getKeyID().length()>64 || !identifiers.add(key.getKeyID())
                        || (key.getAlgorithm()!=null && !JWSAlgorithm.RS256.equals(key.getAlgorithm()))
                        || (key.getKeyUse()!=null && !KeyUse.SIGNATURE.equals(key.getKeyUse())))
                    throw new KeySourceException("JWKS key contract rejected");
            }
            return result;
        } catch(InterruptedException exception) {
            future.cancel(true); Thread.currentThread().interrupt(); throw new KeySourceException("JWKS lookup interrupted");
        } catch(KeySourceException exception) { throw exception; }
        catch(Exception exception) { future.cancel(true); throw new KeySourceException("JWKS fetch failed"); }
    }
    private static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> result=new CompletableFuture<>();
        private final ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        private Flow.Subscription subscription;
        @Override public CompletionStage<byte[]> getBody() { return result; }
        @Override public void onSubscribe(Flow.Subscription subscription) { this.subscription=subscription; subscription.request(1); }
        @Override public void onNext(List<ByteBuffer> buffers) {
            for(ByteBuffer buffer:buffers) {
                if(buffer.remaining()>32768-bytes.size()) {
                    subscription.cancel(); result.completeExceptionally(new IllegalArgumentException("JWKS body too large")); return;
                }
                byte[] chunk=new byte[buffer.remaining()]; buffer.get(chunk); bytes.writeBytes(chunk);
            }
            subscription.request(1);
        }
        @Override public void onError(Throwable error) { result.completeExceptionally(error); }
        @Override public void onComplete() { result.complete(bytes.toByteArray()); }
    }
}
