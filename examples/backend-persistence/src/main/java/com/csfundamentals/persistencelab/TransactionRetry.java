package com.csfundamentals.persistencelab;

import java.sql.*;
import java.util.*;
import java.util.concurrent.TimeUnit;

/** Retries only known-aborted local transactions; never retries an unknown commit outcome. */
public final class TransactionRetry {
    private TransactionRetry() { }
    @FunctionalInterface public interface Work<T> { T execute(Connection connection,int attempt) throws Exception; }
    public record Attempt(String transactionId,String outcome) { }
    public record Result<T>(T value,List<Attempt> attempts) { }
    public static final class Failed extends SQLException {
        private final List<Attempt> attempts;
        private Failed(SQLException cause,List<Attempt> attempts) {
            super("Bounded transaction did not complete",cause.getSQLState(),cause);
            this.attempts=List.copyOf(attempts);
        }
        public List<Attempt> attempts() { return attempts; }
    }
    public static boolean knownAborted(String state) { return "40001".equals(state) || "40P01".equals(state); }
    public static <T> Result<T> run(OwnedDatabase database,int isolation,int maximumAttempts,Work<T> work) throws Exception {
        if(maximumAttempts<1 || maximumAttempts>3 || work==null)throw new IllegalArgumentException("One to three attempts and fixed work required");
        if(isolation!=Connection.TRANSACTION_READ_COMMITTED && isolation!=Connection.TRANSACTION_SERIALIZABLE)
            throw new IllegalArgumentException("This retry exercise supports only its declared RC/Serializable paths");
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
        List<Attempt> attempts=new ArrayList<>();
        for(int attempt=1;attempt<=maximumAttempts;attempt++) {
            if(System.nanoTime()>=deadline)throw new SQLTimeoutException("Transaction retry scheduling budget exhausted");
            try(Connection connection=database.connection()) {
                connection.setTransactionIsolation(isolation); connection.setAutoCommit(false);
                String transaction;
                try(Statement statement=connection.createStatement();ResultSet row=statement.executeQuery("SELECT txid_current()::text")) {
                    row.next(); transaction=row.getString(1);
                }
                try {
                    T value=work.execute(connection,attempt);
                    connection.commit(); attempts.add(new Attempt(transaction,"COMMITTED"));
                    return new Result<>(value,List.copyOf(attempts));
                } catch(SQLException failure) {
                    try { connection.rollback(); } catch(SQLException cleanup) { failure.addSuppressed(cleanup); throw new Failed(failure,attempts); }
                    attempts.add(new Attempt(transaction,Objects.toString(failure.getSQLState(),"UNKNOWN")));
                    if(!knownAborted(failure.getSQLState()) || attempt==maximumAttempts || System.nanoTime()>=deadline)
                        throw new Failed(failure,attempts);
                    // A small fixed teaching delay; production contention needs a measured backoff/jitter policy.
                    Thread.sleep(10L*attempt);
                } catch(Exception|Error failure) {
                    try { connection.rollback(); } catch(SQLException cleanup) { failure.addSuppressed(cleanup); }
                    throw failure;
                }
            }
        }
        throw new IllegalStateException("Finite attempt loop exhausted without a result");
    }
}
