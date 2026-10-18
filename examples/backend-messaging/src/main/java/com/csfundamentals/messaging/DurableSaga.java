package com.csfundamentals.messaging;

import java.nio.file.Path;
import java.sql.*;
import java.util.*;
import static com.csfundamentals.messaging.SagaFiles.prepare;
import static com.csfundamentals.messaging.DurableSagaParticipant.Outcome;

/** Durable orchestration. No transaction spans this file and either participant file. */
public final class DurableSaga {
    public enum State { RESERVE_PENDING,PAYMENT_PENDING,RELEASE_PENDING,CONFIRMED,REJECTED,COMPENSATED,MANUAL_REVIEW }
    public enum Crash { NONE,AFTER_RESERVE_COMMIT,AFTER_PAYMENT_COMMIT,AFTER_RELEASE_COMMIT }
    @FunctionalInterface public interface Boundary { void after(Crash point); }
    public static final class Conflict extends RuntimeException { Conflict(){super("saga_request_or_version_conflict");} }
    public record Snapshot(SagaRequest request,State state,State resumeState,int failures,String error,long version,String reviewNote) {
        public boolean terminal() { return Set.of(State.CONFIRMED,State.REJECTED,State.COMPENSATED,State.MANUAL_REVIEW).contains(state); }
    }
    private final SagaFiles files;
    private final DurableSagaParticipant inventory,payment;
    public DurableSaga(Path file,String password,DurableSagaParticipant inventory,DurableSagaParticipant payment) throws SQLException {
        files=new SagaFiles(file,password); this.inventory=inventory; this.payment=payment;
        files.schema("CREATE TABLE IF NOT EXISTS saga_instances(tenant VARCHAR(16) NOT NULL,id VARCHAR(48) NOT NULL,sku VARCHAR(32) NOT NULL,quantity INT NOT NULL,cents INT NOT NULL,state VARCHAR(32) NOT NULL,resume_state VARCHAR(32) NOT NULL,failures INT NOT NULL,error VARCHAR(80) NOT NULL,version BIGINT NOT NULL,review_note VARCHAR(120) NOT NULL,PRIMARY KEY(tenant,id))");
    }
    public Snapshot start(SagaRequest request) throws SQLException {
        try(var connection=files.open()) {
            connection.setAutoCommit(false);
            var existing=read(connection,request.tenant(),request.id());
            if(existing.isPresent()) {
                if(!existing.get().request().equals(request))throw new Conflict();
                connection.commit();return existing.get();
            }
            try(var insert=prepare(connection,"INSERT INTO saga_instances VALUES(?,?,?,?,?,'RESERVE_PENDING','RESERVE_PENDING',0,'',1,'')")) {
                insert.setString(1,request.tenant());insert.setString(2,request.id());insert.setString(3,request.sku());
                insert.setInt(4,request.quantity());insert.setInt(5,request.cents());insert.executeUpdate();
            }
            connection.commit();return get(request.tenant(),request.id());
        }
    }
    private Optional<Snapshot> read(Connection connection,String tenant,String id) throws SQLException {
        try(var query=prepare(connection,"SELECT sku,quantity,cents,state,resume_state,failures,error,version,review_note FROM saga_instances WHERE tenant=? AND id=?")) {
            query.setString(1,tenant);query.setString(2,id);
            try(var row=query.executeQuery()) {
                if(!row.next())return Optional.empty();
                return Optional.of(new Snapshot(new SagaRequest(tenant,id,row.getString(1),row.getInt(2),row.getInt(3)),
                        State.valueOf(row.getString(4)),State.valueOf(row.getString(5)),row.getInt(6),row.getString(7),row.getLong(8),row.getString(9)));
            }
        }
    }
    public Snapshot get(String tenant,String id) throws SQLException {
        try(var connection=files.open()) { return read(connection,tenant,id).orElseThrow(()->new IllegalArgumentException("saga_missing")); }
    }
    private Snapshot transition(Snapshot before,State state,int failures,String error,String note) throws SQLException {
        State resume=state==State.MANUAL_REVIEW?before.state():state;
        try(var connection=files.open();var update=prepare(connection,"UPDATE saga_instances SET state=?,resume_state=?,failures=?,error=?,version=version+1,review_note=? WHERE tenant=? AND id=? AND version=?")) {
            update.setString(1,state.name());update.setString(2,resume.name());update.setInt(3,failures);update.setString(4,error);
            update.setString(5,note);update.setString(6,before.request().tenant());update.setString(7,before.request().id());update.setLong(8,before.version());
            update.executeUpdate();
        }
        // A stale worker never overwrites a newer transition; return the stored outcome.
        return get(before.request().tenant(),before.request().id());
    }
    private Outcome action(DurableSagaParticipant participant,SagaRequest request,String action,Crash point,Boundary boundary) throws SQLException {
        var receipt=participant.lookup(request,action);
        if(receipt.isPresent())return receipt.get();
        var result=participant.execute(request,action);
        boundary.after(point);return result;
    }
    public Snapshot tick(String tenant,String id) throws SQLException { return tick(tenant,id,point->{}); }
    public Snapshot tick(String tenant,String id,Boundary boundary) throws SQLException {
        var before=get(tenant,id); if(before.terminal())return before;
        var request=before.request();
        try {
            State next;
            switch(before.state()) {
                case RESERVE_PENDING -> {
                    var result=action(inventory,request,"reserve",Crash.AFTER_RESERVE_COMMIT,boundary);
                    if(result==Outcome.DECLINED)next=State.REJECTED;
                    else if(result==Outcome.RESERVED)next=State.PAYMENT_PENDING;
                    else return transition(before,State.MANUAL_REVIEW,0,"reservation_unexpected_state",before.reviewNote());
                }
                case PAYMENT_PENDING -> {
                    if(inventory.lookup(request,"reserve").orElse(null)!=Outcome.RESERVED)
                        return transition(before,State.MANUAL_REVIEW,0,"reservation_not_active",before.reviewNote());
                    var result=action(payment,request,"charge",Crash.AFTER_PAYMENT_COMMIT,boundary);
                    if(result==Outcome.CHARGED)next=State.CONFIRMED;
                    else if(result==Outcome.DECLINED)next=State.RELEASE_PENDING;
                    else return transition(before,State.MANUAL_REVIEW,0,"payment_unexpected_state",before.reviewNote());
                }
                case RELEASE_PENDING -> {
                    // An unknown payment outcome is NOT sufficient evidence to release stock.
                    if(payment.lookup(request,"charge").orElse(null)!=Outcome.DECLINED)
                        return transition(before,State.MANUAL_REVIEW,0,"payment_outcome_not_declined",before.reviewNote());
                    var result=action(inventory,request,"release",Crash.AFTER_RELEASE_COMMIT,boundary);
                    if(result==Outcome.RELEASED)next=State.COMPENSATED;
                    else return transition(before,State.MANUAL_REVIEW,0,"compensation_not_completed",before.reviewNote());
                }
                default -> { return before; }
            }
            return transition(before,next,0,"",before.reviewNote());
        } catch(DurableSagaParticipant.Unavailable failure) {
            int count=before.failures()+1;
            return transition(before,count>=3?State.MANUAL_REVIEW:before.state(),count,failure.getMessage(),before.reviewNote());
        } catch(DurableSagaParticipant.BindingConflict unsafe) {
            return transition(before,State.MANUAL_REVIEW,before.failures(),"participant_binding_conflict",before.reviewNote());
        } catch(SQLException unavailable) {
            int count=before.failures()+1;
            return transition(before,count>=3?State.MANUAL_REVIEW:before.state(),count,"dependency_database_error",before.reviewNote());
        } catch(IllegalStateException unsafe) {
            return transition(before,State.MANUAL_REVIEW,before.failures(),"participant_invariant_failed",before.reviewNote());
        }
    }
    public Snapshot resumeAfterReview(String tenant,String id,long expectedVersion,String note) throws SQLException {
        if(note==null || !note.matches("[a-z0-9 -]{5,120}"))throw new IllegalArgumentException("review_note_required");
        var before=get(tenant,id);
        if(before.state()!=State.MANUAL_REVIEW || before.version()!=expectedVersion)throw new Conflict();
        // A manual decision only permits another reconciliation attempt; it never changes the request/keys.
        try(var connection=files.open();var update=prepare(connection,"UPDATE saga_instances SET state=resume_state,failures=0,error='',review_note=?,version=version+1 WHERE tenant=? AND id=? AND version=? AND state='MANUAL_REVIEW'")) {
            update.setString(1,note);update.setString(2,tenant);update.setString(3,id);update.setLong(4,expectedVersion);
            if(update.executeUpdate()!=1)throw new Conflict();
        }
        return get(tenant,id);
    }
}
