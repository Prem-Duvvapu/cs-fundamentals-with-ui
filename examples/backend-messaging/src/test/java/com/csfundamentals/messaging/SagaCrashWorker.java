package com.csfundamentals.messaging;

import java.nio.file.Path;

/** Test-only owned child. Its abrupt exit proves cross-JVM persistence at a committed boundary. */
public final class SagaCrashWorker {
    public static void main(String[] args) throws Exception {
        Path directory=Path.of(args[0]);
        var crash=DurableSaga.Crash.valueOf(args[1]);
        String password=System.getenv("SAGA_LAB_PASSWORD");
        var inventory=new DurableSagaParticipant(directory.resolve("inventory"),password,DurableSagaParticipant.Kind.INVENTORY);
        var payment=new DurableSagaParticipant(directory.resolve("payment"),password,DurableSagaParticipant.Kind.PAYMENT);
        var saga=new DurableSaga(directory.resolve("coordinator"),password,inventory,payment);
        for(int tick=0;tick<6;tick++) {
            saga.tick("tenant-a","order-1",point->{
                if(point==crash) {
                    System.out.println("OWNED_WORKER_HALTING_AFTER="+point);System.out.flush();
                    Runtime.getRuntime().halt(93);
                }
            });
        }
        throw new IllegalStateException("Expected committed crash boundary was not reached");
    }
}
