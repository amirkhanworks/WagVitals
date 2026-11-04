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

  // Keep the sticky header out of the way while reading down the page.
  // Reveal it again as soon as the visitor scrolls upward.
  let lastScrollY = window.scrollY;
  const showHeader = () => {
    if (!header) return;
    header.classList.remove('is-hidden');
  };

  const updateHeader = () => {
    if (!header) return;

    const currentScrollY = Math.max(0, window.scrollY);
    header.classList.toggle('is-scrolled', currentScrollY > 8);

    // Never hide the navigation while its mobile menu is open or focused.
    const menuIsOpen = menuToggle?.getAttribute('aria-expanded') === 'true';
    const headerHasKeyboardFocus = header.querySelector(':focus-visible') !== null;

    if (currentScrollY <= 8 || menuIsOpen || headerHasKeyboardFocus) {
      showHeader();
    } else if (currentScrollY > lastScrollY + 5) {
      header.classList.add('is-hidden');
    } else if (currentScrollY < lastScrollY - 5) {
      showHeader();
    }

    lastScrollY = currentScrollY;
  };

  if (header) {
    header.addEventListener('focusin', showHeader);
    header.addEventListener('pointerenter', showHeader);
  }

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

  // Keep the native FAQ disclosure state explicit for assistive technology.
  document.querySelectorAll('.faq-item').forEach((detail) => {
    const summary = detail.querySelector('summary');
    if (!summary) return;
    summary.setAttribute('aria-expanded', String(detail.open));
    detail.addEventListener('toggle', () => {
      summary.setAttribute('aria-expanded', String(detail.open));
    });
  });

  // Waitlist form: accessible inline validation and honest endpoint handling.
  const waitlistForm = document.querySelector('[data-waitlist-form]');

  if (waitlistForm) {
    const fields = [...waitlistForm.querySelectorAll('input, select, textarea')];
    const feedback = waitlistForm.querySelector('[data-form-feedback]');
    const success = waitlistForm.querySelector('[data-form-success]');
    const submitButton = waitlistForm.querySelector('[data-waitlist-submit]');

    // Keep native browser validation when JavaScript is unavailable.
    // Once this handler is active, render validation messages beside each field.
    waitlistForm.noValidate = true;

    const messageFor = (field) => {
      if (field.validity.valueMissing) return 'Please complete this field.';
      if (field.validity.typeMismatch) return 'Please enter a valid email address.';
      if (field.validity.patternMismatch) return 'Please check the format and try again.';
      if (field.validity.tooShort) return 'Please enter a little more information.';
      return '';
    };

    const validateField = (field) => {
      const error = waitlistForm.querySelector(
        '[data-error-for="' + field.name + '"]'
      );
      const message = messageFor(field);

      field.setAttribute('aria-invalid', message ? 'true' : 'false');

      if (error) {
        error.textContent = message;
      }

      return !message;
    };

    fields.forEach((field) => {
      field.addEventListener('input', () => validateField(field));
      field.addEventListener('change', () => validateField(field));
      field.addEventListener('blur', () => validateField(field));
    });

    waitlistForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      waitlistForm.removeAttribute('data-submitted');

      if (feedback) {
        feedback.hidden = true;
        feedback.textContent = '';
      }
      if (success) {
        success.hidden = true;
      }

      const invalidFields = fields.filter((field) => !validateField(field));

      if (invalidFields.length) {
        invalidFields[0].focus();
        return;
      }

      const endpoint = (waitlistForm.getAttribute('action') || '').trim();
      const endpointIsPlaceholder = !endpoint || /\{\{[^}]+\}\}/.test(endpoint);

      if (endpointIsPlaceholder) {
        if (feedback) {
          feedback.textContent =
            'The waitlist form is being connected. Please reach us directly using the contact options below.';
          feedback.hidden = false;
        }
        return;
      }

      const originalLabel = submitButton ? submitButton.textContent : '';
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending…';
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(waitlistForm),
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
          throw new Error('The form service returned an unsuccessful response.');
        }

        waitlistForm.reset();
        fields.forEach((field) => {
          field.setAttribute('aria-invalid', 'false');
          const error = waitlistForm.querySelector(
            '[data-error-for="' + field.name + '"]'
          );
          if (error) error.textContent = '';
        });

        if (success) {
          success.textContent = "You're on the list. We'll be in touch.";
          success.hidden = false;
          waitlistForm.setAttribute('data-submitted', 'true');
          success.focus?.();
        }
      } catch (error) {
        if (feedback) {
          feedback.textContent =
            'We could not submit your details just now. Please contact us directly using the options below.';
          feedback.hidden = false;
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
      }
    });
  }

})();