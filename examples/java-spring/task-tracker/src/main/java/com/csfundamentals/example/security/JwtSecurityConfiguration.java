package com.csfundamentals.example.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.proc.*;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import java.net.URI;
import java.time.*;
import java.util.Collections;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@Profile("jwt")
public class JwtSecurityConfiguration {
    @Bean JwtDecoder teachingJwtDecoder(@Value("${TASK_TRACKER_JWKS_URI}") URI uri,
            @Value("${TASK_TRACKER_JWT_ISSUER}") String issuer,
            @Value("${TASK_TRACKER_JWT_AUDIENCE}") String audience,
            @Value("${TASK_TRACKER_JWKS_CACHE_SECONDS:30}") int seconds) {
        if(issuer.isBlank() || audience.isBlank())throw new IllegalArgumentException("Configure issuer and audience");
        DefaultJWTProcessor<SecurityContext> processor=new DefaultJWTProcessor<>();
        processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.RS256,new BoundedJwkSource(uri,Duration.ofSeconds(seconds))));
        NimbusJwtDecoder decoder=new NimbusJwtDecoder(processor);
        OAuth2TokenValidator<Jwt> required=jwt->{
            Instant now=Instant.now();
            boolean valid=jwt.getExpiresAt()!=null && jwt.getIssuedAt()!=null && jwt.getSubject()!=null
                    && jwt.getSubject().matches("[a-zA-Z0-9-]{1,64}") && jwt.getAudience().contains(audience)
                    && !jwt.getIssuedAt().isAfter(now.plusSeconds(5))
                    && jwt.getExpiresAt().isAfter(jwt.getIssuedAt())
                    && Duration.between(jwt.getIssuedAt(),jwt.getExpiresAt()).compareTo(Duration.ofMinutes(10))<=0;
            return valid?OAuth2TokenValidatorResult.success():OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(Duration.ofSeconds(5)),new JwtIssuerValidator(issuer),required));
        return decoder;
    }
    @Bean @Order(0)
    SecurityFilterChain bearerProjects(HttpSecurity http,JwtDecoder decoder) throws Exception {
        DefaultBearerTokenResolver resolver=new DefaultBearerTokenResolver();
        resolver.setAllowUriQueryParameter(false); resolver.setAllowFormEncodedBodyParameter(false);
        return http.securityMatcher(request->{
            String path=request.getServletPath();
            return (path.equals("/api/projects") || path.startsWith("/api/projects/"))
                    && Collections.list(request.getHeaders("Authorization")).stream().anyMatch(value->value.regionMatches(true,0,"Bearer",0,6));
        }).sessionManagement(session->session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf->csrf.disable()) // Only the explicit Authorization-header bearer chain; legacy CSRF stays enabled.
                .authorizeHttpRequests(auth->auth.requestMatchers(HttpMethod.GET,"/api/projects/**").hasAuthority("SCOPE_projects:read")
                        .anyRequest().hasAuthority("SCOPE_projects:write"))
                .oauth2ResourceServer(resource->resource.jwt(jwt->jwt.decoder(decoder)).bearerTokenResolver(request->{
                    if(Collections.list(request.getHeaders("Authorization")).size()!=1)
                        throw new OAuth2AuthenticationException("invalid_request");
                    String token=resolver.resolve(request);
                    if(token!=null && token.length()>4096)throw new OAuth2AuthenticationException("invalid_token");
                    return token;
                }).authenticationEntryPoint((request,response,failure)->{
                    response.setStatus(401); response.setHeader("WWW-Authenticate","Bearer");
                    response.setContentType("application/json"); response.getWriter().write("{\"error\":\"invalid_token\"}");
                }).accessDeniedHandler((request,response,failure)->{
                    response.setStatus(403); response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"insufficient_scope\"}");
                })).build();
    }
}
