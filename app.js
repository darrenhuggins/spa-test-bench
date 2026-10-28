/* SPA Test Bench: a tiny vanilla-JS SPA for testing Pendo guides against common SPA behaviors. */
(() => {
  const CFG = window.SPA_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');

  // ---------- base path (GitHub project pages live under /REPO/) ----------
  const BASE = (() => {
    if (CFG.basePath !== null && CFG.basePath !== undefined) return CFG.basePath;
    if (location.hostname.endsWith('github.io')) {
      const seg = location.pathname.split('/')[1];
      return seg ? '/' + seg : '';
    }
    return '';
  })();

  // ---------- settings (test controls) ----------
  const DEFAULTS = { random: true, lateMs: 2000, identityMs: 0, pageLoad: false };
  const settings = Object.assign({}, DEFAULTS, (() => {
    try { return JSON.parse(localStorage.getItem('spa-test-settings') || '{}'); } catch (e) { return {}; }
  })());
  const save = () => { try { localStorage.setItem('spa-test-settings', JSON.stringify(settings)); } catch (e) {} };

  // ---------- logging ----------
  const logEl = $('#log');
  function log(msg) {
    const d = document.createElement('div');
    d.textContent = new Date().toLocaleTimeString() + '  ' + msg;
    logEl.prepend(d);
    while (logEl.children.length > 60) logEl.lastChild.remove();
  }

  // ---------- unstable class names ----------
  // c('btn') -> 'btn_x7k2a' (new suffix each call when randomizing), else 'btn'.
  const rnd = () => Math.random().toString(36).slice(2, 7);
  const c = (base) => (settings.random ? base + '_' + rnd() : base);

  // ---------- Pendo ----------
  const pendoLoaded = () => !!(window.pendo && CFG.pendoApiKey && CFG.pendoApiKey !== 'YOUR_PENDO_API_KEY');
  function initPendo() {
    if (!pendoLoaded()) { log('Pendo not loaded (no API key in config.js)'); return; }
    const go = () => {
      window.pendo.initialize({ visitor: CFG.visitor, account: CFG.account });
      log('pendo.initialize() called for visitor ' + CFG.visitor.id);
    };
    if (settings.identityMs > 0) {
      log('Delaying pendo.initialize() by ' + settings.identityMs + 'ms (simulated async identity)');
      setTimeout(go, settings.identityMs);
    } else go();
  }
  setInterval(() => {
    const el = $('#pendo-status');
    if (!pendoLoaded()) { el.textContent = 'Pendo: not loaded (set API key in config.js)'; return; }
    const ready = typeof window.pendo.isReady === 'function' && window.pendo.isReady();
    el.textContent = 'Pendo: ' + (ready ? 'agent ready ✔' : 'snippet present, agent not ready yet');
  }, 1000);

  // ---------- router ----------
  let routeToken = 0;     // invalidates late renders from a previous route
  let lastPath = null;

  const currentPath = () => {
    let p = location.pathname;
    if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
    return p.replace(/\/+$/, '') || '/';
  };
  const href = (path) => BASE + path;

  function go(path, replace) {
    history[replace ? 'replaceState' : 'pushState']({}, '', href(path));
    log((replace ? 'replaceState → ' : 'pushState → ') + href(path) + '  (no page load)');
    route();
  }

  function later(fn) {
    const token = routeToken;
    setTimeout(() => { if (token === routeToken) fn(); }, settings.lateMs);
  }

  const routes = [
    { re: /^\/$/,                 title: 'Home',          view: viewHome },
    { re: /^\/dashboard$/,        title: 'Dashboard',     view: viewDashboard },
    { re: /^\/reports$/,          title: 'Reports',       view: viewReports },
    { re: /^\/reports\/([^/]+)$/, title: 'Report detail', view: viewReportDetail },
    { re: /^\/settings$/,         title: 'Settings',      view: viewSettings },
    { re: /^\/legacy$/,           title: 'Legacy (hash)', view: viewLegacy }
  ];

  function route() {
    const path = currentPath();

    // Hash changes inside /legacy only swap the inner pane (typical hash-router behavior).
    if (path === '/legacy' && lastPath === '/legacy') { renderLegacyPane(); return; }
    lastPath = path;

    routeToken++;
    const match = routes.map(r => ({ r, m: path.match(r.re) })).find(x => x.m);
    document.querySelectorAll('#nav a').forEach(a => {
      const p = a.getAttribute('data-path');
      a.classList.toggle('active', p === path || (p !== '/' && path.startsWith(p + '/')));
    });

    if (match) {
      document.title = match.r.title + ' · SPA Test Bench';
      match.r.view(...match.m.slice(1));
    } else {
      document.title = 'Not found · SPA Test Bench';
      app.innerHTML = `<div data-ui="card"><h1>Not found</h1><p>No route for <code>${path}</code>.</p>
        <a data-link data-path="/" data-pendo="notfound-home">Go home</a></div>`;
    }
    log('Route rendered: ' + path + (location.search || '') + (location.hash || ''));
    if (settings.pageLoad && pendoLoaded()) { window.pendo.pageLoad(); log('pendo.pageLoad() called'); }
  }

  // ---------- views ----------
  function viewHome() {
    app.innerHTML = `
      <h1 data-pendo="home-title">SPA Test Bench</h1>
      <p class="sub">A tiny single page app for testing guides. Navigation here never reloads the page.</p>
      <div data-ui="card" class="${c('card')}">
        <h3>What to test where</h3>
        <table>
          <tr><th>Behavior</th><th>Where</th><th>Stable hook</th></tr>
          <tr><td>Route change, no page load (pushState)</td><td>Any nav link</td><td><code>[data-pendo^="nav-"]</code></td></tr>
          <tr><td>Parameterized URL</td><td><a data-link data-path="/reports/42" data-pendo="home-report-link">/reports/42</a></td><td>Page rule <code>//*/reports/*</code></td></tr>
          <tr><td>Query string state</td><td><a data-link data-path="/reports?status=open" data-pendo="home-query-link">/reports?status=open</a></td><td>Page rule with query param</td></tr>
          <tr><td>Late-rendered elements</td><td><a data-link data-path="/dashboard" data-pendo="home-dash-link">Dashboard</a></td><td><code>[data-pendo="export-btn"]</code></td></tr>
          <tr><td>Random class names</td><td>Everywhere (toggle in test controls)</td><td>Use <code>data-pendo</code>, not classes</td></tr>
          <tr><td>Same URL, different views</td><td><a data-link data-path="/settings" data-pendo="home-settings-link">Settings</a> (tabs, modal, wizard)</td><td>Element-on-page conditions</td></tr>
          <tr><td>Hash routing</td><td><a data-link data-path="/legacy" data-pendo="home-legacy-link">Legacy</a></td><td>Page rule with hash</td></tr>
        </table>
      </div>
      <div data-ui="card" class="${c('card')}">
        <button data-ui="btn" class="${c('btn')}" id="home-cta" data-pendo="home-cta" type="button">Primary action</button>
        <button data-ui="btn" data-variant="ghost" class="${c('btn')}" id="rerender-btn" data-pendo="rerender-btn" type="button">Destroy &amp; re-render this view</button>
        <p class="hint" style="color:var(--muted)">The second button replaces every element on the page, to test guides that lose their anchor.</p>
      </div>`;
    $('#rerender-btn').addEventListener('click', () => { log('Manual re-render (DOM replaced)'); viewHome(); });
  }

  function viewDashboard() {
    app.innerHTML = `
      <h1 data-pendo="dash-title">Dashboard</h1>
      <p class="sub">Widgets render after the late-render delay (${settings.lateMs}ms), like data-driven components.</p>
      <div data-ui="grid" id="widgets">
        <div data-ui="skeleton"></div><div data-ui="skeleton"></div><div data-ui="skeleton"></div>
      </div>
      <div id="toolbar" style="margin-top:16px"></div>`;
    later(() => {
      $('#widgets').innerHTML = ['Active users', 'Sessions', 'Conversion'].map((t, i) => `
        <div data-ui="card" class="${c('card')}" data-pendo="widget-${i}">
          <div style="color:var(--muted)">${t}</div>
          <div style="font-size:28px;font-weight:700">${[1284, 5902, '3.4%'][i]}</div>
        </div>`).join('');
      $('#toolbar').innerHTML = `
        <button data-ui="btn" class="${c('btn')}" id="export-btn" data-pendo="export-btn" type="button">Export CSV</button>
        <span class="badge" data-pendo="late-badge">New</span>`;
      $('#export-btn').addEventListener('click', () => log('Export CSV clicked'));
      // also add a late nav item to the global header
      if (!$('#nav [data-pendo="nav-insights"]')) {
        const a = document.createElement('a');
        a.setAttribute('data-link', ''); a.setAttribute('data-path', '/reports');
        a.setAttribute('data-pendo', 'nav-insights'); a.className = c('nav-item');
        a.href = href('/reports'); a.textContent = 'Insights ✨';
        $('#nav').appendChild(a);
      }
      log('Late elements rendered: widgets, #export-btn, nav-insights');
    });
  }

  const REPORTS = [
    { id: 42, name: 'Weekly engagement', status: 'open' },
    { id: 57, name: 'Feature adoption', status: 'closed' },
    { id: 63, name: 'Retention cohorts', status: 'open' }
  ];

  function viewReports() {
    const status = new URLSearchParams(location.search).get('status');
    const rows = REPORTS.filter(r => !status || r.status === status);
    app.innerHTML = `
      <h1 data-pendo="reports-title">Reports</h1>
      <p class="sub">Filter: <a data-link data-path="/reports" data-pendo="filter-all">all</a> ·
        <a data-link data-path="/reports?status=open" data-pendo="filter-open">open</a> ·
        <a data-link data-path="/reports?status=closed" data-pendo="filter-closed">closed</a></p>
      <div data-ui="card" class="${c('card')}">
        <table data-pendo="reports-table">
          <tr><th>ID</th><th>Name</th><th>Status</th></tr>
          ${rows.map(r => `<tr><td>${r.id}</td>
            <td><a data-link data-path="/reports/${r.id}" data-pendo="report-link-${r.id}">${r.name}</a></td>
            <td><span class="badge">${r.status}</span></td></tr>`).join('')}
        </table>
      </div>`;
  }

  function viewReportDetail(id) {
    const r = REPORTS.find(x => String(x.id) === id);
    app.innerHTML = `
      <p><a data-link data-path="/reports" data-pendo="back-to-reports">← Reports</a></p>
      <h1 data-pendo="report-title">${r ? r.name : 'Report ' + id}</h1>
      <p class="sub">URL parameter: <code>${id}</code></p>
      <div data-ui="card" class="${c('card')}"><button data-ui="btn" class="${c('btn')}" data-pendo="share-report" type="button">Share report</button></div>`;
  }

  // Settings: tabs, modal and wizard all change the view WITHOUT changing the URL.
  const settingsState = { tab: 'profile', modal: false, wizard: 0 };
  function viewSettings() {
    const s = settingsState;
    const tabs = ['profile', 'billing', 'team'];
    const body = {
      profile: `<label class="field">Display name<input type="text" value="Test User" data-pendo="field-name"></label>
                <label class="field">Email<input type="email" value="tester@example.com" data-pendo="field-email"></label>`,
      billing: `<p>Plan: <span class="badge">Trial</span></p><button data-ui="btn" class="${c('btn')}" data-pendo="upgrade-btn" type="button">Upgrade plan</button>`,
      team: `<p>2 members</p><button data-ui="btn" class="${c('btn')}" id="invite-btn" data-pendo="invite-btn" type="button">Invite teammate</button>`
    }[s.tab];
    const stepNames = ['Connect', 'Configure', 'Finish'];
    app.innerHTML = `
      <h1 data-pendo="settings-title">Settings</h1>
      <p class="sub">URL stays <code>${location.pathname}</code> through every tab, modal and wizard step.</p>
      <div data-ui="tabs" role="tablist">
        ${tabs.map(t => `<button data-ui="tab" class="${c('tab')}" role="tab" aria-selected="${t === s.tab}" data-tab="${t}" data-pendo="tab-${t}" type="button">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
      </div>
      <div data-ui="card" class="${c('card')}" data-pendo="tab-body">${body}</div>
      <div data-ui="card" class="${c('card')}" data-pendo="wizard">
        <h3>Setup wizard</h3>
        <div class="steps">${stepNames.map((n, i) => `<div class="step ${i === s.wizard ? 'on' : ''}" data-pendo="wizard-step-${i}">${i + 1}. ${n}</div>`).join('')}</div>
        <button data-ui="btn" data-variant="ghost" class="${c('btn')}" id="wiz-back" data-pendo="wizard-back" type="button" ${s.wizard === 0 ? 'disabled' : ''}>Back</button>
        <button data-ui="btn" class="${c('btn')}" id="wiz-next" data-pendo="wizard-next" type="button">${s.wizard === 2 ? 'Restart' : 'Next'}</button>
      </div>
      ${s.modal ? `<div data-ui="overlay" id="modal-overlay"><div data-ui="modal" class="${c('modal')}" data-pendo="invite-modal" role="dialog">
        <h3>Invite teammate</h3>
        <label class="field">Email<input type="email" placeholder="name@company.com" data-pendo="invite-email"></label>
        <button data-ui="btn" data-variant="ghost" class="${c('btn')}" id="modal-cancel" data-pendo="modal-cancel" type="button">Cancel</button>
        <button data-ui="btn" class="${c('btn')}" id="modal-send" data-pendo="modal-send" type="button">Send invite</button>
      </div></div>` : ''}`;

    app.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      s.tab = b.dataset.tab; log('Tab → ' + s.tab + ' (URL unchanged)'); viewSettings();
    }));
    const inv = $('#invite-btn'); if (inv) inv.addEventListener('click', () => { s.modal = true; log('Modal opened (URL unchanged)'); viewSettings(); });
    const closeModal = () => { s.modal = false; log('Modal closed'); viewSettings(); };
    const mc = $('#modal-cancel'); if (mc) mc.addEventListener('click', closeModal);
    const ms = $('#modal-send'); if (ms) ms.addEventListener('click', closeModal);
    $('#wiz-next').addEventListener('click', () => { s.wizard = s.wizard === 2 ? 0 : s.wizard + 1; log('Wizard step → ' + (s.wizard + 1) + ' (URL unchanged)'); viewSettings(); });
    $('#wiz-back').addEventListener('click', () => { s.wizard = Math.max(0, s.wizard - 1); log('Wizard step → ' + (s.wizard + 1)); viewSettings(); });
  }

  // Legacy: hash-based sub-routing inside a single pathname.
  function viewLegacy() {
    app.innerHTML = `
      <h1 data-pendo="legacy-title">Legacy (hash routing)</h1>
      <p class="sub">The pathname stays <code>/legacy</code>; only the <code>#fragment</code> changes.</p>
      <div data-ui="tabs">
        <a data-ui="tab" class="${c('tab')}" href="#/overview" data-pendo="hash-overview">Overview</a>
        <a data-ui="tab" class="${c('tab')}" href="#/details" data-pendo="hash-details">Details</a>
        <a data-ui="tab" class="${c('tab')}" href="#/history" data-pendo="hash-history">History</a>
      </div>
      <div id="legacy-pane"></div>`;
    renderLegacyPane();
  }
  function renderLegacyPane() {
    const h = (location.hash || '#/overview').replace('#/', '');
    const pane = $('#legacy-pane'); if (!pane) return;
    pane.innerHTML = `<div data-ui="card" class="${c('card')}" data-pendo="legacy-${h}"><h3>${h[0].toUpperCase() + h.slice(1)}</h3>
      <p>Hash route <code>#/${h}</code></p><button data-ui="btn" class="${c('btn')}" data-pendo="legacy-action" type="button">Action</button></div>`;
    document.querySelectorAll('#app [data-ui="tab"][href]').forEach(a => a.setAttribute('aria-selected', String(a.getAttribute('href') === '#/' + h)));
    log('Hash pane rendered: #/' + h);
  }

  // ---------- wiring ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (!a) return;
    e.preventDefault();
    go(a.getAttribute('data-path'));
  });
  window.addEventListener('popstate', () => { log('popstate (back/forward or hash change)'); route(); });

  // nav hrefs (so right-click/open-in-new-tab work and URLs are correct under /REPO/)
  document.querySelectorAll('a[data-link]').forEach(a => { a.href = href(a.getAttribute('data-path')); });

  // debug panel
  $('#debug-toggle').addEventListener('click', () => $('#debug').classList.toggle('collapsed'));
  $('#opt-random').checked = settings.random;
  $('#opt-late').value = settings.lateMs;
  $('#opt-identity').value = settings.identityMs;
  $('#opt-pageload').checked = settings.pageLoad;
  $('#opt-random').addEventListener('change', e => { settings.random = e.target.checked; save(); });
  $('#opt-late').addEventListener('change', e => { settings.lateMs = Math.max(0, +e.target.value || 0); save(); });
  $('#opt-identity').addEventListener('change', e => { settings.identityMs = Math.max(0, +e.target.value || 0); save(); });
  $('#opt-pageload').addEventListener('change', e => { settings.pageLoad = e.target.checked; save(); });

  log('Boot. base path = "' + BASE + '"');
  initPendo();
  route();
})();
