package fr.kayzen.flux;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Liste locale des fichiers récupérés (stockée uniquement sur le téléphone). */
final class History {
    private static final int MAX = 50;
    private final SharedPreferences prefs;

    History(Context ctx) {
        prefs = ctx.getSharedPreferences("history", Context.MODE_PRIVATE);
    }

    JSONArray all() {
        try {
            return new JSONArray(prefs.getString("items", "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    void add(String name, String uri, String mime, long size) {
        JSONArray old = all();
        JSONArray next = new JSONArray();
        try {
            JSONObject o = new JSONObject();
            o.put("name", name);
            o.put("uri", uri);
            o.put("mime", mime);
            o.put("size", size);
            o.put("time", System.currentTimeMillis());
            next.put(o);
            for (int i = 0; i < old.length() && next.length() < MAX; i++) next.put(old.get(i));
        } catch (JSONException ignored) {
            return;
        }
        prefs.edit().putString("items", next.toString()).apply();
    }

    void clear() {
        prefs.edit().remove("items").apply();
    }
}
