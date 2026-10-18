package com.csfundamentals.persistencelab;

import java.sql.*;

/** Fixed SQL for the owned fixture schema; deployment-retirement evidence is an explicit input. */
public final class ExpandContract {
    private ExpandContract() {}
    public static void expand(Connection connection) throws SQLException {
        execute(connection,"ALTER TABLE notes ADD COLUMN display_name TEXT");
    }
    public static void backfill(Connection connection) throws SQLException {
        for(int batch=0;batch<10;batch++) {
            int changed;
            try(Statement statement=connection.createStatement()) {
                changed=statement.executeUpdate("UPDATE notes SET display_name=title WHERE id IN (SELECT id FROM notes WHERE display_name IS NULL ORDER BY id LIMIT 2)");
            }
            if(changed==0)return;
        }
        try(Statement statement=connection.createStatement();ResultSet remaining=statement.executeQuery("SELECT count(*) FROM notes WHERE display_name IS NULL")) {
            remaining.next(); if(remaining.getLong(1)==0)return;
        }
        throw new IllegalStateException("Bounded fixture backfill incomplete");
    }
    public static void contract(Connection connection,boolean previousBinariesRetired,boolean failBeforeCommit) throws SQLException {
        if(!previousBinariesRetired)throw new IllegalStateException("Retire incompatible readers and writers before contract");
        if(!connection.getAutoCommit())throw new IllegalStateException("Use a fresh transaction boundary");
        connection.setAutoCommit(false);
        try {
            execute(connection,"ALTER TABLE notes ALTER COLUMN display_name SET NOT NULL");
            execute(connection,"ALTER TABLE notes DROP COLUMN title");
            if(failBeforeCommit)throw new IllegalStateException("Injected crash before DDL commit");
            connection.commit();
        } catch(SQLException|RuntimeException failure) { connection.rollback(); throw failure; }
        finally { connection.setAutoCommit(true); }
    }
    public static void reexpandForOldBinary(Connection connection,boolean newOnlyBinariesRetired) throws SQLException {
        if(!newOnlyBinariesRetired)throw new IllegalStateException("Retire incompatible new-only readers and writers before rollback");
        if(!connection.getAutoCommit())throw new IllegalStateException("Use a fresh transaction boundary");
        connection.setAutoCommit(false);
        try {
            execute(connection,"ALTER TABLE notes ADD COLUMN title TEXT");
            execute(connection,"UPDATE notes SET title=display_name");
            execute(connection,"ALTER TABLE notes ALTER COLUMN title SET NOT NULL");
            execute(connection,"ALTER TABLE notes ALTER COLUMN display_name DROP NOT NULL");
            connection.commit();
        } catch(SQLException|RuntimeException failure) { connection.rollback(); throw failure; }
        finally { connection.setAutoCommit(true); }
    }
    private static void execute(Connection connection,String sql) throws SQLException {
        try(Statement statement=connection.createStatement()) { statement.execute(sql); }
    }
}
