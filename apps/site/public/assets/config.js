/**
 * Configuration du site — à compléter avant la mise en ligne.
 * Tant qu'un lien contient « A_CONFIGURER », le bouton correspondant s'affiche « Bientôt disponible ».
 */
window.KAYZEN_FLUX = {
  // Liens de paiement Stripe (Dashboard Stripe > Liens de paiement). Ajouter ?client_reference_id=flux
  payment: {
    monthly: 'https://buy.stripe.com/A_CONFIGURER_mensuel',
    yearly: 'https://buy.stripe.com/A_CONFIGURER_annuel',
    lifetime: 'https://buy.stripe.com/A_CONFIGURER_a_vie',
  },
  // Installeurs (page « Releases » du dépôt GitHub, une fois la version publiée).
  downloads: {
    windows: 'https://github.com/kayzen-lyon/kayzen-flux/releases/latest/download/A_CONFIGURER.exe',
    mac: 'https://github.com/kayzen-lyon/kayzen-flux/releases/latest/download/A_CONFIGURER.dmg',
    linux: 'https://github.com/kayzen-lyon/kayzen-flux/releases/latest/download/A_CONFIGURER.AppImage',
    chrome: 'https://chromewebstore.google.com/detail/A_CONFIGURER',
    firefox: 'https://addons.mozilla.org/firefox/addon/A_CONFIGURER',
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
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
});
