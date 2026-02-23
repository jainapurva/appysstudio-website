// Smooth nav background on scroll
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.style.background = window.scrollY > 40
    ? 'rgba(10,10,15,0.97)'
    : 'rgba(10,10,15,0.85)';
});

// Eye follows mouse on hero section
const eyes = document.querySelectorAll('.robot-eye');
const pupils = document.querySelectorAll('.pupil');

document.addEventListener('mousemove', (e) => {
  pupils.forEach((pupil, i) => {
    const eye = eyes[i];
    if (!eye) return;
    const rect = eye.getBoundingClientRect();
    const eyeCX = rect.left + rect.width / 2;
    const eyeCY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - eyeCY, e.clientX - eyeCX);
    const maxDist = 12;
    const x = Math.cos(angle) * maxDist;
    const y = Math.sin(angle) * maxDist;
    pupil.style.transform = `translate(${x}px, ${y}px)`;
    pupil.style.transition = 'transform 0.1s ease-out';
  });
});

// Intersection observer for fade-in cards
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.product-card, .tech-item, .stat').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
