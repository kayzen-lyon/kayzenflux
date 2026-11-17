package fr.kayzen.flux;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import fr.kayzen.flux.core.MimeTypes;

/** Enregistrement dans Téléchargements/KAYZEN Flux (MediaStore sur Android 10+). */
final class Saver {
    static final String FOLDER = "KAYZEN Flux";
    // Constantes de MediaStore.Downloads (API 29), écrites en clair : compilation contre l'API 23.
    private static final Uri DOWNLOADS = Uri.parse("content://media/external/downloads");
    private static final String RELATIVE_PATH = "relative_path";
    private static final String IS_PENDING = "is_pending";

    private Saver() {}

    static Uri save(Context ctx, File src) throws IOException {
        String mime = MimeTypes.forFile(src.getName());
        if (Build.VERSION.SDK_INT >= 29) {
            ContentResolver cr = ctx.getContentResolver();
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, src.getName());
            v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            v.put(RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + FOLDER);
            v.put(IS_PENDING, 1);
            Uri uri = cr.insert(DOWNLOADS, v);
            if (uri == null) throw new IOException("Enregistrement impossible dans Téléchargements.");
            try (OutputStream os = cr.openOutputStream(uri)) {
                if (os == null) throw new IOException("Enregistrement impossible.");
                Engine.copy(src, os);
            } catch (IOException e) {
                cr.delete(uri, null, null);
                throw e;
            }
            ContentValues done = new ContentValues();
            done.put(IS_PENDING, 0);
            cr.update(uri, done, null, null);
            return uri;
        }
        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), FOLDER);
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Dossier Téléchargements inaccessible.");
        File dest = new File(dir, src.getName());
        try (OutputStream os = new FileOutputStream(dest)) {
            Engine.copy(src, os);
        }
        final Uri[] result = {null};
        CountDownLatch latch = new CountDownLatch(1);
        MediaScannerConnection.scanFile(ctx, new String[] {dest.getAbsolutePath()}, new String[] {mime}, (path, uri) -> {
            result[0] = uri;
            latch.countDown();
        });
        try {
            latch.await(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return result[0] != null ? result[0] : Uri.fromFile(dest);
    }
}
