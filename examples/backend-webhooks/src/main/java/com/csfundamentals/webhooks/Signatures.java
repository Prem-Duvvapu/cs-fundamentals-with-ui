package com.csfundamentals.webhooks;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

final class Signatures {
    private final Map<String, Map<String, byte[]>> keys;
    private final Clock clock;
    Signatures(Map<String, Map<String, byte[]>> keys, Clock clock) {
        var owned = new HashMap<String, Map<String, byte[]>>();
        keys.forEach((tenant, entries) -> {
            var copy = new HashMap<String, byte[]>();
            entries.forEach((id, value) -> {
                if (!id.matches("[a-z0-9-]{1,24}") || value.length != 32) throw new IllegalArgumentException("invalid_key_configuration");
                copy.put(id, value.clone());
            });
            owned.put(tenant, Map.copyOf(copy));
        });
        this.keys = Map.copyOf(owned); this.clock = clock;
    }
    void verify(String tenant, String keyId, String timestamp, String signature, byte[] body) {
        if (keyId == null || !keyId.matches("[a-z0-9-]{1,24}") || timestamp == null || !timestamp.matches("[0-9]{10}")
                || signature == null || !signature.matches("[0-9a-f]{64}")) throw unauthorized();
        long age = clock.instant().getEpochSecond() - Long.parseLong(timestamp);
        if (age < -60 || age > 60) throw unauthorized();
        byte[] key = keys.getOrDefault(tenant, Map.of()).get(keyId);
        if (key == null || !MessageDigest.isEqual(mac(key, tenant, timestamp, body), HexFormat.of().parseHex(signature))) throw unauthorized();
    }
    static byte[] mac(byte[] key, String tenant, String timestamp, byte[] body) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            mac.update((timestamp + "\n" + tenant + "\n").getBytes(StandardCharsets.US_ASCII));
            return mac.doFinal(body);
        } catch (java.security.GeneralSecurityException impossible) { throw new IllegalStateException("hmac_unavailable"); }
    }
    private static Failure unauthorized() { return new Failure(401, "unauthorized"); }
}
