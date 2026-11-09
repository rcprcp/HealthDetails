package com.healthdetails.monitor;

import jakarta.ws.rs.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MonitorIntervalTest {

    @Test
    void parsesApiAndEnumValues() {
        assertEquals(MonitorInterval.STREAM, MonitorInterval.fromValue("stream"));
        assertEquals(MonitorInterval.TWO_HOURS, MonitorInterval.fromValue("2h"));
        assertEquals(MonitorInterval.STREAM, MonitorInterval.fromValue("STREAM"));
        assertEquals(MonitorInterval.TWO_HOURS, MonitorInterval.fromValue("two_hours"));
    }

    @Test
    void exposesCronExpressions() {
        assertEquals("0 * * * * ?", MonitorInterval.STREAM.cron());
        assertEquals("0 0 */2 * * ?", MonitorInterval.TWO_HOURS.cron());
    }

    @Test
    void rejectsUnknownIntervals() {
        assertThrows(BadRequestException.class, () -> MonitorInterval.fromValue("1m"));
        assertThrows(BadRequestException.class, () -> MonitorInterval.fromValue("5m"));
        assertThrows(BadRequestException.class, () -> MonitorInterval.fromValue(null));
        assertThrows(BadRequestException.class, () -> MonitorInterval.fromValue(" "));
    }
}
