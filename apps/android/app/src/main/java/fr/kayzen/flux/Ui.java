package fr.kayzen.flux;

import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Palette et composants KAYZEN (orange brûlé, marine, crème ; mode sombre). */
final class Ui {
    static final int ORANGE = Color.parseColor("#B5451B");
    static final int NAVY = Color.parseColor("#14213D");
    static final int CREAM = Color.parseColor("#F6EFE4");

    final Context ctx;
    final boolean dark;
    final int bg;
    final int card;
    final int text;
    final int muted;
    final int border;

    Ui(Context ctx) {
        this.ctx = ctx;
        int mode = ctx.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        dark = mode == Configuration.UI_MODE_NIGHT_YES;
        bg = dark ? Color.parseColor("#0B1526") : CREAM;
        card = dark ? Color.parseColor("#14213D") : Color.WHITE;
        text = dark ? CREAM : NAVY;
        muted = dark ? Color.parseColor("#B8B2A7") : Color.parseColor("#5B6475");
        border = dark ? Color.parseColor("#26375A") : Color.parseColor("#E6DCCB");
    }

    int dp(float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, ctx.getResources().getDisplayMetrics()));
    }

    GradientDrawable rounded(int color, int strokeColor, float radiusDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radiusDp));
        if (strokeColor != 0) d.setStroke(dp(1), strokeColor);
        return d;
    }

    LinearLayout card() {
        LinearLayout l = new LinearLayout(ctx);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setBackground(rounded(card, border, 18));
        l.setPadding(dp(16), dp(16), dp(16), dp(16));
        l.setElevation(dp(1));
        return l;
    }

    LinearLayout.LayoutParams block(int topDp) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(topDp);
        return lp;
    }

    TextView label(String s, float sp, boolean bold, int color) {
        TextView t = new TextView(ctx);
        t.setText(s);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        return t;
    }

    Button primary(String s) {
        Button b = new Button(ctx);
        b.setText(s);
        b.setAllCaps(false);
        b.setTextColor(Color.WHITE);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        b.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        b.setBackground(rounded(ORANGE, 0, 14));
        b.setStateListAnimator(null);
        b.setMinHeight(dp(50));
        return b;
    }

    Button secondary(String s) {
        Button b = new Button(ctx);
        b.setText(s);
        b.setAllCaps(false);
        b.setTextColor(text);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        b.setBackground(rounded(0x00000000, border, 14));
        b.setStateListAnimator(null);
        b.setMinHeight(dp(44));
        b.setGravity(Gravity.CENTER);
        return b;
    }
}
