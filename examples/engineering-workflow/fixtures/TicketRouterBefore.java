import java.util.Locale;
public final class TicketRouter {
    public static String route(String t, String p, boolean s) {
        if (t == null || p == null) throw new IllegalArgumentException("Missing routing input");
        t = t.trim().toUpperCase(Locale.ROOT); p = p.trim().toUpperCase(Locale.ROOT);
        if ((!t.equals("STANDARD") && !t.equals("ENTERPRISE")) || (!p.equals("NORMAL") && !p.equals("URGENT"))) throw new IllegalArgumentException("Unknown routing input");
        String d;
        if (s) { d = "SECURITY_ONCALL"; }
        else {
            if (p.equals("URGENT")) { d = "INCIDENT_QUEUE"; }
            else {
                if (t.equals("ENTERPRISE")) { d = "ENTERPRISE_QUEUE"; }
                else { d = "STANDARD_QUEUE"; }
            }
        }
        return d;
    }
}
