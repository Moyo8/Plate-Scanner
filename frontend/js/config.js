const API_CONFIG = {
  BASE_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://plate-scanner-api.onrender.com'
};

window.API_CONFIG = API_CONFIG;

(function attachFooter() {
  const FOOTER_ID = 'app-global-footer';
  const STYLE_ID = 'app-global-footer-style';

  const ensureFooter = () => {
    if (!document.body || document.getElementById(FOOTER_ID)) return;

    // outer container (full width) and inner pill for the visual
    const footer = document.createElement('footer');
    footer.id = FOOTER_ID;
    footer.setAttribute('role', 'contentinfo');

    const inner = document.createElement('div');
    inner.className = 'app-global-footer-inner';
    inner.textContent = '© 2025 PlateScanner. All rights reserved.';
    footer.appendChild(inner);
    document.body.appendChild(footer);

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
/* full-width footer container (non-interactive) */
#${FOOTER_ID} {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  pointer-events: none; /* allow clicks through by default */
  z-index: 9999;
}

/* the visible pill centered inside the container */
#${FOOTER_ID} .app-global-footer-inner {
  margin: 12px 16px;
  padding: 8px 20px;
  border-radius: 999px;
  background: rgba(7, 20, 42, 0.92);
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  letter-spacing: 0.02em;
  box-shadow: 0 10px 30px rgba(7, 20, 42, 0.35);
  pointer-events: auto; /* allow interactions if needed */
}

@media (max-width: 600px) {
  #${FOOTER_ID} .app-global-footer-inner {
    font-size: 11px;
    padding: 6px 14px;
    margin: 10px 12px;
  }
}

body.has-fixed-footer {
  padding-bottom: var(--footer-offset, 96px);
}
      `;
      document.head.appendChild(style);
    }

    // ensure we don't stack multiple listeners
    if (!document.body.dataset.footerPaddingFixed) {
      document.body.dataset.footerPaddingFixed = 'true';
      document.body.classList.add('has-fixed-footer');

      const adjustOffset = () => {
        const innerEl = footer.querySelector('.app-global-footer-inner');
        const rect = innerEl ? innerEl.getBoundingClientRect() : footer.getBoundingClientRect();
        const required = Math.ceil(rect.height + 24);
        document.documentElement.style.setProperty('--footer-offset', required + 'px');
      };

      adjustOffset();
      setTimeout(adjustOffset, 350);
      window.addEventListener('resize', adjustOffset);
    }
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    ensureFooter();
  } else {
    document.addEventListener('DOMContentLoaded', ensureFooter);
  }
})();