package fr.kayzen.flux.core;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Validation des liens soumis par l'utilisateur, alignée sur packages/core/src/url.ts :
 * http(s) uniquement, sans identifiants, sans adresse locale ou privée.
 */
public final class UrlValidator {
    public static final int MAX_URL_LENGTH = 2048;

    private static final Pattern[] PRIVATE_HOSTS = {
        Pattern.compile("^localhost$", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\.localhost$", Pattern.CASE_INSENSITIVE),
        Pattern.compile("^127\\."),
        Pattern.compile("^10\\."),
        Pattern.compile("^192\\.168\\."),
        Pattern.compile("^172\\.(1[6-9]|2\\d|3[01])\\."),
        Pattern.compile("^169\\.254\\."),
        Pattern.compile("^0\\."),
        Pattern.compile("^\\[?::1\\]?$"),
        Pattern.compile("^\\[?f[cd][0-9a-f]{2}:", Pattern.CASE_INSENSITIVE),
        Pattern.compile("^\\[?fe80:", Pattern.CASE_INSENSITIVE),
    };

    private static final Pattern URL_IN_TEXT = Pattern.compile("https?://[^\\s<>\"']+", Pattern.CASE_INSENSITIVE);

    private UrlValidator() {}

    /** Résultat de validation : soit une URL normalisée, soit un motif de refus en français. */
    public static final class Result {
        public final boolean ok;
        public final String url;
        public final String host;
        public final String reason;

        private Result(boolean ok, String url, String host, String reason) {
            this.ok = ok;
            this.url = url;
            this.host = host;
            this.reason = reason;
        }

        static Result ok(String url, String host) { return new Result(true, url, host, null); }
        static Result refused(String reason) { return new Result(false, null, null, reason); }
    }

    public static boolean isPrivateHost(String host) {
        for (Pattern p : PRIVATE_HOSTS) {
            if (p.matcher(host).find()) return true;
        }
        return false;
    }

    public static Result validate(String input) {
        String raw = input == null ? "" : input.trim();
        if (raw.isEmpty()) return Result.refused("Lien vide.");
        if (raw.length() > MAX_URL_LENGTH) return Result.refused("Lien trop long.");
        if (raw.startsWith("-")) return Result.refused("Lien invalide.");
        URI uri;
        try {
            uri = new URI(raw);
        } catch (URISyntaxException e) {
            return Result.refused("Ce texte n'est pas un lien valide.");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            return Result.refused("Seules les adresses http et https sont acceptées.");
        }
        if (uri.getRawUserInfo() != null) {
            return Result.refused("Les liens contenant des identifiants sont refusés.");
        }
        String host = uri.getHost();
        if (host == null || host.isEmpty()) return Result.refused("Hôte manquant.");
        if (isPrivateHost(host)) return Result.refused("Les adresses locales ou privées sont refusées.");
        return Result.ok(uri.toString(), host.toLowerCase(Locale.ROOT));
    }

    /** Extrait le premier lien http(s) d'un texte partagé (ex. « Regarde ça : https://… »). */
    public static String extractFirstUrl(String text) {
        if (text == null) return null;
        Matcher m = URL_IN_TEXT.matcher(text);
        if (!m.find()) return null;
        String url = m.group();
        // Ponctuation finale fréquente dans les messages partagés.
        while (!url.isEmpty() && ".,;:!?)]}".indexOf(url.charAt(url.length() - 1)) >= 0) {
            url = url.substring(0, url.length() - 1);
        }
        return url;
    }
}
