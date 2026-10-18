package com.csfundamentals.dataservices;

import com.mongodb.MongoWriteException;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="DATA_MONGO_INTEGRATION",matches="1")
class MongoIntegrationTests {
    static MongoTickets source() { return new MongoTickets(Objects.requireNonNull(System.getenv("DATA_MONGO_URI"))); }
    @Test void documentAggregateTenantUniqueKeyAndEmbeddedDetailsPersist() {
        try(var source=source()) {
            var alice=source.create("alice","same","Alice original","high");
            source.create("bob","same","Bob private","high");
            assertEquals(alice,source.find("alice","same").orElseThrow());
            assertEquals("support",source.find("bob","same").orElseThrow().department());
            var duplicate=assertThrows(MongoWriteException.class,()->source.create("alice","same","Duplicate","low"));
            assertEquals(11000,duplicate.getError().getCode());
            assertTrue(source.find("alice","missing").isEmpty());
        }
    }
    @Test void actualCollectionValidatorRejectsWrongType() {
        try(var source=source()) {
            var fixture=new Ticket("tenant-a","bad",1,"Original","high","open","support",List.of()).document();
            var error=assertThrows(MongoWriteException.class,()->source.diagnosticsCollection().insertOne(fixture.append("version","one")));
            assertEquals(121,error.getError().getCode());
        }
    }
    @Test void actualQueryIndexAndReturnedDocumentsAgreeWithTenantScope() {
        try(var source=source()) {
            source.create("alice","urgent","Urgent original","high");
            source.create("alice","ordinary","Ordinary original","low");
            source.create("bob","private","Bob private","high");
            assertEquals(List.of("urgent"),source.openHighPriority("alice").stream().map(Ticket::id).toList());
            String plan=source.explainOpenHighPriority("alice").toJson();
            assertTrue(plan.contains("IXSCAN"),plan); assertTrue(plan.contains("tenant_status_priority"),plan);
            System.out.println("MONGODB_INDEX_PLAN="+plan);
        }
    }
    @Test void conditionalVersionUpdateHasOneWinnerAndNoLostUpdate() throws Exception {
        try(var source=source()) {
            source.create("alice","one","Original","high");
            var barrier=new CyclicBarrier(2); var executor=Executors.newFixedThreadPool(2);
            try {
                var outcomes=new ArrayList<Future<Boolean>>();
                for(String title:List.of("First","Second")) outcomes.add(executor.submit(()->{
                    barrier.await(2,TimeUnit.SECONDS);
                    try { source.rename("alice","one",1,title); return true; }
                    catch(TicketSource.Conflict expected){return false;}
                }));
                int winners=0;
                for(var result:outcomes)if(result.get(5,TimeUnit.SECONDS))winners++;
                assertEquals(1,winners); assertEquals(2,source.version("alice","one").orElseThrow());
                assertThrows(TicketSource.Conflict.class,()->source.rename("bob","one",2,"Cannot touch Alice"));
            } finally { executor.shutdownNow(); assertTrue(executor.awaitTermination(3,TimeUnit.SECONDS)); }
        }
    }
}
