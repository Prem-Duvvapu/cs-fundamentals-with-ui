package com.csfundamentals.messaging;

import java.nio.file.Path;
import java.sql.*;
import java.util.*;
import static com.csfundamentals.messaging.SagaFiles.prepare;

/** Deterministic fake business participants with REAL independent JDBC commits and receipts. */
public final class DurableSagaParticipant {
    public enum Kind { INVENTORY, PAYMENT }
    public enum Outcome { RESERVED, RELEASED, CHARGED, DECLINED }
    public enum Fault { DECLINE, UNAVAILABLE_BEFORE, TIMEOUT_AFTER_COMMIT, LOOKUP_UNAVAILABLE }
    public static final class Unavailable extends RuntimeException {
        Unavailable(String code) { super(code); }
    }
    public static final class BindingConflict extends RuntimeException {
        BindingConflict() { super("operation_id_reused_with_different_request"); }
    }
    private final SagaFiles files;
    private final Kind kind;
    public DurableSagaParticipant(Path file,String password,Kind kind) throws SQLException {
        this.files=new SagaFiles(file,password); this.kind=Objects.requireNonNull(kind);
        files.schema("CREATE TABLE IF NOT EXISTS saga_actions(action_id VARCHAR(128) PRIMARY KEY,binding VARCHAR(256) NOT NULL,action_type VARCHAR(16) NOT NULL,outcome VARCHAR(16) NOT NULL)",
                "CREATE TABLE IF NOT EXISTS saga_resources(id VARCHAR(80) PRIMARY KEY,stock INT NOT NULL,captured BIGINT NOT NULL)",
                "CREATE TABLE IF NOT EXISTS saga_faults(action_id VARCHAR(144) PRIMARY KEY,mode VARCHAR(32) NOT NULL,remaining INT NOT NULL)");
        try(var connection=files.open()) {
            for(String tenant:List.of("tenant-a","tenant-b")) {
                String id=tenant+(kind==Kind.INVENTORY?":widget":":captured");
                try(var insert=prepare(connection,"INSERT INTO saga_resources SELECT ?,?,0 WHERE NOT EXISTS(SELECT 1 FROM saga_resources WHERE id=?)")) {
                    insert.setString(1,id); insert.setInt(2,kind==Kind.INVENTORY?10:0); insert.setString(3,id); insert.executeUpdate();
                }
            }
        }
    }
    private void checkKind(String action) {
        if ((kind==Kind.PAYMENT)!=action.equals("charge")) throw new IllegalArgumentException("wrong_participant_for_action");
    }
    public void fault(SagaRequest request,String action,Fault mode,int count) throws SQLException {
        checkKind(action); if(count<0 || count>10)throw new IllegalArgumentException("fault_count_limit");
        String key=request.action(action)+(mode==Fault.LOOKUP_UNAVAILABLE?":lookup":"");
        try(var connection=files.open();var statement=prepare(connection,"MERGE INTO saga_faults KEY(action_id) VALUES(?,?,?)")) {
            statement.setString(1,key); statement.setString(2,mode.name()); statement.setInt(3,count); statement.executeUpdate();
        }
    }
    private Fault consumeFault(Connection connection,String key) throws SQLException {
        try(var query=prepare(connection,"SELECT mode,remaining FROM saga_faults WHERE action_id=? FOR UPDATE")) {
            query.setString(1,key);
            try(var row=query.executeQuery()) {
                if(!row.next() || row.getInt(2)==0)return null;
                var result=Fault.valueOf(row.getString(1));
                try(var update=prepare(connection,"UPDATE saga_faults SET remaining=remaining-1 WHERE action_id=?")) {
                    update.setString(1,key); update.executeUpdate();
                }
                return result;
            }
        }
    }
    private Optional<Outcome> receipt(Connection connection,SagaRequest request,String action,boolean lock) throws SQLException {
        try(var query=prepare(connection,"SELECT binding,outcome FROM saga_actions WHERE action_id=?"+(lock?" FOR UPDATE":""))) {
            query.setString(1,request.action(action));
            try(var row=query.executeQuery()) {
                if(!row.next())return Optional.empty();
                if(!request.binding().equals(row.getString(1)))throw new BindingConflict();
                return Optional.of(Outcome.valueOf(row.getString(2)));
            }
        }
    }
    public Optional<Outcome> lookup(SagaRequest request,String action) throws SQLException {
        checkKind(action);
        try(var connection=files.open()) {
            connection.setAutoCommit(false);
            if(consumeFault(connection,request.action(action)+":lookup")!=null) {
                connection.commit(); throw new Unavailable("dependency_lookup_unavailable");
            }
            var result=receipt(connection,request,action,false); connection.commit(); return result;
        }
    }
    public Outcome execute(SagaRequest request,String action) throws SQLException {
        checkKind(action);
        try(var connection=files.open()) {
            connection.setAutoCommit(false);
            try {
                var previous=receipt(connection,request,action,true);
                if(previous.isPresent()) { connection.commit(); return previous.get(); }
                var fault=consumeFault(connection,request.action(action));
                if(fault==Fault.UNAVAILABLE_BEFORE) { connection.commit(); throw new Unavailable("dependency_unavailable_before_commit"); }
                Outcome outcome;
                if(fault==Fault.DECLINE)outcome=Outcome.DECLINED;
                else if(action.equals("reserve"))outcome=reserve(connection,request);
                else if(action.equals("release"))outcome=release(connection,request);
                else outcome=charge(connection,request);
                try(var insert=prepare(connection,"INSERT INTO saga_actions VALUES(?,?,?,?)")) {
                    insert.setString(1,request.action(action)); insert.setString(2,request.binding()); insert.setString(3,action);
                    insert.setString(4,outcome.name()); insert.executeUpdate();
                }
                connection.commit();
                if(fault==Fault.TIMEOUT_AFTER_COMMIT)throw new Unavailable("dependency_timeout_unknown_outcome");
                return outcome;
            } catch(SQLException|RuntimeException failure) { connection.rollback(); throw failure; }
        }
    }
    private Outcome reserve(Connection connection,SagaRequest request) throws SQLException {
        String resource=request.tenant()+":"+request.sku();
        try(var query=prepare(connection,"SELECT stock FROM saga_resources WHERE id=? FOR UPDATE")) {
            query.setString(1,resource);
            try(var row=query.executeQuery()) {
                if(!row.next() || row.getInt(1)<request.quantity())return Outcome.DECLINED;
            }
        }
        try(var update=prepare(connection,"UPDATE saga_resources SET stock=stock-? WHERE id=?")) {
            update.setInt(1,request.quantity()); update.setString(2,resource); update.executeUpdate();
        }
        return Outcome.RESERVED;
    }
    private Outcome release(Connection connection,SagaRequest request) throws SQLException {
        var reserved=receipt(connection,request,"reserve",true).orElseThrow(()->new IllegalStateException("compensation_without_reservation"));
        if(reserved!=Outcome.RESERVED)throw new IllegalStateException("reservation_not_active_for_compensation");
        try(var update=prepare(connection,"UPDATE saga_resources SET stock=stock+? WHERE id=?")) {
            update.setInt(1,request.quantity()); update.setString(2,request.tenant()+":"+request.sku());
            if(update.executeUpdate()!=1)throw new IllegalStateException("reservation_resource_missing");
        }
        try(var update=prepare(connection,"UPDATE saga_actions SET outcome='RELEASED' WHERE action_id=?")) {
            update.setString(1,request.action("reserve")); update.executeUpdate();
        }
        return Outcome.RELEASED;
    }
    private Outcome charge(Connection connection,SagaRequest request) throws SQLException {
        try(var update=prepare(connection,"UPDATE saga_resources SET captured=captured+? WHERE id=?")) {
            update.setInt(1,request.cents()); update.setString(2,request.tenant()+":captured");
            if(update.executeUpdate()!=1)throw new IllegalStateException("payment_account_missing");
        }
        return Outcome.CHARGED;
    }
    public long stock(String tenant) throws SQLException { return resource(tenant+":widget","stock"); }
    public long captured(String tenant) throws SQLException { return resource(tenant+":captured","captured"); }
    private long resource(String id,String column) throws SQLException {
        try(var connection=files.open();var query=prepare(connection,"SELECT "+column+" FROM saga_resources WHERE id=?")) {
            query.setString(1,id); try(var row=query.executeQuery()) { return row.next()?row.getLong(1):0; }
        }
    }
    public int effects(String action) throws SQLException {
        checkKind(action);
        try(var connection=files.open();var query=prepare(connection,"SELECT COUNT(*) FROM saga_actions WHERE action_type=? AND outcome<>'DECLINED'")) {
            query.setString(1,action); try(var row=query.executeQuery()) { row.next();return row.getInt(1); }
        }
    }
}
