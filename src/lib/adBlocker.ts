/**
 * UltraWatch In-App Ad Blocker
 * Blocks popups, ad scripts, and unwanted overlays from third-party player iframes.
 */

const AD_DOMAIN_PATTERNS = [
  'googlesyndication', 'doubleclick', 'adserver', 'popads', 'popcash',
  'propellerads', 'adsterra', 'monetag', 'profiton', 'cleatsbonks',
  'adskeeper', 'mgid', 'taboola', 'outbrain', 'revcontent', 'contentabc',
  'adnxs', 'criteo', 'scorecardresearch', 'quantserve', 'zedo',
  'admixer', 'adfox', 'adsystem',
];

const AD_SELECTORS = [
  '[id*="ad-"]', '[id*="ad_"]', '[id*="ads-"]', '[id*="ads_"]',
  '[class*="ad-"]', '[class*="ad_"]', '[class*="ads-"]', '[class*="ads_"]',
  '[class*="advert"]', '[class*="sponsor"]', '[class*="promo"]',
  '[id*="popup"]', '[class*="popup"]', '[id*="overlay"]', '[class*="overlay-"]',
  'ins.adsbygoogle', 'iframe[src*="ads"]', 'div[data-ad]',
  'div[data-ad-slot]', '[id^="google_ads_"]', '[id^="div-gpt-ad"]',
];

function isAdScript(src: string): boolean {
  const lower = src.toLowerCase();
  return AD_DOMAIN_PATTERNS.some(pattern => lower.includes(pattern));
}

function blockScript(script: HTMLScriptElement) {
  const src = script.src || '';
  const inline = script.textContent || '';

  if (src && isAdScript(src)) {
    script.type = 'javascript/blocked';
    script.remove();
    return true;
  }

  if (inline && AD_DOMAIN_PATTERNS.some(p => inline.toLowerCase().includes(p))) {
    script.remove();
    return true;
  }

  return false;
}

function removeAdElements() {
  for (const selector of AD_SELECTORS) {
    try {
      document.querySelectorAll(selector).forEach(el => {
        if (el.closest('#root')) return;
        el.remove();
      });
    } catch {
      // invalid selector, skip
    }
  }
}

function blockPopups() {
  const originalOpen = window.open;
  (window as any).open = function (...args: any[]) {
    const url = args[0]?.toString() || '';
    if (AD_DOMAIN_PATTERNS.some(p => url.toLowerCase().includes(p))) {
      return null;
    }
    if (!window.event && !args[2]?.includes('noopener')) {
      return null;
    }
    return originalOpen.apply(window, args as any);
  };

  window.alert = () => {};
  const originalConfirm = window.confirm;
  window.confirm = function (...args: any[]) {
    try {
      const stack = new Error().stack || '';
      if (stack.includes('localhost') || stack.includes('ultrawatch')) {
        return originalConfirm.apply(window, args as any);
      }
    } catch {
      // allow
    }
    return originalConfirm.apply(window, args as any);
  };
}

function setupMutationObserver() {
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const el = node as HTMLElement;

        if (el.tagName === 'SCRIPT') {
          blockScript(el as HTMLScriptElement);
          continue;
        }

        for (const selector of AD_SELECTORS) {
          try {
            if (el.matches?.(selector) && !el.closest('#root')) {
              el.remove();
              break;
            }
            el.querySelectorAll?.(selector).forEach(child => {
              if (!child.closest('#root')) child.remove();
            });
          } catch {
            // skip invalid
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function blockIframeAds() {
  setInterval(() => {
    document.querySelectorAll('iframe').forEach(iframe => {
      const src = iframe.src || '';
      if (AD_DOMAIN_PATTERNS.some(p => src.toLowerCase().includes(p))) {
        iframe.remove();
      }
    });
  }, 2000);
}

// NEW: Block click events within iframes that might trigger redirects
function blockIframeClicks() {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const iframe = target.closest('iframe');
    
    // Only allow clicks on iframes if they're not flagged as ad iframes
    if (iframe) {
      const src = iframe.src || '';
      
      // Check if iframe contains ad domains
      if (AD_DOMAIN_PATTERNS.some(p => src.toLowerCase().includes(p))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
      
      // Block clicks on overlay elements within iframes
      if (target.matches('[class*="overlay"], [class*="popup"], [id*="overlay"], [id*="popup"]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
    }
  }, true);
  
  // Intercept iframe navigation attempts
  const originalReplace = window.location.replace;
  const originalAssign = window.location.assign;
  
  window.location.replace = function(url: string) {
    if (AD_DOMAIN_PATTERNS.some(p => url.toLowerCase().includes(p))) {
      console.warn('[UltraWatch] Blocked redirect attempt to:', url);
      return undefined;
    }
    return originalReplace.call(window.location, url);
  };
  
  window.location.assign = function(url: string) {
    if (AD_DOMAIN_PATTERNS.some(p => url.toLowerCase().includes(p))) {
      console.warn('[UltraWatch] Blocked navigation attempt to:', url);
      return undefined;
    }
    return originalAssign.call(window.location, url);
  };
}

// NEW: Sandbox iframes to prevent malicious behavior
function sandboxIframes() {
  setInterval(() => {
    document.querySelectorAll('iframe').forEach(iframe => {
      // Skip if already has sandbox attribute
      if (iframe.hasAttribute('sandbox')) return;
      
      // Add sandbox restrictions for all iframes
      // allow-same-origin: for video player content
      // allow-scripts: for video players to function
      // allow-popups: controlled by blockPopups()
      // allow-presentation: for fullscreen video
      iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-presentation');
    });
  }, 1000);
}

// NEW: Monitor and clean up malicious iframe content
function monitorIframeContent() {
  setInterval(() => {
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        // Try to access iframe content
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          // Remove ad elements inside iframe
          iframeDoc.querySelectorAll(AD_SELECTORS.join(',')).forEach(el => {
            el.remove();
          });
          
          // Remove ad scripts inside iframe
          iframeDoc.querySelectorAll('script').forEach(script => {
            blockScript(script);
          });
        }
      } catch (e) {
        // Cross-origin iframe, can't access - skip
      }
    });
  }, 3000);
}

function init() {
  document.querySelectorAll('script').forEach(script => {
    blockScript(script as HTMLScriptElement);
  });

  removeAdElements();
  blockPopups();
  blockIframeClicks();  // NEW
  setupMutationObserver();
  blockIframeAds();
  sandboxIframes();     // NEW
  monitorIframeContent(); // NEW

  window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    return undefined;
  }, { capture: true });

  console.log('[UltraWatch] Ad blocker active with iframe protection');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
