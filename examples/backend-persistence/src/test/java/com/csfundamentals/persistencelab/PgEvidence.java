package com.csfundamentals.persistencelab;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;

final class PgEvidence {
    static void sql(Connection connection,String text) throws SQLException {
        try(Statement statement=connection.createStatement()) { statement.execute(text); }
    }
    static long number(Connection connection,String text) throws SQLException {
        try(Statement statement=connection.createStatement();ResultSet rows=statement.executeQuery(text)) {
            if(!rows.next())throw new SQLException("Expected one fixture observation"); return rows.getLong(1);
        }
    }
    static String text(Connection connection,String text) throws SQLException {
        try(Statement statement=connection.createStatement();ResultSet rows=statement.executeQuery(text)) {
            if(!rows.next())throw new SQLException("Expected one fixture observation"); return rows.getString(1);
        }
    }
    static List<Integer> ids(Connection connection,String text) throws SQLException {
        List<Integer> values=new ArrayList<>();
        try(Statement statement=connection.createStatement();ResultSet rows=statement.executeQuery(text)) {
            while(rows.next()) { if(values.size()>=20000)throw new SQLException("Fixture row cap"); values.add(rows.getInt(1)); }
        }
        return values;
    }
    static void begin(Connection connection,int isolation) throws SQLException {
        connection.setTransactionIsolation(isolation); connection.setAutoCommit(false);
        sql(connection,"SET LOCAL lock_timeout='2200ms'; SET LOCAL statement_timeout='2500ms'");
    }
    static int pid(Connection connection) throws SQLException { return Math.toIntExact(number(connection,"SELECT pg_backend_pid()")); }
    static boolean blockedBy(Connection observer,int waiter,int holder) throws SQLException {
        return number(observer,"SELECT count(*) FROM pg_stat_activity WHERE pid="+waiter
            +" AND wait_event_type='Lock' AND "+holder+"=ANY(pg_blocking_pids(pid))")==1;
    }
    static boolean awaitBlock(Connection observer,int waiter,int holder) throws Exception {
        long deadline=System.nanoTime()+TimeUnit.MILLISECONDS.toNanos(1500);
        do { if(blockedBy(observer,waiter,holder))return true; Thread.sleep(5); } while(System.nanoTime()<deadline);
        return false;
    }
    static void await(CountDownLatch latch) throws InterruptedException {
        if(!latch.await(2,TimeUnit.SECONDS))throw new IllegalStateException("Owned synchronization deadline");
    }
    static void stop(ExecutorService workers) throws InterruptedException {
        workers.shutdownNow(); if(!workers.awaitTermination(6,TimeUnit.SECONDS))throw new IllegalStateException("Owned JDBC workers did not finish");
    }
    static List<Map<String,Object>> attempts(List<TransactionRetry.Attempt> attempts) {
        return attempts.stream().map(item->Map.<String,Object>of("transactionId",item.transactionId(),"outcome",item.outcome())).toList();
    }
    static void write(String name,Object value) throws Exception {
        if(!name.matches("[a-z-]{1,32}"))throw new IllegalArgumentException("Fixed evidence filename required");
        String encoded=json(value)+"\n";
        if(encoded.getBytes(StandardCharsets.UTF_8).length>65536)throw new IllegalStateException("Evidence byte cap");
        Path directory=Path.of("target/evidence"); Files.createDirectories(directory);
        Files.writeString(directory.resolve(name+".json"),encoded,StandardCharsets.UTF_8);
    }
    private static String json(Object value) {
        if(value instanceof Number || value instanceof Boolean)return value.toString();
        if(value instanceof String text) {
            StringBuilder out=new StringBuilder("\"");
            for(char character:text.toCharArray()) {
                if(character=='"' || character=='\\')out.append('\\').append(character);
                else if(character<32)out.append(String.format("\\u%04x",(int)character));
                else out.append(character);
            }
            return out.append('"').toString();
        }
        if(value instanceof Map<?,?> map) {
            StringJoiner out=new StringJoiner(",","{","}");
            map.forEach((key,item)->out.add(json(key.toString())+":"+json(item))); return out.toString();
        }
        if(value instanceof Iterable<?> items) {
            StringJoiner out=new StringJoiner(",","[","]"); for(Object item:items)out.add(json(item)); return out.toString();
        }
        throw new IllegalArgumentException("Only explicit nonsecret evidence types are allowed");
    }
}
