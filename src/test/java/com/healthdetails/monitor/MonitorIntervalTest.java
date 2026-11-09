package com.healthdetails.monitor;

import jakarta.ws.rs.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MonitorIntervalTest {

    @Test
    void parsesApiAndEnumValues() {
        assertEquals(MonitorInterval.ONE_MINUTE, MonitorInterval.fromValue("1m"));
        assertEquals(MonitorInterval.TWO_HOURS, MonitorInterval.fromValue("2h"));
        assertEquals(MonitorInterval.ONE_MINUTE, MonitorInterval.fromValue("ONE_MINUTE"));
        assertEquals(MonitorInterval.TWO_HOURS, MonitorInterval.fromValue("two_hours"));
    }

    @Test
    void exposesCronExpressions() {
        assertEquals("0 * * * * ?", MonitorInterval.ONE_MINUTE.cron());
        assertEquals("0 0 */2 * * ?", MonitorInterval.TWO_HOURS.cron());
    }

    @Test
    void rejectsUnknownIntervals() {
        assertThrows(BadRequestException.class, () -> MonitorInterval.fromValue("5m"));
        assertThrows(BadRequestException.class, () -> MonitorInterval.fromValue(null));
        assertThrows(BadRequestException.class, () -> MonitorInterval.fromValue(" "));
    }
}
