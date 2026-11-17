/*
 * Applique le thème et les réglages d'accessibilité AVANT le premier rendu
 * (chargé de façon synchrone dans <head>) pour éviter un flash de thème.
 * Repris de la logique du site kayzen-lyon.com (script inline d'index.html),
 * déplacé dans un fichier pour respecter la CSP « script-src 'self' ».
 * Clés et classes partagées avec assets/site.js : garder les deux alignés.
 */
(function () {
  var root = document.documentElement;
  var theme = null;
  try {
    var saved = localStorage.getItem('kayzen-flux-theme');
    if (saved === 'dark' || saved === 'light') theme = saved;
  } catch (e) { /* stockage indisponible (navigation privée) */ }
  if (!theme) {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.classList.add(theme === 'dark' ? 'dark' : 'light');

  try {
    var a11y = JSON.parse(localStorage.getItem('kayzen-flux-a11y') || 'null');
    if (a11y && typeof a11y === 'object') {
      if (a11y.fontSize === 1 || a11y.fontSize === 2) root.classList.add('a11y-text-' + a11y.fontSize);
      if (a11y.highContrast === true) root.classList.add('high-contrast');
      if (a11y.reduceMotion === true) root.classList.add('reduce-motion');
      if (a11y.readableFont === true) root.classList.add('readable-font');
    }
  } catch (e) { /* réglages illisibles : valeurs par défaut */ }
})();
