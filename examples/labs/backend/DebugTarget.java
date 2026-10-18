import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public final class DebugTarget {
    private static final List<byte[]> CACHE = new ArrayList<>();

    private static void deadlock() throws Exception {
        Object left = new Object();
        Object right = new Object();
        CountDownLatch acquired = new CountDownLatch(2);
        Thread first = worker("lab-left", left, right, acquired);
        Thread second = worker("lab-right", right, left, acquired);
        first.start();
        second.start();
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
        while (System.nanoTime() < deadline) {
            long[] ids = ManagementFactory.getThreadMXBean().findDeadlockedThreads();
            if (ids != null && ids.length == 2) return;
            Thread.sleep(10);
        }
        throw new IllegalStateException("The owned threads did not deadlock");
    }

    private static Thread worker(String name, Object first, Object second, CountDownLatch acquired) {
        Thread thread = new Thread(() -> {
            synchronized (first) {
                acquired.countDown();
                try {
                    if (!acquired.await(3, TimeUnit.SECONDS)) return;
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
                synchronized (second) { throw new AssertionError("Unexpected acquisition"); }
            }
        }, name);
        thread.setDaemon(true);
        return thread;
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1 || !(args[0].equals("deadlock") || args[0].equals("retained"))) {
            throw new IllegalArgumentException("Use deadlock or retained");
        }
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(25);
        if (args[0].equals("deadlock")) {
            deadlock();
        } else {
            for (int i = 0; i < 12; i++) {
                byte[] bytes = new byte[1024 * 1024];
                for (int p = 0; p < bytes.length; p += 4096) bytes[p] = (byte) i;
                CACHE.add(bytes);
            }
        }
        System.out.printf("{\"pid\":%d,\"mode\":\"%s\",\"ready\":true}%n",
                ProcessHandle.current().pid(), args[0]);
        System.out.flush();
        while (System.nanoTime() < deadline) {
            if (System.in.available() > 0 && System.in.read() == 'c') {
                CACHE.clear();
                System.out.println("{\"cleared\":true}");
                System.out.flush();
            }
            Thread.sleep(20);
        }
    }
}
