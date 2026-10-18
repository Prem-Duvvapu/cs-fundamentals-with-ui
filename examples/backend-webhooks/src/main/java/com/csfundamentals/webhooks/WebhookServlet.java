package com.csfundamentals.webhooks;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.SQLException;
import java.util.*;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import tools.jackson.databind.ObjectMapper;

final class WebhookServlet extends HttpServlet {
    static final int MAX_BODY = 4096;
    private final Signatures signatures;
    private final EventStore store;
    private final byte[] observerSecret;
    private final int maximumSchema, responseDelay;
    private final Path commitSignal;
    private final Semaphore bodies = new Semaphore(16);
    private final AtomicInteger requests = new AtomicInteger();
    private final ObjectMapper json = new ObjectMapper();
    WebhookServlet(Signatures signatures, EventStore store, String observerSecret, int maximumSchema, int responseDelay, Path commitSignal) {
        this.signatures=signatures; this.store=store; this.observerSecret=observerSecret.getBytes(StandardCharsets.US_ASCII);
        this.maximumSchema=maximumSchema; this.responseDelay=responseDelay; this.commitSignal=commitSignal;
    }
    @Override protected void service(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setHeader("Cache-Control","no-store"); response.setHeader("X-Content-Type-Options","nosniff");
        if (requests.incrementAndGet() > 256) { reply(response,429,"request_budget"); return; }
        if (request.getQueryString()!=null) { reply(response,400,"bad_request"); return; }
        if (request.getRequestURI().equals("/lab/state")) { observe(request,response); return; }
        if (!request.getMethod().equals("POST")) { reply(response,405,"method_not_allowed"); return; }
        String tenant = request.getRequestURI().replaceFirst("^/webhooks/", "");
        if (!Set.of("tenant-a","tenant-b").contains(tenant)) { reply(response,404,"not_found"); return; }
        String keyId=single(request,"X-Key-Id"), timestamp=single(request,"X-Timestamp"), signature=single(request,"X-Signature");
        if (keyId==null || timestamp==null || signature==null) { reply(response,401,"unauthorized"); return; }
        if (!"application/json".equals(request.getContentType()) || request.getHeader("Content-Encoding")!=null) { reply(response,415,"unsupported_media"); return; }
        if (request.getContentLengthLong()>MAX_BODY) { reply(response,413,"body_too_large"); return; }
        if (!bodies.tryAcquire()) { reply(response,429,"overloaded"); return; }
        AsyncContext context=request.startAsync(); context.setTimeout(2500);
        var exchange=new Exchange(context,response,tenant,keyId,timestamp,signature);
        context.addListener(exchange);
        try { request.getInputStream().setReadListener(exchange); }
        catch (Exception failure) { exchange.finish(400,"bad_request"); }
    }
    private void observe(HttpServletRequest request,HttpServletResponse response) throws IOException {
        String secret=single(request,"X-Lab-Observer");
        if (!request.getMethod().equals("GET") || secret==null || secret.length()!=64
                || !MessageDigest.isEqual(observerSecret,secret.getBytes(StandardCharsets.US_ASCII))) { reply(response,401,"unauthorized"); return; }
        try {
            byte[] bytes=json.writeValueAsBytes(store.observe());
            response.setStatus(200); response.setContentType("application/json"); response.getOutputStream().write(bytes);
        } catch (SQLException failure) { reply(response,503,"store_unavailable"); }
    }
    private static String single(HttpServletRequest request,String name) {
        var values=request.getHeaders(name);
        if (!values.hasMoreElements()) return null;
        String value=values.nextElement(); return values.hasMoreElements() || value.length()>128 ? null : value;
    }
    private static void reply(HttpServletResponse response,int status,String code) throws IOException {
        response.setStatus(status); response.setContentType("application/json");
        if (status==429 || status==503) response.setHeader("Retry-After","1");
        response.getOutputStream().write(("{\"result\":\""+code+"\"}").getBytes(StandardCharsets.US_ASCII));
    }
    private final class Exchange implements ReadListener, AsyncListener {
        private final AsyncContext context;
        private final HttpServletResponse response;
        private final String tenant,keyId,timestamp,signature;
        private final ByteArrayOutputStream body=new ByteArrayOutputStream();
        private final long began=System.nanoTime();
        private boolean finished;
        Exchange(AsyncContext context,HttpServletResponse response,String tenant,String keyId,String timestamp,String signature) {
            this.context=context; this.response=response; this.tenant=tenant; this.keyId=keyId; this.timestamp=timestamp; this.signature=signature;
        }
        @Override public synchronized void onDataAvailable() throws IOException {
            var input=context.getRequest().getInputStream(); var buffer=new byte[512];
            while (!finished && input.isReady() && !input.isFinished()) {
                if (System.nanoTime()-began>2_500_000_000L) { finish(408,"body_timeout"); return; }
                int size=input.read(buffer);
                if (size<0) break;
                if (body.size()+size>MAX_BODY) { finish(413,"body_too_large"); return; }
                body.write(buffer,0,size);
            }
        }
        @Override public synchronized void onAllDataRead() {
            if (finished) return;
            if (System.nanoTime()-began>2_500_000_000L) { finish(408,"body_timeout"); return; }
            context.setTimeout(8000);
            try {
                byte[] raw=body.toByteArray(); signatures.verify(tenant,keyId,timestamp,signature,raw);
                String result=store.accept(tenant,Payload.parse(raw,maximumSchema),raw);
                if (result.equals("applied") && commitSignal!=null) Files.writeString(commitSignal,"committed\n",StandardOpenOption.CREATE,StandardOpenOption.TRUNCATE_EXISTING);
                if (responseDelay>0) Thread.sleep(responseDelay);
                finish(result.equals("applied")?202:200,result);
            } catch (Failure failure) { finish(failure.status,failure.code); }
            catch (SQLException failure) { finish(503,"store_unavailable"); }
            catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); finish(503,"interrupted"); }
            catch (Exception failure) { finish(503,"store_unavailable"); }
        }
        synchronized void finish(int status,String code) {
            if (finished) return;
            finished=true;
            try { reply(response,status,code); } catch (IOException disconnected) { /* The persisted receipt, not a delivered response, determines retry behavior. */ }
            finally { bodies.release(); try { context.complete(); } catch (IllegalStateException alreadyComplete) { } }
        }
        @Override public void onError(Throwable failure) { finish(400,"bad_request"); }
        @Override public void onTimeout(AsyncEvent event) { finish(408,"body_timeout"); }
        @Override public void onError(AsyncEvent event) { finish(400,"bad_request"); }
        @Override public void onComplete(AsyncEvent event) { }
        @Override public void onStartAsync(AsyncEvent event) { }
    }
}
