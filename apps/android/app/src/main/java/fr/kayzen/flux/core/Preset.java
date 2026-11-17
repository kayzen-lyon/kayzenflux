package fr.kayzen.flux.core;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Préréglages d'export (tous gratuits). Libellés honnêtes : un FLAC issu d'une
 * source compressée n'est jamais présenté comme « sans perte ».
 */
public enum Preset {
    MP3_192("mp3-192", true, "MP3 (192 kbps)", "Compatible partout. Qualité plafonnée par la source.",
        "-f", "ba/b", "-x", "--audio-format", "mp3", "--audio-quality", "192K"),
    M4A("m4a", true, "M4A (AAC)", "Léger, idéal pour la musique sur téléphone.",
        "-f", "ba[ext=m4a]/ba/b", "-x", "--audio-format", "m4a"),
    OPUS("opus", true, "Opus (flux d’origine)",
        "Sans réencodage quand la source est déjà en Opus ; sinon, choisissez M4A.",
        "-f", "ba[acodec^=opus]", "-x", "--audio-format", "opus"),
    FLAC("flac", true, "FLAC (conteneur)",
        "Pour le montage. N’ajoute aucune qualité à une source compressée.",
        "-f", "ba/b", "-x", "--audio-format", "flac"),
    MP4_720("mp4-720", false, "MP4 (720p)", "Léger, pour téléphone.",
        "-f", "bv*[height<=?720]+ba/b[height<=?720]", "-S", "vcodec:h264,res,acodec:m4a",
        "--merge-output-format", "mp4"),
    MP4_1080("mp4-1080", false, "MP4 (1080p)", "Full HD, compatible partout (H.264 privilégié).",
        "-f", "bv*[height<=?1080]+ba/b[height<=?1080]", "-S", "vcodec:h264,res,acodec:m4a",
        "--merge-output-format", "mp4"),
    BEST("best", false, "Meilleure qualité", "Meilleure définition disponible (MP4, ou MKV si nécessaire).",
        "-f", "bv*+ba/b", "-S", "res,fps", "--merge-output-format", "mp4/mkv");

    public final String id;
    public final boolean audio;
    public final String label;
    public final String hint;
    private final List<String> args;

    Preset(String id, boolean audio, String label, String hint, String... args) {
        this.id = id;
        this.audio = audio;
        this.label = label;
        this.hint = hint;
        this.args = Collections.unmodifiableList(Arrays.asList(args));
    }

    public List<String> args() { return args; }

    public static Preset fromId(String id) {
        for (Preset p : values()) {
            if (p.id.equals(id)) return p;
        }
        return null;
    }
}
