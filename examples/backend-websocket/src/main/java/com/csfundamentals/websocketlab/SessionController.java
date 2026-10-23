package com.csfundamentals.websocketlab;

import java.security.Principal;
import java.util.Map;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
public class SessionController {
    @GetMapping("/lab/session/csrf") Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "parameter", token.getParameterName());
    }
    @GetMapping("/lab/session/me") Map<String, String> me(Principal principal) {
        return Map.of("principal", principal.getName());
    }
}
