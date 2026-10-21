package com.csfundamentals.websocketlab;

import java.util.Map;
import org.springframework.http.*;
import org.springframework.http.server.*;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

final class HandshakePolicy implements HandshakeInterceptor {
    static final String RESERVATION = HandshakePolicy.class.getName()+".reservation";
    private final EchoRegistry registry;
    HandshakePolicy(EchoRegistry registry) { this.registry = registry; }
    @Override public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                             WebSocketHandler handler, Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest servlet)) return deny(response, HttpStatus.FORBIDDEN);
        var http = servlet.getServletRequest();
        var origins = request.getHeaders().get(HttpHeaders.ORIGIN);
        String expected = "http://127.0.0.1:"+http.getLocalPort();
        // Compare with the bound local port, never forwarded/Host headers or caller query parameters.
        if (origins == null || origins.size() != 1 || !origins.get(0).equals(expected)
                || http.getQueryString() != null || http.getHeader("Authorization") != null)
            return deny(response, HttpStatus.FORBIDDEN);
        var session = http.getSession(false);
        if (session == null || http.getUserPrincipal() == null) return deny(response, HttpStatus.UNAUTHORIZED);
        EchoRegistry.Reservation reservation = registry.reserve(http.getUserPrincipal().getName(), session.getId());
        if (reservation == null) return deny(response, HttpStatus.TOO_MANY_REQUESTS);
        attributes.put(RESERVATION, reservation);
        http.setAttribute(RESERVATION, reservation);
        return true;
    }
    private static boolean deny(ServerHttpResponse response, HttpStatus status) { response.setStatusCode(status); return false; }
    @Override public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                         WebSocketHandler handler, Exception failure) {
        // Handshake attributes are unavailable here; release uses request-scoped admission.
        if (request instanceof ServletServerHttpRequest servlet) {
            Object value = servlet.getServletRequest().getAttribute(RESERVATION);
            boolean switching = response instanceof ServletServerHttpResponse servletResponse
                && servletResponse.getServletResponse().getStatus() == 101;
            // Tomcat may invoke endpoint onOpen after the HTTP handshake handler returns.
            if (value instanceof EchoRegistry.Reservation reservation && (failure != null || !switching))
                registry.reject(reservation);
        }
    }
}
