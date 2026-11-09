package com.healthdetails.service;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

class ValueFormatterTest {

    @Test
    void distinguishesTimestamptzFromTimestampByTypeName() throws Exception {
        OffsetDateTime instant = OffsetDateTime.parse("2026-11-08T23:27:16.178712Z");
        assertEquals(
                "2026-11-08T23:27:16.178712Z",
                ValueFormatter.toJsonValue(resultSet(instant), 1, Types.TIMESTAMP, "timestamptz"));

        LocalDateTime local = LocalDateTime.parse("2026-11-08T18:23:30");
        assertEquals(
                "2026-11-08T18:23:30",
                ValueFormatter.toJsonValue(resultSet(local), 1, Types.TIMESTAMP, "timestamp"));
    }

    @Test
    void rendersByteaAsAPlaceholderInsteadOfBase64Noise() throws Exception {
        assertEquals(
                "<binary 3 bytes>",
                ValueFormatter.toJsonValue(resultSet(new byte[]{1, 2, 3}), 1, Types.BINARY, "bytea"));
    }

    @Test
    void keepsJsonbAsTextAndNumbersAsNumbers() throws Exception {
        assertEquals(
                "{\"value\": 72}",
                ValueFormatter.toJsonValue(resultSet("{\"value\": 72}"), 1, Types.OTHER, "jsonb"));

        BigDecimal numeric = new BigDecimal("2.75");
        assertSame(
                numeric,
                ValueFormatter.toJsonValue(resultSet(numeric), 1, Types.NUMERIC, "numeric"));
    }

    private static ResultSet resultSet(Object value) {
        return (ResultSet) Proxy.newProxyInstance(
                ValueFormatterTest.class.getClassLoader(),
                new Class<?>[]{ResultSet.class},
                (proxy, method, args) -> {
                    if (method.getName().equals("getObject")
                            || method.getName().equals("getBytes")
                            || method.getName().equals("getString")) {
                        return value;
                    }
                    throw new UnsupportedOperationException(method.getName());
                });
    }
}
