package com.csfundamentals.persistencelab;

import java.io.StringReader;
import java.sql.*;
import java.util.*;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.*;
import org.xml.sax.InputSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;
import static com.csfundamentals.persistencelab.PgEvidence.*;

@EnabledIfEnvironmentVariable(named="PERSISTENCE_TESTS",matches="true")
@Timeout(35)
class PostgresAccessPathTest {
    @Test void selectiveCompositeCoveringIndexPreservesResultsWhileBroadScanAndDeepOffsetExposeDifferentWork() throws Exception {
        try(OwnedDatabase database=new OwnedDatabase(TestSettings.environment());Connection connection=database.connection()) {
            sql(connection,"CREATE TABLE orders_path(id INT PRIMARY KEY,tenant INT NOT NULL,status TEXT NOT NULL,created_seq INT NOT NULL,payload TEXT NOT NULL)");
            sql(connection,"INSERT INTO orders_path SELECT n,n%100,CASE WHEN (n/100)%2=0 THEN 'open' ELSE 'closed' END,n/2,repeat('x',64) FROM generate_series(1,20000) n; ANALYZE orders_path");
            String query="SELECT id,created_seq,payload FROM orders_path WHERE tenant=42 AND status='open' ORDER BY created_seq,id LIMIT 20";
            List<String> original=rows(connection,query);
            List<Map<String,Object>> before=plan(connection,query,false);
            assertTrue(has(before,"Seq Scan")); assertTrue(has(before,"Sort"));
            sql(connection,"CREATE INDEX orders_lookup ON orders_path(tenant,status,created_seq,id) INCLUDE(payload)");
            sql(connection,"VACUUM (ANALYZE) orders_path");
            List<String> indexed=rows(connection,query);
            List<Map<String,Object>> after=plan(connection,query,false);
            assertEquals(original,indexed); assertEquals(20,indexed.size());
            assertEquals(42,Integer.parseInt(indexed.get(0).split(":" )[0]));
            assertTrue(has(after,"Index Only Scan")); assertFalse(has(after,"Sort"));
            assertTrue(after.stream().anyMatch(node->"orders_lookup".equals(node.get("Index-Name"))));
            assertEquals(0L,((Number)indexNode(after).get("Heap-Fetches")).longValue());
            String offset=query.replace("LIMIT 20","LIMIT 20 OFFSET 60");
            String cursor=query.replace(" ORDER BY"," AND (created_seq,id)>(5921,11842) ORDER BY");
            assertEquals(rows(connection,offset),rows(connection,cursor));
            List<Map<String,Object>> offsetPlan=plan(connection,offset,false),cursorPlan=plan(connection,cursor,false);
            assertEquals(80L,((Number)indexNode(offsetPlan).get("Actual-Rows")).longValue()); assertEquals(20L,((Number)indexNode(cursorPlan).get("Actual-Rows")).longValue());
            List<Map<String,Object>> broad=plan(connection,"SELECT sum(octet_length(payload)) FROM orders_path WHERE tenant>=0",false);
            assertTrue(has(broad,"Seq Scan")); assertFalse(broad.stream().anyMatch(node->"orders_lookup".equals(node.get("Index-Name"))));
            long indexBytes=number(connection,"SELECT pg_relation_size('"+database.schema+".orders_lookup')"); assertTrue(indexBytes>0);
            connection.setAutoCommit(false);
            List<Map<String,Object>> write;
            try { write=plan(connection,"UPDATE orders_path SET status='closed' WHERE id=42",true); }
            finally { connection.rollback(); connection.setAutoCommit(true); }
            assertEquals(original,rows(connection,query));
            assertTrue(write.stream().anyMatch(node->((Number)node.getOrDefault("WAL-Records",0)).longValue()>0));
            write("composite-index",Map.of("fixtureRows",20000,"resultRows",20,"equivalentRows",true,"indexBytes",indexBytes,
                "before",before,"after",after,"deepOffset",offsetPlan,"keyset",cursorPlan,"broad",broad,"rolledBackIndexedWrite",write));
        }
    }
    private List<String> rows(Connection connection,String query) throws SQLException {
        List<String> result=new ArrayList<>();
        try(Statement statement=connection.createStatement();ResultSet rows=statement.executeQuery(query)) {
            while(rows.next()) { if(result.size()>=20)throw new SQLException("Fixed page cap"); result.add(rows.getInt(1)+":"+rows.getInt(2)+":"+rows.getString(3)); }
        }
        return result;
    }
    private static boolean has(List<Map<String,Object>> plan,String type) { return plan.stream().anyMatch(node->type.equals(node.get("Node-Type"))); }
    private static Map<String,Object> indexNode(List<Map<String,Object>> plan) {
        return plan.stream().filter(node->"orders_lookup".equals(node.get("Index-Name"))).findFirst().orElseThrow();
    }
    private List<Map<String,Object>> plan(Connection connection,String query,boolean wal) throws Exception {
        String xml=text(connection,"EXPLAIN (ANALYZE,BUFFERS,"+(wal?"WAL,":"")+"FORMAT XML) "+query);
        if(xml.length()>65536)throw new IllegalStateException("Owned plan byte cap");
        DocumentBuilderFactory factory=DocumentBuilderFactory.newInstance();
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING,true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
        factory.setXIncludeAware(false); factory.setExpandEntityReferences(false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD,""); factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA,"");
        Document document=factory.newDocumentBuilder().parse(new InputSource(new StringReader(xml)));
        NodeList plans=document.getElementsByTagName("Plan");
        List<Map<String,Object>> nodes=new ArrayList<>();
        for(int i=0;i<plans.getLength();i++) {
            if(i>=16)throw new IllegalStateException("Owned plan node cap");
            Map<String,Object> node=new LinkedHashMap<>();
            for(Node child=plans.item(i).getFirstChild();child!=null;child=child.getNextSibling()) {
                String name=child.getNodeName();
                if(Set.of("Node-Type","Index-Name","Sort-Method").contains(name))node.put(name,child.getTextContent());
                if(Set.of("Plan-Rows","Actual-Rows","Actual-Loops","Rows-Removed-by-Filter","Shared-Hit-Blocks","Shared-Read-Blocks","Heap-Fetches","WAL-Records","WAL-Bytes").contains(name))
                    node.put(name,Long.parseLong(child.getTextContent()));
            }
            nodes.add(node);
        }
        assertFalse(nodes.isEmpty()); return nodes;
    }

    @Test void stableTieBreakersDoNotTurnMutableOffsetOrKeysetPagesIntoASnapshot() throws Exception {
        try(OwnedDatabase database=new OwnedDatabase(TestSettings.environment());Connection reader=database.connection();Connection writer=database.connection()) {
            sql(writer,"CREATE TABLE feed(id INT PRIMARY KEY,position INT NOT NULL)");
            reset(writer); assertEquals(List.of(1,2),page(reader,0,false));
            sql(writer,"INSERT INTO feed VALUES(6,15)");
            List<Integer> insertOffset=page(reader,2,false),insertKeyset=page(reader,0,true);
            assertEquals(List.of(2,3),insertOffset); assertEquals(List.of(3,4),insertKeyset);
            reset(writer); assertEquals(List.of(1,2),page(reader,0,false)); sql(writer,"DELETE FROM feed WHERE id=1");
            List<Integer> deleteOffset=page(reader,2,false),deleteKeyset=page(reader,0,true);
            assertEquals(List.of(4,5),deleteOffset); assertEquals(List.of(3,4),deleteKeyset);
            reset(writer); assertEquals(List.of(1,2),page(reader,0,false));
            sql(writer,"UPDATE feed SET position=CASE id WHEN 1 THEN 25 WHEN 4 THEN 5 ELSE position END WHERE id IN(1,4)");
            List<Integer> mutableKeyset=page(reader,0,true); assertEquals(List.of(3,1),mutableKeyset);
            reset(writer); begin(reader,Connection.TRANSACTION_REPEATABLE_READ);
            assertEquals(List.of(1,2),page(reader,0,false));
            sql(writer,"INSERT INTO feed VALUES(6,15); DELETE FROM feed WHERE id=1; UPDATE feed SET position=5 WHERE id=4");
            assertEquals(List.of(3,4),page(reader,2,false)); assertEquals(List.of(3,4),page(reader,0,true)); reader.commit();
            write("pagination",Map.of("firstPage",List.of(1,2),"insertOffset",insertOffset,"insertKeyset",insertKeyset,
                "deleteOffset",deleteOffset,"deleteKeyset",deleteKeyset,"mutableSortKeyKeyset",mutableKeyset,
                "repeatableReadRemaining",List.of(3,4),"keysetIsNotSnapshot",true,"tieBreaker","position,id"));
        }
    }
    private void reset(Connection connection) throws SQLException { sql(connection,"TRUNCATE feed; INSERT INTO feed VALUES(1,10),(2,20),(3,20),(4,30),(5,40)"); }
    private List<Integer> page(Connection connection,int offset,boolean cursor) throws SQLException {
        if(offset!=0 && offset!=2)throw new IllegalArgumentException("Fixed teaching offset");
        return ids(connection,"SELECT id FROM feed "+(cursor?"WHERE (position,id)>(20,2) ":"")+"ORDER BY position,id LIMIT 2 OFFSET "+offset);
    }
}
