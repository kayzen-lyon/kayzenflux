/**
 * Configuration du site — liens de téléchargement.
 * Tout élément portant data-link="groupe.cle" reçoit l'URL correspondante.
 * Tant qu'un lien contient « A_CONFIGURER » (ou est absent), le bouton s'affiche « Bientôt disponible ».
 */
// Servi en HTTPS par le site (réécriture Vercel vers l'espace web IONOS, voir vercel.json).
const DOWNLOAD_BASE = 'https://flux.kayzen-lyon.com/telechargements/';

window.KAYZEN_FLUX = {
  // Fichiers publiés sur telechargements.kayzen-lyon.com (version 1.0.0).
  // macOS : pas encore de version publiée, la page affiche « Bientôt disponible » sans lien.
  downloads: {
    windows: DOWNLOAD_BASE + 'kayzen-flux-1.0.0-win-x64.exe',
    linuxAppImage: DOWNLOAD_BASE + 'kayzen-flux-1.0.0-linux-x86_64.AppImage',
    linuxDeb: DOWNLOAD_BASE + 'kayzen-flux-1.0.0-linux-amd64.deb',
    android: DOWNLOAD_BASE + 'kayzen-flux-1.0.0-android.apk',
    chromium: DOWNLOAD_BASE + 'kayzen-flux-extension-chromium-1.0.0.zip',
    firefox: DOWNLOAD_BASE + 'kayzen-flux-extension-firefox-1.0.0.zip',
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const cfg = window.KAYZEN_FLUX;
  document.querySelectorAll('[data-link]').forEach((a) => {
    const [group, key] = a.dataset.link.split('.');
    const href = cfg[group] && cfg[group][key];
    if (!href || href.includes('A_CONFIGURER')) {
      a.setAttribute('aria-disabled', 'true');
      a.removeAttribute('href');
      a.textContent = 'Bientôt disponible';
    } else {
      a.href = href;
    }
  });
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
});
