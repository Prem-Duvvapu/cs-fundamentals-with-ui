package com.csfundamentals.identitylab;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LoopbackBoundary extends OncePerRequestFilter {
    private final AtomicInteger calls = new AtomicInteger();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String expectedHost = "127.0.0.1:" + request.getLocalPort();
        if (!expectedHost.equals(request.getHeader("Host"))
                || !"127.0.0.1".equals(request.getRemoteAddr())) {
            response.sendError(400);
            return;
        }
        if (request.getContentLengthLong() > 16_384) {
            response.sendError(413);
            return;
        }
        if (calls.incrementAndGet() > 256) {
            response.sendError(503);
            return;
        }
        chain.doFilter(request, response);
    }
}
