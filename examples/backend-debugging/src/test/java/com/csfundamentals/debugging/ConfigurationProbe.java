package com.csfundamentals.debugging;

import java.nio.file.*;
import java.util.*;
import com.csfundamentals.example.TaskTrackerApplication;
import com.csfundamentals.example.TaskRepository;
import org.springframework.aop.support.AopUtils;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.properties.bind.BindException;
import org.springframework.boot.context.properties.source.InvalidConfigurationPropertyValueException;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.boot.origin.PropertySourceOrigin;
import org.springframework.boot.actuate.autoconfigure.endpoint.web.WebEndpointProperties;
import org.springframework.boot.origin.OriginLookup;
import org.springframework.boot.origin.TextResourceOrigin;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.boot.web.server.autoconfigure.ServerProperties;
import org.springframework.cache.CacheManager;
import org.springframework.core.env.PropertySource;
import tools.jackson.databind.ObjectMapper;

/** Observation launcher only: imports the unchanged application and adds no application bean. */
public final class ConfigurationProbe {
    private static final String KEY = "management.endpoints.web.exposure.include";
    private static final Set<String> RESOURCES = Set.of("application.properties", "application-production.properties");
    private static void publish(Map<String, Object> report, Path destination) throws Exception {
        byte[] bytes = new ObjectMapper().writeValueAsBytes(report);
        if (bytes.length > 16384) throw new IllegalStateException("probe_report_limit");
        Path pending = Files.createTempFile(destination.getParent(), ".configuration-", ".json");
        try {
            Files.write(pending, bytes);
            Files.move(pending, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally { Files.deleteIfExists(pending); }
    }
    public static void main(String[] args) throws Exception {
        Path destination = Path.of(System.getenv("OWNED_CONFIGURATION_REPORT"));
        var report = new LinkedHashMap<String, Object>();
        var application = new SpringApplication(TaskTrackerApplication.class);
        var prepared = new java.util.concurrent.atomic.AtomicReference<ConfigurableEnvironment>();
        application.addListeners((ApplicationListener<ApplicationEnvironmentPreparedEvent>)event -> prepared.set(event.getEnvironment()));
        application.setRegisterShutdownHook(false);
        try (var context = application.run(args)) {
            var environment = context.getEnvironment();
            var candidates = new ArrayList<Map<String, Object>>();
            for (PropertySource<?> source : environment.getPropertySources()) {
                if (source.getName().equals("configurationProperties") || source.getProperty(KEY) == null) continue;
                var item = new LinkedHashMap<String, Object>();
                String name = source.getName();
                if (name.equals("commandLineArgs")) item.put("source", "command-line");
                else if (name.equals("systemEnvironment")) item.put("source", "environment-variable");
                else {
                    var origin = OriginLookup.getOrigin(source, KEY);
                    if (!(origin instanceof TextResourceOrigin text) || !RESOURCES.contains(text.getResource().getFilename()))
                        throw new IllegalStateException("unexpected_configuration_source");
                    item.put("source", text.getResource().getFilename());
                    item.put("line", text.getLocation().getLine()+1);
                }
                String value = String.valueOf(source.getProperty(KEY));
                if (!Set.of("health", "health,metrics").contains(value)) throw new IllegalStateException("unexpected_safe_property_value");
                item.put("value", value); candidates.add(item);
            }
            report.put("state", "ready");
            report.put("property", KEY);
            report.put("effective", environment.getProperty(KEY));
            report.put("orderedCandidates", candidates);
            report.put("boundExposure", new TreeSet<>(context.getBean(WebEndpointProperties.class).getExposure().getInclude()));
            report.put("activeProfiles", Arrays.asList(environment.getActiveProfiles()));
            report.put("defaultProfiles", Arrays.asList(environment.getDefaultProfiles()));
            report.put("repositoryClass", AopUtils.getTargetClass(context.getBean(TaskRepository.class)).getName());
            report.put("cacheManagerCount", context.getBeanNamesForType(CacheManager.class).length);
            report.put("configuredPort", context.getBean(ServerProperties.class).getPort());
            report.put("localPort", ((WebServerApplicationContext)context).getWebServer().getPort());
            publish(report, destination);
            long deadline = System.nanoTime()+java.time.Duration.ofSeconds(25).toNanos();
            while (System.nanoTime() < deadline) {
                if (System.in.available() > 0 && System.in.read() == 'q') return;
                Thread.sleep(20);
            }
            throw new IllegalStateException("probe_control_deadline");
        } catch (RuntimeException failure) {
            var names = new ArrayList<String>();
            String failedProperty = "unobserved", failedOrigin = "unobserved";
            Throwable cause = failure;
            while (cause != null && names.size() < 16) {
                names.add(cause.getClass().getSimpleName());
                if (cause instanceof BindException bind && bind.getProperty() != null
                        && bind.getProperty().getName().toString().equals("server.port")) {
                    failedProperty = "server.port";
                    var origin = bind.getOrigin();
                    for (int i = 0; origin != null && i < 4; i++, origin = origin.getParent())
                        if (origin instanceof PropertySourceOrigin source && source.getPropertySource().getName().equals("commandLineArgs"))
                            failedOrigin = "command-line";
                }
                if (cause instanceof InvalidConfigurationPropertyValueException invalid && invalid.getName().equals("server.port"))
                    failedProperty = "server.port";
                cause = cause.getCause();
            }
            if (failedProperty.equals("server.port") && prepared.get() != null)
                for (PropertySource<?> source : prepared.get().getPropertySources()) {
                    if (source.getName().equals("configurationProperties") || source.getProperty("server.port") == null) continue;
                    if (source.getName().equals("commandLineArgs")) failedOrigin = "command-line";
                    break;
                }
            report.clear(); report.put("state", "startup-failed"); report.put("causeTypes", names);
            report.put("failedProperty", failedProperty); report.put("failedOrigin", failedOrigin);
            publish(report, destination);
            throw new IllegalStateException("owned_configuration_startup_failed");
        }
    }
}
