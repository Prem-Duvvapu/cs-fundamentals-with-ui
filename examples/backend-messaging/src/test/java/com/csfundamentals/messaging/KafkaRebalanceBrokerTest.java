package com.csfundamentals.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.KafkaFuture;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.errors.GroupIdNotFoundException;
import org.apache.kafka.common.errors.UnknownTopicOrPartitionException;
import org.apache.kafka.common.errors.WakeupException;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static com.csfundamentals.messaging.DurableStore.Crash.NONE;
import static org.junit.jupiter.api.Assertions.*;

/** Actual group membership and handoff, never a substitute for the optional broker run. */
@EnabledIfEnvironmentVariable(named = "MESSAGING_BROKERS", matches = "true")
@Timeout(120)
class KafkaRebalanceBrokerTest {
    @TempDir Path directory;

    @Test void concurrentMembersRevokeAndReplayUncommittedEffectWithoutDuplicateProjection() throws Exception {
        String owned = "lab-rebalance-" + UUID.randomUUID();
        String topic = owned + "-events", group = owned + "-worker";
        String password = UUID.randomUUID().toString();
        String database = "jdbc:h2:file:" + directory.resolve("rebalance-projection");
        DurableStore store = new DurableStore(database, password);
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("schemaVersion", 1);
        evidence.put("scenario", "actual-classic-group-controlled-member-departure");
        evidence.put("processCrash", false);
        evidence.put("autoCommit", false);
        evidence.put("groupProtocol", "classic");
        evidence.put("kafkaClientVersion", org.apache.kafka.common.utils.AppInfoParser.getVersion());
        evidence.put("javaRuntime", System.getProperty("java.runtime.version"));
        evidence.put("topic", topic);
        evidence.put("group", group);
        ExecutorService owners = Executors.newFixedThreadPool(2);
        Worker first = new Worker("a", topic, group, store, false);
        Worker second = new Worker("b", topic, group, store, true);
        try (Admin admin = BrokerClients.admin()) {
            try {
                evidence.put("brokerClusterId", admin.describeCluster().clusterId().get(10, TimeUnit.SECONDS));
                admin.createTopics(List.of(new NewTopic(topic, 2, (short) 1))).all().get(10, TimeUnit.SECONDS);
                first.start(owners);
                await("initial one-member ownership", first, second, () -> first.assignment().size() == 2);
                evidence.put("initialSingleMember", groupSnapshot(admin, group, topic, 1));
                second.start(owners);
                await("two consumer owner threads and disjoint assignments", first, second,
                        () -> first.assignment().size() == 1 && second.assignment().size() == 1
                                && Collections.disjoint(first.assignment(), second.assignment()));
                Map<String, Object> joined = groupSnapshot(admin, group, topic, 2);
                evidence.put("twoMemberGroup", joined);
                assertTrue(first.hasCallback("revoked"), "Joining member must actually revoke the first member's old ownership");
                int firstPartition = first.assignment().iterator().next().partition();
                int replayPartition = second.assignment().iterator().next().partition();
                assertNotEquals(firstPartition, replayPartition);
                TopicPartition stable = new TopicPartition(topic, firstPartition);
                TopicPartition moved = new TopicPartition(topic, replayPartition);
                TicketEvent normal = new TicketEvent("rebalance-normal", "ticket-normal", 1);
                TicketEvent withheld = new TicketEvent("rebalance-withheld", "ticket-replayed", 1);
                TicketEvent marker = new TicketEvent("rebalance-after", "ticket-replayed", 1);
                KafkaProducer<String, String> producer = BrokerClients.producer();
                try {
                    RecordMetadata normalSend = send(producer, topic, firstPartition, normal);
                    RecordMetadata withheldSend = send(producer, topic, replayPartition, withheld);
                    await("both members commit their local effect", first, second,
                            () -> first.hasDelivery(normal.id()) && second.hasDelivery(withheld.id()));
                    Delivery withheldDelivery = second.delivery(withheld.id());
                    assertEquals(replayPartition, withheldDelivery.partition());
                    assertEquals(withheldSend.offset(), withheldDelivery.offset());
                    assertTrue(withheldDelivery.applied());
                    assertFalse(withheldDelivery.offsetCommitted());
                    evidence.put("withheldDelivery", withheldDelivery);
                    Map<TopicPartition, OffsetAndMetadata> before = offsets(admin, group);
                    assertEquals(normalSend.offset() + 1, before.get(stable).offset());
                    assertFalse(before.containsKey(moved), "Withheld offset must actually be absent at the broker");
                    assertEquals(1, store.projectionAmount("ticket-replayed"));
                    evidence.put("beforeDepartureOffsets", offsetSnapshot(before));
                    evidence.put("withheldRecord", Map.of("partition", replayPartition, "offset", withheldSend.offset(),
                            "eventId", withheld.id(), "localEffect", 1, "brokerOffsetCommitted", false));
                    // Only the owning thread unsubscribes/closes. Deliberately no offset for its held effect.
                    second.stopAndJoin();
                    assertTrue(second.hasCallback("revoked"), "Owned unsubscribe must report actual revocation");
                    await("survivor recovers both partitions and exact uncommitted record", first, second,
                            () -> first.assignment().size() == 2 && first.hasDelivery(withheld.id()));
                    Delivery replay = first.delivery(withheld.id());
                    assertEquals(replayPartition, replay.partition());
                    assertEquals(withheldSend.offset(), replay.offset());
                    assertFalse(replay.applied(), "The durable inbox must reject the already committed business effect");
                    assertEquals(1, new DurableStore(database, password).projectionAmount("ticket-replayed"));
                    evidence.put("replay", replay);
                    evidence.put("survivingMemberGroup", groupSnapshot(admin, group, topic, 1));
                    RecordMetadata markerSend = send(producer, topic, replayPartition, marker);
                    await("new work after recovery commits its broker offset", first, second, () -> first.hasDelivery(marker.id()));
                    Map<TopicPartition, OffsetAndMetadata> after = offsets(admin, group);
                    assertEquals(markerSend.offset() + 1, after.get(moved).offset());
                    assertEquals(normalSend.offset() + 1, after.get(stable).offset());
                    assertEquals(1, store.projectionAmount("ticket-normal"));
                    assertEquals(2, store.projectionAmount("ticket-replayed"));
                    evidence.put("afterRecoveryOffsets", offsetSnapshot(after));
                    evidence.put("finalProjection", Map.of("normal", 1, "replayedIncludingFreshMarker", 2));
                    evidence.put("freshMarkerAccepted", first.delivery(marker.id()).applied());
                    assertTrue(first.delivery(marker.id()).applied());
                } finally { producer.close(Duration.ofSeconds(5)); }
                first.stopAndJoin();
                evidence.put("callbacks", Map.of("a", first.callbackSnapshot(), "b", second.callbackSnapshot()));
                evidence.put("deliveries", Map.of("a", first.deliverySnapshot(), "b", second.deliverySnapshot()));
                evidence.put("ownerThreadsDistinct", !first.ownerThread.equals(second.ownerThread));
                assertNotEquals(first.ownerThread, second.ownerThread);
                evidence.put("actualCasesExecuted", 1);
                evidence.put("skipped", 0);
            } finally {
                try {
                    try { first.stopAndJoin(); }
                    finally { second.stopAndJoin(); }
                } finally {
                    try {
                        owners.shutdownNow();
                        assertTrue(owners.awaitTermination(10, TimeUnit.SECONDS), "Owned consumer threads must terminate");
                        evidence.put("ownerThreadsStopped", first.stopped() && second.stopped());
                        try { cleanup(admin.deleteTopics(List.of(topic)).topicNameValues().get(topic)); }
                        finally { cleanup(admin.deleteConsumerGroups(List.of(group)).deletedGroups().get(group)); }
                        requireDeleted(admin, topic, group);
                        evidence.put("ownedBrokerResourcesDeleted", true);
                    } finally {
                        try { writeEvidence(evidence); }
                        finally { admin.close(Duration.ofSeconds(5)); }
                    }
                }
            }
        }
    }

    private static RecordMetadata send(KafkaProducer<String, String> producer, String topic, int partition, TicketEvent event) throws Exception {
        return producer.send(new ProducerRecord<>(topic, partition, event.ticketId(), event.json())).get(10, TimeUnit.SECONDS);
    }

    private static void await(String description, Worker first, Worker second, Callable<Boolean> condition) throws Exception {
        long deadline = System.nanoTime() + Duration.ofSeconds(25).toNanos();
        while (System.nanoTime() < deadline) {
            first.check(); second.check();
            if (condition.call()) return;
            Thread.sleep(25);
        }
        fail("Missing actual observation before bounded deadline: " + description);
    }

    private static Map<TopicPartition, OffsetAndMetadata> offsets(Admin admin, String group) throws Exception {
        return admin.listConsumerGroupOffsets(group).partitionsToOffsetAndMetadata().get(10, TimeUnit.SECONDS);
    }

    private static List<Map<String, Object>> offsetSnapshot(Map<TopicPartition, OffsetAndMetadata> offsets) {
        return offsets.entrySet().stream().sorted(Comparator.comparingInt(entry -> entry.getKey().partition()))
                .map(entry -> Map.<String, Object>of("partition", entry.getKey().partition(), "nextOffset", entry.getValue().offset())).toList();
    }

    private static Map<String, Object> groupSnapshot(Admin admin, String group, String topic, int expectedMembers) throws Exception {
        ConsumerGroupDescription description = admin.describeConsumerGroups(List.of(group)).describedGroups().get(group).get(10, TimeUnit.SECONDS);
        assertEquals("Stable", description.groupState().toString());
        assertEquals(expectedMembers, description.members().size());
        Set<TopicPartition> all = new HashSet<>();
        List<Map<String, Object>> members = new ArrayList<>();
        for (MemberDescription member : description.members()) {
            Set<TopicPartition> assigned = member.assignment().topicPartitions();
            assertEquals(expectedMembers == 2 ? 1 : 2, assigned.size());
            for (TopicPartition partition : assigned) assertTrue(all.add(partition), "Actual broker assignments must not overlap");
            members.add(Map.of("clientId", member.clientId(), "memberId", member.consumerId(), "partitions", partitionNumbers(assigned)));
        }
        assertEquals(Set.of(new TopicPartition(topic, 0), new TopicPartition(topic, 1)), all);
        Set<String> clients = new HashSet<>();
        for (MemberDescription member : description.members()) clients.add(member.clientId());
        assertEquals(expectedMembers == 2 ? Set.of(group + "-a", group + "-b") : Set.of(group + "-a"), clients);
        return Map.of("state", description.groupState().toString(), "assignor", description.partitionAssignor(), "members", members);
    }

    private static List<Integer> partitionNumbers(Collection<TopicPartition> partitions) {
        return partitions.stream().map(TopicPartition::partition).sorted().toList();
    }

    private static void cleanup(KafkaFuture<Void> result) throws Exception {
        try { result.get(10, TimeUnit.SECONDS); }
        catch (ExecutionException error) {
            if (!(error.getCause() instanceof GroupIdNotFoundException) && !(error.getCause() instanceof UnknownTopicOrPartitionException)) throw error;
        }
    }

    private static void requireDeleted(Admin admin, String topic, String group) throws Exception {
        boolean topicGone = false, groupGone = false;
        long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
        while ((!topicGone || !groupGone) && System.nanoTime() < deadline) {
            if (!topicGone) {
                try { admin.describeTopics(List.of(topic)).topicNameValues().get(topic).get(5, TimeUnit.SECONDS); }
                catch (ExecutionException error) {
                    if (error.getCause() instanceof UnknownTopicOrPartitionException) topicGone = true;
                    else throw error;
                }
            }
            if (!groupGone) {
                try { admin.describeConsumerGroups(List.of(group)).describedGroups().get(group).get(5, TimeUnit.SECONDS); }
                catch (ExecutionException error) {
                    if (error.getCause() instanceof GroupIdNotFoundException) groupGone = true;
                    else throw error;
                }
            }
            if (!topicGone || !groupGone) Thread.sleep(50);
        }
        assertTrue(topicGone && groupGone, "Exact owned topic/group must be absent at the broker after deletion");
    }

    private static void writeEvidence(Map<String, Object> evidence) throws Exception {
        Path destination = Path.of("target", "rebalance-evidence.json");
        byte[] report = new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsBytes(evidence);
        assertTrue(report.length <= 32768, "Synthetic evidence must remain bounded");
        Files.createDirectories(destination.getParent());
        Files.write(destination, report);
    }

    record Delivery(String member, int partition, long offset, String eventId, boolean applied, boolean offsetCommitted) {}
    record Callback(String member, String phase, List<Integer> partitions, int generation, List<Map<String, Object>> completedOffsets) {}

    private static final class Worker implements Runnable {
        private final String name, topic, group;
        private final DurableStore store;
        private final boolean withhold;
        private final AtomicBoolean running = new AtomicBoolean(true);
        private final AtomicReference<KafkaConsumer<String, String>> live = new AtomicReference<>();
        private final AtomicReference<Throwable> failure = new AtomicReference<>();
        private volatile Set<TopicPartition> assigned = Set.of();
        private final List<Delivery> deliveries = new ArrayList<>();
        private final List<Callback> callbacks = new ArrayList<>();
        private volatile String ownerThread = "not-started";
        private Future<?> future;

        Worker(String name, String topic, String group, DurableStore store, boolean withhold) {
            this.name = name; this.topic = topic; this.group = group; this.store = store; this.withhold = withhold;
        }
        void start(ExecutorService executor) { future = executor.submit(this); }
        Set<TopicPartition> assignment() { return assigned; }
        synchronized boolean hasDelivery(String id) { return deliveries.stream().anyMatch(delivery -> delivery.eventId().equals(id)); }
        synchronized Delivery delivery(String id) { return deliveries.stream().filter(delivery -> delivery.eventId().equals(id)).findFirst().orElseThrow(); }
        synchronized List<Delivery> deliverySnapshot() { return List.copyOf(deliveries); }
        synchronized List<Callback> callbackSnapshot() { return List.copyOf(callbacks); }
        synchronized boolean hasCallback(String phase) { return callbacks.stream().anyMatch(callback -> callback.phase().equals(phase) && !callback.partitions().isEmpty()); }
        boolean stopped() { return future == null || future.isDone(); }
        void check() { if (failure.get() != null) throw new AssertionError("Consumer owner " + name + " failed", failure.get()); }
        void stopAndJoin() throws Exception {
            running.set(false);
            KafkaConsumer<String, String> consumer = live.get();
            if (consumer != null) consumer.wakeup(); // The only cross-thread KafkaConsumer operation.
            if (future != null) future.get(10, TimeUnit.SECONDS);
            check();
        }

        @Override public void run() {
            ownerThread = Thread.currentThread().getName();
            Map<TopicPartition, OffsetAndMetadata> completed = new HashMap<>();
            KafkaConsumer<String, String> consumer = null;
            try {
                Properties settings = BrokerClients.kafkaBase();
                settings.put("key.deserializer", StringDeserializer.class.getName());
                settings.put("value.deserializer", StringDeserializer.class.getName());
                settings.put("group.id", group); settings.put("client.id", group + "-" + name);
                settings.put("enable.auto.commit", "false"); settings.put("auto.offset.reset", "earliest");
                settings.put("group.protocol", "classic"); settings.put("partition.assignment.strategy", RangeAssignor.class.getName());
                settings.put("max.poll.records", "1"); settings.put("max.poll.interval.ms", "30000");
                settings.put("session.timeout.ms", "10000"); settings.put("heartbeat.interval.ms", "1000");
                consumer = new KafkaConsumer<>(settings);
                live.set(consumer);
                KafkaConsumer<String, String> ownedConsumer = consumer;
                consumer.subscribe(List.of(topic), new ConsumerRebalanceListener() {
                    private void note(String phase, Collection<TopicPartition> partitions) {
                        synchronized (Worker.this) {
                            if (callbacks.size() >= 64) throw new IllegalStateException("Callback evidence limit");
                            callbacks.add(new Callback(name, phase, partitionNumbers(partitions), ownedConsumer.groupMetadata().generationId(), offsetSnapshot(completed)));
                        }
                    }
                    @Override public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
                        Map<TopicPartition, OffsetAndMetadata> safe = new HashMap<>();
                        for (TopicPartition partition : partitions) if (completed.containsKey(partition)) safe.put(partition, completed.get(partition));
                        if (!safe.isEmpty()) ownedConsumer.commitSync(safe, Duration.ofSeconds(5));
                        note("revoked", partitions);
                        for (TopicPartition partition : partitions) completed.remove(partition);
                        assigned = Set.of();
                    }
                    @Override public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
                        assigned = Set.copyOf(partitions);
                        note("assigned", partitions);
                    }
                    @Override public void onPartitionsLost(Collection<TopicPartition> partitions) {
                        note("lost", partitions); // Never commit state after ownership has already been lost.
                        for (TopicPartition partition : partitions) completed.remove(partition);
                        assigned = Set.of();
                    }
                });
                long deadline = System.nanoTime() + Duration.ofSeconds(90).toNanos();
                while (running.get()) {
                    if (System.nanoTime() >= deadline) throw new IllegalStateException("Owned poll loop deadline");
                    for (ConsumerRecord<String, String> record : consumer.poll(Duration.ofMillis(200))) {
                        TicketEvent event = TicketEvent.parse(record.value());
                        boolean applied = store.consume(event, NONE);
                        TopicPartition partition = new TopicPartition(record.topic(), record.partition());
                        if (withhold) consumer.pause(Set.of(partition));
                        else {
                            completed.put(partition, new OffsetAndMetadata(record.offset() + 1));
                            consumer.commitSync(Map.of(partition, completed.get(partition)), Duration.ofSeconds(5));
                        }
                        synchronized (this) {
                            if (deliveries.size() >= 16) throw new IllegalStateException("Delivery evidence limit");
                            deliveries.add(new Delivery(name, record.partition(), record.offset(), event.id(), applied, !withhold));
                        }
                    }
                }
            } catch (WakeupException wakeup) {
                if (running.get()) failure.compareAndSet(null, wakeup);
            } catch (Throwable error) {
                failure.compareAndSet(null, error);
            } finally {
                if (consumer != null) {
                    try { consumer.unsubscribe(); }
                    catch (Throwable error) { failure.compareAndSet(null, error); }
                    try { consumer.close(CloseOptions.timeout(Duration.ofSeconds(5))); }
                    catch (Throwable error) { failure.compareAndSet(null, error); }
                }
                live.set(null);
            }
        }
    }
}
