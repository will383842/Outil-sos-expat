// src/utils/ga4.ts
/**
 * Google Analytics 4 (GA4) Initialization and Management
 * 
 * Features:
 * - Dynamic script loading based on cookie consent
 * - Respects user privacy preferences
 * - Handles consent mode updates
 * - Provides safe gtag wrapper
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;

/**
 * Check if GA4 is enabled and measurement ID is configured
 */
export const isGA4Enabled = (): boolean => {
  return Boolean(GA4_MEASUREMENT_ID && GA4_MEASUREMENT_ID.startsWith('G-'));
};

/**
 * Check if user has consented to analytics cookies
 */
export const hasAnalyticsConsent = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const savedPreferences = localStorage.getItem('cookie_preferences');
    if (savedPreferences) {
      const prefs = JSON.parse(savedPreferences) as { analytics?: boolean };
      return prefs.analytics === true;
    }
  } catch {
    // Invalid data, default to no consent
  }
  
  return false;
};

/**
 * Check if Google's gtag has replaced our wrapper
 */
const isGoogleGtagActive = (ourGtagRef: (...args: unknown[]) => void): boolean => {
  const currentGtag = (window as any).gtag;
  if (!currentGtag || typeof currentGtag !== 'function') {
    return false;
  }
  
  // Google's gtag will be different from our wrapper
  const ourGtagStr = ourGtagRef.toString();
  const currentGtagStr = currentGtag.toString();
  
  return currentGtagStr !== ourGtagStr && currentGtagStr.length > ourGtagStr.length;
};

/**
 * Configure GA4 after script has loaded
 */
const configureGA4 = (ourGtagRef?: (...args: unknown[]) => void): void => {
  if (!GA4_MEASUREMENT_ID) {
    console.error('❌ GA4: Measurement ID not configured');
    return;
  }

  const consentGranted = hasAnalyticsConsent();
  
  // Use the actual gtag (Google's script should have replaced our wrapper)
  const actualGtag = (window as any).gtag || window.gtag;
  
  if (!actualGtag) {
    console.warn('⚠️ GA4: gtag function not available');
    return;
  }

  // Verify Google's script is active
  const isGoogleActive = ourGtagRef ? isGoogleGtagActive(ourGtagRef) : false;
  
  if (ourGtagRef && !isGoogleActive) {
    console.warn('⚠️ GA4: Script loaded but Google Analytics may not have initialized');
    console.warn('   Our gtag:', ourGtagRef.toString().substring(0, 50));
    console.warn('   Current gtag:', actualGtag.toString().substring(0, 50));
    console.warn('   This may indicate: Ad blocker, Privacy settings, CSP blocking execution');
    console.warn('   ⚠️ Events will be queued in dataLayer but may not send to GA4');
    console.warn('   Solution: Disable ad blockers or test in incognito mode');
  }

  // Configure GA4 - this will queue in dataLayer even if Google's script didn't execute
  actualGtag('js', new Date());
  actualGtag('config', GA4_MEASUREMENT_ID, {
    // Privacy settings
    anonymize_ip: true,
    allow_google_signals: consentGranted,
    allow_ad_personalization_signals: consentGranted,
    // Consent mode
    analytics_storage: consentGranted ? 'granted' : 'denied',
    ad_storage: consentGranted ? 'granted' : 'denied',
    // Cookie domain - set to 'auto' to use current domain
    cookie_domain: 'auto',
    // Send page view manually to avoid duplicates
    send_page_view: false,
  });

  // Send initial page view
  actualGtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname,
  });
  
  // If Google's script didn't execute, log a warning about dataLayer
  if (!isGoogleActive && ourGtagRef) {
    console.warn('⚠️ GA4: Events are queued in dataLayer but Google script is not processing them');
    console.warn('   dataLayer contents:', JSON.stringify(window.dataLayer, null, 2));
  }

  console.log('✅ GA4 initialized:', GA4_MEASUREMENT_ID);
  console.log('📊 GA4: Page view sent for:', window.location.href);
  console.log('📊 GA4: Consent granted:', consentGranted);
  console.log('📊 GA4: dataLayer length:', window.dataLayer?.length || 0);

  // Check for network requests after a delay
  setTimeout(() => {
    checkNetworkRequests();
  }, 2000);
};

/**
 * Check if GA4 network requests are being made
 */
const checkNetworkRequests = (): void => {
  const requests = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const gaRequests = requests.filter(r => 
    r.name.includes('google-analytics.com/g/collect') || 
    r.name.includes('analytics.google.com')
  );
  
  if (gaRequests.length > 0) {
    console.log('✅ GA4: Network requests detected:', gaRequests.length);
    gaRequests.slice(-3).forEach((req, i) => {
      console.log(`   Request ${i + 1}: ${req.name.substring(0, 100)}...`);
      console.log(`   Size: ${req.transferSize} bytes, Duration: ${req.duration.toFixed(0)}ms`);
    });
  } else {
    console.warn('⚠️ GA4: No network requests to google-analytics.com detected');
    console.warn('   This means events are NOT reaching GA4 servers');
    console.warn('   Most likely causes:');
    console.warn('   1. Ad blocker blocking requests');
    console.warn('   2. Consent mode blocking (check analytics_storage)');
    console.warn('   3. Browser privacy settings');
    console.warn('   4. Network/firewall blocking');
  }
};

/**
 * Initialize GA4 script and dataLayer
 */
export const initializeGA4 = (): void => {
  console.log('🔍 GA4: Initialization started');
  console.log('   Measurement ID:', GA4_MEASUREMENT_ID || '❌ NOT SET');
  console.log('   Enabled:', isGA4Enabled());
  console.log('   Consent:', hasAnalyticsConsent());

  if (typeof window === 'undefined') {
    console.warn('⚠️ GA4: Window not available (SSR)');
    return;
  }

  if (!isGA4Enabled()) {
    console.error('❌ GA4: Not enabled - check VITE_GA4_MEASUREMENT_ID in .env.development');
    return;
  }

  // Check if already initialized (less strict check)
  if (window.gtag && window.dataLayer) {
    const currentGtag = (window as any).gtag;
    // Check if it's Google's gtag (not our wrapper)
    if (currentGtag && currentGtag.toString().length > 100) {
      console.log('✅ GA4: Already initialized');
      return;
    }
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];

  // Define gtag function (queues until script loads)
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;
  
  // Store reference to our gtag for comparison
  const ourGtagRef = gtag;

  // Check if script already exists in DOM
  const existingScript = document.querySelector(
    `script[src*="googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}"]`
  ) as HTMLScriptElement | null;

  if (existingScript) {
    console.log('📜 GA4: Script already exists in DOM');
    // Script already exists, wait for it to load if needed
    if (existingScript.dataset.loaded === 'true') {
      // Script already loaded, configure immediately
      console.log('📜 GA4: Script already loaded, configuring...');
      configureGA4(ourGtagRef);
    } else {
      // Wait for script to load
      console.log('📜 GA4: Waiting for existing script to load...');
      existingScript.addEventListener('load', () => {
        existingScript.dataset.loaded = 'true';
        waitForGoogleScript(ourGtagRef);
      });
    }
    return;
  }

  // Load GA4 script
  console.log('📜 GA4: Creating and loading script...');
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  
  // IMPORTANT: Set crossOrigin to allow execution
  script.crossOrigin = 'anonymous';
  
  // Configure GA4 AFTER script loads
  script.addEventListener('load', () => {
    script.dataset.loaded = 'true';
    console.log('✅ GA4: Script file loaded from googletagmanager.com');
    console.log('   Script src:', script.src);
    console.log('   Script in DOM:', document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}"]`) ? '✅ Yes' : '❌ No');
    
    // Check if script actually has content (not blocked/empty)
    const scriptElement = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}"]`) as HTMLScriptElement;
    if (scriptElement) {
      // Check network performance entry
      const requests = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const scriptRequest = requests.find(r => r.name.includes('googletagmanager.com/gtag/js'));
      
      if (scriptRequest) {
        console.log('   Script transfer size:', scriptRequest.transferSize, 'bytes');
        console.log('   Script decoded size:', scriptRequest.decodedBodySize, 'bytes');
        console.log('   Script duration:', scriptRequest.duration.toFixed(0), 'ms');
        
        if (scriptRequest.transferSize === 0 || scriptRequest.decodedBodySize === 0) {
          console.error('❌ GA4: Script loaded but size is 0 - BLOCKED by ad blocker or privacy tool');
          console.error('   The script file is being intercepted and replaced with empty content');
          console.error('');
          console.error('   🔧 TO FIX FOR TESTING:');
          console.error('   1. Disable ad blockers (uBlock Origin, AdBlock Plus, Privacy Badger, etc.)');
          console.error('   2. Disable browser privacy features:');
          console.error('      - Firefox: Settings → Privacy → Enhanced Tracking Protection → OFF');
          console.error('      - Safari: Preferences → Privacy → Prevent cross-site tracking → OFF');
          console.error('      - Chrome: Settings → Privacy → Tracking protection → OFF');
          console.error('   3. Test in incognito/private mode (disables most extensions)');
          console.error('   4. Check browser extensions: Extensions → Disable all → Test');
          console.error('');
          console.error('   📝 NOTE: In production, users with ad blockers won\'t be tracked.');
          console.error('   This is normal and actually good for privacy compliance.');
          console.error('');
          console.error('   ⚠️ Events are queued in dataLayer but won\'t send until blocker is disabled.');
          
          // Still configure GA4 - events will queue in dataLayer
          // If user disables blocker later, events might send
          console.warn('   ⚠️ Attempting to configure anyway - events will queue in dataLayer...');
          waitForGoogleScript(ourGtagRef);
          return;
        }
      } else {
        console.warn('⚠️ GA4: Could not find script in performance entries');
        console.warn('   This might mean the request was blocked before completion');
      }
    }
    
    // Wait for Google's script to replace our wrapper
    waitForGoogleScript(ourGtagRef);
  });

  script.addEventListener('error', (event) => {
    console.error('❌ GA4: Failed to load script');
    console.error('   Error event:', event);
    console.error('   Check:');
    console.error('   1. Network tab for actual error');
    console.error('   2. Ad blockers');
    console.error('   3. Browser privacy settings');
    console.error('   4. Firewall/proxy blocking');
    console.error('   5. CSP (Content Security Policy)');
  });

  document.head.appendChild(script);
  console.log('📜 GA4: Script appended to DOM');
};

/**
 * Wait for Google's script to initialize and replace our wrapper
 */
const waitForGoogleScript = (ourGtagRef: (...args: unknown[]) => void): void => {
  let attempts = 0;
  const maxAttempts = 20; // Check for 2 seconds (20 * 100ms)
  
  const checkInterval = setInterval(() => {
    attempts++;
    const isActive = isGoogleGtagActive(ourGtagRef);
    
    if (isActive || attempts >= maxAttempts) {
      clearInterval(checkInterval);
      
      if (isActive) {
        console.log('✅ GA4: Google Analytics script is active');
        configureGA4(ourGtagRef);
      } else {
        console.warn('⚠️ GA4: Google script did not initialize after', attempts * 100, 'ms');
        console.warn('   Attempting to configure anyway...');
        configureGA4(ourGtagRef);
      }
    }
  }, 100);
};

/**
 * Update GA4 consent mode - Consent Mode v2 compliant
 * Supports both simple boolean and detailed preferences
 */
export const updateGA4Consent = (
  consentOrPrefs: boolean | { analytics: boolean; marketing: boolean; performance: boolean }
): void => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  // Handle both legacy boolean and new preferences object
  let analytics: boolean;
  let marketing: boolean;
  let performance: boolean;

  if (typeof consentOrPrefs === 'boolean') {
    // Legacy: single boolean for all
    analytics = consentOrPrefs;
    marketing = consentOrPrefs;
    performance = consentOrPrefs;
  } else {
    // New: granular preferences
    analytics = consentOrPrefs.analytics;
    marketing = consentOrPrefs.marketing;
    performance = consentOrPrefs.performance;
  }

  // Consent Mode v2 - all required parameters
  window.gtag('consent', 'update', {
    // Analytics consent
    analytics_storage: analytics ? 'granted' : 'denied',

    // Marketing/Advertising consent (Consent Mode v2 required parameters)
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',

    // Functionality consent
    functionality_storage: performance ? 'granted' : 'denied',
    personalization_storage: performance ? 'granted' : 'denied',
  });

  // Update GA4 config if available
  if (GA4_MEASUREMENT_ID && isGA4Enabled()) {
    window.gtag('config', GA4_MEASUREMENT_ID, {
      allow_google_signals: marketing,
      allow_ad_personalization_signals: marketing,
    });
  }

  console.log('📊 GA4: Consent updated', { analytics, marketing, performance });
};

/**
 * Safe gtag wrapper that checks if GA4 is available
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, unknown>
): void => {
  if (typeof window === 'undefined' || !window.gtag || !hasAnalyticsConsent()) {
    return;
  }

  try {
    window.gtag('event', eventName, eventParams);
  } catch (error) {
    console.error('Error tracking GA4 event:', error);
  }
};

/**
 * Set user properties
 */
export const setUserProperties = (properties: Record<string, unknown>): void => {
  if (typeof window === 'undefined' || !window.gtag || !hasAnalyticsConsent()) {
    return;
  }

  try {
    window.gtag('set', 'user_properties', properties);
  } catch (error) {
    console.error('Error setting GA4 user properties:', error);
  }
};

/**
 * Set user ID
 */
export const setUserId = (userId: string): void => {
  if (typeof window === 'undefined' || !window.gtag || !hasAnalyticsConsent()) {
    return;
  }

  try {
    window.gtag('config', GA4_MEASUREMENT_ID, {
      user_id: userId,
    });
  } catch (error) {
    console.error('Error setting GA4 user ID:', error);
  }
};

/**
 * Diagnostic function to check GA4 status
 * Call this in browser console: window.ga4Diagnostic()
 */
export const ga4Diagnostic = (): void => {
  if (typeof window === 'undefined') {
    console.log('❌ Not in browser environment');
    return;
  }

  console.log('🔍 GA4 Diagnostic Report');
  console.log('========================');
  
  // Check Measurement ID
  console.log('📊 Measurement ID:', GA4_MEASUREMENT_ID || '❌ NOT SET');
  console.log('📊 Enabled:', isGA4Enabled());
  
  // Check consent
  const consent = hasAnalyticsConsent();
  console.log('🍪 Analytics Consent:', consent ? '✅ Granted' : '❌ Not granted');
  
  // Check dataLayer
  console.log('📦 dataLayer:', window.dataLayer);
  console.log('📦 dataLayer length:', window.dataLayer?.length || 0);
  
  // Check gtag
  const gtagExists = typeof window.gtag === 'function';
  console.log('🔧 gtag function:', gtagExists ? '✅ Exists' : '❌ Missing');
  
  if (gtagExists) {
    const gtagStr = window.gtag.toString();
    console.log('🔧 gtag type:', gtagStr.length < 100 ? gtagStr : `Function (length: ${gtagStr.length})`);
  }
  
  // Check script in DOM
  const script = document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`);
  console.log('📜 Script in DOM:', script ? '✅ Found' : '❌ Not found');
  
  if (script) {
    const scriptEl = script as HTMLScriptElement;
    console.log('📜 Script src:', scriptEl.src);
    console.log('📜 Script loaded:', scriptEl.dataset.loaded === 'true' ? '✅ Yes' : '❌ No');
  }
  
  // Check network requests
  const requests = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const gaScriptRequests = requests.filter(r => r.name.includes('googletagmanager.com/gtag/js'));
  const gaCollectRequests = requests.filter(r => r.name.includes('google-analytics.com/g/collect'));
  
  console.log('🌐 GA Script requests:', gaScriptRequests.length);
  if (gaScriptRequests.length > 0) {
    gaScriptRequests.forEach((req, i) => {
      console.log(`   ${i + 1}. ${req.name}`);
      console.log(`      Status: ${req.transferSize > 0 ? '✅ Loaded' : '⚠️ Blocked/Empty'}`);
      console.log(`      Size: ${req.transferSize} bytes`);
    });
  }
  
  console.log('🌐 GA Collect requests:', gaCollectRequests.length);
  if (gaCollectRequests.length > 0) {
    console.log('   ✅ Events are being sent to GA4!');
    gaCollectRequests.slice(-5).forEach((req, i) => {
      console.log(`   ${i + 1}. ${req.name.substring(0, 100)}...`);
    });
  } else {
    console.log('   ❌ No events sent to GA4');
    console.log('   ⚠️ This means events are NOT reaching GA4 servers');
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (!GA4_MEASUREMENT_ID) {
    console.log('   1. Set VITE_GA4_MEASUREMENT_ID in .env.development');
  }
  if (!consent) {
    console.log('   2. Accept analytics cookies');
  }
  if (!gtagExists) {
    console.log('   3. GA4 script may not have loaded');
  }
  if (gaCollectRequests.length === 0) {
    console.log('   4. Events not sending - check ad blockers');
  }
  if (gaScriptRequests.length === 0) {
    console.log('   5. Script not requested - check Network tab');
  }
};

// Expose diagnostic function globally for easy access
if (typeof window !== 'undefined') {
  (window as any).ga4Diagnostic = ga4Diagnostic;
}

