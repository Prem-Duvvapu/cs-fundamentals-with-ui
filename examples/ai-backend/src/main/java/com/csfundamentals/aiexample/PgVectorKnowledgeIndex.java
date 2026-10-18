package com.csfundamentals.aiexample;

import java.sql.*;
import java.util.*;

/** Whole-tenant publication is atomic; documents remain the authorization/version authority. */
public final class PgVectorKnowledgeIndex {
    public enum Mode { EXACT, ANN }
    public record EmbeddedChunk(KnowledgeChunks.Chunk chunk, float[] vector) {}
    public record Status(String namespace, boolean ready, int documents, int chunks, String generation) {}
    private final String url, user, password, table;
    private final EmbeddingSpace space;
    public PgVectorKnowledgeIndex(String url, String user, String password, EmbeddingSpace space) {
        if (!url.startsWith("jdbc:postgresql:")) throw new IllegalArgumentException("pgvector_requires_postgresql");
        this.url = url; this.user = user; this.password = password; this.space = space;
        this.table = "knowledge_vectors_" + space.namespace();
        initialize();
    }
    public EmbeddingSpace space() { return space; }
    private Connection connect() throws SQLException {
        var properties = new Properties();
        properties.setProperty("user", user); properties.setProperty("password", password);
        properties.setProperty("connectTimeout", "3"); properties.setProperty("socketTimeout", "8");
        return DriverManager.getConnection(url, properties);
    }
    private void initialize() {
        try (var connection = connect()) {
            connection.setAutoCommit(false);
            try (var statement = connection.createStatement()) {
                statement.execute("SET LOCAL lock_timeout='2s'");
                statement.execute("SET LOCAL statement_timeout='8s'");
                try (var result = statement.executeQuery("SELECT extversion FROM pg_extension WHERE extname='vector'")) {
                    if (!result.next() || !result.getString(1).matches("0\\.8\\.[0-9]+"))
                        throw new IllegalStateException("pgvector_0_8_extension_required");
                }
                statement.execute("CREATE TABLE IF NOT EXISTS knowledge_embedding_spaces(namespace VARCHAR(32) PRIMARY KEY, model VARCHAR(128) NOT NULL, revision VARCHAR(64) NOT NULL, dimensions INTEGER NOT NULL, chunk_policy VARCHAR(64) NOT NULL)");
                statement.execute("CREATE TABLE IF NOT EXISTS knowledge_vector_manifests(namespace VARCHAR(32) NOT NULL,tenant VARCHAR(32) NOT NULL,fingerprint VARCHAR(64) NOT NULL,generation VARCHAR(36) NOT NULL,documents INTEGER NOT NULL,chunks INTEGER NOT NULL,PRIMARY KEY(namespace,tenant))");
            }
            try (var insert = connection.prepareStatement("INSERT INTO knowledge_embedding_spaces VALUES(?,?,?,?,?) ON CONFLICT(namespace) DO NOTHING")) {
                insert.setString(1, space.namespace()); insert.setString(2, space.model()); insert.setString(3, space.revision());
                insert.setInt(4, space.dimensions()); insert.setString(5, space.chunkPolicy()); insert.executeUpdate();
            }
            try (var query = connection.prepareStatement("SELECT model,revision,dimensions,chunk_policy FROM knowledge_embedding_spaces WHERE namespace=?")) {
                query.setString(1, space.namespace());
                try (var result = query.executeQuery()) {
                    if (!result.next() || !new EmbeddingSpace(space.namespace(), result.getString(1), result.getString(2), result.getInt(3), result.getString(4)).equals(space))
                        throw new IllegalArgumentException("embedding_namespace_contract_mismatch");
                }
            }
            try (var statement = connection.createStatement()) {
                statement.execute("CREATE TABLE IF NOT EXISTS " + table + "(tenant VARCHAR(32) NOT NULL,document_id VARCHAR(64) NOT NULL,version BIGINT NOT NULL,ordinal INTEGER NOT NULL,body VARCHAR(1000) NOT NULL,embedding vector(" + space.dimensions() + ") NOT NULL,PRIMARY KEY(tenant,document_id,ordinal)) PARTITION BY LIST(tenant)");
                for (var tenant : Map.of("a", "tenant-a", "b", "tenant-b").entrySet()) {
                    String partition = table + "_" + tenant.getKey();
                    statement.execute("CREATE TABLE IF NOT EXISTS " + partition + " PARTITION OF " + table + " FOR VALUES IN ('" + tenant.getValue() + "')");
                    statement.execute("CREATE INDEX IF NOT EXISTS " + partition + "_ann ON " + partition + " USING hnsw(embedding vector_cosine_ops) WITH(m=8,ef_construction=32)");
                }
            }
            connection.commit();
        } catch (SQLException failure) { throw unavailable(failure); }
    }
    private static KnowledgeRetrieval.Unavailable unavailable(SQLException cause) {
        var failure = new KnowledgeRetrieval.Unavailable("vector_database_unavailable"); failure.initCause(cause); return failure;
    }
    private static void configure(Connection connection, Mode mode) throws SQLException {
        try (var statement = connection.createStatement()) {
            statement.execute("SET LOCAL lock_timeout='2s'"); statement.execute("SET LOCAL statement_timeout='5s'");
            if (mode == Mode.EXACT) {
                statement.execute("SET LOCAL enable_indexscan=off"); statement.execute("SET LOCAL enable_bitmapscan=off");
            } else {
                statement.execute("SET LOCAL hnsw.ef_search=40"); statement.execute("SET LOCAL hnsw.iterative_scan=strict_order");
                statement.execute("SET LOCAL hnsw.max_scan_tuples=1000");
            }
        }
    }
    public Status publish(String principal, List<KnowledgeStore.Document> snapshot, List<EmbeddedChunk> chunks) {
        String tenant = KnowledgeStore.tenant(principal);
        String fingerprint = EmbeddingSpace.fingerprint(snapshot);
        var expected = KnowledgeChunks.split(snapshot);
        if (chunks.size() != expected.size()) throw new IllegalArgumentException("incomplete_index_generation");
        for (int i = 0; i < chunks.size(); i++) {
            if (!chunks.get(i).chunk().equals(expected.get(i)) || !tenant.equals(chunks.get(i).chunk().document().tenant()))
                throw new SecurityException("invalid_index_scope");
            space.validate(chunks.get(i).vector());
        }
        try (var connection = connect()) {
            connection.setAutoCommit(false); configure(connection, Mode.EXACT);
            // Serialize concurrent rebuilds for this namespace+tenant, including an absent manifest.
            try (var lock = connection.prepareStatement("SELECT pg_advisory_xact_lock(hashtextextended(?,0))")) {
                lock.setString(1, space.namespace() + ":" + tenant); lock.execute();
            }
            if (!fingerprint.equals(EmbeddingSpace.fingerprint(visible(connection, tenant))))
                throw new KnowledgeRetrieval.Unavailable("source_changed_during_indexing");
            try (var delete = connection.prepareStatement("DELETE FROM " + table + " WHERE tenant=?")) {
                delete.setString(1, tenant); delete.executeUpdate();
            }
            try (var insert = connection.prepareStatement("INSERT INTO " + table + " VALUES(?,?,?,?,?,CAST(? AS vector))")) {
                for (var item : chunks) {
                    insert.setString(1, tenant); insert.setString(2, item.chunk().document().id()); insert.setLong(3, item.chunk().document().version());
                    insert.setInt(4, item.chunk().ordinal()); insert.setString(5, item.chunk().text()); insert.setString(6, space.literal(item.vector())); insert.addBatch();
                }
                insert.executeBatch();
            }
            String generation = UUID.randomUUID().toString();
            try (var manifest = connection.prepareStatement("INSERT INTO knowledge_vector_manifests VALUES(?,?,?,?,?,?) ON CONFLICT(namespace,tenant) DO UPDATE SET fingerprint=EXCLUDED.fingerprint,generation=EXCLUDED.generation,documents=EXCLUDED.documents,chunks=EXCLUDED.chunks")) {
                manifest.setString(1, space.namespace()); manifest.setString(2, tenant); manifest.setString(3, fingerprint);
                manifest.setString(4, generation); manifest.setInt(5, snapshot.size()); manifest.setInt(6, chunks.size()); manifest.executeUpdate();
            }
            connection.commit();
            return new Status(space.namespace(), true, snapshot.size(), chunks.size(), generation);
        } catch (SQLException failure) { throw unavailable(failure); }
    }
    private static List<KnowledgeStore.Document> visible(Connection connection, String tenant) throws SQLException {
        try (var query = connection.prepareStatement("SELECT id,tenant,version,title,body,enabled FROM knowledge_documents WHERE tenant=? AND enabled=TRUE ORDER BY id")) {
            query.setString(1, tenant);
            try (var rows = query.executeQuery()) {
                var result = new ArrayList<KnowledgeStore.Document>();
                while (rows.next()) {
                    result.add(document(rows));
                    if (result.size() > 32) throw new KnowledgeRetrieval.Unavailable("index_document_limit");
                }
                return result;
            }
        }
    }
    private static KnowledgeStore.Document document(ResultSet row) throws SQLException {
        return new KnowledgeStore.Document(row.getString(1), row.getString(2), row.getLong(3), row.getString(4), row.getString(5), row.getBoolean(6));
    }
    private Status status(Connection connection, String tenant) throws SQLException {
        String current = EmbeddingSpace.fingerprint(visible(connection, tenant));
        try (var query = connection.prepareStatement("SELECT fingerprint,generation,documents,chunks FROM knowledge_vector_manifests WHERE namespace=? AND tenant=?")) {
            query.setString(1, space.namespace()); query.setString(2, tenant);
            try (var row = query.executeQuery()) {
                if (!row.next()) return new Status(space.namespace(), false, 0, 0, "");
                return new Status(space.namespace(), current.equals(row.getString(1)), row.getInt(3), row.getInt(4), row.getString(2));
            }
        }
    }
    public Status status(String principal) {
        String tenant = KnowledgeStore.tenant(principal);
        try (var connection = connect()) {
            connection.setAutoCommit(false); configure(connection, Mode.EXACT);
            var result = status(connection, tenant); connection.commit(); return result;
        }
        catch (SQLException failure) { throw unavailable(failure); }
    }
    private String query() {
        // Keep nearest-neighbor ORDER BY/LIMIT on the vector relation. Joining first can
        // turn the query into a primary-key scan plus sort and lose the HNSW access path.
        // Tenant partition pruning happens inside the candidate phase; source authorization
        // and version checks still happen before any candidate becomes model context.
        return "WITH nearest AS MATERIALIZED (SELECT tenant,document_id,version,ordinal,body,embedding <=> CAST(? AS vector) AS distance FROM "
                + table + " WHERE tenant=? ORDER BY embedding <=> CAST(? AS vector) LIMIT ?) "
                + "SELECT d.id,d.tenant,d.version,d.title,d.body,d.enabled,v.ordinal,v.body FROM nearest v JOIN knowledge_documents d "
                + "ON d.tenant=v.tenant AND d.id=v.document_id AND d.version=v.version AND d.enabled=TRUE ORDER BY v.distance LIMIT ?";
    }
    private void bind(PreparedStatement query,String tenant,String literal,Mode mode,int limit) throws SQLException {
        query.setString(1,literal); query.setString(2,tenant); query.setString(3,literal);
        query.setInt(4,mode==Mode.EXACT?128:40); query.setInt(5,limit);
    }
    public KnowledgeRetrieval.Result search(String principal, float[] vector, Mode mode, int limit) {
        if (limit < 1 || limit > 3) throw new IllegalArgumentException("retrieval_limit");
        String tenant = KnowledgeStore.tenant(principal), literal = space.literal(vector);
        try (var connection = connect()) {
            connection.setAutoCommit(false); connection.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ); configure(connection, mode);
            if (!status(connection, tenant).ready()) throw new KnowledgeRetrieval.Unavailable("vector_index_missing_or_stale");
            try (var query = connection.prepareStatement(query())) {
                bind(query,tenant,literal,mode,limit);
                try (var rows = query.executeQuery()) {
                    var result = new ArrayList<KnowledgeRetrieval.Evidence>();
                    while (rows.next()) {
                        var doc = document(rows);
                        result.add(new KnowledgeRetrieval.Evidence(doc, doc.citation() + ":c" + rows.getInt(7), rows.getString(8)));
                    }
                    connection.commit();
                    return new KnowledgeRetrieval.Result(mode == Mode.EXACT ? "pgvector-exact" : "pgvector-ann", result);
                }
            }
        } catch (SQLException failure) { throw unavailable(failure); }
    }
    // Package-private diagnostic hook used only by the explicit PostgreSQL integration test.
    String explain(String principal, float[] vector, Mode mode, boolean discourageNonVectorPaths) {
        String tenant = KnowledgeStore.tenant(principal);
        try (var connection = connect()) {
            connection.setAutoCommit(false); configure(connection, mode);
            if (discourageNonVectorPaths) try (var statement = connection.createStatement()) {
                statement.execute("SET LOCAL enable_seqscan=off"); statement.execute("SET LOCAL enable_sort=off");
            }
            try (var query = connection.prepareStatement("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + query())) {
                bind(query,tenant,space.literal(vector),mode,3);
                try (var rows = query.executeQuery()) { rows.next(); return rows.getString(1); }
            }
        } catch (SQLException failure) { throw unavailable(failure); }
    }
}
