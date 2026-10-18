package com.csfundamentals.webhooks;

import java.security.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.Semaphore;

final class EventStore {
    private final String url, password;
    private final Semaphore slots = new Semaphore(4);
    EventStore(String url, String password) throws SQLException {
        this.url = url; this.password = password;
        try (var connection = open(); var sql = connection.createStatement()) {
            sql.execute("CREATE TABLE IF NOT EXISTS totals(tenant VARCHAR(16) PRIMARY KEY, balance BIGINT NOT NULL)");
            sql.execute("CREATE TABLE IF NOT EXISTS receipts(tenant VARCHAR(16), event_id VARCHAR(64), body_hash BINARY(32) NOT NULL, schema_version INT NOT NULL, PRIMARY KEY(tenant,event_id))");
            sql.execute("CREATE TABLE IF NOT EXISTS effects(tenant VARCHAR(16), event_id VARCHAR(64), amount_minor INT NOT NULL CHECK(amount_minor BETWEEN 1 AND 1000), PRIMARY KEY(tenant,event_id), FOREIGN KEY(tenant,event_id) REFERENCES receipts(tenant,event_id))");
            for (String tenant : List.of("tenant-a", "tenant-b")) {
                try (var insert = connection.prepareStatement("INSERT INTO totals SELECT ?,0 WHERE NOT EXISTS(SELECT 1 FROM totals WHERE tenant=?)")) {
                    insert.setString(1, tenant); insert.setString(2, tenant); insert.executeUpdate();
                }
            }
        }
    }
    String accept(String tenant, Payload payload, byte[] body) throws SQLException { return accept(tenant, payload, body, false); }
    String accept(String tenant, Payload payload, byte[] body, boolean failBeforeCommit) throws SQLException {
        if (!slots.tryAcquire()) throw new Failure(429, "overloaded");
        try (var connection = open()) {
            byte[] hash = hash(body); connection.setAutoCommit(false);
            try {
                try (var insert = connection.prepareStatement("INSERT INTO receipts(tenant,event_id,body_hash,schema_version) VALUES(?,?,?,?)")) {
                    insert.setQueryTimeout(1); insert.setString(1,tenant); insert.setString(2,payload.eventId()); insert.setBytes(3,hash); insert.setInt(4,payload.schemaVersion()); insert.executeUpdate();
                }
                try (var update = connection.prepareStatement("UPDATE totals SET balance=balance+? WHERE tenant=?")) {
                    update.setQueryTimeout(1); update.setInt(1,payload.amountMinor()); update.setString(2,tenant);
                    if (update.executeUpdate() != 1) throw new IllegalStateException("tenant_not_registered");
                }
                try (var insert = connection.prepareStatement("INSERT INTO effects(tenant,event_id,amount_minor) VALUES(?,?,?)")) {
                    insert.setQueryTimeout(1); insert.setString(1,tenant); insert.setString(2,payload.eventId()); insert.setInt(3,payload.amountMinor()); insert.executeUpdate();
                }
                if (failBeforeCommit) throw new IllegalStateException("injected_before_commit");
                connection.commit(); return "applied";
            } catch (SQLException failure) {
                connection.rollback();
                if (!"23505".equals(failure.getSQLState())) throw failure;
                try (var select = connection.prepareStatement("SELECT body_hash FROM receipts WHERE tenant=? AND event_id=?")) {
                    select.setQueryTimeout(1); select.setString(1,tenant); select.setString(2,payload.eventId());
                    try (var rows = select.executeQuery()) {
                        if (!rows.next()) throw new SQLException("receipt_unavailable");
                        if (!MessageDigest.isEqual(hash, rows.getBytes(1))) throw new Failure(409,"event_conflict");
                        connection.rollback(); return "duplicate";
                    }
                }
            } catch (RuntimeException failure) { connection.rollback(); throw failure; }
        } finally { slots.release(); }
    }
    Map<String, Map<String, Long>> observe() throws SQLException {
        try (var connection = open(); var sql = connection.createStatement()) {
            sql.setQueryTimeout(1);
            var result = new LinkedHashMap<String, Map<String, Long>>();
            try (var rows = sql.executeQuery("SELECT t.tenant,t.balance,(SELECT COUNT(*) FROM receipts r WHERE r.tenant=t.tenant),(SELECT COUNT(*) FROM effects e WHERE e.tenant=t.tenant) FROM totals t ORDER BY t.tenant")) {
                while (rows.next()) result.put(rows.getString(1), Map.of("balance",rows.getLong(2),"receipts",rows.getLong(3),"effects",rows.getLong(4)));
            }
            return result;
        }
    }
    private Connection open() throws SQLException {
        var connection = DriverManager.getConnection(url,"sa",password);
        try (var sql = connection.createStatement()) { sql.execute("SET LOCK_TIMEOUT 750"); }
        return connection;
    }
    private static byte[] hash(byte[] body) {
        try { return MessageDigest.getInstance("SHA-256").digest(body); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException("sha256_unavailable"); }
    }
}
