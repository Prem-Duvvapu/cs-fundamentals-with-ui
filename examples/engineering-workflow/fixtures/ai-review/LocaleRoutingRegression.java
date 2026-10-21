import java.util.Locale;
public final class LocaleRoutingRegression {
    public static void main(String[] args) {
        if (!Locale.getDefault().getLanguage().equals("tr"))
            throw new AssertionError("Expected isolated Turkish-locale child JVM");
        expect("turkish-enterprise-normal", "enterprise", "normal", false, "ENTERPRISE_QUEUE");
        expect("turkish-enterprise-urgent", "enterprise", "urgent", false, "INCIDENT_QUEUE");
        expect("turkish-enterprise-security", "enterprise", "normal", true, "SECURITY_ONCALL");
        System.out.println("LOCALE_CASES=3");
    }
    private static void expect(String id, String tier, String priority, boolean security, String expected) {
        String actual;
        try { actual = TicketRouter.route(tier, priority, security); }
        catch (IllegalArgumentException invalid) { actual = "INVALID"; }
        if (!expected.equals(actual)) throw new AssertionError(id + ": expected " + expected + ", got " + actual);
        System.out.println(id + "=" + actual);
    }
}
