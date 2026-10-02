package com.csfundamentals.example;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.transaction.TransactionAwareCacheManagerProxy;
import org.springframework.context.annotation.*;
@Configuration @Profile("cached") @EnableCaching
public class CachingConfiguration {
    @Bean CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("projectPages");
        manager.setCaffeine(Caffeine.newBuilder().maximumSize(256).expireAfterWrite(Duration.ofSeconds(60)));
        return new TransactionAwareCacheManagerProxy(manager);
    }
}
