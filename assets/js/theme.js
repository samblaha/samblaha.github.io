(function () {
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;

  const savedTheme = localStorage.getItem('theme');
  const theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
  html.setAttribute('data-theme', theme);

  function syncGiscus(next) {
    const frame = document.querySelector('iframe.giscus-frame');
    if (!frame || !frame.contentWindow) return;
    const giscusTheme = next === 'light' ? 'light' : 'transparent_dark';
    frame.contentWindow.postMessage({ giscus: { setConfig: { theme: giscusTheme } } }, 'https://giscus.app');
  }

  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    themeToggle.addEventListener('click', () => {
      const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeToggle.setAttribute('aria-pressed', newTheme === 'light' ? 'true' : 'false');
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
