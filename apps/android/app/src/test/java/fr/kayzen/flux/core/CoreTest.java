package fr.kayzen.flux.core;

import static org.junit.Assert.*;

import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class CoreTest {
    @Test public void acceptsHttpsUrl() {
        UrlValidator.Result r = UrlValidator.validate("  https://exemple.fr/video?id=1 ");
        assertTrue(r.ok);
        assertEquals("https://exemple.fr/video?id=1", r.url);
        assertEquals("exemple.fr", r.host);
    }

    @Test public void refusesBadUrls() {
        assertFalse(UrlValidator.validate("").ok);
        assertFalse(UrlValidator.validate("-o /tmp/x").ok);
        assertFalse(UrlValidator.validate("ftp://exemple.fr/a").ok);
        assertFalse(UrlValidator.validate("file:///etc/passwd").ok);
        assertFalse(UrlValidator.validate("https://user:pw@exemple.fr/").ok);
        assertFalse(UrlValidator.validate("http://127.0.0.1:8080/").ok);
        assertFalse(UrlValidator.validate("http://192.168.1.10/").ok);
        assertFalse(UrlValidator.validate("http://localhost/").ok);
        assertFalse(UrlValidator.validate("pas un lien").ok);
        StringBuilder sb = new StringBuilder("https://exemple.fr/");
        while (sb.length() <= UrlValidator.MAX_URL_LENGTH) sb.append('a');
        assertEquals("Lien trop long.", UrlValidator.validate(sb.toString()).reason);
    }

    @Test public void privateHostPatterns() {
        assertTrue(UrlValidator.isPrivateHost("172.16.0.1"));
        assertTrue(UrlValidator.isPrivateHost("[::1]"));
        assertFalse(UrlValidator.isPrivateHost("172.32.0.1"));
        assertFalse(UrlValidator.isPrivateHost("exemple.fr"));
    }

    @Test public void extractsSharedUrl() {
        assertEquals("https://exemple.fr/v/abc", UrlValidator.extractFirstUrl("Regarde ça : https://exemple.fr/v/abc."));
        assertNull(UrlValidator.extractFirstUrl("aucun lien ici"));
        assertNull(UrlValidator.extractFirstUrl(null));
    }

    @Test public void infoArgsPlaceUrlAfterDoubleDash() {
        List<String> a = ArgsBuilder.info("https://exemple.fr/v", "http://kz:t@127.0.0.1:1234");
        assertEquals("--", a.get(a.size() - 2));
        assertEquals("https://exemple.fr/v", a.get(a.size() - 1));
        assertTrue(a.contains("--ignore-config"));
        assertTrue(a.contains("-J"));
        assertEquals("http://kz:t@127.0.0.1:1234", a.get(a.indexOf("--proxy") + 1));
    }

    @Test(expected = ArgsBuilder.ArgsException.class)
    public void infoArgsRejectInvalidUrl() {
        ArgsBuilder.info("--exec rm", null);
    }

    @Test public void downloadArgsForEveryPreset() {
        for (Preset p : Preset.values()) {
            List<String> a = ArgsBuilder.download("https://exemple.fr/v", p, "/data/w", "/data/bin", null);
            assertTrue(a.contains("--ignore-config"));
            assertTrue(a.contains("--no-playlist"));
            assertTrue(a.containsAll(p.args()));
            assertEquals("/data/bin", a.get(a.indexOf("--ffmpeg-location") + 1));
            assertEquals("/data/w", a.get(a.indexOf("-P") + 1));
            assertEquals("--", a.get(a.size() - 2));
            assertFalse(a.contains("--proxy"));
        }
    }

    @Test(expected = ArgsBuilder.ArgsException.class)
    public void downloadArgsRejectDashOutputDir() {
        ArgsBuilder.download("https://exemple.fr/v", Preset.M4A, "-x", null, null);
    }

    @Test(expected = ArgsBuilder.ArgsException.class)
    public void downloadArgsRequirePreset() {
        ArgsBuilder.download("https://exemple.fr/v", null, "/w", null, null);
    }

    @Test public void presetsMatchOffer() {
        assertEquals(7, Preset.values().length);
        assertEquals(Preset.MP3_192, Preset.fromId("mp3-192"));
        assertNull(Preset.fromId("inconnu"));
        assertTrue(Preset.MP3_192.args().contains("192K"));
        assertTrue(Preset.MP4_720.args().contains("bv*[height<=?720]+ba/b[height<=?720]"));
        assertTrue(Preset.MP4_1080.args().contains("bv*[height<=?1080]+ba/b[height<=?1080]"));
        assertTrue(Preset.FLAC.audio);
        assertFalse(Preset.BEST.audio);
        // Honnêteté : jamais « sans perte » pour un FLAC issu d'une source compressée.
        for (Preset p : Preset.values()) {
            assertFalse(p.label.toLowerCase().contains("sans perte"));
            assertFalse(p.hint.toLowerCase().contains("sans perte"));
        }
    }

    @Test public void parsesProgress() {
        ProgressParser.Progress p = ProgressParser.parse("KZP|downloading|512|1024|NA|2048.5|3");
        assertNotNull(p);
        assertEquals("downloading", p.status);
        assertEquals(0.5, p.fraction(), 1e-9);
        assertEquals(3, p.eta);
        ProgressParser.Progress est = ProgressParser.parse("KZP|downloading|10|NA|40.0|NA|NA");
        assertEquals(40, est.total);
        assertEquals(-1, ProgressParser.parse("KZP|downloading|10|NA|NA|NA|NA").fraction(), 0);
        assertNull(ProgressParser.parse("[download] 10%"));
        assertNull(ProgressParser.parse("KZP|bad"));
        assertEquals("/w/a.mp3", ProgressParser.parseFile("KZF|/w/a.mp3"));
        assertNull(ProgressParser.parseFile("KZF|  "));
    }

    @Test public void formats() {
        assertEquals("3:05", ProgressParser.formatDuration(185));
        assertEquals("1:00:01", ProgressParser.formatDuration(3601));
        assertEquals("512 o", ProgressParser.formatBytes(512));
        assertEquals("1,5 Mo", ProgressParser.formatBytes(1572864));
    }

    @Test public void detectsDrm() {
        assertTrue(Drm.detect(Boolean.TRUE, null));
        assertTrue(Drm.detect(null, Arrays.<Object>asList(Boolean.TRUE, "maybe")));
        assertFalse(Drm.detect(null, Arrays.<Object>asList(Boolean.TRUE, Boolean.FALSE)));
        assertFalse(Drm.detect(Boolean.FALSE, Arrays.<Object>asList()));
        assertTrue(Drm.isDrmError("ERROR: This video is DRM protected"));
        assertTrue(Drm.isDrmError("Widevine license required"));
        assertFalse(Drm.isDrmError("HTTP Error 404"));
    }

    @Test public void readsChecksums() {
        String sums = "e51e  yt-dlp\n"
            + "e51e69e89489f199530f13d32a4342da3ddb2cf34842f364603a066db05afbf3  yt-dlp\n"
            + "1648beeb7b0c78b471654262697066c016783d33813659367a5c274828ba3240  yt-dlp_musllinux_aarch64.zip\n";
        assertEquals("e51e69e89489f199530f13d32a4342da3ddb2cf34842f364603a066db05afbf3", Checksums.find(sums, "yt-dlp"));
        assertNull(Checksums.find(sums, "absent"));
        assertEquals("00ff", Checksums.hex(new byte[] {0, (byte) 0xff}));
    }

    @Test public void mimeTypes() {
        assertEquals("audio/mpeg", MimeTypes.forFile("a.MP3"));
        assertEquals("video/mp4", MimeTypes.forFile("b.mp4"));
        assertEquals("video/x-matroska", MimeTypes.forFile("c.mkv"));
        assertEquals("application/octet-stream", MimeTypes.forFile("d.bin"));
    }
}
