package com.csfundamentals.identitylab;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class IdentityApplication {
    public static void main(String[] arguments) {
        SpringApplication.run(IdentityApplication.class, arguments);
    }

    @GetMapping("/ready")
    String ready() {
        return "teaching-authorization-server";
    }
}
