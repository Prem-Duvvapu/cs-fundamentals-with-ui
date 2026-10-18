package com.csfundamentals.messaging;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/** One local JDBC transaction protects each boundary; publishing is deliberately outside it. */
public final class DurableStore {
    private final String url;
    private final String password;
    public enum Crash { NONE, BEFORE_SOURCE_COMMIT, AFTER_PUBLISH, BEFORE_EFFECT_COMMIT, AFTER_EFFECT_COMMIT }
    public static final class SimulatedCrash extends RuntimeException {}
    @FunctionalInterface public interface Publisher { void publish(TicketEvent event) throws Exception; }

    public DurableStore(String url, String password) throws SQLException {
        if (!url.startsWith("jdbc:h2:file:") || url.contains(";") || password == null || password.length() < 32)
            throw new IllegalArgumentException("Use a local owned H2 file and a generated password");
        this.url = url;
        this.password = password;
        try (Connection connection = open(); Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE IF NOT EXISTS source_activity(ticket_id VARCHAR(64) PRIMARY KEY, amount INT NOT NULL)");
            statement.execute("CREATE TABLE IF NOT EXISTS outbox(id VARCHAR(64) PRIMARY KEY, payload VARCHAR(4096) NOT NULL, sent BOOLEAN NOT NULL DEFAULT FALSE)");
            statement.execute("CREATE TABLE IF NOT EXISTS inbox(id VARCHAR(64) PRIMARY KEY, payload VARCHAR(4096) NOT NULL)");
            statement.execute("CREATE TABLE IF NOT EXISTS projection(ticket_id VARCHAR(64) PRIMARY KEY, amount INT NOT NULL)");
        }
    }
    private Connection open() throws SQLException { return DriverManager.getConnection(url, "lab", password); }

    public void enqueue(TicketEvent event, Crash crash) throws SQLException {
        try (Connection connection = open()) {
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement outbox = connection.prepareStatement("INSERT INTO outbox(id,payload) VALUES (?,?)")) {
                    outbox.setString(1, event.id()); outbox.setString(2, event.json()); outbox.executeUpdate();
                }
                increment(connection, "source_activity", event);
                if (crash == Crash.BEFORE_SOURCE_COMMIT) throw new SimulatedCrash();
                connection.commit();
            } catch (SQLException | RuntimeException exception) { connection.rollback(); throw exception; }
        }
    }

    public List<TicketEvent> pending() throws SQLException {
        List<TicketEvent> events = new ArrayList<>();
        try (Connection connection = open(); Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT payload FROM outbox WHERE sent=FALSE ORDER BY id LIMIT 100")) {
            while (result.next()) events.add(TicketEvent.parse(result.getString(1)));
        }
        return events;
    }

    public void relay(Publisher publisher, Crash crash) throws Exception {
        for (TicketEvent event : pending()) {
            publisher.publish(event); // Return means the adapter's bounded broker-confirm/send completed.
            if (crash == Crash.AFTER_PUBLISH) throw new SimulatedCrash();
            try (Connection connection = open(); PreparedStatement statement = connection.prepareStatement("UPDATE outbox SET sent=TRUE WHERE id=?")) {
                statement.setString(1, event.id()); statement.executeUpdate();
            }
        }
    }

    public boolean consume(TicketEvent event, Crash crash) throws SQLException {
        try (Connection connection = open()) {
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement lookup = connection.prepareStatement("SELECT payload FROM inbox WHERE id=?")) {
                    lookup.setString(1, event.id());
                    try (ResultSet result = lookup.executeQuery()) {
                        if (result.next()) {
                            if (!TicketEvent.parse(result.getString(1)).equals(event))
                                throw new IllegalArgumentException("Event ID reused with different business fields");
                            connection.rollback();
                            return false;
                        }
                    }
                }
                try (PreparedStatement statement = connection.prepareStatement("INSERT INTO inbox(id,payload) VALUES (?,?)")) {
                    statement.setString(1, event.id()); statement.setString(2, event.json()); statement.executeUpdate();
                }
                increment(connection, "projection", event);
                if (crash == Crash.BEFORE_EFFECT_COMMIT) throw new SimulatedCrash();
                connection.commit();
                if (crash == Crash.AFTER_EFFECT_COMMIT) throw new SimulatedCrash();
                return true;
            } catch (SQLException | RuntimeException exception) { connection.rollback(); throw exception; }
        }
    }

    private void increment(Connection connection, String table, TicketEvent event) throws SQLException {
        // Table is an internal constant, never a message field.
        try (PreparedStatement statement = connection.prepareStatement("MERGE INTO " + table + " t USING (VALUES (?,?)) s(id,delta) ON t.ticket_id=s.id WHEN MATCHED THEN UPDATE SET amount=t.amount+s.delta WHEN NOT MATCHED THEN INSERT(ticket_id,amount) VALUES(s.id,s.delta)")) {
            statement.setString(1, event.ticketId()); statement.setInt(2, event.delta()); statement.executeUpdate();
        }
    }

    public int sourceAmount(String ticketId) throws SQLException { return amount("source_activity", ticketId); }
    public int projectionAmount(String ticketId) throws SQLException { return amount("projection", ticketId); }
    private int amount(String table, String ticketId) throws SQLException {
        try (Connection connection = open(); PreparedStatement statement = connection.prepareStatement("SELECT amount FROM " + table + " WHERE ticket_id=?")) {
            statement.setString(1, ticketId);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getInt(1) : 0; }
        }
    }
}
