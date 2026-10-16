package com.csfundamentals.aiexample;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.*;
import java.time.*;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** Local fake business mutation, deliberately independent of any model-generated authority. */
public final class RefundWorkflow {
    private final String url, user, password, secret;
    private final Clock clock;
    public record Proposal(String operationId, String orderId, long amountCents, long orderVersion, long expiresAt, String approvalToken, String status) {}
    public record Order(String orderId, long version, String status) {}
    public RefundWorkflow(String url, String user, String password, String secret, Clock clock) {
        if (secret.length() < 32) throw new IllegalArgumentException("approval_secret_min_32_characters");
        this.url = url; this.user = user; this.password = password; this.secret = secret; this.clock = clock;
        try (var c = connection(); var s = c.createStatement()) {
            s.execute("CREATE TABLE IF NOT EXISTS support_orders(tenant VARCHAR(32),id VARCHAR(64),version BIGINT NOT NULL,status VARCHAR(32) NOT NULL,PRIMARY KEY(tenant,id))");
            s.execute("CREATE TABLE IF NOT EXISTS refund_proposals(tenant VARCHAR(32),id VARCHAR(64),request_key VARCHAR(64) NOT NULL,order_id VARCHAR(64) NOT NULL,amount_cents BIGINT NOT NULL,order_version BIGINT NOT NULL,expires_at BIGINT NOT NULL,status VARCHAR(32) NOT NULL,PRIMARY KEY(tenant,id),UNIQUE(tenant,request_key))");
            s.execute("INSERT INTO support_orders SELECT 'tenant-a','ORD-1001',1,'paid' WHERE NOT EXISTS(SELECT 1 FROM support_orders WHERE tenant='tenant-a' AND id='ORD-1001')");
            s.execute("INSERT INTO support_orders SELECT 'tenant-b','ORD-2001',1,'paid' WHERE NOT EXISTS(SELECT 1 FROM support_orders WHERE tenant='tenant-b' AND id='ORD-2001')");
        } catch (SQLException e) { throw new IllegalStateException("workflow_database_unavailable", e); }
    }
    private Connection connection() throws SQLException { return DriverManager.getConnection(url, user, password); }
    private String token(String principal, Proposal p) {
        try {
            var mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((KnowledgeStore.tenant(principal) + "|" + principal + "|" + p.operationId() + "|" + p.orderId() + "|" + p.amountCents() + "|" + p.orderVersion() + "|" + p.expiresAt()).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException("approval_signing_unavailable", e); }
    }
    private Proposal read(Connection c, String tenant, String id) throws SQLException {
        try (var q = c.prepareStatement("SELECT id,order_id,amount_cents,order_version,expires_at,status FROM refund_proposals WHERE tenant=? AND id=?")) {
            q.setString(1, tenant); q.setString(2, id);
            try (var r = q.executeQuery()) {
                if (!r.next()) throw new SecurityException("operation_not_authorized");
                return new Proposal(r.getString(1), r.getString(2), r.getLong(3), r.getLong(4), r.getLong(5), null, r.getString(6));
            }
        }
    }
    public Order lookup(String principal, String orderId) {
        try (var c = connection()) { return lookup(c, KnowledgeStore.tenant(principal), orderId, false); }
        catch (SQLException e) { throw new IllegalStateException("workflow_database_unavailable", e); }
    }
    private Order lookup(Connection c, String tenant, String id, boolean lock) throws SQLException {
        try (var q = c.prepareStatement("SELECT id,version,status FROM support_orders WHERE tenant=? AND id=?" + (lock ? " FOR UPDATE" : ""))) {
            q.setString(1, tenant); q.setString(2, id);
            try (var r = q.executeQuery()) {
                if (!r.next()) throw new SecurityException("order_not_authorized");
                return new Order(r.getString(1), r.getLong(2), r.getString(3));
            }
        }
    }
    public Proposal propose(String principal, String requestKey, String orderId, long cents) {
        String tenant = KnowledgeStore.tenant(principal);
        if (requestKey == null || !requestKey.matches("[a-zA-Z0-9-]{1,64}") || cents < 1 || cents > 1000) throw new IllegalArgumentException("invalid_proposal");
        var order = lookup(principal, orderId);
        try (var c = connection()) {
            try (var q = c.prepareStatement("SELECT id FROM refund_proposals WHERE tenant=? AND request_key=?")) {
                q.setString(1, tenant); q.setString(2, requestKey);
                try (var r = q.executeQuery()) { if (r.next()) {
                    var p = read(c, tenant, r.getString(1));
                    if (!p.orderId().equals(orderId) || p.amountCents() != cents) throw new KnowledgeStore.Conflict();
                    return withToken(principal, p);
                } }
            }
            if (!order.status().equals("paid")) throw new KnowledgeStore.Conflict();
            var p = new Proposal(UUID.randomUUID().toString(), orderId, cents, order.version(), clock.instant().plusSeconds(300).getEpochSecond(), null, "proposed");
            try (var q = c.prepareStatement("INSERT INTO refund_proposals VALUES(?,?,?,?,?,?,?,?)")) {
                q.setString(1, tenant); q.setString(2, p.operationId()); q.setString(3, requestKey); q.setString(4, orderId);
                q.setLong(5, cents); q.setLong(6, order.version()); q.setLong(7, p.expiresAt()); q.setString(8, p.status()); q.executeUpdate();
            }
            return withToken(principal, p);
        } catch (SQLException e) {
            if ("23505".equals(e.getSQLState())) throw new KnowledgeStore.Conflict();
            throw new IllegalStateException("workflow_database_unavailable", e);
        }
    }
    private Proposal withToken(String principal, Proposal p) {
        return new Proposal(p.operationId(), p.orderId(), p.amountCents(), p.orderVersion(), p.expiresAt(), token(principal, p), p.status());
    }
    public Proposal status(String principal, String id) {
        try (var c = connection()) { return read(c, KnowledgeStore.tenant(principal), id); }
        catch (SQLException e) { throw new IllegalStateException("workflow_database_unavailable", e); }
    }
    public Proposal approve(String principal, String id, String suppliedToken) {
        String tenant = KnowledgeStore.tenant(principal);
        try (var c = connection()) {
            c.setAutoCommit(false);
            try {
                var initial = read(c, tenant, id);
                var order = lookup(c, tenant, initial.orderId(), true);
                var p = read(c, tenant, id); // Re-read after order lock serializes competing approvals.
                if (suppliedToken == null || suppliedToken.length() != 64 || !MessageDigest.isEqual(token(principal, p).getBytes(StandardCharsets.US_ASCII), suppliedToken.getBytes(StandardCharsets.US_ASCII)))
                    throw new SecurityException("approval_token_invalid");
                if (p.status().equals("completed")) { c.commit(); return p; }
                if (clock.instant().getEpochSecond() >= p.expiresAt()) throw new SecurityException("approval_expired");
                if (order.version() != p.orderVersion() || !order.status().equals("paid")) throw new KnowledgeStore.Conflict();
                try (var update = c.prepareStatement("UPDATE support_orders SET version=version+1,status='refund-requested' WHERE tenant=? AND id=? AND version=?")) {
                    update.setString(1, tenant); update.setString(2, p.orderId()); update.setLong(3, p.orderVersion());
                    if (update.executeUpdate() != 1) throw new KnowledgeStore.Conflict();
                }
                try (var update = c.prepareStatement("UPDATE refund_proposals SET status='completed' WHERE tenant=? AND id=?")) {
                    update.setString(1, tenant); update.setString(2, id); update.executeUpdate();
                }
                c.commit(); return status(principal, id);
            } catch (RuntimeException | SQLException e) { c.rollback(); throw e; }
        } catch (SQLException e) { throw new IllegalStateException("workflow_database_unavailable", e); }
    }
}
