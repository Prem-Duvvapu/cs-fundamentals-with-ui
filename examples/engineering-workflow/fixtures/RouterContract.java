import java.nio.file.*;
public final class RouterContract {
    public static void main(String[] args) throws Exception {
        var lines = Files.readAllLines(Path.of(args[0]));
        if (lines.size() < 2 || lines.size() > 65) throw new IllegalArgumentException("Invalid bounded golden contract");
        for (int index = 1; index < lines.size(); index++) {
            var row = lines.get(index).split("\t", -1);
            if (row.length != 6) throw new IllegalArgumentException("Invalid golden row");
            String actual;
            try { actual = TicketRouter.route(value(row[1]), value(row[2]), Boolean.parseBoolean(row[3])); }
            catch (IllegalArgumentException invalid) { actual = "INVALID"; }
            if (!row[4].equals(actual)) throw new AssertionError(row[0] + ": expected " + row[4] + ", got " + actual);
            System.out.println(row[0] + "=" + actual);
        }
        System.out.println("GOLDEN_CASES=" + (lines.size() - 1));
    }
    private static String value(String input) { return input.equals("<null>") ? null : input; }
}
