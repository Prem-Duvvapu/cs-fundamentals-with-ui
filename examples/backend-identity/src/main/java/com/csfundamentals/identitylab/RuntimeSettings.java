package com.csfundamentals.identitylab;

import java.net.URI;
import java.util.Map;

public final class RuntimeSettings {
    private final String user;
    private final String password;
    private final String otherUser;
    private final String otherPassword;
    private final String redirect;

    public RuntimeSettings(Map<String, String> environment) {
        user = requireUser(environment.get("IDENTITY_USER"));
        otherUser = requireUser(environment.get("IDENTITY_OTHER_USER"));
        if (user.equals(otherUser)) {
            throw new IllegalArgumentException("Generate two distinct teaching identities");
        }
        password = requireSecret(environment.get("IDENTITY_PASSWORD"));
        otherPassword = requireSecret(environment.get("IDENTITY_OTHER_PASSWORD"));
        URI uri;
        try {
            uri = URI.create(environment.getOrDefault("IDENTITY_REDIRECT_URI", ""));
        } catch (IllegalArgumentException failure) {
            throw new IllegalArgumentException("Configure an owned loopback callback");
        }
        if (!"http".equals(uri.getScheme()) || !"127.0.0.1".equals(uri.getHost())
                || uri.getPort() < 1 || uri.getPort() > 65535 || !"/callback".equals(uri.getPath())
                || uri.getRawQuery() != null || uri.getFragment() != null || uri.getUserInfo() != null) {
            throw new IllegalArgumentException("Configure an exact owned loopback callback");
        }
        redirect = uri.toASCIIString();
    }

    private static String requireUser(String value) {
        if (value == null || !value.matches("learner-[a-f0-9]{16}")) {
            throw new IllegalArgumentException("Generate a bounded teaching username");
        }
        return value;
    }

    private static String requireSecret(String value) {
        if (value == null || !value.matches("[a-f0-9]{64}")) {
            throw new IllegalArgumentException("Generate a runtime 256-bit hexadecimal password");
        }
        return value;
    }

    public String user() { return user; }
    public String password() { return password; }
    public String otherUser() { return otherUser; }
    public String otherPassword() { return otherPassword; }
    public String redirect() { return redirect; }
}
