package com.csfundamentals.example;

import com.csfundamentals.example.observability.ProbeAlert;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static com.csfundamentals.example.observability.ProbeAlert.Decision.*;

class ObservabilityAlertTest {
    @Test void lowTrafficAndOneBadWindowDoNotTriggerSustainedAlert() {
        assertEquals(INSUFFICIENT_VOLUME,ProbeAlert.evaluate(new ProbeAlert.Window(2,1,1),new ProbeAlert.Window(2,1,1)));
        assertEquals(CLEAR,ProbeAlert.evaluate(new ProbeAlert.Window(100,0,0),new ProbeAlert.Window(100,10,0)));
    }
    @Test void sustainedFailuresAndTailLatencyHaveDistinctReasons() {
        assertEquals(DEPENDENCY_ERRORS,ProbeAlert.evaluate(new ProbeAlert.Window(100,6,0),new ProbeAlert.Window(100,8,0)));
        assertEquals(DEPENDENCY_LATENCY,ProbeAlert.evaluate(new ProbeAlert.Window(100,0,7),new ProbeAlert.Window(100,0,9)));
        assertThrows(IllegalArgumentException.class,()->new ProbeAlert.Window(10,11,0));
        assertThrows(IllegalArgumentException.class,()->new ProbeAlert.Window(-1,0,0));
    }
}
