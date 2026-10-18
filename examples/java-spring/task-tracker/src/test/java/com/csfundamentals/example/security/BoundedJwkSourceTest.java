package com.csfundamentals.example.security;

import com.nimbusds.jose.*;
import com.nimbusds.jose.jwk.*;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import static org.junit.jupiter.api.Assertions.*;

class BoundedJwkSourceTest {
    private static JWKSelector selector(String id) { return new JWKSelector(new JWKMatcher.Builder().keyID(id).build()); }
    @Test void actualHttpCacheAndUnknownKidRefreshHaveFiniteBudgetAndThrottle() throws Exception {
        try(JwksFixture fixture=new JwksFixture()) {
            AtomicLong clock=new AtomicLong();
            BoundedJwkSource source=new BoundedJwkSource(fixture.uri(),Duration.ofSeconds(2),clock::get,3);
            assertEquals(1,source.get(selector("first"),null).size());
            assertEquals(1,source.get(selector("first"),null).size()); assertEquals(1,fixture.calls.get());
            assertThrows(KeySourceException.class,()->source.get(selector("missing"),null));
            assertEquals(1,fixture.calls.get());
            for(int attempt=0;attempt<2;attempt++) { clock.addAndGet(Duration.ofSeconds(1).toNanos()); assertTrue(source.get(selector("missing"),null).isEmpty()); }
            clock.addAndGet(Duration.ofSeconds(1).toNanos());
            assertThrows(KeySourceException.class,()->source.get(selector("missing"),null)); assertEquals(3,fixture.calls.get());
        }
    }
    @Test void actualRotationHonorsCacheExpiryAndDoesNotRetainRemovedKeysForever() throws Exception {
        try(JwksFixture fixture=new JwksFixture()) {
            AtomicLong clock=new AtomicLong();
            BoundedJwkSource source=new BoundedJwkSource(fixture.uri(),Duration.ofSeconds(2),clock::get,8);
            assertEquals(1,source.get(selector("first"),null).size());
            fixture.body.set(new JWKSet(List.of(fixture.first.toPublicJWK(),fixture.second.toPublicJWK())).toString());
            clock.addAndGet(Duration.ofSeconds(1).toNanos());
            assertEquals(1,source.get(selector("second"),null).size());
            fixture.body.set(new JWKSet(fixture.second.toPublicJWK()).toString());
            assertEquals(1,source.get(selector("first"),null).size(),"Old key remains accepted within the documented cache window");
            clock.addAndGet(Duration.ofSeconds(3).toNanos());
            assertTrue(source.get(selector("first"),null).isEmpty()); assertEquals(3,fixture.calls.get());
        }
    }
    @Test void oversizedBodiesPrivateKeysAndRedirectsAreRejected() throws Exception {
        try(JwksFixture fixture=new JwksFixture()) {
            fixture.body.set("x".repeat(32769));
            assertThrows(KeySourceException.class,()->new BoundedJwkSource(fixture.uri(),Duration.ofSeconds(2)).get(selector("first"),null));
            fixture.body.set(new JWKSet(fixture.first).toString(false));
            assertThrows(KeySourceException.class,()->new BoundedJwkSource(fixture.uri(),Duration.ofSeconds(2)).get(selector("first"),null));
            fixture.responseStatus=302;
            assertThrows(KeySourceException.class,()->new BoundedJwkSource(fixture.uri(),Duration.ofSeconds(2)).get(selector("first"),null));
            assertEquals(0,fixture.untrustedCalls.get());
        }
    }
    @Test void deadlineIncludesStalledResponseBodyAfterHeaders() throws Exception {
        try(JwksFixture fixture=new JwksFixture()) {
            fixture.delayMillis=2500;
            long start=System.nanoTime();
            assertThrows(KeySourceException.class,()->new BoundedJwkSource(fixture.uri(),Duration.ofSeconds(2)).get(selector("first"),null));
            assertTrue(System.nanoTime()-start<Duration.ofSeconds(2).toNanos());
        }
    }
    @Test void onlyExplicitLoopbackSourceAndBoundedCacheAreAllowed() {
        for(String uri:List.of("https://attacker.invalid/jwks","http://localhost:8000/jwks","http://127.0.0.1:8000/jwks?override=1")) {
            assertThrows(IllegalArgumentException.class,()->new BoundedJwkSource(URI.create(uri),Duration.ofSeconds(2)));
        }
        assertThrows(IllegalArgumentException.class,()->new BoundedJwkSource(URI.create("http://127.0.0.1:8000/jwks"),Duration.ofMinutes(2)));
    }
}
