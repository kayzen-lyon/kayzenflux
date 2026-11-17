/*
 * KAYZEN Flux — interactions du site vitrine, en JavaScript natif.
 * Réécriture des composants React du site kayzen-lyon.com
 * (ThemeProvider, ScrollToTop, AccessibilityToggle) pour une page statique
 * sous CSP stricte : aucun style inline, aucun appel réseau, aucune mesure
 * d'audience. Les préférences restent dans le localStorage du visiteur.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'kayzen-flux-theme';
  var A11Y_KEY = 'kayzen-flux-a11y';
  /* Couleur de la barre du navigateur pour chaque thème (fond de page). */
  var THEME_COLOR = { light: '#ffffff', dark: '#0d1621' };
  var reducedMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* le choix vaut pour la session */ }
  }

  function prefersReducedMotion() {
    return root.classList.contains('reduce-motion') || (reducedMotionQuery !== null && reducedMotionQuery.matches);
  }

  /* ---------- Thème clair / sombre ---------- */
  function currentTheme() {
    return root.classList.contains('dark') ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var dark = theme === 'dark';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.setAttribute('aria-label', dark ? 'Passer au thème clair' : 'Passer au thème sombre');
    });
  }

  function initTheme() {
    applyTheme(currentTheme());
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = currentTheme() === 'dark' ? 'light' : 'dark';
        if (!prefersReducedMotion()) {
          root.classList.add('theme-transition');
          window.setTimeout(function () { root.classList.remove('theme-transition'); }, 400);
        }
        applyTheme(next);
        store(THEME_KEY, next); // seul un choix explicite est mémorisé
      });
    });
    /* Sans choix mémorisé, on suit le réglage du système s'il change. */
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        var saved = null;
        try { saved = localStorage.getItem(THEME_KEY); } catch (err) { saved = null; }
        if (saved !== 'dark' && saved !== 'light') applyTheme(e.matches ? 'dark' : 'light');
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
  }

  /* ---------- Retour en haut + anneau de progression ---------- */
  function initScrollTop() {
    var btn = document.querySelector('[data-scroll-top]');
    if (!btn) return;
    var ring = btn.querySelector('[data-scroll-ring]');
    var circumference = ring ? 2 * Math.PI * Number(ring.getAttribute('r')) : 0;
    if (ring) {
      ring.setAttribute('stroke-dasharray', circumference.toFixed(2));
      ring.setAttribute('stroke-dashoffset', circumference.toFixed(2));
    }
    var ticking = false;
    var update = function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      /* Attribut de présentation SVG (pas un style inline) : compatible CSP. */
      if (ring) ring.setAttribute('stroke-dashoffset', (circumference * (1 - progress)).toFixed(2));
      var visible = window.scrollY > 600;
      btn.classList.toggle('is-visible', visible);
      btn.tabIndex = visible ? 0 : -1;
      btn.setAttribute('aria-hidden', visible ? 'false' : 'true');
    };
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      /* Le focus revient en tête de contenu, sinon la tabulation reprend au milieu de la page. */
      var main = document.getElementById('contenu');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    });
  }

  /* ---------- Menu d'accessibilité ---------- */
  var DEFAULTS = { fontSize: 0, highContrast: false, reduceMotion: false, readableFont: false };
  var SIZE_LABELS = ['Normal', 'Grand', 'Très grand'];

  function readA11y() {
    var s = { fontSize: 0, highContrast: false, reduceMotion: false, readableFont: false };
    try {
      var parsed = JSON.parse(localStorage.getItem(A11Y_KEY) || 'null');
      if (parsed && typeof parsed === 'object') {
        if (parsed.fontSize === 1 || parsed.fontSize === 2) s.fontSize = parsed.fontSize;
        s.highContrast = parsed.highContrast === true;
        s.reduceMotion = parsed.reduceMotion === true;
        s.readableFont = parsed.readableFont === true;
      }
    } catch (e) { /* valeurs par défaut */ }
    return s;
  }

  function initA11y() {
    var wrap = document.querySelector('[data-a11y]');
    if (!wrap) return;
    var toggle = wrap.querySelector('[data-a11y-toggle]');
    var panel = wrap.querySelector('[data-a11y-panel]');
    var sizeOut = wrap.querySelector('[data-a11y-size]');
    var dec = wrap.querySelector('[data-a11y-dec]');
    var inc = wrap.querySelector('[data-a11y-inc]');
    var reset = wrap.querySelector('[data-a11y-reset]');
    var switches = wrap.querySelectorAll('[data-a11y-option]');
    var settings = readA11y();
    var CLASSES = { highContrast: 'high-contrast', reduceMotion: 'reduce-motion', readableFont: 'readable-font' };

    var apply = function () {
      root.classList.toggle('a11y-text-1', settings.fontSize === 1);
      root.classList.toggle('a11y-text-2', settings.fontSize === 2);
      Object.keys(CLASSES).forEach(function (k) { root.classList.toggle(CLASSES[k], settings[k] === true); });
      if (sizeOut) sizeOut.textContent = SIZE_LABELS[settings.fontSize];
      if (dec) dec.disabled = settings.fontSize === 0;
      if (inc) inc.disabled = settings.fontSize === 2;
      switches.forEach(function (b) {
        b.setAttribute('aria-pressed', settings[b.getAttribute('data-a11y-option')] ? 'true' : 'false');
      });
      store(A11Y_KEY, JSON.stringify(settings));
    };

    var setOpen = function (open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    toggle.addEventListener('click', function () { setOpen(panel.hidden); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('mousedown', function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) setOpen(false);
    });
    if (dec) dec.addEventListener('click', function () { settings.fontSize = Math.max(0, settings.fontSize - 1); apply(); });
    if (inc) inc.addEventListener('click', function () { settings.fontSize = Math.min(2, settings.fontSize + 1); apply(); });
    switches.forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-a11y-option');
        settings[key] = !settings[key];
        apply();
      });
    });
    if (reset) reset.addEventListener('click', function () {
      settings = { fontSize: DEFAULTS.fontSize, highContrast: false, reduceMotion: false, readableFont: false };
      apply();
    });
    apply();
  }

  function init() {
    initTheme();
    initScrollTop();
    initA11y();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
