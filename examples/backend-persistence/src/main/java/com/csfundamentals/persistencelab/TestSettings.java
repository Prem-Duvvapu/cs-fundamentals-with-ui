package com.csfundamentals.persistencelab;

import java.util.regex.*;

public final class TestSettings {
    private final String url,user,password;
    public TestSettings(String url,String user,String password) {
        Matcher match=Pattern.compile("jdbc:postgresql://127\\.0\\.0\\.1:([0-9]{1,5})/lab_persist_([a-f0-9]{32})_source").matcher(url==null?"":url);
        if(!match.matches() || Integer.parseInt(match.group(1))<1 || Integer.parseInt(match.group(1))>65535
                || !("lab_persist_role_"+match.group(2)).equals(user) || password==null || password.length()<32)
            throw new IllegalArgumentException("Use generated credentials and an owned loopback lab database");
        this.url=url; this.user=user; this.password=password;
    }
    public static TestSettings environment() {
        return new TestSettings(System.getenv("PERSISTENCE_JDBC_URL"),System.getenv("PERSISTENCE_DB_USER"),System.getenv("PERSISTENCE_DB_PASSWORD"));
    }
    public String url() { return url; }
    public String user() { return user; }
    public String password() { return password; }
    public static String ownedSchema(String schema) {
        if(schema==null || !schema.matches("lab_schema_[a-f0-9]{32}"))throw new IllegalArgumentException("Schema must belong to this lab run");
        return schema;
    }
}
