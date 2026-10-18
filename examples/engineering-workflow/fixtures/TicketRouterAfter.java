import java.util.Locale;
public final class TicketRouter {
    private enum Tier { STANDARD, ENTERPRISE }
    private enum Priority { NORMAL, URGENT }

    public static String route(String tierInput, String priorityInput, boolean securityIncident) {
        Tier tier = Tier.valueOf(normalize(tierInput));
        Priority priority = Priority.valueOf(normalize(priorityInput));
        if (securityIncident) return "SECURITY_ONCALL";
        if (priority == Priority.URGENT) return "INCIDENT_QUEUE";
        if (tier == Tier.ENTERPRISE) return "ENTERPRISE_QUEUE";
        return "STANDARD_QUEUE";
    }

    private static String normalize(String input) {
        if (input == null) throw new IllegalArgumentException("Missing routing input");
        return input.trim().toUpperCase(Locale.ROOT);
    }
}
