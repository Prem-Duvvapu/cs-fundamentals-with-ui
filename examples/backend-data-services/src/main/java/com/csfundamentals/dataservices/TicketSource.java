package com.csfundamentals.dataservices;

import java.util.Optional;
import java.util.OptionalLong;

public interface TicketSource {
    OptionalLong version(String principal, String id);
    Optional<Ticket> find(String principal, String id);
    Ticket rename(String principal, String id, long expectedVersion, String title);
    final class Conflict extends RuntimeException { public Conflict() { super("ticket_version_conflict"); } }
    final class Unavailable extends RuntimeException { public Unavailable() { super("authoritative_source_unavailable"); } }
}
