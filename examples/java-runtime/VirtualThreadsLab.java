import java.io.*;
import java.net.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** Small real loopback workload. Counts and bounds are evidence; elapsed time is not a benchmark. */
public final class VirtualThreadsLab {
    private static final int WORK=12;
    private static final class Dependency implements AutoCloseable {
        final ServerSocket listener=new ServerSocket();
        final ExecutorService workers=Executors.newVirtualThreadPerTaskExecutor();
        final Set<Socket> sockets=ConcurrentHashMap.newKeySet();
        final AtomicInteger active=new AtomicInteger(),maximum=new AtomicInteger(),accepted=new AtomicInteger();
        final CountDownLatch firstWave;
        final boolean stall;
        final Thread acceptor;
        volatile boolean closed;
        Dependency(int firstWave,boolean stall) throws IOException {
            this.firstWave=new CountDownLatch(firstWave);this.stall=stall;
            listener.bind(new InetSocketAddress("127.0.0.1",0),16);listener.setSoTimeout(100);
            acceptor=Thread.ofPlatform().name("lab-dependency-acceptor").start(()->{
                while(!closed) {
                    try {
                        Socket socket=listener.accept();sockets.add(socket);
                        if(accepted.incrementAndGet()>WORK) {socket.close();throw new IllegalStateException("owned_work_limit");}
                        workers.submit(()->handle(socket));
                    } catch(SocketTimeoutException retry) { /* Bounded poll permits prompt owned shutdown. */ }
                    catch(IOException ending) {if(!closed)throw new UncheckedIOException(ending);}
                }
            });
        }
        private void handle(Socket socket) {
            boolean counted=false;
            try(socket) {
                socket.setSoTimeout(1000);
                if(socket.getInputStream().read()!=42)throw new IOException("unexpected_owned_request");
                int current=active.incrementAndGet();counted=true;maximum.accumulateAndGet(current,Math::max);
                firstWave.countDown();
                if(!firstWave.await(2,TimeUnit.SECONDS))throw new IOException("first_wave_deadline");
                Thread.sleep(stall?1000:20);
                // Count completed processing before the client can read its success byte/release its permit.
                active.decrementAndGet();counted=false;
                socket.getOutputStream().write(42);socket.getOutputStream().flush();
            } catch(IOException expectedOnDeadline) { /* A canceled client may have closed its socket. */ }
            catch(InterruptedException canceled) {Thread.currentThread().interrupt();}
            finally {if(counted)active.decrementAndGet();sockets.remove(socket);}
        }
        int port(){return listener.getLocalPort();}
        @Override public void close() throws Exception {
            closed=true;listener.close();acceptor.join(1000);
            for(var socket:sockets)try{socket.close();}catch(IOException ignored){}
            workers.shutdownNow();
            if(acceptor.isAlive() || !workers.awaitTermination(2,TimeUnit.SECONDS))throw new IllegalStateException("owned_dependency_cleanup_deadline");
        }
    }
    private record Result(String mode,int total,int succeeded,int failed,int virtualTasks,int downstreamMaximum,int activeAfterCleanup,long elapsedMs) {
        String json(){return String.format(Locale.ROOT,"{\"mode\":\"%s\",\"total\":%d,\"succeeded\":%d,\"failed\":%d,\"virtualTasks\":%d,\"downstreamMaximum\":%d,\"activeAfterCleanup\":%d,\"elapsedMs\":%d}",mode,total,succeeded,failed,virtualTasks,downstreamMaximum,activeAfterCleanup,elapsedMs);}
    }
    private static Result run(String mode) throws Exception {
        boolean virtual=!mode.equals("platform-limited"),limited=!mode.equals("virtual-unlimited"),stall=mode.equals("virtual-timeout");
        var permits=new Semaphore(2);
        var executor=virtual?Executors.newVirtualThreadPerTaskExecutor():new ThreadPoolExecutor(4,4,0,TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(WORK),Thread.ofPlatform().name("lab-platform-",0).factory(),new ThreadPoolExecutor.AbortPolicy());
        var virtualTasks=new AtomicInteger();
        var dependency=new Dependency(limited?2:4,stall);
        long started=System.nanoTime();
        int success=0,failed=0;
        var futures=new ArrayList<Future<Boolean>>();
        try {
            for(int item=0;item<WORK;item++)futures.add(executor.submit(()->{
                if(Thread.currentThread().isVirtual())virtualTasks.incrementAndGet();
                boolean held=false;
                try {
                    if(limited) {held=permits.tryAcquire(1500,TimeUnit.MILLISECONDS);if(!held)return false;}
                    try(var socket=new Socket()) {
                        socket.connect(new InetSocketAddress("127.0.0.1",dependency.port()),500);
                        socket.setSoTimeout(stall?200:1000);
                        socket.getOutputStream().write(42);socket.getOutputStream().flush();
                        return socket.getInputStream().read()==42;
                    }
                } catch(IOException boundedDependencyFailure) {return false;}
                finally {if(held)permits.release();}
            }));
            long deadline=System.nanoTime()+Duration.ofSeconds(6).toNanos();
            for(var future:futures) {
                long remaining=deadline-System.nanoTime();
                if(remaining<=0)throw new TimeoutException("owned_workload_deadline");
                if(future.get(remaining,TimeUnit.NANOSECONDS))success++;else failed++;
            }
        } finally {
            for(var future:futures)if(!future.isDone())future.cancel(true);
            executor.shutdownNow();
            try {if(!executor.awaitTermination(2,TimeUnit.SECONDS))throw new IllegalStateException("owned_client_cleanup_deadline");}
            finally {dependency.close();}
        }
        if(dependency.active.get()!=0)throw new AssertionError("Owned downstream work leaked");
        return new Result(mode,WORK,success,failed,virtualTasks.get(),dependency.maximum.get(),dependency.active.get(),
                TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-started));
    }
    public static void main(String[] args) throws Exception {
        if(Runtime.version().feature()<21)throw new IllegalStateException("JDK21_or_later_required");
        if(args.length>0)throw new IllegalArgumentException("No external endpoint or unbounded work arguments are accepted");
        var results=new ArrayList<Result>();
        for(String mode:List.of("platform-limited","virtual-limited","virtual-unlimited","virtual-timeout"))results.add(run(mode));
        System.out.println("{\"runtimeFeature\":"+Runtime.version().feature()+",\"cases\":["+String.join(",",results.stream().map(Result::json).toList())+"]}");
    }
}
