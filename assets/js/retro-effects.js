(function() {
  'use strict';

  // ===== Liquid Morph Effect for Cards =====
  function initLiquidMorph() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', handleLiquidEnter);
      card.addEventListener('mousemove', handleLiquidMove);
      card.addEventListener('mouseleave', handleLiquidLeave);
    });
  }

  function handleLiquidEnter(e) {
    const card = e.currentTarget;
    card.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }

  function handleLiquidMove(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
    
    // Subtle float based on cursor position
    card.style.transform = `translateY(-12px) translateX(${x}px) scale(1.01)`;
  }

  function handleLiquidLeave(e) {
    const card = e.currentTarget;
    card.style.transform = '';
  }

  // ===== Parallax Background Layers =====
  function initParallax() {
    const lightElements = document.querySelectorAll('.bg__light');
    let ticking = false;
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateParallax(lightElements);
          ticking = false;
        });
        ticking = true;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateMouseParallax(lightElements, e);
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  function updateParallax(elements) {
    const scrolled = window.pageYOffset;
    
    elements.forEach((element, index) => {
      const speed = (index + 1) * 0.05;
      const yPos = -(scrolled * speed);
      element.style.transform = `translateY(${yPos}px)`;
    });
  }

  function updateMouseParallax(elements, e) {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    
    elements.forEach((element, index) => {
      const depth = (index + 1) * 15;
      const moveX = x * depth;
      const moveY = y * depth;
      
      const currentTransform = element.style.transform || '';
      if (currentTransform.includes('translateY')) {
        const match = currentTransform.match(/translateY\(([-\d.]+)px\)/);
        const scrollY = match ? match[1] : 0;
        element.style.transform = `translate(${moveX}px, ${scrollY}px)`;
      } else {
        element.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    });
  }

  // ===== Smooth Scroll with Inertia =====
  function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
      link.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const headerOffset = 100;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // ===== Floating Animation for Hero Elements =====
  function initFloatingElements() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
    });
    
    function animateFloat() {
      currentX += (mouseX - currentX) * 0.05;
      currentY += (mouseY - currentY) * 0.05;
      
      hero.style.transform = `translate(${currentX}px, ${currentY}px)`;
      requestAnimationFrame(animateFloat);
    }
    
    animateFloat();
  }

  // ===== Add Hover Glow to Interactive Elements =====
  function initHoverGlow() {
    const interactives = document.querySelectorAll('.btn, .nav__link, .card__title');
    
    interactives.forEach(element => {
      element.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      });
    });
  }

  // ===== Observe Elements for Entrance Animations =====
  function initObserver() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);
    
    const animatedElements = document.querySelectorAll('.card, .hero, section');
    animatedElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      observer.observe(el);
    });
  }

  // ===== Liquid Blob Animation Enhancement =====
  function enhanceLiquidBlobs() {
    const blobs = document.querySelectorAll('.bg__light');
    if (!blobs.length) return;
    
    let scrollTicking = false;
    
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.pageYOffset;
          blobs.forEach((blob, index) => {
            const speed = (index + 1) * 0.03;
            const yPos = scrolled * speed;
            blob.style.transform = `translateY(${yPos}px)`;
          });
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    });
  }

  // ===== Cursor Glow Effect (Subtle) =====
  function initCursorGlow() {
    const cursorGlow = document.body;
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    
    function updateCursor() {
      currentX += (mouseX - currentX) * 0.2;
      currentY += (mouseY - currentY) * 0.2;
      
      if (cursorGlow) {
        const glow = window.getComputedStyle(cursorGlow, '::after');
        cursorGlow.style.setProperty('--cursor-x', currentX + 'px');
        cursorGlow.style.setProperty('--cursor-y', currentY + 'px');
      }
      
      requestAnimationFrame(updateCursor);
    }
    
    // Only enable on desktop/mouse devices
    if (window.matchMedia('(pointer: fine)').matches) {
      updateCursor();
    }
  }

  // ===== Add Stagger Animation to Grid Cards =====
  function initStaggerAnimation() {
    const cards = document.querySelectorAll('.card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }, index * 100);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(40px)';
      card.style.transition = `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`;
      observer.observe(card);
    });
  }

  // ===== Initialize All Effects =====
  function init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll);
    } else {
      initAll();
    }
  }

  // ===== Enhanced Cursor Blob Trail =====
  function initCursorBlob() {
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let isMoving = false;
    
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMoving = true;
      
      // Show cursor blob
      document.body.style.setProperty('--cursor-opacity', '0.15');
    });
    
    document.addEventListener('mouseleave', () => {
      isMoving = false;
      document.body.style.setProperty('--cursor-opacity', '0');
    });
    
    function updateCursor() {
      if (isMoving) {
        currentX += (mouseX - currentX) * 0.15;
        currentY += (mouseY - currentY) * 0.15;
        
        document.body.style.setProperty('--cursor-x', currentX + 'px');
        document.body.style.setProperty('--cursor-y', currentY + 'px');
      }
      
      requestAnimationFrame(updateCursor);
    }
    
    // Add CSS custom property support
    const style = document.createElement('style');
    style.textContent = `
      body::after {
        opacity: var(--cursor-opacity, 0);
        left: var(--cursor-x, 0);
        top: var(--cursor-y, 0);
      }
    `;
    document.head.appendChild(style);
    
    // Only enable on desktop
    if (window.matchMedia('(pointer: fine)').matches) {
      updateCursor();
    }
  }
  
  // ===== Liquid Ripple on Click =====
  function initLiquidRipple() {
    document.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      ripple.className = 'liquid-ripple';
      ripple.style.left = e.clientX + 'px';
      ripple.style.top = e.clientY + 'px';
      
      document.body.appendChild(ripple);
      
      ripple.animate([
        {
          width: '0px',
          height: '0px',
          opacity: 0.5,
          borderRadius: '50%'
        },
        {
          width: '100px',
          height: '100px',
          opacity: 0,
          borderRadius: '48% 52% 50% 50% / 52% 48% 52% 48%'
        }
      ], {
        duration: 800,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }).onfinish = () => {
        ripple.remove();
      };
    });
    
    // Add ripple styles
    const style = document.createElement('style');
    style.textContent = `
      .liquid-ripple {
        position: fixed;
        pointer-events: none;
        border: 2px solid var(--accent);
        transform: translate(-50%, -50%);
        z-index: 9999;
      }
    `;
    document.head.appendChild(style);
  }

  function initAll() {
    initLiquidMorph();
    initParallax();
    initSmoothScroll();
    initFloatingElements();
    initHoverGlow();
    initStaggerAnimation();
    enhanceLiquidBlobs();
    initCursorBlob();
    initLiquidRipple();
    
    console.log('✨ Enhanced liquid effects initialized');
  }

  // Start initialization
  init();
})();

