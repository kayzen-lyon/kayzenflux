package fr.kayzen.flux.core;

import java.util.Locale;

/** Lecture d'un fichier SHA2-256SUMS (format « <hex>  <nom> »). */
public final class Checksums {
    private Checksums() {}

    public static String find(String sums, String fileName) {
        if (sums == null) return null;
        for (String line : sums.split("\\r?\\n")) {
            String[] parts = line.trim().split("\\s+\\*?", 2);
            if (parts.length == 2 && parts[1].trim().equals(fileName) && parts[0].matches("[0-9a-fA-F]{64}")) {
                return parts[0].toLowerCase(Locale.ROOT);
            }
        }
        return null;
    }

    public static String hex(byte[] digest) {
        StringBuilder sb = new StringBuilder();
        for (byte b : digest) sb.append(String.format(Locale.ROOT, "%02x", b));
        return sb.toString();
    }
}
