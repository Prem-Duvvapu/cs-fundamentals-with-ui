package com.csfundamentals.example;

import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class SecurityConfiguration {
    @Bean @Profile("!secure")
    UserDetailsService teachingUsers() { return new InMemoryUserDetailsManager(); }
    @Bean @Profile("!secure")
    SecurityFilterChain teaching(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll()).csrf(csrf -> csrf.disable()).build();
    }
    @Bean @Profile("secure")
    SecurityFilterChain secured(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(auth -> auth
            .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ERROR).permitAll()
            .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
            .requestMatchers("/api/csrf").authenticated()
            .requestMatchers(HttpMethod.GET, "/api/projects/**").hasAnyRole("LEARNER", "VIEWER")
            .requestMatchers("/api/projects/**", "/actuator/metrics/**").hasRole("LEARNER")
            .anyRequest().denyAll()).httpBasic(Customizer.withDefaults()).build();
    }
    @Bean @Profile("secure") PasswordEncoder passwords() { return PasswordEncoderFactories.createDelegatingPasswordEncoder(); }
    @Bean @Profile("secure")
    UserDetailsService users(PasswordEncoder encoder,
        @Value("${TASK_TRACKER_ALICE_PASSWORD}") String alice,
        @Value("${TASK_TRACKER_BOB_PASSWORD}") String bob,
        @Value("${TASK_TRACKER_VIEWER_PASSWORD}") String viewer) {
        if (alice.isBlank() || bob.isBlank() || viewer.isBlank()) throw new IllegalArgumentException("Configure nonempty teaching user passwords.");
        return new InMemoryUserDetailsManager(
            User.withUsername("alice").password(encoder.encode(alice)).roles("LEARNER").build(),
            User.withUsername("bob").password(encoder.encode(bob)).roles("LEARNER").build(),
            User.withUsername("viewer").password(encoder.encode(viewer)).roles("VIEWER").build());
    }
}
