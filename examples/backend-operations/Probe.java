import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

/** Only the owned cluster Service may be requested; credentials never reach stdout. */
public class Probe {
    public static void main(String[] args) throws Exception {
        if (args.length != 2 || !args[0].matches("task\\.ops-[a-f0-9]{16}\\.svc\\.cluster\\.local")
                || !(args[1].equals("up") || args[1].equals("down"))) throw new IllegalArgumentException("Owned Service and up/down required");
        var addresses = InetAddress.getAllByName(args[0]);
        if (addresses.length == 0) throw new IllegalStateException("No Service DNS records");
        String password = System.getenv("TASK_TRACKER_ALICE_PASSWORD");
        if (password == null || password.length() < 20) throw new IllegalStateException("Runtime credential required");
        String authorization = Base64.getEncoder().encodeToString(("alice:"+password).getBytes(StandardCharsets.UTF_8));
        var request = HttpRequest.newBuilder(URI.create("http://"+args[0]+":9191/api/projects"))
            .timeout(Duration.ofSeconds(3)).header("Authorization", "Basic "+authorization).GET().build();
        var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
        try {
            int status = client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            if (args[1].equals("down") || status != 200) throw new IllegalStateException("Unexpected HTTP status "+status);
            System.out.println("{\"dnsResolved\":true,\"authenticatedStatus\":200}");
        } catch (java.io.IOException failure) {
            if (!args[1].equals("down")) throw failure;
            System.out.println("{\"dnsResolved\":true,\"connectionUnavailable\":true}");
        }
    }
}
