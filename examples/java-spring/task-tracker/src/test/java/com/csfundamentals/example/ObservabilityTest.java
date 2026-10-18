package com.csfundamentals.example;

import com.csfundamentals.example.observability.*;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.sdk.testing.exporter.InMemorySpanExporter;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.slf4j.LoggerFactory;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.annotation.DirtiesContext;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties="spring.datasource.url=jdbc:h2:mem:observability;DB_CLOSE_DELAY=-1")
@ActiveProfiles("observability")
@Import(ObservabilityTest.Capture.class)
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class ObservabilityTest {
    @TestConfiguration static class Capture {
        @Bean InMemorySpanExporter capturedSpans() { return InMemorySpanExporter.create(); }
        @Bean @Primary SpanExporter composite(InMemorySpanExporter exporter) {
            return SpanExporter.composite(exporter,new LocalSpanLogExporter());
        }
    }
    @LocalServerPort int port;
    @Autowired InMemorySpanExporter exported;
    @Autowired MeterRegistry meters;
    @Autowired TaskRepository repository;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    private final ListAppender<ILoggingEvent> logs=new ListAppender<>();
    private final Logger log=(Logger)LoggerFactory.getLogger("teaching.observability");
    @BeforeEach void prepare() { exported.reset(); logs.start(); log.addAppender(logs); }
    @AfterEach void detach() { log.detachAppender(logs); logs.stop(); }
    private HttpResponse<String> request(String query,String parent) throws Exception {
        HttpRequest.Builder request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/observability/probe?"+query))
                .timeout(Duration.ofSeconds(4)).POST(HttpRequest.BodyPublishers.noBody())
                .header("Authorization","Bearer NEVER_LOG_THIS_TOKEN")
                .header("baggage","user.email=NEVER_LOG_THIS_EMAIL");
        if(parent!=null)request.header("traceparent",parent);
        return client.send(request.build(),HttpResponse.BodyHandlers.ofString());
    }
    private Map<String,SpanData> stages() {
        Map<String,SpanData> result=new HashMap<>();
        for(SpanData span:exported.getFinishedSpanItems()) assertNull(result.put(span.getName(),span),"Unexpected duplicate stage");
        return result;
    }
    @Test void realHttpAsyncDependencyAndJpaKeepOneParentChain() throws Exception {
        int before=repository.findAll().size();
        String trace="1234567890abcdef1234567890abcdef", parent="1234567890abcdef";
        assertEquals(200,request("scenario=ok","00-"+trace+"-"+parent+"-01").statusCode());
        assertEquals(before+1,repository.findAll().size(),"Actual persistence operation must commit");
        Map<String,SpanData> spans=stages();
        assertEquals(Set.of("REQUEST","ASYNC","DEPENDENCY_CLIENT","DEPENDENCY_SERVER","DATABASE"),spans.keySet());
        for(SpanData span:spans.values()) assertEquals(trace,span.getTraceId());
        assertEquals(parent,spans.get("REQUEST").getParentSpanId());
        for(String[] pair:new String[][]{{"REQUEST","ASYNC"},{"ASYNC","DEPENDENCY_CLIENT"},{"DEPENDENCY_CLIENT","DEPENDENCY_SERVER"},{"DEPENDENCY_SERVER","DATABASE"}}) {
            assertEquals(spans.get(pair[0]).getSpanId(),spans.get(pair[1]).getParentSpanId());
        }
        assertTrue(spans.get("DEPENDENCY_SERVER").getParentSpanContext().isRemote());
    }
    @Test void missingOrMalformedIncomingContextStartsFreshValidTrace() throws Exception {
        assertEquals(200,request("scenario=ok",null).statusCode());
        SpanData root=stages().get("REQUEST"); assertTrue(root.getSpanContext().isValid()); assertFalse(root.getParentSpanContext().isValid());
        exported.reset();
        assertEquals(200,request("scenario=ok","NEVER_LOG_INVALID_HEADER").statusCode());
        assertFalse(stages().get("REQUEST").getParentSpanContext().isValid());
        assertNotEquals(root.getTraceId(),stages().get("REQUEST").getTraceId());
    }
    @Test void latencyBelongsToDependencyStageAndHasMeasuredTimer() throws Exception {
        assertEquals(200,request("scenario=slow",null).statusCode());
        SpanData dependency=stages().get("DEPENDENCY_SERVER");
        assertTrue(dependency.getEndEpochNanos()-dependency.getStartEpochNanos()>=Duration.ofMillis(70).toNanos());
        assertTrue(meters.get("tasktracker.probe.duration").tags("stage","DEPENDENCY_SERVER","outcome","success").timer().max(java.util.concurrent.TimeUnit.MILLISECONDS)>=70);
    }
    @Test void failedDependencyIsAttributedWithoutInventingADatabaseCall() throws Exception {
        int before=repository.findAll().size();
        assertEquals(503,request("scenario=failure",null).statusCode());
        assertEquals(before,repository.findAll().size());
        Map<String,SpanData> spans=stages(); assertFalse(spans.containsKey("DATABASE")); assertEquals(4,spans.size());
        for(SpanData span:spans.values()) {
            assertEquals(StatusCode.ERROR,span.getStatus().getStatusCode());
            assertEquals("DEPENDENCY_FAILURE",span.getAttributes().get(AttributeKey.stringKey("error.type")));
            assertTrue(span.getEvents().isEmpty(),"No raw exception details");
        }
    }
    @Test void payloadsIdsQueriesAndHeadersDoNotBecomeLogsOrMetricLabels() throws Exception {
        assertEquals(200,request("scenario=ok&user=NEVER_LOG_THIS_USER",null).statusCode());
        Map<String,SpanData> spans=stages();
        assertEquals(5,logs.list.size());
        for(ILoggingEvent event:logs.list) {
            String json=event.getFormattedMessage();
            assertTrue(json.startsWith("{\"event\":\"probe.span\""));
            assertEquals("probe.span",tools.jackson.databind.json.JsonMapper.builder().build().readTree(json).path("event").asText());
            assertFalse(json.contains("NEVER_LOG"));
            assertFalse(json.contains("Observability synthetic fixture"));
            assertTrue(json.contains(spans.get("REQUEST").getTraceId()));
        }
        for(SpanData span:spans.values()) {
            assertEquals(Set.of(AttributeKey.stringKey("lab.stage")),span.getAttributes().asMap().keySet());
        }
        for(var meter:meters.getMeters()) {
            if(!meter.getId().getName().startsWith("tasktracker.probe."))continue;
            for(var tag:meter.getId().getTags()) {
                assertTrue(Set.of("stage","outcome","le").contains(tag.getKey()),meter.getId().toString());
                if(tag.getKey().equals("le")) assertTrue(Set.of(.05,.1,.25,1.0,2.0).contains(Double.parseDouble(tag.getValue())));
                assertFalse(tag.getValue().contains("NEVER_LOG"));
            }
        }
        long series=meters.getMeters().stream().filter(meter->meter.getId().getName().startsWith("tasktracker.probe.")).count();
        assertTrue(series<=70,"At most ten stage/outcome pairs, each with timer, counter and five fixed SLO bucket gauges");
    }
}
