// Edit this file, then commit. Nothing else needs to change.
window.SPA_CONFIG = {
  // Your Pendo subscription API key (Settings > Subscription Settings > App Details).
  // Leave as-is to run the app without loading Pendo.
  pendoApiKey: '37d3acb5-c6dd-4282-9c1b-2c13d5973adc',

  // EU / other regions use a different CDN host, e.g. 'https://cdn.eu.pendo.io'
  pendoCdn: 'https://cdn.pendo.io',

  // Identity sent to pendo.initialize()
  visitor: { id: 'spa-test-visitor-1', role: 'tester' },
  account: { id: 'spa-test-account-1', plan: 'trial' },

  // Base path of the site.
  //   null  -> auto-detect (project pages: https://USER.github.io/REPO/ => '/REPO')
  //   ''    -> force root (user/org site: https://USER.github.io/, or a custom domain)
  basePath: null
};
