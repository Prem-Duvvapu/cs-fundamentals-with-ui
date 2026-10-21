import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/** Fixed, bounded workloads for three disposable nonprivileged Pods only. */
public final class ResourceProbe {
    private static final Path CGROUP = Path.of("/sys/fs/cgroup");
    private static volatile long sink;

    public static void main(String[] args) throws Exception {
        if (args.length != 1) throw new IllegalArgumentException("heap, native or cpu required");
        switch (args[0]) {
            case "heap" -> heap();
            case "native" -> nativeMemory();
            case "cpu" -> cpu();
            default -> throw new IllegalArgumentException("heap, native or cpu required");
        }
    }

    private static void heap() {
        System.out.println("RESOURCE_PROBE heap allocation cap=128MiB");
        var retained = new ArrayList<byte[]>();
        long deadline = System.nanoTime() + 12_000_000_000L;
        for (int count = 0; count < 128 && System.nanoTime() < deadline; count++) {
            byte[] bytes = new byte[1024 * 1024];
            for (int page = 0; page < bytes.length; page += 4096) bytes[page] = 1;
            retained.add(bytes);
        }
        throw new IllegalStateException("Heap workload reached bound without expected OOME");
    }

    private static void nativeMemory() throws Exception {
        String maximum = Files.readString(CGROUP.resolve("memory.max")).strip();
        if (!maximum.equals("100663296"))
            throw new IllegalStateException("Actual cgroup-v2 memory.max must be 96MiB");
        System.out.println("RESOURCE_PROBE native memory.max=" + maximum + " allocation cap=128MiB");
        System.out.flush();
        var retained = new ArrayList<ByteBuffer>();
        long deadline = System.nanoTime() + 12_000_000_000L;
        for (int count = 0; count < 128 && System.nanoTime() < deadline; count++) {
            ByteBuffer bytes = ByteBuffer.allocateDirect(1024 * 1024);
            for (int page = 0; page < bytes.capacity(); page += 4096) bytes.put(page, (byte) 1);
            retained.add(bytes);
        }
        throw new IllegalStateException("Native workload reached bound without expected kernel kill");
    }

    private static Map<String, Long> counters() throws Exception {
        Map<String, Long> values = new HashMap<>();
        for (String line : Files.readAllLines(CGROUP.resolve("cpu.stat"))) {
            String[] parts = line.trim().split("\\s+");
            if (parts.length != 2) throw new IllegalStateException("Unexpected cpu.stat line");
            values.put(parts[0], Long.parseLong(parts[1]));
        }
        for (String key : new String[]{"usage_usec", "nr_periods", "nr_throttled", "throttled_usec"})
            if (!values.containsKey(key)) throw new IllegalStateException("Required cgroup-v2 CPU counter absent: " + key);
        return values;
    }

    private static String json(Map<String, Long> values) {
        return "{\"usage_usec\":" + values.get("usage_usec") + ",\"nr_periods\":" + values.get("nr_periods")
            + ",\"nr_throttled\":" + values.get("nr_throttled") + ",\"throttled_usec\":" + values.get("throttled_usec") + "}";
    }

    private static void cpu() throws Exception {
        String maximum = Files.readString(CGROUP.resolve("cpu.max")).strip();
        String[] quota = maximum.split("\\s+");
        if (quota.length != 2 || quota[0].equals("max"))
            throw new IllegalStateException("Finite cgroup-v2 CPU quota required");
        long quotaMicros = Long.parseLong(quota[0]), periodMicros = Long.parseLong(quota[1]);
        if (quotaMicros <= 0 || periodMicros <= 0 || quotaMicros * 10 != periodMicros)
            throw new IllegalStateException("Actual cgroup CPU quota must equal 100m");
        Map<String, Long> before = counters();
        long start = System.nanoTime(), finish = start + 8_000_000_000L;
        long value = 17;
        while (System.nanoTime() < finish) {
            for (int i = 0; i < 10000; i++) value = value * 6364136223846793005L + 1;
            sink = value;
        }
        long elapsedMillis = (System.nanoTime() - start) / 1_000_000;
        Map<String, Long> after = counters(), delta = new HashMap<>();
        for (String key : before.keySet()) {
            long difference = after.getOrDefault(key, before.get(key)) - before.get(key);
            if (difference < 0) throw new IllegalStateException("CPU counters moved backwards");
            delta.put(key, difference);
        }
        for (String key : new String[]{"usage_usec", "nr_periods", "nr_throttled", "throttled_usec"})
            if (delta.get(key) <= 0) throw new IllegalStateException("Actual CPU activity/throttling missing: " + key);
        System.out.println("{\"cgroupVersion\":2,\"cpuMax\":\"" + maximum + "\",\"elapsedMillis\":" + elapsedMillis
            + ",\"before\":" + json(before) + ",\"after\":" + json(after) + ",\"delta\":" + json(delta) + "}");
    }
}
