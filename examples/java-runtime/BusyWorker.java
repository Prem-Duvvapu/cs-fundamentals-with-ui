import java.lang.management.ManagementFactory;
import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.*;
import jdk.jfr.Recording;

/** One bounded CPU worker, an actual recording and no customer inputs. Compatible with Java17+. */
public final class BusyWorker {
    private static volatile long blackhole;
    private static long cpuNanos,wallNanos,batches;
    private static void hotLoop(CountDownLatch started) {
        var threads=ManagementFactory.getThreadMXBean();
        if(!threads.isCurrentThreadCpuTimeSupported())throw new IllegalStateException("thread_CPU_time_required");
        threads.setThreadCpuTimeEnabled(true);
        long begin=System.nanoTime(),cpuBegin=threads.getCurrentThreadCpuTime(),value=1;
        started.countDown();
        do {
            for(int i=0;i<65536;i++) {value^=value<<13;value^=value>>>7;value^=value<<17;}
            blackhole=value;batches++;
            cpuNanos=threads.getCurrentThreadCpuTime()-cpuBegin;
            wallNanos=System.nanoTime()-begin;
        } while(cpuNanos<Duration.ofSeconds(2).toNanos() && wallNanos<Duration.ofSeconds(8).toNanos() && !Thread.currentThread().isInterrupted());
    }
    public static void main(String[] args) throws Exception {
        if(args.length!=1)throw new IllegalArgumentException("Provide the owned recording path");
        Thread watchdog=new Thread(()->{
            try {Thread.sleep(15000);Runtime.getRuntime().halt(94);}
            catch(InterruptedException stopped){Thread.currentThread().interrupt();}
        },"lab-process-deadline");
        watchdog.setDaemon(true);watchdog.start();
        Path recordingPath=Path.of(args[0]).toAbsolutePath();
        try(var recording=new Recording()) {
            recording.enable("jdk.ExecutionSample").withPeriod(Duration.ofMillis(10)).withStackTrace();
            recording.setMaxSize(8*1024*1024);recording.start();
            System.out.println("{\"ready\":true,\"pid\":"+ProcessHandle.current().pid()+"}");System.out.flush();
            if(System.in.read()!='g')throw new IllegalStateException("Owned runner start signal required");
            var started=new CountDownLatch(1);
            Thread worker=new Thread(()->hotLoop(started),"lab-hotloop");worker.setDaemon(true);worker.start();
            if(!started.await(2,TimeUnit.SECONDS))throw new IllegalStateException("owned_worker_start_deadline");
            System.out.println("{\"running\":true}");System.out.flush();
            worker.join(9000);
            if(worker.isAlive()) {worker.interrupt();worker.join(1000);throw new IllegalStateException("owned_worker_stop_deadline");}
            recording.stop();recording.dump(recordingPath);
            if(cpuNanos<Duration.ofMillis(200).toNanos() || batches<1)throw new IllegalStateException("No actual bounded CPU work observed");
            System.out.println("{\"cpuNanos\":"+cpuNanos+",\"wallNanos\":"+wallNanos+",\"batches\":"+batches+",\"blackhole\":"+blackhole+"}");
        }
    }
}
