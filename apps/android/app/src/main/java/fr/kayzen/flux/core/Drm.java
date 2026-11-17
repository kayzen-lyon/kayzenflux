package fr.kayzen.flux.core;

import java.util.List;
import java.util.regex.Pattern;

/** Détection des contenus chiffrés : KAYZEN Flux refuse tout contenu protégé par DRM. */
public final class Drm {
    public static final String MESSAGE =
        "Ce contenu est protégé (DRM). KAYZEN Flux ne télécharge jamais de contenu chiffré.";
    private static final Pattern ERROR = Pattern.compile("drm|widevine|playready|fairplay", Pattern.CASE_INSENSITIVE);

    private Drm() {}

    /** has_drm de premier niveau vrai, ou tous les formats marqués true/"maybe". */
    public static boolean detect(Object topLevel, List<Object> formatFlags) {
        if (isFlagged(topLevel)) return true;
        if (formatFlags == null || formatFlags.isEmpty()) return false;
        for (Object f : formatFlags) {
            if (!isFlagged(f)) return false;
        }
        return true;
    }

    private static boolean isFlagged(Object v) {
        return Boolean.TRUE.equals(v) || "maybe".equals(v);
    }

    public static boolean isDrmError(String stderr) {
        return stderr != null && ERROR.matcher(stderr).find();
    }
}
