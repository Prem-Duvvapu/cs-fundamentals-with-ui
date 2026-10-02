package com.csfundamentals.example;
import org.springframework.context.annotation.Profile;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
@RestController @Profile("secure")
public class CsrfController {
    record Token(String token, String headerName) { }
    @GetMapping("/api/csrf") Token csrf(CsrfToken token) { return new Token(token.getToken(), token.getHeaderName()); }
}
