package fr.kayzen.flux;

import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Relais HTTP local (127.0.0.1, sur le téléphone uniquement).
 *
 * Le moteur yt-dlp (lié à musl) ne sait pas résoudre les noms de domaine sur
 * Android (pas de /etc/resolv.conf). Il passe donc par ce relais, qui résout
 * les noms avec le système Android puis se contente de transmettre les octets
 * (tunnel CONNECT : le TLS reste de bout en bout). Accès protégé par un jeton
 * aléatoire ; rien n'est journalisé.
 */
final class LocalProxy {
    private final ServerSocket server;
    private final String token;
    private final ExecutorService pool = Executors.newCachedThreadPool();

    LocalProxy() throws IOException {
        server = new ServerSocket();
        server.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 0), 50);
        byte[] b = new byte[18];
        new SecureRandom().nextBytes(b);
        token = Base64.encodeToString(b, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        Thread t = new Thread(this::acceptLoop, "kz-proxy");
        t.setDaemon(true);
        t.start();
    }

    String url() {
        return "http://kz:" + token + "@127.0.0.1:" + server.getLocalPort();
    }

    private void acceptLoop() {
        while (!server.isClosed()) {
            try {
                Socket s = server.accept();
                pool.execute(() -> handle(s));
            } catch (IOException ignored) {
                // socket fermé
            }
        }
    }

    private static String readHead(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        int state = 0;
        while (buf.size() < 65536) {
            int c = in.read();
            if (c < 0) return null;
            buf.write(c);
            state = (c == '\r' && (state == 0 || state == 2)) ? state + 1 : (c == '\n' && (state == 1 || state == 3)) ? state + 1 : 0;
            if (state == 4) return new String(buf.toByteArray(), StandardCharsets.ISO_8859_1);
        }
        return null;
    }

    private void handle(Socket client) {
        try (Socket c = client) {
            c.setSoTimeout(120_000);
            InputStream in = c.getInputStream();
            OutputStream out = c.getOutputStream();
            String head = readHead(in);
            if (head == null) return;
            c.setSoTimeout(0);
            String[] lines = head.split("\r\n");
            String[] req = lines[0].split(" ");
            if (req.length < 3) return;
            String expected = "Basic " + Base64.encodeToString(("kz:" + token).getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
            boolean authorized = false;
            StringBuilder forwarded = new StringBuilder();
            for (int i = 1; i < lines.length; i++) {
                String l = lines[i];
                String lower = l.toLowerCase(Locale.ROOT);
                if (lower.startsWith("proxy-authorization:")) {
                    authorized = l.substring(l.indexOf(':') + 1).trim().equals(expected);
                } else if (!lower.startsWith("proxy-") && !l.isEmpty()) {
                    forwarded.append(l).append("\r\n");
                }
            }
            if (!authorized) {
                out.write("HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm=\"kz\"\r\nContent-Length: 0\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1));
                return;
            }
            String host;
            int port;
            String firstLine = null;
            if (req[0].equalsIgnoreCase("CONNECT")) {
                int colon = req[1].lastIndexOf(':');
                host = req[1].substring(0, colon).replace("[", "").replace("]", "");
                port = Integer.parseInt(req[1].substring(colon + 1));
            } else {
                java.net.URI u = java.net.URI.create(req[1]);
                host = u.getHost();
                port = u.getPort() > 0 ? u.getPort() : 80;
                String path = u.getRawPath() == null || u.getRawPath().isEmpty() ? "/" : u.getRawPath();
                if (u.getRawQuery() != null) path += "?" + u.getRawQuery();
                firstLine = req[0] + " " + path + " " + req[2] + "\r\n";
            }
            try (Socket upstream = new Socket()) {
                upstream.connect(new InetSocketAddress(host, port), 20_000);
                OutputStream up = upstream.getOutputStream();
                if (firstLine == null) {
                    out.write("HTTP/1.1 200 Connection established\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1));
                    out.flush();
                } else {
                    up.write((firstLine + forwarded + "\r\n").getBytes(StandardCharsets.ISO_8859_1));
                    up.flush();
                }
                pool.execute(() -> pipe(in, up, upstream));
                pipe(upstream.getInputStream(), out, c);
            } catch (IOException e) {
                out.write("HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1));
            }
        } catch (IOException | RuntimeException ignored) {
            // connexion interrompue
        }
    }

    private static void pipe(InputStream in, OutputStream out, Socket toClose) {
        byte[] buf = new byte[65536];
        try {
            int n;
            while ((n = in.read(buf)) >= 0) {
                out.write(buf, 0, n);
                out.flush();
            }
        } catch (IOException ignored) {
            // fin du flux
        } finally {
            try {
                toClose.shutdownOutput();
            } catch (IOException ignored) {
                // déjà fermé
            }
        }
    }
}
