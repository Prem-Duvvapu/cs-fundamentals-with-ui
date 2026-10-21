import com.csfundamentals.example.*;
public final class TaskServiceDebugTarget {
    public static void main(String[] args) {
        var service = new TaskService(new MemoryTaskRepository());
        service.create("ordinary-fixture");
        service.create("conditional-fixture");
        try { service.create(" "); throw new AssertionError("Expected validation failure"); }
        catch (IllegalArgumentException expected) { System.out.println("EXPECTED_VALIDATION_CAUGHT"); }
        if (service.list().size() != 2) throw new AssertionError("Invalid request mutated repository");
        System.out.println("TARGET_COMPLETE");
    }
}
