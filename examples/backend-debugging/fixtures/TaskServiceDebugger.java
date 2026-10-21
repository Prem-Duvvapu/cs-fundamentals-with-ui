import com.sun.jdi.*;
import com.sun.jdi.connect.*;
import com.sun.jdi.event.*;
import com.sun.jdi.request.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;

/** Fixed-target, fixed-predicate JDI exercise; never attaches to an external JVM. */
public final class TaskServiceDebugger {
    private static String boundedVersion(String version) {
        if (!version.matches("[A-Za-z0-9.+_-]{1,128}")) throw new IllegalStateException("bounded_runtime_identity_required");
        return version;
    }
    private static String runtimeJson(int feature, String version, String vmName) {
        boundedVersion(version);
        if (feature != 17 || Runtime.Version.parse(version).feature() != feature)
            throw new IllegalStateException("owned_java17_runtime_required");
        if (vmName != null && !vmName.matches("[A-Za-z0-9 ._()+-]{1,128}"))
            throw new IllegalStateException("bounded_vm_identity_required");
        return "{\"feature\":"+feature+",\"version\":\""+version+"\""
            +(vmName == null ? "" : ",\"vmName\":\""+vmName+"\"")+"}";
    }
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Owned classes and report required");
        String runtime = runtimeJson(Runtime.version().feature(), Runtime.version().toString(), null);
        Path classes = Path.of(args[0]).toRealPath(), report = Path.of(args[1]);
        Path log = report.resolveSibling("owned-debuggee.log");
        ListeningConnector connector = Bootstrap.virtualMachineManager().listeningConnectors().stream()
            .filter(value -> value.name().equals("com.sun.jdi.SocketListen")).findFirst().orElseThrow();
        var arguments = connector.defaultArguments();
        arguments.get("localAddress").setValue("127.0.0.1");
        arguments.get("port").setValue("0");
        arguments.get("timeout").setValue("5000");
        String address = connector.startListening(arguments);
        Process target = null;
        VirtualMachine vm = null;
        int conditions = 0, matches = 0, exceptions = 0;
        var stepLocations = new ArrayList<String>();
        boolean caught = false, exited = false;
        String exceptionLocation = "", catchLocation = "";
        try {
            String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
            target = new ProcessBuilder(java, "-Xmx64m", "-XX:ActiveProcessorCount=2",
                "-agentlib:jdwp=transport=dt_socket,server=n,suspend=y,address="+address,
                "-cp", classes.toString(), "TaskServiceDebugTarget")
                .directory(classes.getParent().toFile()).redirectErrorStream(true).redirectOutput(log.toFile()).start();
            vm = connector.accept(arguments);
            connector.stopListening(arguments);
            String targetVersion = boundedVersion(vm.version());
            String debuggeeRuntime = runtimeJson(Runtime.Version.parse(targetVersion).feature(), targetVersion, vm.name());
            var manager = vm.eventRequestManager();
            var prepare = manager.createClassPrepareRequest();
            prepare.addClassFilter("com.csfundamentals.example.TaskService");
            prepare.setSuspendPolicy(EventRequest.SUSPEND_ALL); prepare.enable();
            var failure = manager.createExceptionRequest(null, true, true);
            failure.addClassFilter("com.csfundamentals.example.TaskService");
            failure.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD); failure.enable();
            long deadline = System.nanoTime()+TimeUnit.SECONDS.toNanos(30);
            int events = 0, phase = 0;
            boolean dead = false;
            while (!dead && System.nanoTime() < deadline) {
                if (Files.exists(log) && Files.size(log) > 16384) throw new IllegalStateException("debuggee_log_limit");
                EventSet set;
                try { set = vm.eventQueue().remove(500); }
                catch (VMDisconnectedException disconnected) { break; }
                if (set == null) continue;
                for (Event event : set) {
                    if (++events > 128) throw new IllegalStateException("debug_event_limit");
                    if (event instanceof ClassPrepareEvent prepared) {
                        Method method = prepared.referenceType().methodsByName("create").get(0);
                        var breakpoint = manager.createBreakpointRequest(method.allLineLocations().get(0));
                        breakpoint.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD); breakpoint.enable();
                        prepare.disable();
                    } else if (event instanceof BreakpointEvent breakpoint) {
                        StackFrame frame = breakpoint.thread().frame(0);
                        LocalVariable variable = frame.visibleVariableByName("title");
                        if (variable == null) throw new IllegalStateException("debug_symbols_required");
                        String value = ((StringReference)frame.getValue(variable)).value();
                        conditions++;
                        if (value.equals("conditional-fixture")) {
                            matches++; phase = 1;
                            StepRequest step = manager.createStepRequest(breakpoint.thread(), StepRequest.STEP_LINE, StepRequest.STEP_OVER);
                            step.addClassFilter("com.csfundamentals.example.*"); step.addCountFilter(1); step.enable();
                        }
                    } else if (event instanceof StepEvent step) {
                        stepLocations.add(step.location().declaringType().name()+"."+step.location().method().name());
                        manager.deleteEventRequest(step.request());
                        if (phase == 1) {
                            phase = 2;
                            StepRequest into = manager.createStepRequest(step.thread(), StepRequest.STEP_LINE, StepRequest.STEP_INTO);
                            into.addClassFilter("com.csfundamentals.example.*"); into.addCountFilter(1); into.enable();
                        }
                    } else if (event instanceof ExceptionEvent exception) {
                        if (!exception.exception().referenceType().name().equals("java.lang.IllegalArgumentException"))
                            throw new IllegalStateException("unexpected_target_exception");
                        exceptions++; caught = exception.catchLocation() != null;
                        exceptionLocation = exception.location().declaringType().name()+"."+exception.location().method().name();
                        catchLocation = caught ? exception.catchLocation().declaringType().name()+"."+exception.catchLocation().method().name() : "uncaught";
                        if (exception.thread().frameCount() < 2) throw new IllegalStateException("missing_stack_frames");
                    } else if (event instanceof VMDeathEvent || event instanceof VMDisconnectEvent) { dead = true; }
                }
                try { set.resume(); } catch (VMDisconnectedException disconnected) { dead = true; }
            }
            exited = target.waitFor(3, TimeUnit.SECONDS);
            if (!exited || target.exitValue() != 0 || conditions != 3 || matches != 1 || exceptions != 1 || !caught
                    || !stepLocations.equals(List.of("com.csfundamentals.example.TaskService.create", "com.csfundamentals.example.MemoryTaskRepository.add"))
                    || !exceptionLocation.equals("com.csfundamentals.example.TaskService.create")
                    || !catchLocation.equals("TaskServiceDebugTarget.main")
                    || !Files.readString(log).contains("TARGET_COMPLETE")) throw new IllegalStateException("actual_debug_observation_mismatch");
            String json = "{\"conditionalChecks\":3,\"conditionalMatches\":1,\"caughtExceptions\":1,\"exceptionType\":\"java.lang.IllegalArgumentException\","
                +"\"exceptionLocation\":\""+exceptionLocation+"\",\"catchLocation\":\""+catchLocation+"\","
                +"\"stepLocations\":[\""+String.join("\",\"", stepLocations)+"\"],\"debuggeePid\":"+target.pid()+",\"debuggeeExited\":true,"
                +"\"transport\":\"owned-loopback-socket\",\"guiOrHumanSession\":false,"
                +"\"runtime\":"+runtime+",\"debuggeeRuntime\":"+debuggeeRuntime+"}";
            Files.writeString(report, json);
        } finally {
            try { connector.stopListening(arguments); } catch (Exception ignored) { }
            if (vm != null) try { vm.dispose(); } catch (VMDisconnectedException ignored) { }
            if (target != null && target.isAlive()) { target.destroyForcibly(); target.waitFor(2, TimeUnit.SECONDS); }
        }
    }
}
