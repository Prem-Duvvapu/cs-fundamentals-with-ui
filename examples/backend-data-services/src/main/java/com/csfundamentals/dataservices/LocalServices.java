package com.csfundamentals.dataservices;

import java.net.URI;
import java.util.*;
import com.mongodb.ConnectionString;

public final class LocalServices {
    private LocalServices() {}
    public static void loopback(String host, int port) {
        if (!Set.of("127.0.0.1", "localhost", "::1", "[::1]").contains(host) || port < 1 || port > 65535)
            throw new IllegalArgumentException("local_throwaway_service_required");
    }
    public static String mongo(String value) {
        if (value == null || !value.startsWith("mongodb://")) throw new IllegalArgumentException("explicit_local_mongodb_uri_required");
        var uri = URI.create(value);
        if (uri.getHost() == null || uri.getFragment() != null) throw new IllegalArgumentException("single_loopback_mongodb_required");
        loopback(uri.getHost(), uri.getPort() == -1 ? 27017 : uri.getPort());
        var settings = new ConnectionString(value);
        if (settings.getCredential() == null || settings.getCredential().getPassword() == null
                || settings.getCredential().getPassword().length < 32 || settings.getHosts().size() != 1)
            throw new IllegalArgumentException("runtime_mongodb_credentials_required");
        return value;
    }
    public static String namespace() { return "cs_data_" + UUID.randomUUID().toString().replace("-", ""); }
    public static void namespace(String value) {
        if (value == null || !value.matches("cs_data_[a-f0-9]{32}")) throw new IllegalArgumentException("owned_namespace_required");
    }
    public static void id(String value) {
        if (value == null || !value.matches("[a-z0-9-]{1,48}")) throw new IllegalArgumentException("invalid_ticket_id");
    }
}
