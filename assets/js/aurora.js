(() => {
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const finePointer = window.matchMedia?.("(pointer: fine)")?.matches;
  const canHover = window.matchMedia?.("(hover: hover)")?.matches;

  if (prefersReduced || !finePointer || !canHover) return;

  let raf = 0;
  let lastGlass = null;
  let lastX = 0;
  let lastY = 0;

  function setSpotlight(glass, clientX, clientY) {
    const r = glass.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    glass.style.setProperty("--mx", `${x}%`);
    glass.style.setProperty("--my", `${y}%`);
  }

  function onMove(e) {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // Parallax Background Orbs
    const orbs = document.querySelectorAll(".bg__light");
    const moveX = (e.clientX / window.innerWidth - 0.5);
    const moveY = (e.clientY / window.innerHeight - 0.5);
    
    orbs.forEach((orb, i) => {
      const factor = (i + 1) * 20;
      orb.style.setProperty("--px", `${moveX * factor}px`);
      orb.style.setProperty("--py", `${moveY * factor}px`);
    });

    const glass = target.closest(".glass");
    lastX = e.clientX;
    lastY = e.clientY;

    if (!glass) {
      lastGlass = null;
      return;
    }

    if (glass !== lastGlass) lastGlass = glass;

    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      if (lastGlass) setSpotlight(lastGlass, lastX, lastY);
    });
  }

  document.addEventListener("pointermove", onMove, { passive: true });
})();


