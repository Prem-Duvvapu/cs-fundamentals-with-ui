package com.csfundamentals.messaging;

import com.rabbitmq.client.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.io.TempDir;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static com.csfundamentals.messaging.DurableStore.Crash.*;

@EnabledIfEnvironmentVariable(named="MESSAGING_BROKERS", matches="true")
@Timeout(70)
class RabbitBrokerTest {
    @TempDir Path directory;
    private static final AMQP.BasicProperties PERSISTENT = new AMQP.BasicProperties.Builder().deliveryMode(2).contentType("application/json").build();

    @Test void realConfirmsBindingPrefetchRedeliveryIdempotenceAndDeadLetter() throws Exception {
        String owned = "lab-"+UUID.randomUUID(), exchange=owned+"-exchange", queue=owned+"-work", deadExchange=owned+"-dead", deadQueue=owned+"-failed";
        String password=UUID.randomUUID().toString(), database="jdbc:h2:file:"+directory.resolve("owned");
        DurableStore store=new DurableStore(database,password);
        TicketEvent first=new TicketEvent("event-1","ticket-1",1), second=new TicketEvent("event-2","ticket-1",1);
        try(Connection connection=BrokerClients.rabbit().newConnection(); Channel publisher=connection.createChannel()) {
            try {
                publisher.exchangeDeclare(exchange,"direct",true);
                publisher.exchangeDeclare(deadExchange,"direct",true);
                publisher.queueDeclare(deadQueue,true,false,false,null); publisher.queueBind(deadQueue,deadExchange,"failed");
                publisher.queueDeclare(queue,true,false,false,Map.of("x-dead-letter-exchange",deadExchange,"x-dead-letter-routing-key","failed"));
                publisher.queueBind(queue,exchange,"ticket.activity");
                publisher.confirmSelect();
                LinkedBlockingQueue<Return> returns=new LinkedBlockingQueue<>(4);
                publisher.addReturnListener(returns::offer);
                publisher.basicPublish(exchange,"missing.binding",true,PERSISTENT,first.json().getBytes(StandardCharsets.UTF_8));
                publisher.waitForConfirmsOrDie(5000);
                assertNotNull(returns.poll(5,TimeUnit.SECONDS),"A publisher confirm alone does not prove routing");
                for(TicketEvent event:new TicketEvent[]{first,second}) {
                    publisher.basicPublish(exchange,"ticket.activity",true,PERSISTENT,event.json().getBytes(StandardCharsets.UTF_8));
                    publisher.waitForConfirmsOrDie(5000);
                }
                LinkedBlockingQueue<Delivery> deliveries=new LinkedBlockingQueue<>(4);
                try(Channel worker=connection.createChannel()) {
                    worker.basicQos(1);
                    worker.basicConsume(queue,false,(tag,delivery)->deliveries.add(delivery),tag->{});
                    Delivery delivered=deliveries.poll(5,TimeUnit.SECONDS); assertNotNull(delivered);
                    assertEquals(first,TicketEvent.parse(new String(delivered.getBody(),StandardCharsets.UTF_8)));
                    assertThrows(DurableStore.SimulatedCrash.class,()->store.consume(first,AFTER_EFFECT_COMMIT));
                    assertNull(deliveries.poll(500,TimeUnit.MILLISECONDS),"Prefetch 1 must block the second unacked delivery");
                    // Channel closes without ACK: broker owns the unacked record and redelivers it.
                }
                try(Channel replacement=connection.createChannel()) {
                    deliveries.clear(); replacement.basicQos(1);
                    replacement.basicConsume(queue,false,(tag,delivery)->deliveries.add(delivery),tag->{});
                    Delivery redelivery=deliveries.poll(5,TimeUnit.SECONDS); assertNotNull(redelivery);
                    assertTrue(redelivery.getEnvelope().isRedeliver());
                    TicketEvent duplicate=TicketEvent.parse(new String(redelivery.getBody(),StandardCharsets.UTF_8));
                    assertEquals(first,duplicate); assertFalse(new DurableStore(database,password).consume(duplicate,NONE));
                    replacement.basicAck(redelivery.getEnvelope().getDeliveryTag(),false);
                    Delivery next=deliveries.poll(5,TimeUnit.SECONDS); assertNotNull(next);
                    assertEquals(second,TicketEvent.parse(new String(next.getBody(),StandardCharsets.UTF_8)));
                    assertTrue(store.consume(second,NONE)); replacement.basicAck(next.getEnvelope().getDeliveryTag(),false);
                    publisher.basicPublish(exchange,"ticket.activity",true,PERSISTENT,"{\"schemaVersion\":99}".getBytes(StandardCharsets.UTF_8));
                    publisher.waitForConfirmsOrDie(5000);
                    Delivery poison=deliveries.poll(5,TimeUnit.SECONDS); assertNotNull(poison);
                    assertThrows(IllegalArgumentException.class,()->TicketEvent.parse(new String(poison.getBody(),StandardCharsets.UTF_8)));
                    replacement.basicReject(poison.getEnvelope().getDeliveryTag(),false);
                    GetResponse dead=pollDead(publisher,deadQueue); assertNotNull(dead);
                    assertTrue(new String(dead.getBody(),StandardCharsets.UTF_8).contains("99"));
                    publisher.basicAck(dead.getEnvelope().getDeliveryTag(),false);
                }
                assertEquals(2,new DurableStore(database,password).projectionAmount("ticket-1"));
            } finally {
                if(publisher.isOpen()) {
                    publisher.queueDelete(queue); publisher.queueDelete(deadQueue);
                    publisher.exchangeDelete(exchange); publisher.exchangeDelete(deadExchange);
                }
            }
        }
    }
    private static GetResponse pollDead(Channel channel,String queue) throws Exception {
        long deadline=System.nanoTime()+Duration.ofSeconds(5).toNanos();
        GetResponse delivery;
        do { delivery=channel.basicGet(queue,false); if(delivery!=null)return delivery; Thread.sleep(50); }
        while(System.nanoTime()<deadline);
        return null;
    }
}
