/*
 * KAYZEN Flux — APERÇU « site immersif » : mur du premier écran et scène fixe.
 * JavaScript natif, compatible avec la CSP du site : aucun style inline,
 * aucun appel réseau autre que les images locales, défilement natif (la
 * molette n'est jamais interceptée). Les animations sont en CSS : elles
 * s'arrêtent seules avec « réduire les animations ».
 */
(function () {
  'use strict';

  /* ---------- Mur en perspective : monté après le premier affichage ---------- */
  var WALL = ['convertisseur', 'bibliotheque', 'abonnements']; // vraies captures de l'application (480 px)
  var COLUMNS = 5;
  var ROWS = 8;

  function buildWall(host) {
    var stage = document.createElement('div');
    stage.className = 'im-wall-stage';
    var grid = document.createElement('div');
    grid.className = 'im-wall-grid';
    for (var c = 0; c < COLUMNS; c++) {
      var col = document.createElement('div');
      col.className = 'im-wall-col';
      for (var r = 0; r < ROWS; r++) {
        var img = document.createElement('img');
        img.src = '/apercu/wall/' + WALL[(c * 2 + r) % WALL.length] + '.webp';
        img.alt = '';
        img.width = 480;
        img.height = 300;
        img.decoding = 'async';
        col.appendChild(img);
      }
      grid.appendChild(col);
    }
    stage.appendChild(grid);
    host.appendChild(stage);
    /* Classe posée après l'insertion pour que le fondu d'apparition se joue. */
    window.setTimeout(function () { stage.classList.add('is-ready'); }, 60);
  }

  function initWall() {
    var host = document.querySelector('[data-wall]');
    if (!host) return;
    var idle = window.requestIdleCallback || function (cb) { return window.setTimeout(cb, 200); };
    idle(function () { buildWall(host); }, { timeout: 1500 });
  }

  /* ---------- Scène fixe : l'écran affiché suit l'élément le plus proche du milieu ---------- */
  function initScene() {
    var scene = document.querySelector('[data-scene]');
    if (!scene) return;
    var items = Array.prototype.slice.call(scene.querySelectorAll('[data-scene-item]'));
    var images = scene.querySelectorAll('[data-scene-img]');
    var num = scene.querySelector('[data-scene-num]');
    var label = scene.querySelector('[data-scene-label]');
    var current = null;

    function activate(item) {
      if (item === current) return;
      current = item;
      var key = item.getAttribute('data-scene-item');
      items.forEach(function (el) { el.classList.toggle('is-on', el === item); });
      images.forEach(function (img) { img.classList.toggle('is-on', img.getAttribute('data-scene-img') === key); });
      if (num) num.textContent = String(items.indexOf(item) + 1).padStart(2, '0');
      if (label) label.textContent = item.getAttribute('data-scene-name');
    }

    var frame = 0;
    function measure() {
      frame = 0;
      var bounds = scene.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      var mid = window.innerHeight * 0.5;
      var best = null;
      var bestDistance = Infinity;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDistance) { bestDistance = d; best = el; }
      });
      if (best) activate(best);
    }
    function onScroll() { if (!frame) frame = window.requestAnimationFrame(measure); }

    items.forEach(function (el) {
      el.addEventListener('mouseenter', function () { activate(el); });
      el.addEventListener('focusin', function () { activate(el); });
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    measure();
  }

  function init() {
    initWall();
    initScene();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
