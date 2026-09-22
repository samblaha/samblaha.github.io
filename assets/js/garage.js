(function () {
  'use strict';

  var root = document.querySelector('[data-garage]');
  if (!root) return;

  var projectPanel = document.querySelector('[data-project-panel]');
  var inventory = document.querySelector('[data-inventory]');
  var infoPanel = document.querySelector('[data-info-panel]');
  var dataNode = document.getElementById('garage-projects');
  var projectData = {};
  var lastTrigger = null;
  var projectRequest = null;
  var projectCache = new Map();
  var readerContent = projectPanel.querySelector('[data-project-content]');
  function stopProjectMedia() {
    projectPanel.querySelectorAll('video, audio').forEach(function (media) { media.pause(); });
  }
  function loadProjectPost(project) {
    if (projectRequest) projectRequest.abort();
    var request = new AbortController();
    projectRequest = request;
    readerContent.setAttribute('aria-busy', 'true');
    readerContent.innerHTML = '<p class="build-reader__notice" role="status">Opening the build journal…</p>';
    var pending = projectCache.has(project.url) ? Promise.resolve(projectCache.get(project.url)) :
      fetch(project.url, { signal: request.signal }).then(function (response) {
        if (!response.ok) throw new Error('Post unavailable');
        return response.text();
      });
    pending.then(function (html) {
      if (request.signal.aborted) return;
      var post = new DOMParser().parseFromString(html, 'text/html');
      var main = post.querySelector('.project__main');
      if (!main) throw new Error('Post content unavailable');
      projectCache.set(project.url, html);
      readerContent.replaceChildren();
      var hero = post.querySelector('.project__hero');
      if (hero) readerContent.appendChild(document.importNode(hero, true));
      readerContent.appendChild(document.importNode(main, true));
      // Import authored post content, never page scripts or standalone-page controls.
      readerContent.querySelectorAll('script, .copy-btn').forEach(function (node) { node.remove(); });
      readerContent.querySelectorAll('[data-lightbox]').forEach(function (image) { image.removeAttribute('data-lightbox'); });
      readerContent.querySelectorAll('video, audio').forEach(function (media) { media.removeAttribute('autoplay'); media.controls = true; });
      readerContent.setAttribute('aria-busy', 'false');
    }).catch(function (error) {
      if (request.signal.aborted) return;
      readerContent.setAttribute('aria-busy', 'false');
      readerContent.innerHTML = '<p class="build-reader__notice" role="status">The journal could not load. Try again or open the standalone post below.</p>';
      var retry = document.createElement('button');
      retry.type = 'button'; retry.textContent = 'Try again';
      retry.addEventListener('click', function () { loadProjectPost(project); });
      readerContent.appendChild(retry);
    });
  }

  try {
    var parsedProjects = JSON.parse(dataNode ? dataNode.textContent : '[]');
    if (Array.isArray(parsedProjects)) {
      parsedProjects.forEach(function (project) {
        if (project && project.id) projectData[project.id] = project;
      });
    }
  } catch (_error) {
    projectData = {};
  }

  function visiblePanels() {
    return [projectPanel, inventory, infoPanel].filter(function (panel) {
      return panel && !panel.hidden;
    });
  }

  function closePanel(panel, restoreFocus) {
    if (!panel || panel.hidden) return;
    if (panel === projectPanel) { stopProjectMedia(); if (projectRequest) projectRequest.abort(); }
    panel.hidden = true;
    if (!visiblePanels().length) document.body.classList.remove('garage-lock');
    root.inert = false;
    if (restoreFocus && lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  }

  function closeAll(restoreFocus) {
    stopProjectMedia();
    if (projectRequest) projectRequest.abort();
    [projectPanel, inventory, infoPanel].forEach(function (panel) {
      if (panel) panel.hidden = true;
    });
    document.body.classList.remove('garage-lock');
    root.inert = false;
    if (restoreFocus && lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  }

  function openPanel(panel, trigger) {
    closeAll(false);
    lastTrigger = trigger || document.activeElement;
    panel.hidden = false;
    root.inert = true;
    document.body.classList.add('garage-lock');
    window.requestAnimationFrame(function () {
      var focusTarget = panel.querySelector('[role=dialog] button');
      if (focusTarget) focusTarget.focus();
    });
  }

  function enterGarage(trigger) {
    root.classList.add('is-entered');
    try { sessionStorage.setItem('garage-entered', '1'); } catch (_error) {}
    var label = root.querySelector('[data-explore-label]');
    if (label) label.textContent = 'Click an object to open its build';
    var hint = root.querySelector('[data-garage-hint]');
    if (hint) hint.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () {
      var firstProject = root.querySelector('[data-project]');
      if (firstProject && trigger && trigger.matches(':focus-visible')) firstProject.focus();
    }, 420);
  }

  function openProject(id, trigger) {
    var project = projectData[id];
    if (!project || !projectPanel) return;

    projectPanel.querySelector('[data-project-kicker]').textContent = project.kicker;
    projectPanel.querySelector('[data-project-title]').textContent = project.title;
    projectPanel.querySelector('[data-project-summary]').textContent = project.summary;
    projectPanel.querySelector('[data-project-link]').href = project.url;

    var tags = projectPanel.querySelector('[data-project-tags]');
    tags.textContent = '';
    project.tags.forEach(function (tag) {
      var chip = document.createElement('span');
      chip.textContent = tag;
      tags.appendChild(chip);
    });

    enterGarage();
    openPanel(projectPanel, trigger);
    projectPanel.querySelector('.build-reader').scrollTop = 0;
    loadProjectPost(project);
  }

  root.querySelectorAll('[data-enter-garage]').forEach(function (button) {
    button.addEventListener('click', function () { enterGarage(button); });
  });

  root.querySelectorAll('[data-project]').forEach(function (button) {
    button.addEventListener('click', function () {
      openProject(button.getAttribute('data-project'), button);
    });
  });

  document.querySelectorAll('[data-open-inventory]').forEach(function (button) {
    button.addEventListener('click', function () {
      enterGarage();
      openPanel(inventory, button);
    });
  });

  document.querySelectorAll('[data-open-about], [data-open-contact]').forEach(function (button) {
    button.addEventListener('click', function () {
      enterGarage();
      openPanel(infoPanel, button);
      if (button.hasAttribute('data-open-contact')) {
        window.requestAnimationFrame(function () {
          var contact = infoPanel.querySelector('[data-contact-block] a');
          if (contact) contact.focus();
        });
      }
    });
  });

  document.querySelectorAll('[data-close-project]').forEach(function (button) {
    button.addEventListener('click', function () { closePanel(projectPanel, true); });
  });

  document.querySelectorAll('[data-close-inventory]').forEach(function (button) {
    button.addEventListener('click', function () { closePanel(inventory, true); });
  });

  document.querySelectorAll('[data-close-info]').forEach(function (button) {
    button.addEventListener('click', function () { closePanel(infoPanel, true); });
  });

  document.querySelectorAll('[data-close-panels]').forEach(function (control) {
    control.addEventListener('click', function () { closeAll(false); });
  });

  document.querySelectorAll('[data-drawer-filter]').forEach(function (button) {
    button.addEventListener('click', function () {
      var filter = button.getAttribute('data-drawer-filter');
      document.querySelectorAll('[data-drawer-filter]').forEach(function (item) {
        item.classList.toggle('is-active', item === button);
      });
      document.querySelectorAll('[data-inventory-item]').forEach(function (item) {
        var tags = (item.getAttribute('data-tags') || '').toLowerCase();
        item.hidden = filter !== 'all' && tags.indexOf(filter) === -1;
      });
    });
  });

  document.addEventListener('garage:enter', function () { enterGarage(); });
  document.addEventListener('garage:open-project', function (event) {
    var id = event.detail && event.detail.id;
    if (id) openProject(id);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && visiblePanels().length) { event.preventDefault(); event.stopImmediatePropagation(); closeAll(true); return; }
    if (event.key !== 'Tab' || !visiblePanels().length) return;

    var panel = visiblePanels()[0];
    var focusables = Array.prototype.slice.call(panel.querySelectorAll('[role=dialog] a[href], [role=dialog] button:not([disabled])')).filter(function (item) { return item.getClientRects().length > 0; });
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  try {
    if (sessionStorage.getItem('garage-entered') === '1') root.classList.add('is-entered');
  } catch (_error) {}

  if (root.classList.contains('is-entered')) enterGarage();
  if (window.location.hash === '#about') openPanel(infoPanel);

  var soundButton = root.querySelector('[data-sound]');
  var audioContext;
  var soundOn = false;
  soundButton.addEventListener('click', async function () {
    try {
      if (!audioContext) {
        var AudioCtor = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtor();
        var gain = audioContext.createGain();
        gain.gain.value = .018;
        gain.connect(audioContext.destination);
        [110, 164.81, 220].forEach(function (frequency) {
          var oscillator = audioContext.createOscillator();
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          oscillator.connect(gain);
          oscillator.start();
        });
      }
      soundOn = !soundOn;
      if (soundOn) await audioContext.resume(); else await audioContext.suspend();
      soundButton.textContent = soundOn ? 'Sound on' : 'Sound off';
      soundButton.setAttribute('aria-pressed', String(soundOn));
    } catch (_error) {
      soundButton.textContent = 'Sound unavailable';
      soundButton.disabled = true;
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (!audioContext || !soundOn) return;
    if (document.hidden) audioContext.suspend(); else audioContext.resume();
  });
})();
