package com.csfundamentals.testing;

import java.nio.file.*;
import java.sql.SQLException;
import java.util.*;
import tools.jackson.databind.ObjectMapper;

/** A failure chain is private input; only fixed labels/class names and SQLSTATE can leave it. */
final class SetupDiagnostics {
    static final Set<String> CLASSES = Set.of(
            "java.lang.IllegalStateException", "java.lang.IllegalArgumentException", "java.lang.ClassCastException",
            "java.lang.NoClassDefFoundError", "java.lang.ClassNotFoundException", "java.net.ConnectException",
            "java.sql.SQLException", "java.sql.SQLTransientConnectionException", "java.sql.SQLNonTransientConnectionException",
            "org.postgresql.util.PSQLException", "org.testcontainers.containers.ContainerLaunchException",
            "org.testcontainers.containers.ContainerFetchException", "org.rnorth.ducttape.RetryCountExceededException",
            "com.github.dockerjava.api.exception.NotFoundException", "com.github.dockerjava.api.exception.BadRequestException",
            "com.github.dockerjava.api.exception.InternalServerErrorException", "com.github.dockerjava.api.exception.UnauthorizedException",
            "org.springframework.beans.factory.BeanCreationException", "org.springframework.beans.factory.UnsatisfiedDependencyException",
            "org.springframework.beans.BeanInstantiationException", "org.springframework.context.ApplicationContextException",
            "org.springframework.boot.web.server.MissingWebServerFactoryBeanException",
            "org.flywaydb.core.api.FlywayException", "org.flywaydb.core.internal.exception.FlywayMigrateException",
            "org.flywaydb.core.internal.exception.FlywaySqlException", "org.flywaydb.core.api.exception.FlywayValidateException",
            "org.hibernate.tool.schema.spi.SchemaManagementException", "org.hibernate.exception.JDBCConnectionException",
            "org.hibernate.exception.SQLGrammarException", "org.hibernate.MappingException", "org.hibernate.AnnotationException");
    static final Set<String> STAGES = Set.of("container-create", "container-start", "container-host-check", "application-start");
    static final Set<String> CATEGORIES = Set.of("unclassified-setup-failure", "docker-environment-unavailable", "container-image-pull-throttled",
            "container-image-access", "container-start-or-readiness", "jdbc-connection", "database-authentication", "database-missing",
            "database-schema-or-sql", "database-resource-limit", "database-not-ready", "schema-missing", "schema-type-mismatch",
            "flyway-unsupported-database", "hibernate-jdbc-metadata-unavailable", "framework-bean-creation", "classpath-missing");
    static Map<String, Object> capture(String stage, Throwable failure) {
        var classes = new LinkedHashSet<String>(); var states = new LinkedHashSet<String>();
        String category = "unclassified-setup-failure";
        int unknown = 0;
        var seen = Collections.newSetFromMap(new IdentityHashMap<Throwable, Boolean>());
        for (Throwable cause = failure; cause != null && seen.size() < 24 && seen.add(cause); cause = cause.getCause()) {
            String name = cause.getClass().getName();
            if (CLASSES.contains(name)) classes.add(name); else unknown++;
            String message = cause.getMessage() == null ? "" : cause.getMessage().toLowerCase(Locale.ROOT);
            if (name.equals("org.springframework.beans.factory.BeanCreationException") || name.equals("org.springframework.beans.factory.UnsatisfiedDependencyException")) category = "framework-bean-creation";
            if (name.equals("org.testcontainers.containers.ContainerLaunchException")) category = "container-start-or-readiness";
            if (name.equals("java.lang.NoClassDefFoundError") || name.equals("java.lang.ClassNotFoundException")) category = "classpath-missing";
            if (message.contains("could not find a valid docker environment")) category = "docker-environment-unavailable";
            if (message.contains("toomanyrequests") || message.contains("pull rate limit")) category = "container-image-pull-throttled";
            if (name.equals("com.github.dockerjava.api.exception.UnauthorizedException")) category = "container-image-access";
            if (message.contains("schema-validation: missing table")) category = "schema-missing";
            if (message.contains("schema-validation: wrong column type")) category = "schema-type-mismatch";
            if (message.contains("unsupported database: postgresql")) category = "flyway-unsupported-database";
            if (message.contains("unable to determine dialect without jdbc metadata")) category = "hibernate-jdbc-metadata-unavailable";
            if (cause instanceof SQLException sql) {
                String state = sql.getSQLState();
                if (state != null && state.matches("[0-9A-Z]{5}")) {
                    states.add(state);
                    category = switch (state.substring(0, 2)) {
                        case "08" -> "jdbc-connection";
                        case "28" -> "database-authentication";
                        case "3D" -> "database-missing";
                        case "42" -> "database-schema-or-sql";
                        case "53" -> "database-resource-limit";
                        case "57" -> "database-not-ready";
                        default -> category;
                    };
                }
            }
        }
        return Map.of("stage", STAGES.contains(stage) ? stage : "application-start", "category", category,
                "knownExceptionClasses", List.copyOf(classes), "sqlStates", List.copyOf(states), "unrecognizedCauseCount", unknown);
    }
    static void write(String stage, Throwable failure) throws Exception {
        byte[] bytes = new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsBytes(capture(stage, failure));
        if (bytes.length > 16384) throw new IllegalStateException("bounded_setup_diagnostics_required");
        Path output = Path.of("target/evidence/setup-failure.json"); Files.createDirectories(output.getParent()); Files.write(output, bytes);
    }
}
