// Lighthouse CI configuration for ALLRENTZ Enterprise Platform
// Performance and accessibility standards for industrial applications

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173',
        'http://localhost:4173/browse',
        'http://localhost:4173/customer-dashboard',
        'http://localhost:4173/vendor-dashboard'
      ],
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
    },
    assert: {
      assertions: {
        // Performance Standards for Industrial Applications
        'categories:performance': ['error', {minScore: 0.8}],
        'categories:accessibility': ['error', {minScore: 0.95}], // WCAG AA compliance
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.8}],

        // Core Web Vitals - Critical for field operations
        'first-contentful-paint': ['error', {maxNumericValue: 2000}], // 2 seconds max
        'largest-contentful-paint': ['error', {maxNumericValue: 3000}], // 3 seconds max
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
        'total-blocking-time': ['error', {maxNumericValue: 300}],

        // Industrial Equipment Specific Requirements
        'speed-index': ['error', {maxNumericValue: 3000}],
        'interactive': ['error', {maxNumericValue: 4000}],
        'max-potential-fid': ['error', {maxNumericValue: 130}],

        // Security Standards
        'csp-xss': 'error',
        'is-on-https': 'error',
        'uses-http2': 'error',
        'no-vulnerable-libraries': 'error',

        // Accessibility Standards (WCAG AA)
        'color-contrast': 'error',
        'heading-order': 'error',
        'link-text': 'error',
        'button-text': 'error',
        'image-alt': 'error',
        'label': 'error',
        'aria-valid-attr': 'error',
        'aria-valid-attr-value': 'error',
        'aria-required-attr': 'error',
        'focusable-controls': 'error',
        'interactive-element-affordance': 'error',
        'logical-tab-order': 'error',

        // Progressive Web App Standards
        'installable-manifest': 'error',
        'splash-screen': 'error',
        'themed-omnibox': 'error',
        'maskable-icon': 'off', // Optional for industrial apps
        'service-worker': 'off', // Will be implemented in Phase 2

        // Mobile Performance (Field Workers)
        'tap-targets': 'error',
        'font-display': 'error',
        'meta-viewport': 'error',

        // Resource Optimization
        'unused-css-rules': ['warn', {maxLength: 2000}],
        'unused-javascript': ['warn', {maxLength: 20000}],
        'uses-optimized-images': 'error',
        'uses-webp-images': 'warn',
        'uses-responsive-images': 'error',
        'efficient-animated-content': 'error',

        // Network Performance
        'uses-text-compression': 'error',
        'uses-rel-preconnect': 'error',
        'uses-rel-preload': 'warn',
        'preload-lcp-image': 'warn',
        'total-byte-weight': ['warn', {maxNumericValue: 1600000}], // 1.6MB max

        // Modern Standards
        'uses-passive-event-listeners': 'error',
        'no-document-write': 'error',
        'uses-http2': 'error',
        'efficient-animated-content': 'error'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    },
    server: {
      port: 9001,
      storage: './lighthouse-results'
    }
  }
};