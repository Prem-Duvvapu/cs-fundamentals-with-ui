package com.csfundamentals.identitylab;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationCodeRequestAuthenticationProvider;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationCodeRequestAuthenticationValidator;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationCodeRequestAuthenticationException;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationCodeRequestAuthenticationContext;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationCodeRequestAuthenticationToken;
import org.springframework.security.oauth2.server.authorization.client.InMemoryRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;

@Configuration
public class AuthorizationConfiguration {
    @Bean
    RuntimeSettings runtimeSettings() {
        return new RuntimeSettings(System.getenv());
    }

    @Bean
    @Order(1)
    SecurityFilterChain protocol(HttpSecurity http) throws Exception {
        return http.oauth2AuthorizationServer(server -> {
                    http.securityMatcher(server.getEndpointsMatcher());
                    server.authorizationEndpoint(endpoint -> endpoint.authenticationProviders(providers ->
                            providers.forEach(provider -> {
                                if (provider instanceof OAuth2AuthorizationCodeRequestAuthenticationProvider code) {
                                    code.setAuthenticationValidator(new OAuth2AuthorizationCodeRequestAuthenticationValidator()
                                            .andThen(AuthorizationConfiguration::strictPublicRequest));
                                }
                            })));
                })
                .authorizeHttpRequests(authorize -> authorize.anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions.defaultAuthenticationEntryPointFor(
                        new LoginUrlAuthenticationEntryPoint("/login"),
                        new MediaTypeRequestMatcher(MediaType.TEXT_HTML)))
                .build();
    }

    private static void strictPublicRequest(OAuth2AuthorizationCodeRequestAuthenticationContext context) {
        OAuth2AuthorizationCodeRequestAuthenticationToken request = context.getAuthentication();
        var parameters = request.getAdditionalParameters();
        Object challenge = parameters.get("code_challenge");
        if (!context.getRegisteredClient().getRedirectUris().contains(request.getRedirectUri())
                || !"S256".equals(parameters.get("code_challenge_method"))
                || !(challenge instanceof String value) || !value.matches("[A-Za-z0-9_-]{43}")) {
            // Null authentication prevents an error redirect to an untrusted callback.
            throw new OAuth2AuthorizationCodeRequestAuthenticationException(new OAuth2Error("invalid_request"), null);
        }
    }

    @Bean
    @Order(2)
    SecurityFilterChain login(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/ready", "/error").permitAll()
                        .anyRequest().authenticated())
                .formLogin(Customizer.withDefaults())
                .build();
    }

    @Bean
    UserDetailsService users(RuntimeSettings settings) {
        var encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
        return new InMemoryUserDetailsManager(
                User.withUsername(settings.user()).password(encoder.encode(settings.password())).roles("USER").build(),
                User.withUsername(settings.otherUser()).password(encoder.encode(settings.otherPassword())).roles("USER").build());
    }

    @Bean
    RegisteredClientRepository clients(RuntimeSettings settings) {
        return new InMemoryRegisteredClientRepository(List.of(
                client("tracker-public", settings.redirect(), Duration.ofMinutes(2)),
                client("short-public", settings.redirect(), Duration.ofSeconds(1)),
                client("other-api-public", settings.redirect(), Duration.ofMinutes(2))));
    }

    private RegisteredClient client(String id, String redirect, Duration lifetime) {
        return RegisteredClient.withId(UUID.randomUUID().toString())
                .clientId(id)
                .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(redirect)
                .scope("projects:read")
                .scope("projects:write")
                .clientSettings(ClientSettings.builder().requireProofKey(true)
                        .requireAuthorizationConsent(false).build())
                .tokenSettings(TokenSettings.builder()
                        .authorizationCodeTimeToLive(Duration.ofSeconds(30))
                        .accessTokenTimeToLive(lifetime).build())
                .build();
    }

    @Bean
    OAuth2TokenCustomizer<JwtEncodingContext> audience() {
        return context -> context.getClaims().audience(List.of(
                "other-api-public".equals(context.getRegisteredClient().getClientId())
                        ? "other-teaching-api" : "task-tracker-lab"));
    }

    @Bean
    JWKSource<SecurityContext> signingKeys() throws Exception {
        var generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        var pair = generator.generateKeyPair();
        var key = new RSAKey.Builder((RSAPublicKey) pair.getPublic())
                .privateKey((RSAPrivateKey) pair.getPrivate())
                .keyID(UUID.randomUUID().toString()).build();
        return new ImmutableJWKSet<>(new JWKSet(key));
    }

    @Bean
    AuthorizationServerSettings serverSettings() {
        // The loopback Host filter binds request-derived issuer to the actual owned port.
        return AuthorizationServerSettings.builder().build();
    }
}
