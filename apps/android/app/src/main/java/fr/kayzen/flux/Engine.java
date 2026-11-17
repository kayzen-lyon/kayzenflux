package fr.kayzen.flux;

import android.content.Context;
import android.content.res.AssetManager;
import android.system.Os;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import fr.kayzen.flux.core.Checksums;

/**
 * Moteur local : yt-dlp (CPython de la build officielle musllinux_aarch64) et
 * ffmpeg, exécutés sur le téléphone. Aucun serveur KAYZEN.
 */
final class Engine {
    static final String YTDLP_ZIPAPP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
    static final String YTDLP_SUMS_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/SHA2-256SUMS";

    interface LineListener {
        void onLine(String line);
    }

    static final class Result {
        final int exitCode;
        final String stdout;
        final String stderr;

        Result(int exitCode, String stdout, String stderr) {
            this.exitCode = exitCode;
            this.stdout = stdout;
            this.stderr = stderr;
        }
    }

    private final Context ctx;
    private final File runtimeDir;
    private final File binDir;
    private final File updatedZipapp;
    private LocalProxy proxy;

    Engine(Context ctx) {
        this.ctx = ctx.getApplicationContext();
        this.runtimeDir = new File(this.ctx.getFilesDir(), "runtime-" + BuildInfo.VERSION_CODE);
        this.binDir = new File(this.ctx.getFilesDir(), "bin");
        this.updatedZipapp = new File(this.ctx.getFilesDir(), "yt-dlp-update.pyz");
    }

    private File nativeLib(String name) {
        return new File(ctx.getApplicationInfo().nativeLibraryDir, name);
    }

    boolean isSupportedDevice() {
        return nativeLib("libkzmusl.so").exists();
    }

    /** Premier lancement : décompresse l'environnement Python (≈ 110 Mo) depuis l'APK. */
    synchronized void ensureInstalled() throws IOException {
        if (!isSupportedDevice()) {
            throw new IOException("Cet appareil n'est pas pris en charge (processeur ARM 64 bits requis).");
        }
        File done = new File(runtimeDir, ".ok");
        if (!done.exists()) {
            File[] old = ctx.getFilesDir().listFiles();
            if (old != null) {
                for (File f : old) {
                    if (f.getName().startsWith("runtime-")) deleteTree(f);
                }
            }
            if (!runtimeDir.mkdirs() && !runtimeDir.isDirectory()) throw new IOException("Espace de stockage indisponible.");
            AssetManager am = ctx.getAssets();
            try (ZipInputStream zin = new ZipInputStream(am.open("runtime.zip"))) {
                ZipEntry e;
                byte[] buf = new byte[1 << 16];
                String root = runtimeDir.getCanonicalPath() + File.separator;
                while ((e = zin.getNextEntry()) != null) {
                    File out = new File(runtimeDir, e.getName());
                    if (!out.getCanonicalPath().startsWith(root)) throw new IOException("Archive invalide.");
                    if (e.isDirectory()) {
                        out.mkdirs();
                        continue;
                    }
                    out.getParentFile().mkdirs();
                    try (OutputStream os = new FileOutputStream(out)) {
                        int n;
                        while ((n = zin.read(buf)) > 0) os.write(buf, 0, n);
                    }
                }
            }
            if (!done.createNewFile()) throw new IOException("Installation du moteur incomplète.");
        }
        // ffmpeg/ffprobe : exécutables natifs de l'APK, exposés sous leur nom attendu par yt-dlp.
        binDir.mkdirs();
        link(nativeLib("libkzffmpeg.so"), new File(binDir, "ffmpeg"));
        link(nativeLib("libkzffprobe.so"), new File(binDir, "ffprobe"));
    }

    private static void link(File target, File linkFile) throws IOException {
        try {
            if (linkFile.getCanonicalPath().equals(target.getCanonicalPath())) return;
            linkFile.delete();
            Os.symlink(target.getAbsolutePath(), linkFile.getAbsolutePath());
        } catch (android.system.ErrnoException e) {
            throw new IOException("Impossible de préparer ffmpeg.", e);
        }
    }

    String ffmpegDir() {
        return binDir.getAbsolutePath();
    }

    synchronized String proxyUrl() throws IOException {
        if (proxy == null) proxy = new LocalProxy();
        return proxy.url();
    }

    private List<String> command(List<String> ytArgs) {
        List<String> cmd = new ArrayList<>();
        cmd.add(nativeLib("libkzmusl.so").getAbsolutePath());
        cmd.add("--library-path");
        cmd.add(new File(runtimeDir, "py/lib").getAbsolutePath());
        cmd.add(new File(runtimeDir, "kzpy").getAbsolutePath());
        if (updatedZipapp.exists()) {
            cmd.add(updatedZipapp.getAbsolutePath());
        } else {
            cmd.add("-m");
            cmd.add("kzflux_entry");
        }
        cmd.addAll(ytArgs);
        return cmd;
    }

    Process start(List<String> ytArgs) throws IOException {
        ProcessBuilder pb = new ProcessBuilder(command(ytArgs));
        Map<String, String> env = pb.environment();
        env.clear();
        File tmp = new File(ctx.getCacheDir(), "tmp");
        tmp.mkdirs();
        env.put("HOME", ctx.getFilesDir().getAbsolutePath());
        env.put("TMPDIR", tmp.getAbsolutePath());
        env.put("PYTHONHOME", new File(runtimeDir, "py").getAbsolutePath());
        env.put("PYTHONNOUSERSITE", "1");
        env.put("PYTHONDONTWRITEBYTECODE", "1");
        env.put("PYTHONUTF8", "1");
        env.put("PYTHONUNBUFFERED", "1");
        env.put("PATH", binDir.getAbsolutePath() + ":/system/bin");
        env.put("LANG", "C.UTF-8");
        return pb.start();
    }

    /** Exécute yt-dlp ; stdout ligne à ligne vers {@code listener}, stderr conservé. */
    Result run(List<String> ytArgs, LineListener listener, Process[] holder) throws IOException, InterruptedException {
        Process p = start(ytArgs);
        if (holder != null) holder[0] = p;
        StringBuilder err = new StringBuilder();
        Thread errReader = new Thread(() -> {
            try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getErrorStream(), StandardCharsets.UTF_8))) {
                String l;
                while ((l = r.readLine()) != null) {
                    synchronized (err) {
                        if (err.length() < 20000) err.append(l).append('\n');
                    }
                }
            } catch (IOException ignored) {
                // processus arrêté
            }
        });
        errReader.start();
        StringBuilder out = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            String l;
            while ((l = r.readLine()) != null) {
                if (listener != null) listener.onLine(l);
                else out.append(l).append('\n');
            }
        }
        int code = p.waitFor();
        errReader.join(2000);
        synchronized (err) {
            return new Result(code, out.toString(), err.toString());
        }
    }

    String version() {
        try {
            Result r = run(java.util.Collections.singletonList("--version"), null, null);
            return r.exitCode == 0 ? r.stdout.trim() : "?";
        } catch (IOException | InterruptedException e) {
            return "?";
        }
    }

    /**
     * Mise à jour de yt-dlp : télécharge la dernière version officielle (zipapp,
     * GitHub yt-dlp), vérifie son SHA-256 publié, puis l'active.
     */
    String update() throws IOException, InterruptedException {
        String sums = new String(download(YTDLP_SUMS_URL, 1 << 20), StandardCharsets.UTF_8);
        String expected = Checksums.find(sums, "yt-dlp");
        if (expected == null) throw new IOException("Somme de contrôle introuvable.");
        byte[] data = download(YTDLP_ZIPAPP_URL, 64 << 20);
        String actual;
        try {
            actual = Checksums.hex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IOException(e);
        }
        if (!expected.equals(actual)) throw new IOException("Somme de contrôle incorrecte : mise à jour refusée.");
        File tmp = new File(ctx.getFilesDir(), "yt-dlp-update.tmp");
        try (OutputStream os = new FileOutputStream(tmp)) {
            os.write(data);
        }
        File previous = new File(ctx.getFilesDir(), "yt-dlp-update.prev");
        previous.delete();
        if (updatedZipapp.exists() && !updatedZipapp.renameTo(previous)) throw new IOException("Mise à jour impossible.");
        if (!tmp.renameTo(updatedZipapp)) throw new IOException("Mise à jour impossible.");
        String v = version();
        if ("?".equals(v)) {
            // La nouvelle version ne démarre pas : retour à la précédente.
            updatedZipapp.delete();
            if (previous.exists()) previous.renameTo(updatedZipapp);
            throw new IOException("La nouvelle version ne démarre pas sur cet appareil ; version précédente conservée.");
        }
        previous.delete();
        return v;
    }

    static byte[] download(String url, int maxBytes) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(20000);
        c.setReadTimeout(60000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "KAYZEN-Flux-Android/" + BuildInfo.VERSION_NAME);
        try {
            if (c.getResponseCode() != 200) throw new IOException("Téléchargement impossible (HTTP " + c.getResponseCode() + ").");
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[1 << 16];
                int n;
                while ((n = in.read(buf)) > 0) {
                    bos.write(buf, 0, n);
                    if (bos.size() > maxBytes) throw new IOException("Fichier trop volumineux.");
                }
                return bos.toByteArray();
            }
        } finally {
            c.disconnect();
        }
    }

    static void deleteTree(File f) {
        if (f.isDirectory() && !isSymlink(f)) {
            File[] kids = f.listFiles();
            if (kids != null) for (File k : kids) deleteTree(k);
        }
        f.delete();
    }

    private static boolean isSymlink(File f) {
        try {
            return !f.getCanonicalPath().equals(f.getAbsolutePath());
        } catch (IOException e) {
            return true;
        }
    }

    static void copy(File src, OutputStream os) throws IOException {
        try (InputStream in = new FileInputStream(src)) {
            byte[] buf = new byte[1 << 16];
            int n;
            while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
        }
    }
}
