package com.csfundamentals.messaging;

import java.nio.file.Path;
import java.sql.*;

final class SagaFiles {
    private final String url, password;
    SagaFiles(Path file, String password) {
        if (file == null || file.toString().contains(";") || file.toString().contains("\n")
                || password == null || password.length() < 32) throw new IllegalArgumentException("owned_saga_file_and_runtime_secret_required");
        this.url = "jdbc:h2:file:" + file.toAbsolutePath().normalize() + ";WRITE_DELAY=0;LOCK_TIMEOUT=1000";
        this.password = password;
    }
    Connection open() throws SQLException { return DriverManager.getConnection(url,"lab",password); }
    static PreparedStatement prepare(Connection connection,String sql) throws SQLException {
        var statement=connection.prepareStatement(sql); statement.setQueryTimeout(2); return statement;
    }
    void schema(String... commands) throws SQLException {
        try(var connection=open();var statement=connection.createStatement()) {
            statement.setQueryTimeout(2);
            for(String command:commands)statement.execute(command);
        }
    }
}
