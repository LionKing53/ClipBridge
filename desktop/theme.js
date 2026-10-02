// Apply the saved preference before the first paint, even when the service is offline.
(() => {
  const key = 'panokopru-theme';
  let theme = 'dark';
  try { if (localStorage.getItem(key) === 'light') theme = 'light'; } catch {}
  function apply(value) {
    theme = value === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(key, theme); } catch {}
    const select = document.querySelector('#theme-select');
    if (select) select.value = theme;
    const toggle = document.querySelector('#theme-toggle');
    if (toggle) {
      const label = theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç';
      toggle.title = label; toggle.setAttribute('aria-label', label);
      toggle.innerHTML = theme === 'dark'
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/></svg>';
    }
    window.chrome?.webview?.postMessage('theme:' + theme);
  }
  apply(theme);
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#settings-page .settings-grid').prepend(document.querySelector('#theme-settings').content.cloneNode(true));
    document.querySelector('#theme-select').addEventListener('change', event => apply(event.target.value));
    const toggle = document.createElement('button'); toggle.id = 'theme-toggle'; toggle.className = 'icon-button';
    toggle.addEventListener('click', () => apply(theme === 'dark' ? 'light' : 'dark'));
    document.querySelector('.header-right').insertBefore(toggle, document.querySelector('#refresh'));
    apply(theme);
  });
})();
