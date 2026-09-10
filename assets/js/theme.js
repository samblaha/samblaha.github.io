(function () {
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;

  const savedTheme = localStorage.getItem('theme');
  const theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';

  function syncThemeColor(next) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'light' ? '#ebe2c8' : '#07080a');
  }

  function syncSwitch(next) {
    if (!themeToggle) return;
    const day = next === 'light';
    themeToggle.setAttribute('aria-checked', day ? 'true' : 'false');
    themeToggle.setAttribute(
      'aria-label',
      day ? 'Shop lights on. Switch to night.' : 'Shop lights off. Switch to day.'
    );
  }

  html.setAttribute('data-theme', theme);
  syncThemeColor(theme);
  syncSwitch(theme);

  function syncGiscus(next) {
    const frame = document.querySelector('iframe.giscus-frame');
    if (!frame || !frame.contentWindow) return;
    const giscusTheme = next === 'light' ? 'light' : 'transparent_dark';
    frame.contentWindow.postMessage({ giscus: { setConfig: { theme: giscusTheme } } }, 'https://giscus.app');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      syncThemeColor(newTheme);
      syncSwitch(newTheme);
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
      syncGiscus(newTheme);
    });
  }

  window.addEventListener('load', function () {
    const current = html.getAttribute('data-theme');
    let n = 0;
    const t = window.setInterval(function () {
      n += 1;
      const frame = document.querySelector('iframe.giscus-frame');
      if (frame || n > 16) {
        if (frame) syncGiscus(current);
        window.clearInterval(t);
      }
    }, 500);
  });
})();
