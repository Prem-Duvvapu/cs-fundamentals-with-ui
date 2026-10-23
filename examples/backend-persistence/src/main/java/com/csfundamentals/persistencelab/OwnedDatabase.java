package com.csfundamentals.persistencelab;

import com.zaxxer.hikari.*;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import java.sql.*;
import java.util.UUID;

public final class OwnedDatabase implements AutoCloseable {
    public final String schema="lab_schema_"+UUID.randomUUID().toString().replace("-","");
    public final HikariDataSource pool;
    private SessionFactory factory;
    public OwnedDatabase(TestSettings settings) throws Exception { this(settings,2); }
    public OwnedDatabase(TestSettings settings,int maximumConnections) throws Exception {
        if(maximumConnections<2 || maximumConnections>3)throw new IllegalArgumentException("Only two workers and one optional observer are allowed");
        HikariConfig configuration=new HikariConfig();
        configuration.setJdbcUrl(settings.url()); configuration.setUsername(settings.user()); configuration.setPassword(settings.password());
        configuration.setMaximumPoolSize(maximumConnections); configuration.setMinimumIdle(0); configuration.setConnectionTimeout(500);
        configuration.setValidationTimeout(250); configuration.setInitializationFailTimeout(1500);
        configuration.addDataSourceProperty("connectTimeout","2"); configuration.addDataSourceProperty("socketTimeout","3");
        configuration.addDataSourceProperty("options","-c statement_timeout=3000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=5000");
        configuration.setPoolName("owned-persistence-lab");
        pool=new HikariDataSource(configuration);
        try(Connection connection=pool.getConnection();Statement statement=connection.createStatement()) {
            statement.execute("CREATE SCHEMA "+TestSettings.ownedSchema(schema));
        } catch(Exception failure) { pool.close(); throw failure; }
    }
    public Connection connection() throws SQLException {
        Connection connection=pool.getConnection();
        try(Statement statement=connection.createStatement()) { statement.execute("SET search_path TO "+TestSettings.ownedSchema(schema)); }
        catch(SQLException failure) { connection.close(); throw failure; }
        return connection;
    }
    public SessionFactory orm() throws Exception {
        try(Connection connection=connection();Statement statement=connection.createStatement()) {
            statement.execute("CREATE TABLE projects(id BIGINT PRIMARY KEY,name VARCHAR(255) NOT NULL)");
            statement.execute("CREATE TABLE tasks(id BIGINT PRIMARY KEY,title VARCHAR(255) NOT NULL,project_id BIGINT NOT NULL REFERENCES projects(id))");
            statement.execute("INSERT INTO projects VALUES(1,'Core'),(2,'Data'),(3,'Operations')");
            statement.execute("INSERT INTO tasks VALUES(11,'a',1),(12,'b',1),(21,'c',2),(22,'d',2),(31,'e',3),(32,'f',3)");
        }
        Configuration configuration=new Configuration().addAnnotatedClass(LabProject.class).addAnnotatedClass(LabTask.class);
        configuration.getProperties().put("hibernate.connection.datasource",pool);
        configuration.setProperty("hibernate.default_schema",schema);
        configuration.setProperty("hibernate.hbm2ddl.auto","validate");
        configuration.setProperty("hibernate.generate_statistics","true");
        configuration.setProperty("hibernate.default_batch_fetch_size","0");
        configuration.setProperty("hibernate.cache.use_second_level_cache","false");
        configuration.setProperty("hibernate.cache.use_query_cache","false");
        factory=configuration.buildSessionFactory(); return factory;
    }
    @Override public void close() throws Exception {
        try {
            if(factory!=null)factory.close();
            try(Connection connection=pool.getConnection();Statement statement=connection.createStatement()) {
                statement.execute("DROP SCHEMA "+TestSettings.ownedSchema(schema)+" CASCADE");
            }
        } finally { pool.close(); }
    }
}
