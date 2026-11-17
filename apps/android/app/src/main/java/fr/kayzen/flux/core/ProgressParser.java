package fr.kayzen.flux.core;

/** Lecture des lignes de progression émises via {@link ArgsBuilder#PROGRESS_TEMPLATE}. */
public final class ProgressParser {
    private ProgressParser() {}

    public static final class Progress {
        public final String status;
        public final long downloaded;
        public final long total;
        public final double speed;
        public final long eta;

        Progress(String status, long downloaded, long total, double speed, long eta) {
            this.status = status;
            this.downloaded = downloaded;
            this.total = total;
            this.speed = speed;
            this.eta = eta;
        }

        /** Fraction 0..1, ou -1 si la taille totale est inconnue. */
        public double fraction() {
            if (total <= 0) return -1;
            return Math.max(0, Math.min(1, (double) downloaded / total));
        }
    }

    public static Progress parse(String line) {
        if (line == null || !line.startsWith(ArgsBuilder.PROGRESS_PREFIX)) return null;
        String[] p = line.substring(ArgsBuilder.PROGRESS_PREFIX.length()).split("\\|", -1);
        if (p.length < 6) return null;
        long total = toLong(p[2]);
        if (total <= 0) total = toLong(p[3]);
        return new Progress(p[0], Math.max(0, toLong(p[1])), total, toDouble(p[4]), toLong(p[5]));
    }

    /** Chemin final annoncé par yt-dlp (préfixe KZF|), sinon null. */
    public static String parseFile(String line) {
        if (line == null || !line.startsWith(ArgsBuilder.FILE_PREFIX)) return null;
        String path = line.substring(ArgsBuilder.FILE_PREFIX.length()).trim();
        return path.isEmpty() ? null : path;
    }

    static long toLong(String s) {
        try {
            return (long) Double.parseDouble(s);
        } catch (NumberFormatException | NullPointerException e) {
            return -1;
        }
    }

    static double toDouble(String s) {
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException | NullPointerException e) {
            return -1;
        }
    }

    public static String formatBytes(long bytes) {
        if (bytes < 0) return "?";
        if (bytes < 1024) return bytes + " o";
        double v = bytes / 1024.0;
        String[] units = {"Ko", "Mo", "Go", "To"};
        int i = 0;
        while (v >= 1024 && i < units.length - 1) {
            v /= 1024;
            i++;
        }
        return String.format(java.util.Locale.FRANCE, "%.1f %s", v, units[i]);
    }

    public static String formatDuration(long seconds) {
        if (seconds < 0) return "";
        long h = seconds / 3600, m = (seconds % 3600) / 60, s = seconds % 60;
        return h > 0 ? String.format(java.util.Locale.ROOT, "%d:%02d:%02d", h, m, s)
                     : String.format(java.util.Locale.ROOT, "%d:%02d", m, s);
    }
}
