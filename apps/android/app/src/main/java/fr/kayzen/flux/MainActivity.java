package fr.kayzen.flux;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.io.File;
import java.io.IOException;
import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import fr.kayzen.flux.core.ArgsBuilder;
import fr.kayzen.flux.core.Drm;
import fr.kayzen.flux.core.Preset;
import fr.kayzen.flux.core.ProgressParser;
import fr.kayzen.flux.core.UrlValidator;

public class MainActivity extends Activity {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final ExecutorService io = Executors.newCachedThreadPool();
    private Ui ui;
    private Engine engine;
    private History history;

    private EditText urlField;
    private Button analyzeBtn;
    private Button downloadBtn;
    private Button cancelBtn;
    private Button updateBtn;
    private LinearLayout infoCard;
    private ImageView thumb;
    private TextView infoTitle;
    private TextView infoMeta;
    private TextView status;
    private ProgressBar progress;
    private RadioGroup presetGroup;
    private TextView engineLine;
    private LinearLayout filesList;

    private volatile Process running;
    private volatile boolean cancelled;
    private String analyzedUrl;
    private boolean analyzedDrm;
    private File pendingSave;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        ui = new Ui(this);
        engine = new Engine(this);
        history = new History(this);
        getWindow().setStatusBarColor(ui.bg);
        getWindow().setNavigationBarColor(ui.bg);
        if (!ui.dark && Build.VERSION.SDK_INT >= 23) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
        setContentView(build());
        handleIntent(getIntent());
        refreshFiles();
        prepareEngine();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String text = null;
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            text = intent.getStringExtra(Intent.EXTRA_TEXT);
        } else if (Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) {
            text = intent.getData().toString();
        }
        String url = UrlValidator.extractFirstUrl(text);
        if (url != null) {
            urlField.setText(url);
            analyze();
        } else if (text != null) {
            toast("Aucun lien trouvé dans le texte partagé.");
        }
    }

    // ---------------------------------------------------------------- interface

    private View build() {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(ui.bg);
        scroll.setFitsSystemWindows(true);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(ui.dp(18), ui.dp(18), ui.dp(18), ui.dp(28));
        scroll.addView(root);

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        header.addView(logo, new LinearLayout.LayoutParams(ui.dp(44), ui.dp(44)));
        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setPadding(ui.dp(12), 0, 0, 0);
        TextView brand = ui.label("KAYZEN Flux", 24, true, ui.text);
        titles.addView(brand);
        titles.addView(ui.label("Audio et vidéo, enregistrés sur votre téléphone", 13, false, ui.muted));
        header.addView(titles, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        Button about = ui.secondary("À propos");
        about.setOnClickListener(v -> startActivity(new Intent(this, AboutActivity.class)));
        header.addView(about);
        root.addView(header);

        // Lien
        LinearLayout linkCard = ui.card();
        linkCard.addView(ui.label("Lien de la vidéo ou de la musique", 14, true, ui.text));
        urlField = new EditText(this);
        urlField.setHint("https://…");
        urlField.setSingleLine(true);
        urlField.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        urlField.setImeOptions(EditorInfo.IME_ACTION_GO);
        urlField.setTextColor(ui.text);
        urlField.setHintTextColor(ui.muted);
        urlField.setBackground(ui.rounded(ui.bg, ui.border, 12));
        urlField.setPadding(ui.dp(12), ui.dp(12), ui.dp(12), ui.dp(12));
        urlField.setOnEditorActionListener((v, id, e) -> {
            analyze();
            return true;
        });
        linkCard.addView(urlField, ui.block(10));
        LinearLayout row = new LinearLayout(this);
        Button paste = ui.secondary("Coller");
        paste.setOnClickListener(v -> paste());
        analyzeBtn = ui.primary("Analyser");
        analyzeBtn.setOnClickListener(v -> analyze());
        LinearLayout.LayoutParams half = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        LinearLayout.LayoutParams half2 = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        half2.leftMargin = ui.dp(10);
        row.addView(paste, half);
        row.addView(analyzeBtn, half2);
        linkCard.addView(row, ui.block(12));
        root.addView(linkCard, ui.block(18));

        // Aperçu
        infoCard = ui.card();
        infoCard.setVisibility(View.GONE);
        LinearLayout infoRow = new LinearLayout(this);
        thumb = new ImageView(this);
        thumb.setScaleType(ImageView.ScaleType.CENTER_CROP);
        thumb.setBackground(ui.rounded(ui.border, 0, 10));
        thumb.setClipToOutline(true);
        infoRow.addView(thumb, new LinearLayout.LayoutParams(ui.dp(120), ui.dp(68)));
        LinearLayout infoText = new LinearLayout(this);
        infoText.setOrientation(LinearLayout.VERTICAL);
        infoText.setPadding(ui.dp(12), 0, 0, 0);
        infoTitle = ui.label("", 15, true, ui.text);
        infoTitle.setMaxLines(3);
        infoMeta = ui.label("", 13, false, ui.muted);
        infoText.addView(infoTitle);
        infoText.addView(infoMeta);
        infoRow.addView(infoText, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        infoCard.addView(infoRow);
        root.addView(infoCard, ui.block(14));

        // Formats
        LinearLayout formatCard = ui.card();
        formatCard.addView(ui.label("Format", 14, true, ui.text));
        presetGroup = new RadioGroup(this);
        for (Preset p : Preset.values()) {
            RadioButton rb = new RadioButton(this);
            rb.setId(View.generateViewId());
            rb.setTag(p);
            rb.setText(p.label + "\n" + p.hint);
            rb.setTextColor(ui.text);
            rb.setButtonTintList(android.content.res.ColorStateList.valueOf(Ui.ORANGE));
            rb.setPadding(ui.dp(6), ui.dp(8), 0, ui.dp(8));
            presetGroup.addView(rb);
            if (p == Preset.MP3_192) rb.setChecked(true);
        }
        formatCard.addView(presetGroup, ui.block(4));
        downloadBtn = ui.primary("Télécharger");
        downloadBtn.setOnClickListener(v -> download());
        formatCard.addView(downloadBtn, ui.block(10));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(1000);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(Ui.ORANGE));
        progress.setVisibility(View.GONE);
        formatCard.addView(progress, ui.block(12));
        status = ui.label("", 13, false, ui.muted);
        formatCard.addView(status, ui.block(6));
        cancelBtn = ui.secondary("Annuler");
        cancelBtn.setVisibility(View.GONE);
        cancelBtn.setOnClickListener(v -> cancel());
        formatCard.addView(cancelBtn, ui.block(8));
        root.addView(formatCard, ui.block(14));

        // Fichiers
        LinearLayout filesCard = ui.card();
        LinearLayout filesHead = new LinearLayout(this);
        filesHead.setGravity(Gravity.CENTER_VERTICAL);
        filesHead.addView(ui.label("Fichiers récupérés", 14, true, ui.text),
            new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        Button clear = ui.secondary("Vider la liste");
        clear.setOnClickListener(v -> {
            history.clear();
            refreshFiles();
        });
        filesHead.addView(clear);
        filesCard.addView(filesHead);
        filesCard.addView(ui.label("Dans Téléchargements › " + Saver.FOLDER, 12, false, ui.muted), ui.block(4));
        filesList = new LinearLayout(this);
        filesList.setOrientation(LinearLayout.VERTICAL);
        filesCard.addView(filesList, ui.block(8));
        root.addView(filesCard, ui.block(14));

        // Moteur
        LinearLayout engineCard = ui.card();
        engineCard.addView(ui.label("Moteur de téléchargement", 14, true, ui.text));
        engineLine = ui.label("Préparation…", 13, false, ui.muted);
        engineCard.addView(engineLine, ui.block(4));
        updateBtn = ui.secondary("Mettre à jour yt-dlp");
        updateBtn.setOnClickListener(v -> updateEngine());
        engineCard.addView(updateBtn, ui.block(10));
        root.addView(engineCard, ui.block(14));

        TextView foot = ui.label("Tout se passe sur votre téléphone : aucun serveur KAYZEN. "
            + "Les contenus protégés (DRM) sont refusés. Respectez les droits d’auteur.", 12, false, ui.muted);
        foot.setGravity(Gravity.CENTER);
        root.addView(foot, ui.block(18));
        return scroll;
    }

    private void paste() {
        ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        ClipData clip = cm == null ? null : cm.getPrimaryClip();
        if (clip != null && clip.getItemCount() > 0) {
            CharSequence t = clip.getItemAt(0).coerceToText(this);
            String url = UrlValidator.extractFirstUrl(t == null ? null : t.toString());
            urlField.setText(url != null ? url : (t == null ? "" : t.toString()));
        }
    }

    private void toast(String s) {
        Toast.makeText(this, s, Toast.LENGTH_LONG).show();
    }

    private void setBusy(boolean busy, boolean downloading) {
        analyzeBtn.setEnabled(!busy);
        downloadBtn.setEnabled(!busy);
        updateBtn.setEnabled(!busy);
        cancelBtn.setVisibility(busy ? View.VISIBLE : View.GONE);
        progress.setVisibility(busy || downloading ? View.VISIBLE : View.GONE);
        if (busy) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }

    // ---------------------------------------------------------------- moteur

    private void prepareEngine() {
        updateBtn.setEnabled(false);
        worker.execute(() -> {
            try {
                engine.ensureInstalled();
                String v = engine.version();
                main.post(() -> {
                    engineLine.setText("yt-dlp " + v + " · ffmpeg intégré · traitement local");
                    updateBtn.setEnabled(true);
                });
            } catch (IOException e) {
                main.post(() -> engineLine.setText(e.getMessage()));
            }
        });
    }

    private void updateEngine() {
        setBusy(true, false);
        cancelBtn.setVisibility(View.GONE);
        progress.setIndeterminate(true);
        status.setText("Mise à jour de yt-dlp depuis les publications officielles…");
        worker.execute(() -> {
            String msg;
            try {
                engine.ensureInstalled();
                String v = engine.update();
                msg = "yt-dlp est à jour (" + v + ").";
                main.post(() -> engineLine.setText("yt-dlp " + v + " · ffmpeg intégré · traitement local"));
            } catch (IOException | InterruptedException e) {
                msg = "Mise à jour impossible : " + e.getMessage();
            }
            String m = msg;
            main.post(() -> {
                setBusy(false, false);
                progress.setIndeterminate(false);
                status.setText(m);
            });
        });
    }

    private void cancel() {
        cancelled = true;
        Process p = running;
        if (p != null) p.destroy();
        status.setText("Annulation…");
    }

    private String friendlyError(Engine.Result r) {
        if (Drm.isDrmError(r.stderr)) return Drm.MESSAGE;
        String err = r.stderr == null ? "" : r.stderr;
        int i = err.lastIndexOf("ERROR:");
        String line = i >= 0 ? err.substring(i + 6).trim() : "";
        int nl = line.indexOf('\n');
        if (nl > 0) line = line.substring(0, nl);
        if (line.contains("Unsupported URL")) return "Ce site n’est pas pris en charge.";
        if (line.contains("Private video") || line.contains("Sign in")) return "Contenu privé ou nécessitant une connexion : non téléchargeable.";
        if (line.isEmpty()) return "Le téléchargement a échoué (code " + r.exitCode + ").";
        return "Erreur : " + (line.length() > 220 ? line.substring(0, 220) + "…" : line);
    }

    private void analyze() {
        UrlValidator.Result check = UrlValidator.validate(urlField.getText().toString());
        if (!check.ok) {
            status.setText(check.reason);
            return;
        }
        cancelled = false;
        setBusy(true, false);
        progress.setIndeterminate(true);
        status.setText("Analyse du lien…");
        worker.execute(() -> {
            try {
                engine.ensureInstalled();
                Process[] holder = new Process[1];
                running = null;
                Engine.Result r = runTracked(ArgsBuilder.info(check.url, engine.proxyUrl()), null, holder);
                JSONObject json = r.exitCode == 0 ? new JSONObject(r.stdout) : null;
                main.post(() -> onAnalyzed(check.url, r, json));
            } catch (IOException | InterruptedException | JSONException | IllegalArgumentException e) {
                main.post(() -> {
                    setBusy(false, false);
                    progress.setIndeterminate(false);
                    status.setText(cancelled ? "Analyse annulée." : "Analyse impossible : " + e.getMessage());
                });
            }
        });
    }

    private Engine.Result runTracked(List<String> args, Engine.LineListener l, Process[] holder) throws IOException, InterruptedException {
        Process[] h = holder;
        Thread watcher = new Thread(() -> {
            while (h[0] == null) {
                try {
                    Thread.sleep(20);
                } catch (InterruptedException e) {
                    return;
                }
            }
            running = h[0];
            if (cancelled) h[0].destroy();
        });
        watcher.start();
        try {
            return engine.run(args, l, holder);
        } finally {
            watcher.interrupt();
            running = null;
        }
    }

    private void onAnalyzed(String url, Engine.Result r, JSONObject json) {
        setBusy(false, false);
        progress.setIndeterminate(false);
        if (cancelled) {
            status.setText("Analyse annulée.");
            return;
        }
        if (json == null) {
            status.setText(friendlyError(r));
            infoCard.setVisibility(View.GONE);
            return;
        }
        List<Object> flags = new ArrayList<>();
        JSONArray formats = json.optJSONArray("formats");
        if (formats != null) {
            for (int i = 0; i < formats.length(); i++) {
                JSONObject f = formats.optJSONObject(i);
                flags.add(f == null ? null : f.opt("has_drm"));
            }
        }
        analyzedDrm = Drm.detect(json.opt("has_drm"), flags);
        analyzedUrl = url;
        infoCard.setVisibility(View.VISIBLE);
        infoTitle.setText(json.optString("title", "Sans titre"));
        String meta = ProgressParser.formatDuration((long) json.optDouble("duration", -1));
        String who = json.optString("uploader", json.optString("channel", ""));
        if (!who.isEmpty() && !"null".equals(who)) meta = meta.isEmpty() ? who : meta + " · " + who;
        infoMeta.setText(meta);
        thumb.setImageDrawable(null);
        if (analyzedDrm) {
            status.setText(Drm.MESSAGE);
            downloadBtn.setEnabled(false);
            return;
        }
        status.setText("Prêt. Choisissez un format puis « Télécharger ».");
        String t = json.optString("thumbnail", "");
        if (t.startsWith("https://")) {
            io.execute(() -> {
                try {
                    byte[] data = Engine.download(t, 4 << 20);
                    Bitmap b = BitmapFactory.decodeByteArray(data, 0, data.length);
                    main.post(() -> thumb.setImageBitmap(b));
                } catch (IOException ignored) {
                    // miniature facultative
                }
            });
        }
    }

    private Preset selectedPreset() {
        View v = presetGroup.findViewById(presetGroup.getCheckedRadioButtonId());
        return v == null ? null : (Preset) v.getTag();
    }

    private void download() {
        UrlValidator.Result check = UrlValidator.validate(urlField.getText().toString());
        if (!check.ok) {
            status.setText(check.reason);
            return;
        }
        if (check.url.equals(analyzedUrl) && analyzedDrm) {
            status.setText(Drm.MESSAGE);
            return;
        }
        if (Build.VERSION.SDK_INT < 29 && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] {Manifest.permission.WRITE_EXTERNAL_STORAGE}, 1);
            return;
        }
        Preset preset = selectedPreset();
        cancelled = false;
        setBusy(true, true);
        progress.setIndeterminate(true);
        status.setText("Démarrage…");
        File work = new File(getCacheDir(), "work/" + System.currentTimeMillis());
        worker.execute(() -> {
            String done;
            try {
                engine.ensureInstalled();
                work.mkdirs();
                List<String> args = ArgsBuilder.download(check.url, preset, work.getAbsolutePath(), engine.ffmpegDir(), engine.proxyUrl());
                final String[] finalPath = {null};
                Engine.Result r = runTracked(args, line -> {
                    String f = ProgressParser.parseFile(line);
                    if (f != null) finalPath[0] = f;
                    ProgressParser.Progress p = ProgressParser.parse(line);
                    if (p != null) main.post(() -> showProgress(p));
                }, new Process[1]);
                if (cancelled) {
                    done = "Téléchargement annulé.";
                } else if (r.exitCode != 0 || finalPath[0] == null) {
                    done = friendlyError(r);
                } else {
                    main.post(() -> {
                        progress.setIndeterminate(true);
                        status.setText("Enregistrement dans Téléchargements…");
                    });
                    File f = new File(finalPath[0]);
                    String root = work.getCanonicalPath() + File.separator;
                    if (!f.getCanonicalPath().startsWith(root)) throw new IOException("Chemin de sortie inattendu.");
                    Uri uri = Saver.save(this, f);
                    history.add(f.getName(), uri.toString(), fr.kayzen.flux.core.MimeTypes.forFile(f.getName()), f.length());
                    done = "Enregistré : " + f.getName();
                }
            } catch (IOException | InterruptedException | IllegalArgumentException e) {
                done = cancelled ? "Téléchargement annulé." : "Échec : " + e.getMessage();
            } finally {
                Engine.deleteTree(work);
            }
            String m = done;
            main.post(() -> {
                setBusy(false, false);
                progress.setIndeterminate(false);
                status.setText(m);
                refreshFiles();
            });
        });
    }

    private void showProgress(ProgressParser.Progress p) {
        double f = p.fraction();
        if (f >= 0) {
            progress.setIndeterminate(false);
            progress.setProgress((int) (f * 1000));
        } else {
            progress.setIndeterminate(true);
        }
        StringBuilder sb = new StringBuilder();
        if ("finished".equals(p.status)) {
            sb.append("Conversion et finalisation…");
            progress.setIndeterminate(true);
        } else {
            sb.append(f >= 0 ? Math.round(f * 100) + " % · " : "")
              .append(ProgressParser.formatBytes(p.downloaded));
            if (p.total > 0) sb.append(" / ").append(ProgressParser.formatBytes(p.total));
            if (p.speed > 0) sb.append(" · ").append(ProgressParser.formatBytes((long) p.speed)).append("/s");
            if (p.eta >= 0) sb.append(" · reste ").append(ProgressParser.formatDuration(p.eta));
        }
        status.setText(sb.toString());
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        if (code == 1 && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) download();
        else if (code == 1) status.setText("Autorisation de stockage nécessaire pour enregistrer dans Téléchargements.");
    }

    private void refreshFiles() {
        filesList.removeAllViews();
        JSONArray items = history.all();
        if (items.length() == 0) {
            filesList.addView(ui.label("Aucun fichier pour l’instant.", 13, false, ui.muted));
            return;
        }
        DateFormat df = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT);
        for (int i = 0; i < items.length(); i++) {
            JSONObject o = items.optJSONObject(i);
            if (o == null) continue;
            LinearLayout rowView = new LinearLayout(this);
            rowView.setOrientation(LinearLayout.VERTICAL);
            rowView.setPadding(ui.dp(10), ui.dp(10), ui.dp(10), ui.dp(10));
            rowView.setBackground(ui.rounded(ui.bg, 0, 10));
            TextView name = ui.label(o.optString("name"), 14, true, ui.text);
            name.setMaxLines(2);
            rowView.addView(name);
            rowView.addView(ui.label(ProgressParser.formatBytes(o.optLong("size", -1)) + " · "
                + df.format(new Date(o.optLong("time"))), 12, false, ui.muted));
            String uri = o.optString("uri");
            String mime = o.optString("mime");
            rowView.setOnClickListener(v -> open(uri, mime));
            filesList.addView(rowView, ui.block(i == 0 ? 0 : 8));
        }
    }

    private void open(String uri, String mime) {
        Intent view = new Intent(Intent.ACTION_VIEW);
        view.setDataAndType(Uri.parse(uri), mime);
        view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(Intent.createChooser(view, "Ouvrir avec"));
        } catch (RuntimeException e) {
            new AlertDialog.Builder(this).setMessage("Aucune application ne peut ouvrir ce fichier, ou il a été supprimé.")
                .setPositiveButton("OK", null).show();
        }
    }

    @Override
    protected void onDestroy() {
        Process p = running;
        if (p != null && isFinishing()) p.destroy();
        super.onDestroy();
    }
}
