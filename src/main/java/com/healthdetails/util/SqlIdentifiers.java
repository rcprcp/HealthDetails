package com.healthdetails.util;

import java.util.regex.Pattern;

public final class SqlIdentifiers {

    private static final Pattern VALID_IDENTIFIER = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*");

    private SqlIdentifiers() {
    }

    public static String requireValid(String identifier) {
        if (identifier == null || !VALID_IDENTIFIER.matcher(identifier).matches()) {
            throw new IllegalArgumentException("Invalid SQL identifier: " + identifier);
        }
        return identifier;
    }

    public static String quote(String identifier) {
        return "\"" + requireValid(identifier) + "\"";
    }
}
