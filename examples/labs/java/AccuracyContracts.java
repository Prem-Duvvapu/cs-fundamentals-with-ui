import java.util.Optional;
import java.util.TreeSet;

public class AccuracyContracts {
    interface Text { CharSequence get(); }
    interface StringText { String get(); }
    @FunctionalInterface interface Combined extends Text, StringText {}
    static class BadInit { static int value = fail(); }
    static class BadError { static int value = failWithError(); }
    static int fail() { throw new IllegalStateException("initialization failed"); }
    static int failWithError() { throw new AssertionError("initializer Error"); }
    static String pick(long value) { return "widening"; }
    static String pick(Integer value) { return "boxing"; }
    static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    public static void main(String[] args) {
        try {
            int ignored = BadInit.value;
            throw new AssertionError("Initialization should fail");
        } catch (ExceptionInInitializerError error) {
            require(error.getCause() instanceof IllegalStateException, "Missing initializer cause");
        }
        try {
            int ignored = BadInit.value;
            throw new AssertionError("Erroneous class should remain unusable");
        } catch (NoClassDefFoundError expected) {
            // Same class identity stays erroneous for this loader.
        }
        try {
            int ignored = BadError.value;
            throw new IllegalStateException("Initializer Error should propagate");
        } catch (AssertionError error) {
            require("initializer Error".equals(error.getMessage()), "Error was wrapped or missed");
        }
        require("widening".equals(pick(1)), "Strict overload phase must precede boxing");
        Combined combined = () -> "one logical SAM";
        require(combined.get().equals("one logical SAM"), "Compatible inherited SAM mismatch");
        require(Optional.of("x").map(value -> (String) null).isEmpty(), "Optional.map null result");
        try {
            Optional.of("x").flatMap(value -> null);
            throw new AssertionError("flatMap null should fail");
        } catch (NullPointerException expected) {}
        TreeSet<String> byLength = new TreeSet<>((a,b) -> Integer.compare(a.length(),b.length()));
        byLength.add("ab"); byLength.add("cd");
        require(byLength.size() == 1 && !"ab".equals("cd"), "Comparator-zero identity mismatch");
        System.out.println("PASS: initialization, overload phases, inherited SAM, Optional and comparator contracts");
    }
}
