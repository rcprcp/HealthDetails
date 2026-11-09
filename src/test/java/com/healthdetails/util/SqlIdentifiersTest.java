package com.healthdetails.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SqlIdentifiersTest {

    @Test
    void quotesValidIdentifiers() {
        assertEquals("\"j2208\"", SqlIdentifiers.quote("j2208"));
        assertEquals("\"v_hr\"", SqlIdentifiers.quote("v_hr"));
    }

    @Test
    void rejectsAnythingThatCouldEscapeAnIdentifier() {
        assertThrows(IllegalArgumentException.class, () -> SqlIdentifiers.requireValid("v_hr; drop table x"));
        assertThrows(IllegalArgumentException.class, () -> SqlIdentifiers.requireValid("v-hr"));
        assertThrows(IllegalArgumentException.class, () -> SqlIdentifiers.requireValid(""));
        assertThrows(IllegalArgumentException.class, () -> SqlIdentifiers.requireValid(null));
    }
}
