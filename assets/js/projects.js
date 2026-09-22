(() => {
  'use strict';
  const rows = [...document.querySelectorAll('[data-project-row]')];
  const preview = document.getElementById('catalog-preview');
  const search = document.getElementById('catalog-search');
  const tag = document.getElementById('catalog-tag');
  const empty = document.querySelector('.catalog-empty');
  let selected;
  function select(row) {
    if (!row || row === selected) return;
    selected = row;
    rows.forEach(item => item.classList.toggle('is-selected', item === row));
    preview.replaceChildren(row.querySelector('template').content.cloneNode(true));
  }
  function filter(updateURL = true) {
    const query = search.value.trim().toLowerCase();
    rows.forEach(row => {
      row.hidden = !(row.dataset.search.includes(query) && (tag.value === 'all' || row.dataset.tags.split(/\s+/).includes(tag.value)));
    });
    const visible = rows.filter(row => !row.hidden);
    document.getElementById('catalog-count').textContent = `${visible.length} project${visible.length === 1 ? '' : 's'}`;
    empty.hidden = visible.length > 0;
    preview.hidden = !visible.length;
    if (!visible.includes(selected)) select(visible[0]);
    if (updateURL) {
      const url = new URL(location.href);
      tag.value === 'all' ? url.searchParams.delete('tag') : url.searchParams.set('tag', tag.value);
      query ? url.searchParams.set('q', search.value.trim()) : url.searchParams.delete('q');
      history.replaceState(null, '', url);
    }
  }
  function restore() {
    const params = new URL(location.href).searchParams;
    tag.value = [...tag.options].some(option => option.value === params.get('tag')) ? params.get('tag') : 'all';
    search.value = params.get('q') || '';
    filter(false);
  }
  rows.forEach(row => {
    row.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') select(row); });
    row.addEventListener('focusin', () => select(row));
  });
  search.addEventListener('input', () => filter());
  tag.addEventListener('change', () => filter());
  document.getElementById('catalog-reset').addEventListener('click', () => {
    search.value = ''; tag.value = 'all'; filter(); search.focus();
  });
  window.addEventListener('popstate', restore);
  restore();
})();
