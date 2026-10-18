package com.csfundamentals.aiexample;

import java.sql.*;
import java.util.*;

/** Small JDBC baseline: authorization and versions belong to the application, not the model. */
public final class KnowledgeStore {
    private final String url, user, password;
    public record Document(String id, String tenant, long version, String title, String text, boolean enabled) {
        public String citation() { return id + ":v" + version; }
    }
    public static class Conflict extends RuntimeException {}
    public KnowledgeStore(String url, String user, String password) {
        this.url = url; this.user = user; this.password = password;
        try (var connection = connect(); var statement = connection.createStatement()) {
            statement.execute("CREATE TABLE IF NOT EXISTS knowledge_documents (tenant VARCHAR(32) NOT NULL, id VARCHAR(64) NOT NULL, version BIGINT NOT NULL, title VARCHAR(160) NOT NULL, body VARCHAR(8192) NOT NULL, enabled BOOLEAN NOT NULL, PRIMARY KEY(tenant,id))");
        } catch (SQLException e) { throw new IllegalStateException("knowledge_database_unavailable", e); }
    }
    private Connection connect() throws SQLException { return DriverManager.getConnection(url, user, password); }
    public static String tenant(String principal) {
        return switch (principal) { case "alice" -> "tenant-a"; case "bob" -> "tenant-b"; default -> throw new SecurityException("unknown_principal"); };
    }
    public Document put(String principal, String id, long expectedVersion, String title, String text, boolean enabled) {
        if (id == null || !id.matches("[a-z0-9-]{1,64}") || title == null || title.isBlank() || title.length() > 160
                || text == null || text.isBlank() || text.length() > 8192 || expectedVersion < 0)
            throw new IllegalArgumentException("invalid_document");
        String tenant = tenant(principal);
        try (var connection = connect()) {
            if (expectedVersion == 0) {
                try (var insert = connection.prepareStatement("INSERT INTO knowledge_documents(tenant,id,version,title,body,enabled) VALUES(?,?,1,?,?,?)")) {
                    insert.setString(1, tenant); insert.setString(2, id); insert.setString(3, title); insert.setString(4, text); insert.setBoolean(5, enabled);
                    insert.executeUpdate();
                }
            } else {
                try (var update = connection.prepareStatement("UPDATE knowledge_documents SET version=version+1,title=?,body=?,enabled=? WHERE tenant=? AND id=? AND version=?")) {
                    update.setString(1, title); update.setString(2, text); update.setBoolean(3, enabled); update.setString(4, tenant); update.setString(5, id); update.setLong(6, expectedVersion);
                    if (update.executeUpdate() != 1) throw new Conflict();
                }
            }
            return new Document(id, tenant, expectedVersion + 1, title, text, enabled);
        } catch (SQLException e) {
            if ("23505".equals(e.getSQLState())) throw new Conflict();
            throw new IllegalStateException("knowledge_database_unavailable", e);
        }
    }
    public void revoke(String principal, String id, long expectedVersion) {
        // Keep a tombstone/version rather than reusing an old citation after deletion.
        put(principal, id, expectedVersion, "Revoked", "Removed", false);
    }
    public List<Document> visible(String principal) {
        try (var connection = connect(); var query = connection.prepareStatement("SELECT id,tenant,version,title,body,enabled FROM knowledge_documents WHERE tenant=? AND enabled=TRUE")) {
            query.setString(1, tenant(principal));
            try (var rows = query.executeQuery()) {
                var documents = new ArrayList<Document>();
                while (rows.next()) documents.add(new Document(rows.getString(1), rows.getString(2), rows.getLong(3), rows.getString(4), rows.getString(5), rows.getBoolean(6)));
                return documents;
            }
        } catch (SQLException e) { throw new IllegalStateException("knowledge_database_unavailable", e); }
    }
    public boolean stillAuthorized(String principal, List<Document> snapshot) {
        var current = visible(principal).stream().collect(java.util.stream.Collectors.toMap(Document::citation, doc -> doc));
        return snapshot.stream().allMatch(doc -> doc.tenant().equals(tenant(principal)) && doc.equals(current.get(doc.citation())));
    }
}
