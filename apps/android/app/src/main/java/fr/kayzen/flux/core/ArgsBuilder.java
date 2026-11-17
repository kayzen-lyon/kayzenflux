package fr.kayzen.flux.core;

import java.util.ArrayList;
import java.util.List;

/**
 * Construction des arguments yt-dlp sous forme de liste (aucune concaténation de
 * chaînes) ; l'URL validée est toujours placée après « -- ».
 */
public final class ArgsBuilder {
    public static final String PROGRESS_PREFIX = "KZP|";
    public static final String FILE_PREFIX = "KZF|";
    public static final String PROGRESS_TEMPLATE = "download:" + PROGRESS_PREFIX
        + "%(progress.status)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|"
        + "%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s";
    public static final String OUTPUT_TEMPLATE = "%(title).150B [%(id)s].%(ext)s";

    private ArgsBuilder() {}

    public static final class ArgsException extends IllegalArgumentException {
        public ArgsException(String message) { super(message); }
    }

    private static void common(List<String> a, String proxy) {
        a.add("--ignore-config");
        a.add("--no-colors");
        a.add("--no-playlist");
        if (proxy != null) {
            a.add("--proxy");
            a.add(proxy);
        }
    }

    /** Analyse sans téléchargement (titre, durée, miniature, DRM). */
    public static List<String> info(String url, String proxy) {
        UrlValidator.Result r = UrlValidator.validate(url);
        if (!r.ok) throw new ArgsException(r.reason);
        List<String> a = new ArrayList<>();
        common(a, proxy);
        a.add("-J");
        a.add("--no-warnings");
        a.add("--");
        a.add(r.url);
        return a;
    }

    public static List<String> download(String url, Preset preset, String outputDir, String ffmpegDir, String proxy) {
        UrlValidator.Result r = UrlValidator.validate(url);
        if (!r.ok) throw new ArgsException(r.reason);
        if (preset == null) throw new ArgsException("Choisissez un format.");
        if (outputDir == null || outputDir.isEmpty() || outputDir.startsWith("-")) {
            throw new ArgsException("Dossier de travail invalide.");
        }
        List<String> a = new ArrayList<>();
        common(a, proxy);
        a.add("--newline");
        a.add("--no-simulate");
        a.add("--no-part");
        a.add("--no-mtime");
        a.add("--progress-template");
        a.add(PROGRESS_TEMPLATE);
        a.add("--print");
        a.add("after_move:" + FILE_PREFIX + "%(filepath)s");
        a.add("-P");
        a.add(outputDir);
        a.add("-o");
        a.add(OUTPUT_TEMPLATE);
        a.add("--windows-filenames");
        // ffmpeg embarqué compilé sans réseau : téléchargement HLS/DASH natif.
        a.add("--downloader");
        a.add("native");
        a.addAll(preset.args());
        if (ffmpegDir != null) {
            a.add("--ffmpeg-location");
            a.add(ffmpegDir);
        }
        a.add("--");
        a.add(r.url);
        return a;
    }
}
