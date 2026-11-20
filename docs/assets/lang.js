// Choix de la langue : #fr / #en dans l'URL, sinon choix mémorisé, sinon langue du navigateur.
(function () {
  var root = document.documentElement;
  function pick() {
    var hash = location.hash.replace('#', '');
    if (hash === 'fr' || hash === 'en') return hash;
    try {
      var saved = localStorage.getItem('psst-lang');
      if (saved === 'fr' || saved === 'en') return saved;
    } catch (e) {}
    return (navigator.language || 'en').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
  }
  function apply(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    var title = root.getAttribute('data-title-' + lang);
    if (title) document.title = title;
    var buttons = document.querySelectorAll('[data-set-lang]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-set-lang') === lang));
    }
  }
  apply(pick());
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-set-lang]');
    if (!b) return;
    var lang = b.getAttribute('data-set-lang');
    try {
      localStorage.setItem('psst-lang', lang);
    } catch (err) {}
    apply(lang);
  });
  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-lang'));
  });
})();
