package com.csfundamentals.webhooks;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.SecureRandom;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class WebhookContractsTest {
    @TempDir Path temporary;
    private static byte[] bytes(String text) { return text.getBytes(StandardCharsets.UTF_8); }
    private static byte[] key() { byte[] value=new byte[32];new SecureRandom().nextBytes(value);return value; }
    private static final String BODY="{\"schemaVersion\":1,\"eventId\":\"evt-test\",\"type\":\"credit\",\"amountMinor\":7}";
    private static String sign(byte[] key,String tenant,String timestamp,byte[] body) { return HexFormat.of().formatHex(Signatures.mac(key,tenant,timestamp,body)); }
    private EventStore store() throws Exception { return new EventStore("jdbc:h2:file:"+temporary.resolve("events")+";WRITE_DELAY=0;DB_CLOSE_ON_EXIT=FALSE",UUID.randomUUID().toString()); }
    @Test void hmacBindsExactRawBytesTenantTimestampAndKey() {
        byte[] secret=key();String timestamp="1792324800";
        var signatures=new Signatures(Map.of("tenant-a",Map.of("new",secret),"tenant-b",Map.of("new",key())),Clock.fixed(Instant.ofEpochSecond(Long.parseLong(timestamp)),ZoneOffset.UTC));
        String valid=sign(secret,"tenant-a",timestamp,bytes(BODY));
        assertDoesNotThrow(()->signatures.verify("tenant-a","new",timestamp,valid,bytes(BODY)));
        for (Runnable bad:List.<Runnable>of(
                ()->signatures.verify("tenant-b","new",timestamp,valid,bytes(BODY)),
                ()->signatures.verify("tenant-a","new",timestamp,valid,bytes(BODY+" ")),
                ()->signatures.verify("tenant-a","missing",timestamp,valid,bytes(BODY)),
                ()->signatures.verify("tenant-a","new","1792324799",valid,bytes(BODY)),
                ()->signatures.verify("tenant-a","new",timestamp,valid.toUpperCase(),bytes(BODY)))) {
            assertEquals(401,assertThrows(Failure.class,bad::run).status);
        }
    }
    @Test void authenticatedStaleAndFutureMessagesAreRejectedAtExplicitWindow() {
        byte[] secret=key();long now=1792324800;
        var signatures=new Signatures(Map.of("tenant-a",Map.of("new",secret)),Clock.fixed(Instant.ofEpochSecond(now),ZoneOffset.UTC));
        for (long delta:List.of(-61L,61L)) {
            String timestamp=Long.toString(now+delta);
            assertEquals(401,assertThrows(Failure.class,()->signatures.verify("tenant-a","new",timestamp,sign(secret,"tenant-a",timestamp,bytes(BODY)),bytes(BODY))).status);
        }
        for (long delta:List.of(-60L,60L)) {
            String timestamp=Long.toString(now+delta);
            assertDoesNotThrow(()->signatures.verify("tenant-a","new",timestamp,sign(secret,"tenant-a",timestamp,bytes(BODY)),bytes(BODY)));
        }
    }
    @Test void overlapThenRetirementAndDefensiveKeyCopy() {
        byte[] old=key(),newKey=key();String timestamp="1792324800";
        var clock=Clock.fixed(Instant.ofEpochSecond(Long.parseLong(timestamp)),ZoneOffset.UTC);
        var overlap=new Signatures(Map.of("tenant-a",Map.of("old",old,"new",newKey)),clock);
        String signedOld=sign(old,"tenant-a",timestamp,bytes(BODY)),signedNew=sign(newKey,"tenant-a",timestamp,bytes(BODY));
        Arrays.fill(old,(byte)0);
        assertDoesNotThrow(()->overlap.verify("tenant-a","old",timestamp,signedOld,bytes(BODY)));
        assertDoesNotThrow(()->overlap.verify("tenant-a","new",timestamp,signedNew,bytes(BODY)));
        var retired=new Signatures(Map.of("tenant-a",Map.of("new",newKey)),clock);
        assertEquals(401,assertThrows(Failure.class,()->retired.verify("tenant-a","old",timestamp,signedOld,bytes(BODY))).status);
        assertDoesNotThrow(()->retired.verify("tenant-a","new",timestamp,signedNew,bytes(BODY)));
    }
    @Test void compatibleSchemasPreserveAmountMeaningAndRejectAmbiguousInput() {
        assertEquals(7,Payload.parse(bytes(BODY),2).amountMinor());
        String v2=BODY.replace("\"schemaVersion\":1","\"schemaVersion\":2").replace("}",",\"deliveryHint\":\"optional descriptive text\"}");
        assertEquals(7,Payload.parse(bytes(v2),2).amountMinor());
        var invalid=List.of(v2,BODY.replace("\"schemaVersion\":1","\"schemaVersion\":3"),BODY.replace("\"amountMinor\":7","\"amountMinor\":7,\"amountMinor\":8"),BODY+"{}",BODY.replace("\"amountMinor\":7","\"amountMinor\":\"7\""),BODY.replace("\"amountMinor\":7","\"amountMinor\":-7"));
        for (String text:invalid) assertEquals(422,assertThrows(Failure.class,()->Payload.parse(bytes(text),1)).status);
        assertEquals(422,assertThrows(Failure.class,()->Payload.parse(new byte[]{(byte)0xc3,(byte)0x28},2)).status);
    }
    @Test void concurrentSameEventCommitsOneEffectAndAllReceiptsMatch() throws Exception {
        var store=store();var executor=Executors.newFixedThreadPool(4);var gate=new CountDownLatch(1);
        try {
            var futures=new ArrayList<Future<String>>();
            for(int i=0;i<4;i++)futures.add(executor.submit(()->{gate.await();return store.accept("tenant-a",Payload.parse(bytes(BODY),2),bytes(BODY));}));
            gate.countDown();var outcomes=new ArrayList<String>();
            for(var future:futures)outcomes.add(future.get(5,TimeUnit.SECONDS));
            assertEquals(1,Collections.frequency(outcomes,"applied"));assertEquals(3,Collections.frequency(outcomes,"duplicate"));
            assertEquals(Map.of("balance",7L,"receipts",1L,"effects",1L),store.observe().get("tenant-a"));
        } finally {executor.shutdownNow();assertTrue(executor.awaitTermination(2,TimeUnit.SECONDS));}
    }
    @Test void changedBytesConflictButSameIdInAnotherTenantIsIndependent() throws Exception {
        var store=store();store.accept("tenant-a",Payload.parse(bytes(BODY),2),bytes(BODY));
        assertEquals(409,assertThrows(Failure.class,()->store.accept("tenant-a",Payload.parse(bytes(BODY+" "),2),bytes(BODY+" "))).status);
        assertEquals("applied",store.accept("tenant-b",Payload.parse(bytes(BODY),2),bytes(BODY)));
        assertEquals(7L,store.observe().get("tenant-a").get("balance"));assertEquals(7L,store.observe().get("tenant-b").get("balance"));
    }
    @Test void rollbackRemovesReceiptEffectAndBalanceTogether() throws Exception {
        var store=store();
        assertThrows(IllegalStateException.class,()->store.accept("tenant-a",Payload.parse(bytes(BODY),2),bytes(BODY),true));
        assertEquals(Map.of("balance",0L,"receipts",0L,"effects",0L),store.observe().get("tenant-a"));
        assertEquals("applied",store.accept("tenant-a",Payload.parse(bytes(BODY),2),bytes(BODY)));
    }
    @Test void reopenedFileRetainsCommittedOutcomeAndRejectsChangedPayload() throws Exception {
        String password=UUID.randomUUID().toString(),url="jdbc:h2:file:"+temporary.resolve("restart")+";WRITE_DELAY=0;DB_CLOSE_ON_EXIT=FALSE";
        new EventStore(url,password).accept("tenant-a",Payload.parse(bytes(BODY),2),bytes(BODY));
        var reopened=new EventStore(url,password);
        assertEquals("duplicate",reopened.accept("tenant-a",Payload.parse(bytes(BODY),2),bytes(BODY)));
        assertEquals(1L,reopened.observe().get("tenant-a").get("effects"));
        assertEquals(409,assertThrows(Failure.class,()->reopened.accept("tenant-a",Payload.parse(bytes(BODY+" "),2),bytes(BODY+" "))).status);
    }
}
