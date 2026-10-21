package com.csfundamentals.websocketlab;

import com.csfundamentals.example.TaskTrackerApplication;
import jakarta.servlet.http.*;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration(proxyBeanMethods = false)
@EnableWebSocket
@Import(SessionController.class)
public class WebSocketLab implements WebSocketConfigurer {
    private final EchoRegistry registry;
    public WebSocketLab(@Value("${lab.session-idle-seconds:120}") int sessionIdle,
                        @Value("${lab.socket-idle-millis:10000}") long socketIdle) {
        if (sessionIdle < 2 || sessionIdle > 300 || socketIdle < 1000 || socketIdle > 30000)
            throw new IllegalArgumentException("Teaching limits out of bounds");
        this.registry = new EchoRegistry(sessionIdle, socketIdle);
    }
    public static void main(String[] args) {
        SpringApplication.run(new Class<?>[]{TaskTrackerApplication.class, WebSocketLab.class}, args);
    }
    @Bean(destroyMethod = "close") EchoRegistry echoes() { return registry; }
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry handlers) {
        handlers.addHandler(registry, "/lab/ws/echo").addInterceptors(new HandshakePolicy(registry));
    }
    @Bean ServletServerContainerFactoryBean webSocketContainer() {
        var container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(1024);
        container.setMaxBinaryMessageBufferSize(1024);
        container.setMaxSessionIdleTimeout(10000L);
        container.setAsyncSendTimeout(500L);
        return container;
    }
    @Bean ServletListenerRegistrationBean<HttpSessionListener> sessionLifecycle() {
        return new ServletListenerRegistrationBean<>(new SessionLifecycle(registry));
    }
    @Bean WebServerFactoryCustomizer<TomcatServletWebServerFactory> boundedHttpSessions() {
        return factory -> factory.addContextCustomizers(context -> {
            var manager = new org.apache.catalina.session.StandardManager();
            manager.setMaxActiveSessions(32); manager.setPathname(null);
            context.setManager(manager);
        });
    }
    private record SessionLifecycle(EchoRegistry registry) implements HttpSessionListener, HttpSessionIdListener {
        @Override public void sessionCreated(HttpSessionEvent event) {
            event.getSession().setMaxInactiveInterval(registry.sessionIdleSeconds());
        }
        @Override public void sessionDestroyed(HttpSessionEvent event) { registry.invalidate(event.getSession().getId()); }
        @Override public void sessionIdChanged(HttpSessionEvent event, String oldId) { registry.invalidate(oldId); }
    }
    @Bean @Order(-1)
    SecurityFilterChain webSocketSessions(HttpSecurity http, UserDetailsService users, PasswordEncoder encoder) throws Exception {
        var provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder);
        return http.securityMatcher("/lab/session/**", "/lab/ws/echo")
            .authenticationProvider(provider)
            .securityContext(context -> context.securityContextRepository(new HttpSessionSecurityContextRepository()))
            .sessionManagement(session -> session.sessionFixation(fixation -> fixation.changeSessionId()))
            .requestCache(cache -> cache.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/lab/session/csrf", "/lab/session/login").permitAll()
                .requestMatchers("/lab/ws/echo").hasRole("LEARNER")
                .anyRequest().authenticated())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, failure) -> response.setStatus(401))
                .accessDeniedHandler((request, response, failure) -> response.setStatus(403)))
            .formLogin(login -> login.loginPage("/lab/session/login").loginProcessingUrl("/lab/session/login")
                .successHandler((request, response, authentication) -> response.setStatus(204))
                .failureHandler((request, response, failure) -> response.setStatus(401)))
            .logout(logout -> logout.logoutUrl("/lab/session/logout").invalidateHttpSession(true)
                .deleteCookies("JSESSIONID").logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
            .build(); // Default CSRF remains enabled, including login and logout POSTs.
    }
}
