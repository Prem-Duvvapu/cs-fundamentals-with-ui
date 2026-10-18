package com.csfundamentals.example.security;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.*;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jwt.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.*;
import org.springframework.test.annotation.DirtiesContext;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,
        classes=com.csfundamentals.example.TaskTrackerApplication.class,
        properties="spring.datasource.url=jdbc:h2:mem:jwt-http;DB_CLOSE_DELAY=-1")
@ActiveProfiles("jwt")
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class JwtHttpTest {
    private static final String ISSUER="https://issuer.example.test",AUDIENCE="task-tracker-api";
    private static final String ALICE_PASSWORD=UUID.randomUUID().toString();
    private static final JwksFixture FIXTURE;
    static { try { FIXTURE=new JwksFixture(); }catch(Exception exception){throw new ExceptionInInitializerError(exception);} }
    @DynamicPropertySource static void properties(DynamicPropertyRegistry properties) {
        properties.add("TASK_TRACKER_JWKS_URI",()->FIXTURE.uri().toString());
        properties.add("TASK_TRACKER_JWT_ISSUER",()->ISSUER); properties.add("TASK_TRACKER_JWT_AUDIENCE",()->AUDIENCE);
        properties.add("TASK_TRACKER_JWKS_CACHE_SECONDS",()->2);
        properties.add("TASK_TRACKER_ALICE_PASSWORD",()->ALICE_PASSWORD);
        properties.add("TASK_TRACKER_BOB_PASSWORD",()->UUID.randomUUID().toString());
        properties.add("TASK_TRACKER_VIEWER_PASSWORD",()->UUID.randomUUID().toString());
    }
    @AfterAll static void cleanup() throws Exception { FIXTURE.close(); }
    @LocalServerPort int port;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    private JWTClaimsSet.Builder claims(String subject,String scopes) {
        return new JWTClaimsSet.Builder().issuer(ISSUER).audience(AUDIENCE).subject(subject).issueTime(new Date())
                .expirationTime(Date.from(Instant.now().plusSeconds(300))).claim("scope",scopes);
    }
    private String token(RSAKey key,JWTClaimsSet claims) throws Exception {
        return token(key,new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(),claims);
    }
    private String token(RSAKey key,JWSHeader header,JWTClaimsSet claims) throws Exception {
        SignedJWT jwt=new SignedJWT(header,claims); jwt.sign(new RSASSASigner(key)); return jwt.serialize();
    }
    private String alice(String scopes) throws Exception { return token(FIXTURE.first,claims("alice",scopes).build()); }
    private HttpResponse<String> call(String path,String method,String json,String authorization) throws Exception {
        HttpRequest.Builder request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(4));
        if(authorization!=null)request.header("Authorization",authorization);
        if(json!=null)request.header("Content-Type","application/json");
        request.method(method,json==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json));
        return client.send(request.build(),HttpResponse.BodyHandlers.ofString());
    }
    @Test @Order(1) void actualBearerTransportKeepsObjectAndFieldOwnershipAndSeparateBasicCsrf() throws Exception {
        String write=alice("projects:read projects:write");
        HttpResponse<String> created=call("/api/projects","POST","{\"name\":\"' OR 1=1 --\",\"owner\":\"bob\",\"id\":9999,\"version\":99}","Bearer "+write);
        assertEquals(201,created.statusCode());
        String location=created.headers().firstValue("Location").orElseThrow();
        String path=URI.create(location).getPath();
        assertFalse(created.body().contains("\"owner\""));
        assertEquals(200,call(path,"GET",null,"Bearer "+write).statusCode());
        String bob=token(FIXTURE.first,claims("bob","projects:read projects:write").build());
        assertEquals(404,call(path,"GET",null,"Bearer "+bob).statusCode());
        assertEquals(404,call(path,"DELETE",null,"Bearer "+bob).statusCode());
        String viewer=token(FIXTURE.first,claims("viewer","projects:read").claim("roles",List.of("ROLE_LEARNER","ROLE_ADMIN")).build());
        assertEquals(403,call(path,"DELETE",null,"Bearer "+viewer).statusCode());
        assertEquals(403,call("/api/projects","GET",null,"Bearer "+alice("admin")).statusCode());
        String basic="Basic "+Base64.getEncoder().encodeToString(("alice:"+ALICE_PASSWORD).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertEquals(200,call(path,"GET",null,basic).statusCode(),"Basic remains independent");
        assertEquals(403,call("/api/projects","POST","{\"name\":\"Must need CSRF\"}",basic).statusCode());
    }
    @Test @Order(2) void issuerAudienceExpiryNotBeforeAndLifetimeAreReallyValidated() throws Exception {
        for(JWTClaimsSet invalid:List.of(
                claims("alice","projects:read").issuer("https://wrong-issuer.invalid").build(),
                claims("alice","projects:read").audience("wrong-api").build(),
                claims("alice","projects:read").expirationTime(Date.from(Instant.now().minusSeconds(60))).build(),
                claims("alice","projects:read").expirationTime(null).build(),
                claims("alice","projects:read").notBeforeTime(Date.from(Instant.now().plusSeconds(60))).build(),
                claims("alice","projects:read").issueTime(Date.from(Instant.now().plusSeconds(30))).build(),
                claims("alice","projects:read").expirationTime(Date.from(Instant.now().plusSeconds(1000))).build(),
                claims(null,"projects:read").build())) {
            HttpResponse<String> rejected=call("/api/projects","GET",null,"Bearer "+token(FIXTURE.first,invalid));
            assertEquals(401,rejected.statusCode()); assertEquals("{\"error\":\"invalid_token\"}",rejected.body());
        }
    }
    @Test @Order(3) void signatureAlgorithmAndHeaderKeySourceAreNotTrustedFromToken() throws Exception {
        JWSHeader trustedWithUntrustedUri=new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("first").jwkURL(FIXTURE.untrustedUri()).build();
        assertEquals(200,call("/api/projects","GET",null,"Bearer "+token(FIXTURE.first,trustedWithUntrustedUri,claims("alice","projects:read").build())).statusCode());
        assertEquals(401,call("/api/projects","GET",null,"Bearer "+token(FIXTURE.untrusted,trustedWithUntrustedUri,claims("alice","projects:read").build())).statusCode());
        SignedJWT wrongAlgorithm=new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.HS256).keyID("first").build(),claims("alice","projects:read").build());
        byte[] secret=new byte[32]; new java.security.SecureRandom().nextBytes(secret); wrongAlgorithm.sign(new MACSigner(secret));
        assertEquals(401,call("/api/projects","GET",null,"Bearer "+wrongAlgorithm.serialize()).statusCode());
        assertEquals(401,call("/api/projects","GET",null,"Bearer "+new PlainJWT(claims("alice","projects:read").build()).serialize()).statusCode());
        assertEquals(0,FIXTURE.untrustedCalls.get(),"Token jku did not control outbound fetching");
    }
    @Test @Order(4) void queryCookieAndOversizedTokenAreNotAlternateCredentialSources() throws Exception {
        assertEquals(401,call("/api/projects?access_token="+alice("projects:read"),"GET",null,null).statusCode());
        HttpRequest cookie=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/projects")).header("Cookie","access_token="+alice("projects:read")).GET().build();
        assertEquals(401,client.send(cookie,HttpResponse.BodyHandlers.ofString()).statusCode());
        int before=FIXTURE.calls.get();
        assertEquals(401,call("/api/projects","GET",null,"Bearer "+"x".repeat(4097)).statusCode());
        assertEquals(before,FIXTURE.calls.get());
    }
    @Test @Order(99) void actualKeyRotationAcceptsOverlapThenRejectsRemovedOldKeyAfterTtl() throws Exception {
        FIXTURE.body.set(new JWKSet(List.of(FIXTURE.first.toPublicJWK(),FIXTURE.second.toPublicJWK())).toString());
        Thread.sleep(1100); // Permit one deliberate unknown-kid refresh.
        String newToken=token(FIXTURE.second,claims("alice","projects:read").build());
        assertEquals(200,call("/api/projects","GET",null,"Bearer "+newToken).statusCode());
        assertEquals(200,call("/api/projects","GET",null,"Bearer "+alice("projects:read")).statusCode());
        FIXTURE.body.set(new JWKSet(FIXTURE.second.toPublicJWK()).toString());
        Thread.sleep(2100);
        assertEquals(401,call("/api/projects","GET",null,"Bearer "+alice("projects:read")).statusCode());
        assertEquals(200,call("/api/projects","GET",null,"Bearer "+newToken).statusCode());
    }
}
