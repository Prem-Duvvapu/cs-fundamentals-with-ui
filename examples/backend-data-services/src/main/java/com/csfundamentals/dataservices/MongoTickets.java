package com.csfundamentals.dataservices;

import com.mongodb.*;
import com.mongodb.client.*;
import com.mongodb.client.model.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.bson.Document;
import static com.mongodb.client.model.Filters.*;
import static com.mongodb.client.model.Indexes.*;
import static com.mongodb.client.model.Updates.*;

/** A single-document aggregate, not a relational database emulator or production tenancy system. */
public final class MongoTickets implements TicketSource, AutoCloseable {
    private final MongoClient client;
    private final MongoDatabase database;
    private final MongoCollection<Document> tickets;
    public MongoTickets(String uri) {
        var connection = new ConnectionString(LocalServices.mongo(uri));
        var settings = MongoClientSettings.builder().applyConnectionString(connection)
                .applyToSocketSettings(socket -> socket.connectTimeout(500, TimeUnit.MILLISECONDS).readTimeout(1200, TimeUnit.MILLISECONDS))
                .applyToClusterSettings(cluster -> cluster.serverSelectionTimeout(1200, TimeUnit.MILLISECONDS))
                .applyToConnectionPoolSettings(pool -> pool.maxSize(4).maxWaitTime(500, TimeUnit.MILLISECONDS))
                .timeout(2, TimeUnit.SECONDS).retryReads(false).retryWrites(false).build();
        client = MongoClients.create(settings);
        database = client.getDatabase(LocalServices.namespace());
        try {
            var schema = new Document("bsonType", "object")
                    .append("required", List.of("tenant", "ticketId", "version", "title", "priority", "status", "details"))
                    .append("properties", new Document("tenant", new Document("enum", List.of("tenant-a", "tenant-b")))
                            .append("ticketId", new Document("bsonType", "string").append("pattern", "^[a-z0-9-]{1,48}$"))
                            .append("version", new Document("bsonType", List.of("int", "long")).append("minimum", 1))
                            .append("title", new Document("bsonType", "string").append("minLength", 1).append("maxLength", 160))
                            .append("priority", new Document("enum", List.of("low", "high")))
                            .append("status", new Document("enum", List.of("open", "closed")))
                            .append("details", new Document("bsonType", "object").append("required", List.of("department", "labels"))
                                    .append("properties", new Document("department", new Document("bsonType", "string").append("pattern", "^[a-z]{1,32}$"))
                                            .append("labels", new Document("bsonType", "array").append("maxItems", 5)
                                                    .append("items", new Document("bsonType", "string").append("pattern", "^[a-z-]{1,24}$"))))));
            database.createCollection("tickets", new CreateCollectionOptions().validationOptions(
                    new ValidationOptions().validator(new Document("$jsonSchema", schema)).validationAction(ValidationAction.ERROR)));
            tickets = database.getCollection("tickets");
            tickets.createIndex(compoundIndex(ascending("tenant"), ascending("ticketId")), new IndexOptions().name("tenant_ticket_unique").unique(true));
            tickets.createIndex(compoundIndex(ascending("tenant", "status", "priority", "ticketId")), new IndexOptions().name("tenant_status_priority"));
        } catch (RuntimeException failure) {
            try { database.drop(); } catch (RuntimeException cleanup) { failure.addSuppressed(cleanup); }
            client.close(); throw failure;
        }
    }
    private org.bson.conversions.Bson identity(String principal, String id) {
        LocalServices.id(id); return and(eq("tenant", Ticket.tenant(principal)), eq("ticketId", id));
    }
    public Ticket create(String principal, String id, String title, String priority) {
        var ticket = new Ticket(Ticket.tenant(principal), id, 1, title, priority, "open", "support", List.of("original-fixture"));
        tickets.insertOne(ticket.document()); return ticket;
    }
    @Override public OptionalLong version(String principal, String id) {
        var row = tickets.find(identity(principal, id)).projection(Projections.include("version")).first();
        return row == null ? OptionalLong.empty() : OptionalLong.of(((Number) row.get("version")).longValue());
    }
    @Override public Optional<Ticket> find(String principal, String id) {
        return Optional.ofNullable(tickets.find(identity(principal, id)).first()).map(Ticket::parse);
    }
    @Override public Ticket rename(String principal, String id, long expectedVersion, String title) {
        if (expectedVersion < 1 || title == null || title.isBlank() || title.length() > 160) throw new IllegalArgumentException("invalid_update");
        var updated = tickets.findOneAndUpdate(and(identity(principal, id), eq("version", expectedVersion)),
                combine(set("title", title), inc("version", 1L)), new FindOneAndUpdateOptions().returnDocument(ReturnDocument.AFTER));
        if (updated == null) throw new TicketSource.Conflict();
        return Ticket.parse(updated);
    }
    public List<Ticket> openHighPriority(String principal) {
        var filter = and(eq("tenant", Ticket.tenant(principal)), eq("status", "open"), eq("priority", "high"));
        return tickets.find(filter).sort(ascending("ticketId")).limit(20).map(Ticket::parse).into(new ArrayList<>());
    }
    public Document explainOpenHighPriority(String principal) {
        return tickets.find(and(eq("tenant", Ticket.tenant(principal)), eq("status", "open"), eq("priority", "high")))
                .sort(ascending("ticketId")).limit(20).hintString("tenant_status_priority").explain(ExplainVerbosity.EXECUTION_STATS);
    }
    MongoCollection<Document> diagnosticsCollection() { return tickets; }
    public String ownedDatabase() { return database.getName(); }
    @Override public void close() { try { database.drop(); } finally { client.close(); } }
}
