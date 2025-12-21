(function() {
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  
  // Check for saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);
  
  // Smooth theme transition
  function createTransitionEffect() {
    // Add transition class
    html.style.transition = 'background-color 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    
    // Remove after animation
    setTimeout(() => {
      html.style.transition = '';
    }, 600);
  }
  
  // Particle burst effect on toggle
  function createParticleBurst(x, y) {
    const particleCount = 12;
    const colors = ['var(--accent)', 'var(--chrome-light)', 'var(--fg)'];
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'fixed';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.width = '4px';
      particle.style.height = '4px';
      particle.style.borderRadius = '50%';
      particle.style.background = colors[i % colors.length];
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '9999';
      particle.style.boxShadow = `0 0 8px ${colors[i % colors.length]}`;
      
      document.body.appendChild(particle);
      
      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = 2 + Math.random() * 2;
      const distance = 40 + Math.random() * 40;
      
      const endX = x + Math.cos(angle) * distance;
      const endY = y + Math.sin(angle) * distance;
      
      particle.animate([
        {
          transform: 'translate(0, 0) scale(1)',
          opacity: 1
        },
        {
          transform: `translate(${endX - x}px, ${endY - y}px) scale(0)`,
          opacity: 0
        }
      ], {
        duration: 600 + Math.random() * 400,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }).onfinish = () => {
        particle.remove();
      };
    }
  }
  
  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      // Create visual effects
      createTransitionEffect();
      
      // Get button position for particle effect
      const rect = themeToggle.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      createParticleBurst(centerX, centerY);
      
      // Update theme
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Add ripple effect to toggle
      const ripple = document.createElement('div');
      ripple.style.position = 'absolute';
      ripple.style.inset = '-20px';
      ripple.style.borderRadius = '50%';
      ripple.style.border = '2px solid var(--accent)';
      ripple.style.pointerEvents = 'none';
      ripple.style.opacity = '0.6';
      
      themeToggle.style.position = 'relative';
      themeToggle.appendChild(ripple);
      
      ripple.animate([
        { transform: 'scale(0.5)', opacity: 0.6 },
        { transform: 'scale(1.5)', opacity: 0 }
      ], {
        duration: 600,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }).onfinish = () => {
        ripple.remove();
      };
    });
  }
  
  console.log('🎨 Theme system initialized');
})();

