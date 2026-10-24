package com.csfundamentals.aiexample;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.*;
import tools.jackson.databind.*;

/** Learned retrieval measurement, never a replacement for the application's lexical default. */
final class SemanticEvaluation {
    static final String MODEL = "all-minilm:22m";
    static final String DIGEST = "1b226e2802dbb772b5fc32a58f103ca1804ef7501331012de126ab22f67475ef";
    static final String PROTOCOL = "learned-retrieval-v1-2026-10-23";
    static final ObjectMapper JSON = new ObjectMapper();
    record Data(List<JsonNode> documents, List<JsonNode> queries, String corpusHash, String queriesHash) {}
    private static final Set<String> SLICES = Set.of("direct", "paraphrase", "multi", "tenant", "unanswerable", "adversarial");
    private static final class Measured implements EmbeddingProvider {
        final EmbeddingProvider actual;
        int attempts, completed;
        Measured(EmbeddingProvider actual) { this.actual = actual; }
        public EmbeddingSpace space() { return actual.space(); }
        public List<float[]> embed(List<String> texts) { attempts++; var result = actual.embed(texts); completed++; return result; }
    }
    static byte[] bounded(Path path) throws Exception {
        if (Files.isSymbolicLink(path)) throw new IllegalArgumentException("dataset_symlink");
        try (var input = Files.newInputStream(path)) {
            byte[] bytes = input.readNBytes(1048577);
            if (bytes.length > 1048576) throw new IllegalArgumentException("dataset_limit");
            StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes));
            return bytes;
        }
    }
    static String hash(byte[] bytes) throws Exception { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
    static List<String> strings(JsonNode node) {
        if (!node.isArray() || node.size() > 8) throw new IllegalArgumentException("bounded_source_labels_required");
        var values = new ArrayList<String>();
        for (var value : node) {
            if (!value.isString() || !value.asString().matches("[a-z0-9-]{1,64}:v[1-9][0-9]{0,5}")) throw new IllegalArgumentException("invalid_source_label");
            values.add(value.asString());
        }
        if (new HashSet<>(values).size() != values.size()) throw new IllegalArgumentException("duplicate_source_labels");
        return values;
    }
    static Data read(Path corpus, Path queries) throws Exception {
        byte[] corpusBytes = bounded(corpus), queryBytes = bounded(queries);
        var rawDocs = JSON.readTree(corpusBytes);
        if (!rawDocs.isArray() || rawDocs.isEmpty() || rawDocs.size() > 32) throw new IllegalArgumentException("invalid_semantic_corpus");
        var docs = new ArrayList<JsonNode>(); var identities = new HashSet<String>();
        for (var doc : rawDocs) {
            if (!Set.of("alice", "bob").contains(doc.path("principal").asString()) || !doc.path("id").asString().matches("[a-z0-9-]{1,64}")
                    || !text(doc, "title", 160) || !text(doc, "text", 1200) || !doc.path("enabled").isBoolean()
                    || !identities.add(doc.path("principal").asString()+"/"+doc.path("id").asString())) throw new IllegalArgumentException("invalid_semantic_document");
            docs.add(doc);
        }
        var rows = new ArrayList<JsonNode>(); var ids = new HashSet<String>();
        for (String line : new String(queryBytes, StandardCharsets.UTF_8).lines().filter(value -> !value.isBlank()).toList()) {
            var row = JSON.readTree(line);
            var names = new HashSet<String>(); row.propertyNames().forEach(names::add);
            if (!names.equals(Set.of("id", "principal", "question", "slice", "relevantSources", "expectAbstain"))
                    || !row.path("id").asString().matches("[a-z0-9-]{1,80}") || !ids.add(row.path("id").asString())
                    || !Set.of("alice", "bob").contains(row.path("principal").asString()) || !text(row, "question", 1000)
                    || !SLICES.contains(row.path("slice").asString()) || !row.path("expectAbstain").isBoolean()) throw new IllegalArgumentException("invalid_semantic_query");
            var labels = strings(row.path("relevantSources"));
            if (labels.isEmpty() != row.path("expectAbstain").asBoolean()) throw new IllegalArgumentException("inconsistent_abstention_label");
            for (String label : labels) {
                if (docs.stream().noneMatch(doc -> doc.path("principal").asString().equals(row.path("principal").asString())
                        && label.equals(doc.path("id").asString()+":v1") && doc.path("enabled").asBoolean())) throw new IllegalArgumentException("unauthorized_source_label");
            }
            rows.add(row); if (rows.size() > 100) throw new IllegalArgumentException("query_limit");
        }
        if (rows.isEmpty()) throw new IllegalArgumentException("queries_required");
        return new Data(List.copyOf(docs), List.copyOf(rows), hash(corpusBytes), hash(queryBytes));
    }
    private static boolean text(JsonNode node, String field, int limit) { return node.path(field).isString() && !node.path(field).asString().isBlank() && node.path(field).asString().length() <= limit; }
    static List<String> documentCitations(List<String> chunks) { return chunks.stream().map(value -> value.replaceFirst(":c[0-9]+$", "")).distinct().toList(); }
    static Map<String, Object> relevance(List<String> wanted, List<String> actual) {
        long hits = actual.stream().filter(wanted::contains).count();
        double reciprocal = 0;
        for (int rank = 0; rank < actual.size(); rank++) if (wanted.contains(actual.get(rank))) { reciprocal = 1.0 / (rank+1); break; }
        var value = new LinkedHashMap<String,Object>();
        value.put("recallAt3", wanted.isEmpty() ? null : hits / (double)wanted.size());
        value.put("mrrAt3", wanted.isEmpty() ? null : reciprocal);
        value.put("unsupportedRetrieval", wanted.isEmpty() && !actual.isEmpty());
        return value;
    }
    private static String failure(RuntimeException error) {
        if (error instanceof SecurityException) return "authorization";
        if (error instanceof EmbeddingProvider.Failure) {
            if (error.getMessage().equals("embedding_deadline")) return "embedding-deadline";
            if (error.getMessage().startsWith("embedding_http_")) return "embedding-http";
            return "embedding-contract";
        }
        if (error instanceof KnowledgeRetrieval.Unavailable) return "retrieval-unavailable";
        if (error instanceof IllegalArgumentException) return "answer-or-input-contract";
        return "internal";
    }
    private static Map<String,Object> arm(KnowledgeStore store, KnowledgeRetrieval retrieval, JsonNode query, Measured provider) {
        var selected = new ArrayList<KnowledgeRetrieval.Evidence>();
        long start = System.nanoTime(); int attempts = provider.attempts;
        var row = new LinkedHashMap<String,Object>();
        String outcome = "failed", error = "none";
        try {
            KnowledgeRetrieval observed = (principal, question) -> { var result = retrieval.retrieve(principal, question); selected.addAll(result.sources()); return result; };
            ChatModel copy = prompt -> {
                String answer = selected.stream().map(KnowledgeRetrieval.Evidence::text).reduce((a,b) -> a+" "+b).orElse("Insufficient evidence");
                return new ChatResponse(List.of(new Generation(new AssistantMessage(JSON.writeValueAsString(Map.of("answer", answer,
                    "citations", selected.stream().map(KnowledgeRetrieval.Evidence::citation).distinct().toList()))))));
            };
            var answer = new KnowledgeService(store, ChatClient.create(copy), observed).ask(query.path("principal").asString(), query.path("question").asString());
            outcome = answer.citations().isEmpty() ? "abstain" : "copy-fixture-answer";
        } catch (RuntimeException failed) { error = failure(failed); }
        var chunks = selected.stream().map(KnowledgeRetrieval.Evidence::citation).toList();
        String tenant = KnowledgeStore.tenant(query.path("principal").asString());
        if (selected.stream().anyMatch(source -> !source.document().tenant().equals(tenant))) throw new SecurityException("observed_cross_tenant_source");
        row.put("outcome", outcome); row.put("failure", error); row.put("retrievedChunks", chunks);
        var documents = documentCitations(chunks); row.put("retrievedDocuments", documents);
        row.putAll(relevance(strings(query.path("relevantSources")), documents));
        row.put("totalMs", (System.nanoTime()-start)/1_000_000.0); row.put("embeddingAttempts", provider.attempts-attempts);
        return row;
    }
    static Map<String,Object> summarize(List<Map<String,Object>> rows) {
        var result = new LinkedHashMap<String,Object>(); result.put("attempts", rows.size());
        result.put("failures", rows.stream().filter(row -> row.get("outcome").equals("failed")).count());
        result.put("unsupportedRetrievals", rows.stream().filter(row -> Boolean.TRUE.equals(row.get("unsupportedRetrieval"))).count());
        for (String key : List.of("recallAt3", "mrrAt3")) result.put(key, rows.stream().filter(row -> row.get(key)!=null).mapToDouble(row -> ((Number)row.get(key)).doubleValue()).average().orElse(0));
        var values = rows.stream().map(row -> ((Number)row.get("totalMs")).doubleValue()).sorted().toList();
        result.put("failureInclusiveP50Ms", values.get(Math.max(0,(int)Math.ceil(values.size()*.5)-1)));
        result.put("failureInclusiveP95Ms", values.get(Math.max(0,(int)Math.ceil(values.size()*.95)-1)));
        return result;
    }
    private static void require(boolean condition, String code) { if (!condition) throw new IllegalStateException(code); }
    private static boolean hasHnsw(JsonNode node) {
        if (node.isObject() && node.path("Index Name").asString("").endsWith("_ann") && node.path("Actual Loops").asDouble(0)>0) return true;
        for (var child : node) if (hasHnsw(child)) return true;
        return false;
    }
    private static Map<String,Object> safety(KnowledgeStore store, Measured provider, PgVectorKnowledgeIndex index, VectorKnowledgeRetrieval exact, String url, String user, String password) throws Exception {
        var evidence = new LinkedHashMap<String,Object>();
        int before = provider.attempts;
        try { exact.retrieve("mallory", "refund"); throw new IllegalStateException("unknown_principal_accepted"); } catch (SecurityException expected) { require(provider.attempts==before,"unauthorized_embedding_call"); }
        evidence.put("unknownPrincipalRejectedBeforeEmbedding",true);
        var foreign=store.visible("bob").get(0);AtomicBoolean called=new AtomicBoolean();
        KnowledgeRetrieval forged=(principal,question)->new KnowledgeRetrieval.Result("forged-fixture",List.of(new KnowledgeRetrieval.Evidence(foreign,foreign.citation(),foreign.text())));
        ChatModel forbidden=prompt->{called.set(true);throw new IllegalStateException("forged_context_reached_model");};
        try {new KnowledgeService(store,ChatClient.create(forbidden),forged).ask("alice","question");throw new IllegalStateException("forged_context_accepted");}
        catch(SecurityException expected){require(!called.get(),"pre_generation_authorization_missing");}
        evidence.put("preGenerationAuthorizationRejectsForgedTenant",true);
        float[] real = provider.embed(List.of("What is the refund policy? ")).get(0);
        evidence.put("diagnosticForcedHnswExecuted",hasHnsw(JSON.readTree(index.explain("alice",real,PgVectorKnowledgeIndex.Mode.ANN,true))));
        evidence.put("diagnosticPlanIsProductionClaim",false);
        var generation = index.status("alice").generation();
        var original = store.visible("alice").stream().filter(doc -> doc.id().equals("password")).findFirst().orElseThrow();
        store.put("alice",original.id(),original.version(),original.title(),"x ".repeat(300),true);
        try { exact.rebuild("alice"); throw new IllegalStateException("oversized_input_accepted"); }
        catch (EmbeddingProvider.Failure expected) { require(expected.getMessage().equals("embedding_http_400"),"wrong_oversize_failure"); }
        require(generation.equals(index.status("alice").generation()) && !index.status("alice").ready(),"partial_generation_published");
        store.put("alice",original.id(),original.version()+1,original.title(),original.text(),true); exact.rebuild("alice");
        evidence.put("actualContextOverflowRejectedWithoutPublication",true);
        store.put("alice","refund",1,"Refund policy","Unopened purchases qualify for a refund within 21 calendar days.",true);
        before=provider.attempts;
        try { exact.retrieve("alice","refund"); throw new IllegalStateException("stale_generation_accepted"); } catch (KnowledgeRetrieval.Unavailable expected) { require(provider.attempts==before,"stale_generation_spent_embedding"); }
        exact.rebuild("alice"); require(exact.retrieve("alice","refund").sources().stream().noneMatch(source -> source.citation().startsWith("refund:v1")),"old_version_retrieved");
        evidence.put("updateRequiresRebuildAndRetainsVersion",true);
        try(var connection=DriverManager.getConnection(url,user,password);var query=connection.prepareStatement("DELETE FROM knowledge_documents WHERE tenant=? AND id=?")) {
            query.setString(1,KnowledgeStore.tenant("alice"));query.setString(2,"shipping");require(query.executeUpdate()==1,"owned_delete_not_executed");
        }
        require(!index.status("alice").ready(),"deleted_source_index_ready");exact.rebuild("alice");
        require(exact.retrieve("alice","shipping").sources().stream().noneMatch(source -> source.document().id().equals("shipping")),"deleted_source_retrieved");
        evidence.put("physicalDeletionFixtureExcludedAfterRebuild",true);
        try { new PgVectorKnowledgeIndex(url,user,password,new EmbeddingSpace(provider.space().namespace(),MODEL,DIGEST,385,EmbeddingSpace.CHUNK_POLICY)); throw new IllegalStateException("namespace_mismatch_accepted"); }
        catch(IllegalArgumentException expected) { evidence.put("namespaceMismatchRejected",true); }
        var fixed=store.visible("alice").stream().filter(doc -> doc.id().equals("maintenance")).findFirst().orElseThrow();
        generation=index.status("alice").generation();AtomicBoolean changed=new AtomicBoolean();
        EmbeddingProvider changing=new EmbeddingProvider() {
            public EmbeddingSpace space(){return provider.space();}
            public List<float[]> embed(List<String> texts){var vectors=provider.embed(texts);if(changed.compareAndSet(false,true))store.put("alice",fixed.id(),fixed.version(),fixed.title(),fixed.text()+" Reviewed.",true);return vectors;}
        };
        try { new VectorKnowledgeRetrieval(store,changing,index,PgVectorKnowledgeIndex.Mode.EXACT).rebuild("alice");throw new IllegalStateException("changed_source_published"); }
        catch(KnowledgeRetrieval.Unavailable expected){require(changed.get() && generation.equals(index.status("alice").generation()),"changed_source_partial_generation");}
        exact.rebuild("alice");evidence.put("changedSourceDuringLearnedEmbeddingRejected",true);
        var selected=exact.retrieve("alice","refund").sources().get(0);
        var chosen=selected.document();AtomicBoolean revoked=new AtomicBoolean();
        ChatModel revoke = prompt -> { store.revoke("alice",chosen.id(),chosen.version()); revoked.set(true);
            return new ChatResponse(List.of(new Generation(new AssistantMessage(JSON.writeValueAsString(Map.of("answer","fixture","citations",List.of(selected.citation()))))))); };
        KnowledgeRetrieval fixedRetrieval=(principal,question)->new KnowledgeRetrieval.Result("learned-selected-source",List.of(selected));
        try { new KnowledgeService(store,ChatClient.create(revoke),fixedRetrieval).ask("alice","refund"); throw new IllegalStateException("post_generation_revocation_accepted"); } catch (SecurityException expected) { require(revoked.get(),"revocation_not_executed"); }
        exact.rebuild("alice"); require(exact.retrieve("alice","refund").sources().stream().noneMatch(source -> source.document().id().equals(chosen.id())),"revoked_source_retrieved");
        evidence.put("revocationAndPostGenerationAuthorization",true);
        return evidence;
    }
    static void run(String[] args) throws Exception {
        if(args.length!=4)throw new IllegalArgumentException("Usage: --evaluate-semantic corpus.json queries.jsonl report.json");
        Data data=read(Path.of(args[1]),Path.of(args[2]));
        if(!Set.of(20,30).contains(data.queries().size()))throw new IllegalArgumentException("frozen_20_or_30_case_split_required");
        Path output=Path.of(args[3]).toAbsolutePath().normalize();
        if(output.equals(Path.of(args[1]).toAbsolutePath().normalize())||output.equals(Path.of(args[2]).toAbsolutePath().normalize())||Files.isSymbolicLink(output))throw new IllegalArgumentException("separate_report_required");
        Files.deleteIfExists(output);Files.createDirectories(output.getParent());
        if(!output.getParent().toRealPath().equals(output.getParent()))throw new IllegalArgumentException("report_symlink_parent");
        String base=System.getenv("AI_SEMANTIC_DB_URL"),user=System.getenv("AI_SEMANTIC_DB_USER"),password=System.getenv("AI_SEMANTIC_DB_PASSWORD");
        if(base==null||!base.matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]{1,5}/[a-zA-Z0-9_]{1,64}(?:\\?connectTimeout=3&socketTimeout=8)?")||user==null||password==null||password.length()<24)throw new IllegalArgumentException("explicit_owned_local_database_required");
        if(!DIGEST.equals(System.getenv("AI_SEMANTIC_MODEL_DIGEST"))||!"0.32.5".equals(System.getenv("AI_SEMANTIC_RUNTIME")))throw new IllegalArgumentException("frozen_model_runtime_required");
        Path jar=Path.of(System.getProperty("java.class.path"));byte[] jarBytes=boundedJar(jar);String jarHash=hash(jarBytes);
        String schema="cs_semantic_"+UUID.randomUUID().toString().replace("-","");boolean owned=false;
        var report=new LinkedHashMap<String,Object>();var cases=new ArrayList<Map<String,Object>>();
        var space=new EmbeddingSpace("semantic_v1",MODEL,DIGEST,384,EmbeddingSpace.CHUNK_POLICY);
        var provider=new Measured(new OllamaEmbeddingProvider(URI.create(System.getenv("AI_SEMANTIC_ORIGIN")),space,Duration.ofSeconds(10),512));
        try {
            try(var c=DriverManager.getConnection(base,user,password);var s=c.createStatement()){s.execute("CREATE SCHEMA "+schema);owned=true;}
            String url=base+(base.contains("?")?"&":"?")+"currentSchema="+schema+",public";
            var store=new KnowledgeStore(url,user,password);
            for(var document:data.documents())store.put(document.path("principal").asString(),document.path("id").asString(),0,document.path("title").asString(),document.path("text").asString(),document.path("enabled").asBoolean());
            var index=new PgVectorKnowledgeIndex(url,user,password,space);
            var exact=new VectorKnowledgeRetrieval(store,provider,index,PgVectorKnowledgeIndex.Mode.EXACT);
            var ann=new VectorKnowledgeRetrieval(store,provider,index,PgVectorKnowledgeIndex.Mode.ANN);
            exact.rebuild("alice");exact.rebuild("bob");
            Map<String,KnowledgeRetrieval> strategies=new LinkedHashMap<>();strategies.put("lexical",KnowledgeRetrieval.lexical(store));strategies.put("dense-exact",exact);strategies.put("configured-ann",ann);
            report.put("schemaVersion",1);report.put("protocol",PROTOCOL);report.put("state","running");report.put("embeddingEvidence","actual-local-learned-model");
            report.put("generationEvidence","copy-fixture-not-model-generation");report.put("humanAnswerSupport","not-assessed");report.put("model",MODEL);report.put("modelDigest",DIGEST);report.put("runtimeVersion","0.32.5");
            report.put("corpusSha256",data.corpusHash());report.put("queriesSha256",data.queriesHash());report.put("teachingJarSha256",jarHash);report.put("cases",cases);
            var snapshots=Map.of("alice",EmbeddingSpace.fingerprint(store.visible("alice")),"bob",EmbeddingSpace.fingerprint(store.visible("bob")));
            for(var query:data.queries()) {
                var row=new LinkedHashMap<String,Object>();row.put("id",query.path("id").asString());row.put("slice",query.path("slice").asString());
                var arms=new LinkedHashMap<String,Object>();
                for(var strategy:strategies.entrySet())arms.put(strategy.getKey(),arm(store,strategy.getValue(),query,provider));
                @SuppressWarnings("unchecked") var exactArm=(Map<String,Object>)arms.get("dense-exact");
                @SuppressWarnings("unchecked") var annArm=(Map<String,Object>)arms.get("configured-ann");
                @SuppressWarnings("unchecked") var exactChunks=(List<String>)exactArm.get("retrievedChunks");
                @SuppressWarnings("unchecked") var annChunks=(List<String>)annArm.get("retrievedChunks");
                row.put("annExactChunkOverlapAt3",exactChunks.isEmpty()?null:annChunks.stream().filter(exactChunks::contains).count()/(double)exactChunks.size());
                for(String principal:List.of("alice","bob"))require(snapshots.get(principal).equals(EmbeddingSpace.fingerprint(store.visible(principal))),"comparison_snapshot_changed");
                row.put("arms",arms);cases.add(row);checkpoint(output,report);
            }
            var summary=new LinkedHashMap<String,Object>();
            for(String name:strategies.keySet()) {
                var all=new ArrayList<Map<String,Object>>();var slices=new LinkedHashMap<String,Object>();
                for(var row:cases){@SuppressWarnings("unchecked") var values=(Map<String,Object>)((Map<?,?>)row.get("arms")).get(name);all.add(values);}
                for(String slice:SLICES){var values=new ArrayList<Map<String,Object>>();for(int i=0;i<cases.size();i++)if(cases.get(i).get("slice").equals(slice))values.add(all.get(i));if(!values.isEmpty())slices.put(slice,summarize(values));}
                var total=summarize(all);total.put("slices",slices);summary.put(name,total);
            }
            report.put("summary",summary);report.put("safety",safety(store,provider,index,exact,url,user,password));
            report.put("embeddingAttempts",provider.attempts);report.put("embeddingSuccessfulBatches",provider.completed);report.put("unauthorizedSourcesObserved",0);
            report.put("qualityGate",qualityGate(summary));
        } finally {
            if(owned)try(var connection=DriverManager.getConnection(base,user,password);var statement=connection.createStatement()) {
                statement.execute("SET lock_timeout='2s'");statement.execute("SET statement_timeout='5s'");statement.execute("DROP SCHEMA "+schema+" CASCADE");
                try(var query=connection.prepareStatement("SELECT count(*) FROM information_schema.schemata WHERE schema_name=?")){query.setString(1,schema);try(var rows=query.executeQuery()){rows.next();require(rows.getInt(1)==0,"owned_schema_not_removed");}}
            }
        }
        require(hash(boundedJar(jar)).equals(jarHash),"teaching_jar_changed");report.put("ownedSchemaRemoved",true);report.put("state","complete");checkpoint(output,report);
        System.out.println("Semantic evaluation complete; learned retrieval and copy-fixture answers remain separate evidence.");
    }
    private static byte[] boundedJar(Path jar)throws Exception{if(!Files.isRegularFile(jar)||Files.size(jar)>268435456)throw new IllegalArgumentException("bounded_teaching_jar_required");return Files.readAllBytes(jar);}
    @SuppressWarnings("unchecked") static Map<String,Object> qualityGate(Map<String,Object> summary){
        var lexical=(Map<String,Object>)summary.get("lexical");var dense=(Map<String,Object>)summary.get("dense-exact");
        var ls=(Map<String,Object>)lexical.get("slices");var ds=(Map<String,Object>)dense.get("slices");
        double improvement=ds.containsKey("paraphrase")&&ls.containsKey("paraphrase")?((Number)((Map<?,?>)ds.get("paraphrase")).get("recallAt3")).doubleValue()-((Number)((Map<?,?>)ls.get("paraphrase")).get("recallAt3")).doubleValue():-1;
        boolean pass=((Number)dense.get("failures")).longValue()==0&&((Number)dense.get("recallAt3")).doubleValue()>=((Number)lexical.get("recallAt3")).doubleValue()&&((Number)dense.get("mrrAt3")).doubleValue()>=((Number)lexical.get("mrrAt3")).doubleValue()&&improvement>=.20;
        return Map.of("authoredRetrievalCriteriaPassed",pass,"paraphraseRecallImprovement",improvement,"automaticPromotion",false,"humanAnswerSupport","not-assessed");
    }
    private static void checkpoint(Path path,Map<String,Object> report)throws Exception{
        String encoded=JSON.writerWithDefaultPrettyPrinter().writeValueAsString(report);if(encoded.getBytes(StandardCharsets.UTF_8).length>262144)throw new IllegalArgumentException("report_byte_cap");
        Path temporary=Files.createTempFile(path.getParent(),".semantic-evaluation-",".json");try{Files.writeString(temporary,encoded);Files.move(temporary,path,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}finally{Files.deleteIfExists(temporary);}
    }
}
