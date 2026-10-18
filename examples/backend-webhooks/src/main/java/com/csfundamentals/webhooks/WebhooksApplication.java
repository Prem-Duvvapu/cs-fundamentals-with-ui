package com.csfundamentals.webhooks;

import java.nio.file.*;
import java.time.Clock;
import java.util.*;
import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.boot.web.server.servlet.context.ServletWebServerApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;

@SpringBootApplication
public class WebhooksApplication {
    public static void main(String[] args) {
        if (args.length!=0) throw new IllegalArgumentException("configuration_is_environment_only");
        SpringApplication.run(WebhooksApplication.class,args);
    }
    @Bean ServletRegistrationBean<WebhookServlet> webhooks(Environment environment) throws Exception {
        if (!"127.0.0.1".equals(environment.getProperty("server.address")) || !"0".equals(environment.getProperty("server.port")))
            throw new IllegalArgumentException("loopback_ephemeral_listener_required");
        String password=secret("LAB_DB_PASSWORD"),observer=secret("LAB_OBSERVER_SECRET");
        var tenantA=new HashMap<String,byte[]>(); tenantA.put("new",HexFormat.of().parseHex(secret("LAB_KEY_A_NEW")));
        String acceptOld=System.getenv().getOrDefault("LAB_ACCEPT_OLD","true");
        if (!Set.of("true","false").contains(acceptOld)) throw new IllegalArgumentException("invalid_rotation_configuration");
        if (acceptOld.equals("true")) tenantA.put("old",HexFormat.of().parseHex(secret("LAB_KEY_A_OLD")));
        var keys=Map.of("tenant-a",Map.copyOf(tenantA),"tenant-b",Map.of("new",HexFormat.of().parseHex(secret("LAB_KEY_B_NEW"))));
        Path database=path("LAB_DB_PATH");
        var store=new EventStore("jdbc:h2:file:"+database+";WRITE_DELAY=0;DB_CLOSE_ON_EXIT=FALSE;LOCK_TIMEOUT=750",password);
        int maximumSchema=bounded("LAB_MAX_SCHEMA",2,1,2),delay=bounded("LAB_RESPONSE_DELAY_MS",0,0,5000);
        Path signal=System.getenv("LAB_COMMIT_SIGNAL")==null?null:path("LAB_COMMIT_SIGNAL");
        var servlet=new WebhookServlet(new Signatures(keys,Clock.systemUTC()),store,observer,maximumSchema,delay,signal);
        var registration=new ServletRegistrationBean<>(servlet,"/webhooks/*","/lab/state");
        registration.setAsyncSupported(true); registration.setLoadOnStartup(1); return registration;
    }
    @EventListener void ready(ApplicationReadyEvent event) throws Exception {
        var context=(ServletWebServerApplicationContext)event.getApplicationContext();
        Path file=path("LAB_READY_FILE");
        Files.writeString(file,Integer.toString(context.getWebServer().getPort()),StandardOpenOption.CREATE_NEW);
    }
    private static String secret(String name) {
        String value=System.getenv(name);
        if (value==null || !value.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("required_256_bit_runtime_secret");
        return value;
    }
    private static int bounded(String name,int fallback,int minimum,int maximum) {
        String raw=System.getenv(name); int value=raw==null?fallback:Integer.parseInt(raw);
        if (value<minimum || value>maximum) throw new IllegalArgumentException("invalid_lab_limit"); return value;
    }
    private static Path path(String name) throws Exception {
        String raw=System.getenv(name);
        if (raw==null || raw.contains(";") || raw.contains("\n") || raw.contains("\r")) throw new IllegalArgumentException("invalid_owned_path");
        Path path=Path.of(raw).toAbsolutePath().normalize();
        if (!path.getParent().toRealPath().equals(path.getParent()) || Files.isSymbolicLink(path)) throw new IllegalArgumentException("invalid_owned_path");
        return path;
    }
}
