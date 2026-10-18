package com.csfundamentals.messaging;

import java.util.Set;

public record SagaRequest(String tenant,String id,String sku,int quantity,int cents) {
    public SagaRequest {
        if (tenant==null || !Set.of("tenant-a","tenant-b").contains(tenant) || id==null || !id.matches("[a-z0-9-]{1,48}")
                || sku==null || !sku.matches("[a-z][a-z0-9-]{0,31}") || quantity<1 || quantity>10 || cents<1 || cents>100000)
            throw new IllegalArgumentException("invalid_saga_request");
    }
    public String action(String type) {
        if (!Set.of("reserve","charge","release").contains(type)) throw new IllegalArgumentException("invalid_action");
        return tenant+":"+id+":"+type;
    }
    String binding() { return tenant+"|"+id+"|"+sku+"|"+quantity+"|"+cents; }
}
