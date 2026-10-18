package com.csfundamentals.messaging;

import com.rabbitmq.client.ConnectionFactory;
import org.apache.kafka.clients.admin.Admin;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import java.util.Properties;

public final class BrokerClients {
    private BrokerClients() {}
    static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Set " + name);
        return value;
    }
    static Properties kafkaBase() {
        String bootstrap = required("KAFKA_BOOTSTRAP");
        if (!bootstrap.matches("127\\.0\\.0\\.1:[0-9]{1,5}")) throw new IllegalArgumentException("Use an owned loopback broker");
        Properties properties = new Properties();
        properties.put("bootstrap.servers", bootstrap);
        properties.put("request.timeout.ms", "5000");
        properties.put("default.api.timeout.ms", "10000");
        return properties;
    }
    public static Admin admin() { return Admin.create(kafkaBase()); }
    public static KafkaProducer<String,String> producer() {
        Properties properties = kafkaBase();
        properties.put("key.serializer", StringSerializer.class.getName());
        properties.put("value.serializer", StringSerializer.class.getName());
        properties.put("enable.idempotence", "true"); properties.put("acks", "all");
        properties.put("delivery.timeout.ms", "10000"); properties.put("max.block.ms", "10000");
        properties.put("retry.backoff.ms", "100"); properties.put("retry.backoff.max.ms", "1000");
        properties.put("max.in.flight.requests.per.connection", "1");
        return new KafkaProducer<>(properties);
    }
    public static KafkaConsumer<String,String> consumer(String group) {
        Properties properties = kafkaBase();
        properties.put("key.deserializer", StringDeserializer.class.getName());
        properties.put("value.deserializer", StringDeserializer.class.getName());
        properties.put("group.id", group); properties.put("enable.auto.commit", "false");
        properties.put("auto.offset.reset", "earliest"); properties.put("max.poll.records", "10");
        properties.put("session.timeout.ms", "10000"); properties.put("heartbeat.interval.ms", "1000");
        properties.put("group.protocol", "classic");
        return new KafkaConsumer<>(properties);
    }
    public static ConnectionFactory rabbit() {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("127.0.0.1"); factory.setPort(Integer.parseInt(required("RABBIT_PORT")));
        factory.setUsername(required("RABBIT_USER")); factory.setPassword(required("RABBIT_PASSWORD"));
        factory.setAutomaticRecoveryEnabled(false); factory.setConnectionTimeout(5000);
        factory.setHandshakeTimeout(5000); factory.setChannelRpcTimeout(5000);
        factory.setRequestedHeartbeat(5); factory.setShutdownTimeout(5000);
        return factory;
    }
}
