package fr.kayzen.flux;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/** Écran « À propos » : version, licence, code source, composants tiers. */
public class AboutActivity extends Activity {
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Ui ui = new Ui(this);
        getWindow().setStatusBarColor(ui.bg);
        getWindow().setNavigationBarColor(ui.bg);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(ui.bg);
        scroll.setFitsSystemWindows(true);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(ui.dp(18), ui.dp(18), ui.dp(18), ui.dp(28));
        scroll.addView(root);

        root.addView(ui.label("À propos", 24, true, ui.text));
        LinearLayout card = ui.card();
        card.addView(ui.label("KAYZEN Flux pour Android", 16, true, ui.text));
        card.addView(ui.label("Version " + BuildInfo.VERSION_NAME + " (" + BuildInfo.VERSION_CODE + ")", 14, false, ui.muted), ui.block(4));
        card.addView(ui.label("Logiciel libre et gratuit, publié sous licence MIT par KAYZEN (Lyon). "
            + "Téléchargement et conversion entièrement réalisés sur votre téléphone : aucun serveur KAYZEN, "
            + "aucune télémétrie. Les contenus protégés par DRM sont refusés.", 14, false, ui.text), ui.block(10));
        Button source = ui.primary("Code source sur GitHub");
        source.setOnClickListener(v -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BuildInfo.SOURCE_URL)));
            } catch (RuntimeException ignored) {
                // aucun navigateur
            }
        });
        card.addView(source, ui.block(14));
        TextView link = ui.label(BuildInfo.SOURCE_URL, 12, false, ui.muted);
        card.addView(link, ui.block(6));
        root.addView(card, ui.block(14));

        LinearLayout lic = ui.card();
        lic.addView(ui.label("Composants tiers et licences", 16, true, ui.text));
        TextView body = ui.label(readAsset("licenses/NOTICE.txt"), 12, false, ui.text);
        body.setTextIsSelectable(true);
        lic.addView(body, ui.block(8));
        root.addView(lic, ui.block(14));
        setContentView(scroll);
    }

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name)) {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
            return new String(bos.toByteArray(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "Voir THIRD_PARTY_LICENSES.md dans le dépôt.";
        }
    }
}
