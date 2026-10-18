package com.csfundamentals.messaging;

import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.errors.GroupIdNotFoundException;
import org.apache.kafka.common.errors.UnknownTopicOrPartitionException;
import org.apache.kafka.common.KafkaFuture;
import java.util.concurrent.ExecutionException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static com.csfundamentals.messaging.DurableStore.Crash.*;

@EnabledIfEnvironmentVariable(named="MESSAGING_BROKERS", matches="true")
@Timeout(100)
class KafkaBrokerTest {
    @TempDir Path directory;

    @Test void realKeyOrderingGroupRestartOutboxDuplicatesAndPoisonRecovery() throws Exception {
        String owned = "lab-" + UUID.randomUUID();
        String topic = owned + "-events", dead = owned + "-dead", group = owned + "-worker", audit = owned + "-audit";
        String password = UUID.randomUUID().toString();
        String db = "jdbc:h2:file:" + directory.resolve("projection");
        DurableStore store = new DurableStore(db, password);
        TicketEvent first = new TicketEvent("event-1", "ticket-1", 1);
        store.enqueue(first, NONE);
        try (Admin admin = BrokerClients.admin()) {
            try {
                admin.createTopics(List.of(new NewTopic(topic, 2, (short)1), new NewTopic(dead, 1, (short)1)))
                        .all().get(15, TimeUnit.SECONDS);
                List<RecordMetadata> sends = new ArrayList<>();
                try (KafkaProducer<String,String> producer = BrokerClients.producer()) {
                    DurableStore.Publisher publish = event -> sends.add(producer.send(new ProducerRecord<>(topic, event.ticketId(), event.json())).get(15, TimeUnit.SECONDS));
                    assertThrows(DurableStore.SimulatedCrash.class, () -> store.relay(publish, AFTER_PUBLISH));
                    DurableStore reopened = new DurableStore(db, password);
                    reopened.relay(publish, NONE); // Broker accepted the first send; local sent flag did not commit.
                    publish.publish(new TicketEvent("event-2", "ticket-1", 1));
                    publish.publish(new TicketEvent("event-3", "ticket-1", 1));
                    sends.add(producer.send(new ProducerRecord<>(topic, "ticket-1", "{\"schemaVersion\":99}" )).get(15,TimeUnit.SECONDS));
                    assertEquals(1, sends.stream().map(RecordMetadata::partition).distinct().count());
                    for (int index=1; index<sends.size(); index++) assertTrue(sends.get(index).offset() > sends.get(index-1).offset());
                    long originalOffset;
                    try (KafkaConsumer<String,String> consumer = BrokerClients.consumer(group)) {
                        consumer.subscribe(List.of(topic));
                        ConsumerRecord<String,String> record = read(consumer, 1).get(0);
                        originalOffset = record.offset();
                        assertEquals(first, TicketEvent.parse(record.value()));
                        assertThrows(DurableStore.SimulatedCrash.class, () -> reopened.consume(first, AFTER_EFFECT_COMMIT));
                        // No consumer offset commit: process replacement must see this record again.
                    }
                    List<ConsumerRecord<String,String>> replay;
                    try (KafkaConsumer<String,String> replacement = BrokerClients.consumer(group)) {
                        replacement.subscribe(List.of(topic)); replay = read(replacement, 5);
                        assertEquals(originalOffset, replay.get(0).offset());
                        assertFalse(reopened.consume(TicketEvent.parse(replay.get(0).value()), NONE));
                        for (ConsumerRecord<String,String> record : replay) {
                            try { reopened.consume(TicketEvent.parse(record.value()), NONE); }
                            catch (IllegalArgumentException invalid) {
                                // Deliberately small DLQ envelope: no raw ticket text, bounded payload.
                                producer.send(new ProducerRecord<>(dead, record.key(), "unsupported-event:" + record.partition() + ":" + record.offset())).get(15,TimeUnit.SECONDS);
                            }
                            replacement.commitSync(Map.of(new TopicPartition(record.topic(),record.partition()), new OffsetAndMetadata(record.offset()+1)), Duration.ofSeconds(10));
                        }
                    }
                    assertEquals(3, new DurableStore(db,password).projectionAmount("ticket-1"));
                    try (KafkaConsumer<String,String> resumed = BrokerClients.consumer(group)) {
                        resumed.subscribe(List.of(topic)); awaitAssignment(resumed);
                        assertTrue(resumed.poll(Duration.ofMillis(500)).isEmpty(), "Committed records must not replay to this group");
                    }
                    try (KafkaConsumer<String,String> separateGroup = BrokerClients.consumer(audit)) {
                        separateGroup.subscribe(List.of(topic));
                        assertEquals(5, read(separateGroup, 5).size(), "Another group has independent offsets");
                    }
                    try (KafkaConsumer<String,String> deadReader = BrokerClients.consumer(owned + "-dead-reader")) {
                        deadReader.assign(List.of(new TopicPartition(dead,0))); deadReader.seekToBeginning(deadReader.assignment());
                        assertTrue(read(deadReader,1).get(0).value().startsWith("unsupported-event:"));
                    }
                }
            } finally {
                // Names come only from this run; cleanup never lists/deletes someone else's topics/groups.
                for (KafkaFuture<Void> deletion : admin.deleteTopics(List.of(topic,dead)).topicNameValues().values()) {
                    cleanup(deletion);
                }
                for (KafkaFuture<Void> deletion : admin.deleteConsumerGroups(List.of(group,audit)).deletedGroups().values()) {
                    cleanup(deletion);
                }
            }
        }
    }

    private static void cleanup(KafkaFuture<Void> deletion) throws Exception {
        try { deletion.get(15,TimeUnit.SECONDS); }
        catch(ExecutionException exception) {
            if (!(exception.getCause() instanceof GroupIdNotFoundException)
                    && !(exception.getCause() instanceof UnknownTopicOrPartitionException)) throw exception;
        }
    }
    private static List<ConsumerRecord<String,String>> read(KafkaConsumer<String,String> consumer, int count) {
        long deadline = System.nanoTime() + Duration.ofSeconds(20).toNanos();
        List<ConsumerRecord<String,String>> records = new ArrayList<>();
        while (records.size() < count && System.nanoTime() < deadline) {
            consumer.poll(Duration.ofMillis(250)).forEach(records::add);
        }
        assertTrue(records.size() >= count, "Missing broker records before bounded poll deadline");
        return records;
    }
    private static void awaitAssignment(KafkaConsumer<String,String> consumer) {
        long deadline = System.nanoTime()+Duration.ofSeconds(20).toNanos();
        while(consumer.assignment().isEmpty() && System.nanoTime()<deadline) {
            assertTrue(consumer.poll(Duration.ofMillis(250)).isEmpty(), "Unexpected replay after committed offsets");
        }
        assertFalse(consumer.assignment().isEmpty(),"Consumer never received partition assignment");
    }
}
