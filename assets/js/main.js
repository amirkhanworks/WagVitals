/* WagVitals India — shared interactions */
(() => {
  'use strict';

  const body = document.body;
  const header = document.querySelector('[data-site-header]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const siteNav = document.querySelector('[data-site-nav]');
  const reducedMotion = Boolean(
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  body.classList.add('js-ready');

  // Keep planned dog-photo slots tidy until the real photos are supplied.
  document.querySelectorAll('.photo-frame img').forEach((image) => {
    const markPhotoMissing = () => {
      const frame = image.closest('.photo-frame');
      if (!frame) return;
      frame.classList.add('is-image-missing');
      frame.setAttribute('role', 'img');
      frame.setAttribute('aria-label', image.alt || 'Dog photography to be added');
      image.style.display = 'none';
    };

    image.addEventListener('error', markPhotoMissing, { once: true });
    if (image.complete && image.naturalWidth === 0) markPhotoMissing();
  });

  // Add a quiet visual state to the sticky header after the first scroll.
  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Full-screen mobile navigation with Escape and basic focus containment.
  const closeMenu = ({ returnFocus = false } = {}) => {
    if (!menuToggle || !siteNav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    siteNav.classList.remove('is-open');
    body.classList.remove('menu-open');
    if (returnFocus) menuToggle.focus();
  };

  const openMenu = () => {
    if (!menuToggle || !siteNav) return;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close menu');
    siteNav.classList.add('is-open');
    body.classList.add('menu-open');
    const firstLink = siteNav.querySelector('a');
    if (firstLink) firstLink.focus();
  };

  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      isOpen ? closeMenu({ returnFocus: true }) : openMenu();
    });

    siteNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMenu());
    });

    document.addEventListener('keydown', (event) => {
      if (menuToggle.getAttribute('aria-expanded') !== 'true') return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu({ returnFocus: true });
      }
      if (event.key === 'Tab') {
        const focusable = [...siteNav.querySelectorAll('a[href], button:not([disabled])')];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 767) closeMenu();
    });
  }

  // Progressive scroll reveal. Content stays visible if IntersectionObserver is unavailable.
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  // Native anchor scrolling, with the browser's reduced-motion preference respected.
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', id);
    });
  });
})();