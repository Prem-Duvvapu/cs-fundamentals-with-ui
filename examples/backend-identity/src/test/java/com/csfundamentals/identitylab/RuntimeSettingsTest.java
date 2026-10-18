package com.csfundamentals.identitylab;

import java.util.HashMap;
import java.util.HexFormat;
import java.security.SecureRandom;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RuntimeSettingsTest {
    private Map<String, String> settings() {
        var random = new SecureRandom();
        byte[] password = new byte[32];
        random.nextBytes(password);
        return new HashMap<>(Map.of("IDENTITY_USER", "learner-" + HexFormat.of().formatHex(password, 0, 8),
                "IDENTITY_OTHER_USER", "learner-" + HexFormat.of().formatHex(password, 8, 16),
                "IDENTITY_PASSWORD", HexFormat.of().formatHex(password),
                "IDENTITY_OTHER_PASSWORD", HexFormat.of().formatHex(password),
                "IDENTITY_REDIRECT_URI", "http://127.0.0.1:12345/callback"));
    }

    @Test
    void acceptsOnlyExactOwnedLoopbackCallbackWithoutQueryFragmentOrUserInfo() {
        var values = settings();
        assertEquals(values.get("IDENTITY_REDIRECT_URI"), new RuntimeSettings(values).redirect());
        for (String redirect : new String[]{"https://remote.invalid/callback", "http://127.0.0.1:1/other",
                "http://127.0.0.1:0/callback", "http://127.0.0.1:1/callback?next=external",
                "http://user@127.0.0.1:1/callback", "http://127.0.0.1:1/callback#fragment"}) {
            values.put("IDENTITY_REDIRECT_URI", redirect);
            assertThrows(IllegalArgumentException.class, () -> new RuntimeSettings(values));
        }
    }

    @Test
    void rejectsMissingDefaultWeakOrCollidingIdentities() {
        assertThrows(IllegalArgumentException.class, () -> new RuntimeSettings(Map.of()));
        var values = settings();
        values.put("IDENTITY_PASSWORD", "password");
        assertThrows(IllegalArgumentException.class, () -> new RuntimeSettings(values));
        var colliding = settings();
        colliding.put("IDENTITY_OTHER_USER", colliding.get("IDENTITY_USER"));
        assertThrows(IllegalArgumentException.class, () -> new RuntimeSettings(colliding));
    }
}
