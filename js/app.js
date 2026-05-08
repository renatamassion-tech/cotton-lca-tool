// ─────────────────────────────────────────────
// Cotton LCA Tool — Main App
// ─────────────────────────────────────────────

// ── App State ──────────────────────────────────
const state = {
  // Option 1 — Cotton Model Check
  modelCheckData: null,
  modelCheckFile: null,
  // Option 2 — GaBi Export Check
  gabiModelData: null,
  gabiModelFile: null,
  gabiExportData: null,
  gabiExportFile: null,
  comparisonRows: [],
  activeGabiTab: 'summary',
  gabiLciaValues: {},
  // Comparison filters
  statusFilter: 'all',
  typeFilter: 'all',
  searchTerm: '',
};

// ── Page Navigation ─────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  window.scrollTo(0, 0);
}

// ── Utility ─────────────────────────────────────
function fmt(val, decimals = 4) {
  if (val === null || val === undefined || val === '') return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (Math.abs(n) >= 1e9) return n.toExponential(3);
  if (Math.abs(n) >= 1e6) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

function fmtPct(val) {
  if (val === null || val === undefined) return '—';
  return val.toFixed(4) + '%';
}

function fmtSci(val) {
  if (val === null || val === undefined) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(4);
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

// ── Status Badges ────────────────────────────────
function statusBadge(status) {
  const classes = {
    'MATCH':               'bg-green-100 text-green-800 border border-green-200',
    'ROUNDING':            'bg-blue-100 text-blue-800 border border-blue-200',
    'SMALL DIFF (<1%)':    'bg-yellow-100 text-yellow-800 border border-yellow-200',
    'MODERATE DIFF (<5%)': 'bg-orange-100 text-orange-800 border border-orange-200',
    'LARGE DIFF':          'bg-red-100 text-red-800 border border-red-200',
    'MISSING':             'bg-red-900 text-white',
    'NOT TRACKED':         'bg-gray-100 text-gray-500 border border-gray-200',
    'Within range':        'bg-green-100 text-green-800 border border-green-200',
    'Outside range':       'bg-red-100 text-red-800 border border-red-200',
  };
  const cls = classes[status] || 'bg-gray-100 text-gray-600';
  return `<span class="inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls} whitespace-nowrap">${status}</span>`;
}

function materialityBadge(m) {
  if (!m) return '';
  const cls = m === 'HIGH' ? 'bg-red-100 text-red-700' : m === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600';
  return `<span class="inline-flex px-1.5 py-0.5 rounded text-xs ${cls}">${m}</span>`;
}

// ── File Upload UI Helpers ───────────────────────
function makeDropzone(inputId, labelText, accept = '.xlsx,.xls') {
  return `
    <label for="${inputId}" class="flex flex-col items-center justify-center border-2 border-dashed border-green-300 rounded-xl p-8 cursor-pointer bg-green-50 hover:bg-green-100 transition-colors group">
      <svg class="w-10 h-10 text-green-400 mb-3 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <span class="text-sm font-medium text-green-700">${labelText}</span>
      <span class="text-xs text-green-500 mt-1">Click to browse or drag & drop</span>
      <input id="${inputId}" type="file" accept="${accept}" class="hidden">
    </label>`;
}

function fileStatusDiv(id) {
  return `<div id="${id}" class="mt-2 hidden"></div>`;
}

function showFileStatus(divId, filename, sheetName, paramCount) {
  const div = document.getElementById(divId);
  if (!div) return;
  div.className = 'mt-2 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3';
  div.innerHTML = `
    <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
    </svg>
    <div class="min-w-0">
      <p class="text-sm font-medium text-green-800 truncate">${filename}</p>
      ${sheetName ? `<p class="text-xs text-green-600">Tab: <strong>${sheetName}</strong></p>` : ''}
      ${paramCount ? `<p class="text-xs text-green-600">${paramCount} parameters parsed</p>` : ''}
    </div>`;
  div.classList.remove('hidden');
}

function showFileError(divId, msg) {
  const div = document.getElementById(divId);
  if (!div) return;
  div.className = 'mt-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700';
  div.innerHTML = `<svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>${msg}`;
  div.classList.remove('hidden');
}

// ── Parse file via FileReader ───────────────────
function readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        resolve(wb);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── Shared Page Header ───────────────────────────
function pageHeader(title) {
  return `
    <header class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
      <div class="max-w-7xl mx-auto flex items-center gap-4">
        <button onclick="showPage('page-home')" class="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Home
        </button>
        <span class="text-gray-300">|</span>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-green-600 rounded flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <h1 class="text-sm font-semibold text-gray-900">${title}</h1>
        </div>
      </div>
    </header>`;
}

// ════════════════════════════════════════════════
// HOME PAGE
// ════════════════════════════════════════════════
function renderHome() {
  document.getElementById('page-home').innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="max-w-4xl mx-auto flex items-center gap-3">
          <div class="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-bold text-gray-900">Cotton LCA QC Tool</h1>
            <p class="text-xs text-gray-500">Worldly · Cascale Cotton Program</p>
          </div>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-6 py-12">
        <div class="text-center mb-10">
          <h2 class="text-3xl font-bold text-gray-900 mb-3">Cotton Model Quality Check</h2>
          <p class="text-gray-600 max-w-xl mx-auto">Check cotton LCA models against baseline reference distributions before and after GaBi modeling.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Option 1: Cotton Model Check -->
          <button onclick="showPage('page-model-check'); initModelCheckPage()"
            class="text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-md hover:border-green-300 transition-all group">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-200 transition-colors">
              <svg class="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Cotton Model Check</h3>
            <p class="text-gray-500 text-sm mb-4">Upload the draft model to check inventory parameters (fertilisers, pesticides, water, diesel, ginning %) against 6-program baseline reference distributions.</p>
            <div class="flex flex-wrap gap-2">
              <span class="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1">Inventory Outlier Check</span>
              <span class="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1">Pre-GaBi QC</span>
              <span class="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1">16 Parameters</span>
            </div>
            <div class="mt-5 flex items-center text-green-700 font-medium text-sm group-hover:translate-x-1 transition-transform">
              Open Check <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </div>
          </button>

          <!-- Option 2: GaBi Export Check -->
          <button onclick="showPage('page-gabi'); initGaBiPage()"
            class="text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-md hover:border-teal-300 transition-all group">
            <div class="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-teal-200 transition-colors">
              <svg class="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Exported GaBi Model Check</h3>
            <p class="text-gray-500 text-sm mb-4">Upload the draft model + GaBi export to verify all parameters transferred correctly, check inventory outliers, and enter LCIA results for baseline comparison.</p>
            <div class="flex flex-wrap gap-2">
              <span class="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded px-2 py-1">Full Comparison</span>
              <span class="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded px-2 py-1">Inventory Outliers</span>
              <span class="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded px-2 py-1">LCIA Check</span>
            </div>
            <div class="mt-5 flex items-center text-teal-700 font-medium text-sm group-hover:translate-x-1 transition-transform">
              Open Check <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </div>
          </button>
        </div>

        <p class="text-center text-xs text-gray-400 mt-10">
          Inventory reference: up to 6 programs (USCTP, Pakistan, Tajikistan, China, Agropima, India) · LCIA reference: 8 programs · per 1 kg cotton lint
        </p>
      </main>
    </div>`;
}

// ════════════════════════════════════════════════
// OPTION 1 — COTTON MODEL CHECK (Inventory Outlier)
// ════════════════════════════════════════════════
function initModelCheckPage() {
  state.modelCheckData = null;
  state.modelCheckFile = null;

  document.getElementById('page-model-check').innerHTML = `
    <div class="min-h-screen bg-gray-50">
      ${pageHeader('Cotton Model Check — Inventory Outlier Check')}
      <main class="max-w-7xl mx-auto px-4 py-8 space-y-6">

        <!-- Upload -->
        <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-base font-semibold text-gray-800 mb-1">Upload Draft Model</h2>
          <p class="text-sm text-gray-500 mb-4">
            The tool will find the seed cotton (unginned) tab, extract all inventory parameters, and flag anything outside the 6-program baseline distribution (mean ± 2 SD).
          </p>
          <div class="max-w-md">
            ${makeDropzone('model-check-input', 'Draft Model (.xlsx)')}
            ${fileStatusDiv('model-check-status')}
          </div>
        </section>

        <!-- Reference stats (always visible) -->
        <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100">
            <h2 class="text-base font-semibold text-gray-800">Reference Distribution Statistics</h2>
            <p class="text-xs text-gray-500 mt-1">Up to 6 programs (USCTP, Pakistan, Tajikistan, China, Agropima, India) · non-zero values only · per 1 kg cotton lint where normalised</p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-gray-50">
                <tr>
                  ${['Parameter','Category','Unit','Normalisation','n','Mean','Std Dev','CV (%)','Lower Bound','Upper Bound','Min','Max']
                    .map(h => `<th class="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                ${INVENTORY_REFERENCE.map(r => `
                  <tr class="hover:bg-gray-50">
                    <td class="px-3 py-2 font-medium text-gray-900">${r.parameter}</td>
                    <td class="px-3 py-2 text-gray-500">${r.category}</td>
                    <td class="px-3 py-2 text-gray-500">${r.unit}</td>
                    <td class="px-3 py-2 text-gray-500">${r.normalisation}</td>
                    <td class="px-3 py-2 text-gray-600">${r.n}</td>
                    <td class="px-3 py-2 font-mono text-gray-900">${r.mean}</td>
                    <td class="px-3 py-2 font-mono text-gray-700">${r.stdDev}</td>
                    <td class="px-3 py-2 text-gray-600">${r.cv}</td>
                    <td class="px-3 py-2 font-mono text-blue-700">${r.lower}</td>
                    <td class="px-3 py-2 font-mono text-blue-700">${r.upper}</td>
                    <td class="px-3 py-2 font-mono text-gray-500">${r.min}</td>
                    <td class="px-3 py-2 font-mono text-gray-500">${r.max}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Results — shown after upload -->
        <div id="model-check-results">
          <div class="bg-gray-100 border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            Upload a draft model above to see the inventory outlier check results.
          </div>
        </div>

      </main>
    </div>`;

  document.getElementById('model-check-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const wb = await readWorkbook(file);
      state.modelCheckData = parseModelFile(wb);
      state.modelCheckFile = file.name;
      showFileStatus('model-check-status', file.name, state.modelCheckData.sheetName, Object.keys(state.modelCheckData.params).length);
      renderModelCheckResults();
    } catch (err) {
      showFileError('model-check-status', 'Failed to parse file: ' + err.message);
    }
  });
}

function renderModelCheckResults() {
  const container = document.getElementById('model-check-results');
  if (!state.modelCheckData) {
    container.innerHTML = `<div class="bg-gray-100 border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">Upload a draft model above to see results.</div>`;
    return;
  }

  const inventoryValues = computeInventoryValues(state.modelCheckData.params);
  const rows = buildInventoryComparison(inventoryValues);
  const flagged = rows.filter(r => r.status === 'Outside range').length;
  const checked = rows.filter(r => r.modelValue !== null).length;
  const missing = rows.filter(r => r.modelValue === null).length;

  container.innerHTML = `
    <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="text-base font-semibold text-gray-800">Inventory Outlier Check Results</h2>
          <p class="text-xs text-gray-500 mt-1">
            ${state.modelCheckFile} · Tab: ${state.modelCheckData.sheetName} ·
            ${checked} checked · ${flagged} flagged · ${missing} not found in model
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          ${flagged > 0
            ? `<span class="bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-sm font-medium">${flagged} Outside Range</span>`
            : `<span class="bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-1 text-sm font-medium">All Within Range</span>`}
          ${missing > 0 ? `<span class="bg-gray-100 text-gray-600 border border-gray-200 rounded-lg px-3 py-1 text-sm">${missing} Not Found</span>` : ''}
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-50">
            <tr>
              ${['Parameter','Category','Value from Model','Unit','Normalisation','Mean','Std Dev','Lower','Upper','Z-Score','Status','Notes','LCIA Driver','Materiality']
                .map(h => `<th class="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${rows.map(r => `
              <tr class="${r.status === 'Outside range' ? 'bg-red-50' : r.modelValue === null ? 'bg-gray-50' : 'hover:bg-gray-50'}">
                <td class="px-3 py-2.5 font-medium text-gray-900">${r.parameter}</td>
                <td class="px-3 py-2.5 text-gray-500">${r.category}</td>
                <td class="px-3 py-2.5 font-mono font-semibold ${r.modelValue === null ? 'text-gray-400 italic' : r.status === 'Outside range' ? 'text-red-700' : 'text-gray-900'}">
                  ${r.modelValue !== null ? fmtSci(r.modelValue) : 'Not found'}</td>
                <td class="px-3 py-2.5 text-gray-500">${r.unit}</td>
                <td class="px-3 py-2.5 text-gray-500">${r.normalisation}</td>
                <td class="px-3 py-2.5 font-mono text-gray-700">${r.mean}</td>
                <td class="px-3 py-2.5 font-mono text-gray-600">${r.stdDev}</td>
                <td class="px-3 py-2.5 font-mono text-blue-700">${r.lower}</td>
                <td class="px-3 py-2.5 font-mono text-blue-700">${r.upper}</td>
                <td class="px-3 py-2.5 font-mono ${r.zScore !== null && Math.abs(r.zScore) > 2 ? 'text-red-600 font-semibold' : 'text-gray-700'}">${r.zScore !== null ? r.zScore.toFixed(3) : '—'}</td>
                <td class="px-3 py-2.5">${r.status ? statusBadge(r.status) : '—'}</td>
                <td class="px-3 py-2.5 text-gray-500 max-w-xs">${r.notes}</td>
                <td class="px-3 py-2.5 text-gray-600">${r.lciaDriver || '—'}</td>
                <td class="px-3 py-2.5">${materialityBadge(r.materiality)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
        Lower bounds use observed minimum where Mean − 2SD is negative. Materiality: HIGH ≥ 100 pts · MEDIUM 10–100 pts · LOW &lt; 10 pts (Cotton Inc. USA, largely rainfed — tiers will differ for other programs).
      </div>
    </section>`;
}

// ════════════════════════════════════════════════
// OPTION 2 — GABI MODEL CHECK
// ════════════════════════════════════════════════
function initGaBiPage() {
  state.comparisonRows = [];
  state.activeGabiTab = 'summary';
  state.gabiLciaValues = {};

  document.getElementById('page-gabi').innerHTML = `
    <div class="min-h-screen bg-gray-50">
      ${pageHeader('Exported GaBi Model Check')}
      <main class="max-w-7xl mx-auto px-4 py-8 space-y-6">

        <!-- File Uploads -->
        <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-base font-semibold text-gray-800 mb-4">Upload Files</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p class="text-sm font-medium text-gray-700 mb-2">Draft Model</p>
              ${makeDropzone('gabi-model-input', 'Draft Model (.xlsx)')}
              ${fileStatusDiv('gabi-model-status')}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-700 mb-2">GaBi Export</p>
              ${makeDropzone('gabi-export-input', 'GaBi Export (.xlsx)')}
              ${fileStatusDiv('gabi-export-status')}
            </div>
          </div>
          <div class="mt-5">
            <button id="run-gabi-btn" onclick="runGaBiCheck()" disabled
              class="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
              Run Comparison
            </button>
          </div>
        </section>

        <!-- Results -->
        <div id="gabi-results" class="hidden">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="border-b border-gray-200 px-2 flex gap-1 pt-2 overflow-x-auto">
              ${[
                { id: 'summary',    label: 'Summary' },
                { id: 'comparison', label: 'Full Comparison' },
                { id: 'inventory',  label: 'Inventory Outlier Check' },
                { id: 'lcia',       label: 'LCIA Outlier Check' },
              ].map((tab, i) => `
                <button onclick="switchGaBiTab('${tab.id}')" id="tab-btn-${tab.id}"
                  class="tab-btn flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px
                    ${i === 0 ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}">
                  ${tab.label}
                </button>`).join('')}
            </div>
            <div id="gabi-tab-content" class="p-6"></div>
          </div>
        </div>

      </main>
    </div>`;

  // Wire model upload
  document.getElementById('gabi-model-input').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const wb = await readWorkbook(file);
      state.gabiModelData = parseModelFile(wb);
      state.gabiModelFile = file.name;
      showFileStatus('gabi-model-status', file.name, state.gabiModelData.sheetName, Object.keys(state.gabiModelData.params).length);
      checkGaBiRunReady();
    } catch (err) { showFileError('gabi-model-status', 'Failed to parse: ' + err.message); }
  });

  // Wire GaBi export upload
  document.getElementById('gabi-export-input').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const wb = await readWorkbook(file);
      state.gabiExportData = parseGaBiFile(wb);
      state.gabiExportFile = file.name;
      showFileStatus('gabi-export-status', file.name, state.gabiExportData.processName || null, Object.keys(state.gabiExportData.params).length);
      checkGaBiRunReady();
    } catch (err) { showFileError('gabi-export-status', 'Failed to parse: ' + err.message); }
  });
}

function checkGaBiRunReady() {
  const btn = document.getElementById('run-gabi-btn');
  if (btn) btn.disabled = !(state.gabiModelData && state.gabiExportData);
}

function runGaBiCheck() {
  state.comparisonRows = buildComparison(state.gabiExportData.params, state.gabiModelData.params);
  document.getElementById('gabi-results').classList.remove('hidden');
  switchGaBiTab('summary');
}

function switchGaBiTab(tabId) {
  state.activeGabiTab = tabId;
  const activeClass = 'border-teal-600 text-teal-700 bg-teal-50';
  const inactiveClass = 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50';
  ['summary', 'comparison', 'inventory', 'lcia'].forEach(id => {
    const btn = document.getElementById(`tab-btn-${id}`);
    if (!btn) return;
    btn.className = `tab-btn flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px ${id === tabId ? activeClass : inactiveClass}`;
  });

  const content = document.getElementById('gabi-tab-content');
  if (tabId === 'summary')    content.innerHTML = renderSummaryTab();
  else if (tabId === 'comparison') { content.innerHTML = renderComparisonTab(); }
  else if (tabId === 'inventory')  content.innerHTML = renderGaBiInventoryTab();
  else if (tabId === 'lcia')       content.innerHTML = renderLCIAOutlierTab();
}

// ── Summary Tab ─────────────────────────────────
function renderSummaryTab() {
  const { counts, total, mappedCount, missingCount } = buildSummary(state.comparisonRows);

  const statuses = [
    { key: 'MATCH',               label: 'Match',              desc: 'Exact match (or confirmed name mapping matches)',               color: 'green' },
    { key: 'ROUNDING',            label: 'Rounding',           desc: 'Difference < 1% — rounding only, no action needed',            color: 'blue' },
    { key: 'SMALL DIFF (<1%)',    label: 'Small Diff (<1%)',   desc: 'Difference 0.01%–1% — monitor, likely acceptable',             color: 'yellow' },
    { key: 'MODERATE DIFF (<5%)', label: 'Moderate Diff (<5%)',desc: 'Difference 1%–5% — review recommended',                        color: 'orange' },
    { key: 'LARGE DIFF',          label: 'Large Diff (≥5%)',   desc: 'Difference ≥ 5% — investigate immediately',                   color: 'red' },
    { key: 'MISSING',             label: 'Missing',            desc: 'GaBi param not found in model even after name mapping',        color: 'rose' },
    { key: 'NOT TRACKED',         label: 'Not Tracked',        desc: 'Pesticide in GaBi with no model equivalent (all zero)',        color: 'gray' },
  ];

  const colorMap = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    rose: 'bg-red-100 border-red-300 text-red-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-500',
  };

  const needsAttention = state.comparisonRows.filter(r => r.status === 'LARGE DIFF' || r.status === 'MISSING');

  return `
    <div class="space-y-6">
      <div>
        <h3 class="text-base font-semibold text-gray-800 mb-1">Comparison Summary</h3>
        <p class="text-sm text-gray-500">
          ${state.gabiModelFile || ''} vs ${state.gabiExportFile || ''}
          ${state.gabiExportData?.processName ? ` · <strong>${state.gabiExportData.processName}</strong>` : ''}
        </p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        ${statuses.map(s => `
          <div class="border rounded-xl p-4 ${colorMap[s.color]}">
            <div class="text-2xl font-bold">${counts[s.key] || 0}</div>
            <div class="text-xs font-semibold mt-1 leading-tight">${s.label}</div>
          </div>`).join('')}
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-2xl font-bold text-gray-900">${total}</div>
          <div class="text-gray-500 text-xs mt-1">Total GaBi parameters</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-2xl font-bold text-gray-900">${mappedCount}</div>
          <div class="text-gray-500 text-xs mt-1">Resolved via name mapping</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-2xl font-bold ${missingCount > 0 ? 'text-red-700' : 'text-green-700'}">${missingCount}</div>
          <div class="text-gray-500 text-xs mt-1">Still unresolved (MISSING)</div>
        </div>
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>${['Status','Count','Description'].map(h => `<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">${h}</th>`).join('')}</tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${statuses.map(s => `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">${statusBadge(s.key)}</td>
                <td class="px-4 py-3 font-semibold text-gray-900">${counts[s.key] || 0}</td>
                <td class="px-4 py-3 text-gray-600">${s.desc}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      ${needsAttention.length > 0 ? `
        <div class="bg-red-50 border border-red-200 rounded-xl p-5">
          <h4 class="font-semibold text-red-800 mb-3 text-sm">⚠ Parameters Requiring Attention (${needsAttention.length})</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr>${['GaBi Parameter','Model Parameter','Type','GaBi Value','Model Value','% Diff','Status','Notes']
                  .map(h => `<th class="px-3 py-2 text-left font-semibold text-red-700">${h}</th>`).join('')}</tr>
              </thead>
              <tbody class="divide-y divide-red-100">
                ${needsAttention.map(r => `
                  <tr class="bg-white">
                    <td class="px-3 py-2 font-mono">${r.gabiParam}</td>
                    <td class="px-3 py-2 font-mono">${r.modelParam}</td>
                    <td class="px-3 py-2 text-gray-600">${r.type}</td>
                    <td class="px-3 py-2 font-mono">${fmt(r.gabiValue)}</td>
                    <td class="px-3 py-2 font-mono">${r.modelValue !== null ? fmt(r.modelValue) : '—'}</td>
                    <td class="px-3 py-2 font-mono">${r.pctDiff !== null ? fmtPct(r.pctDiff) : '—'}</td>
                    <td class="px-3 py-2">${statusBadge(r.status)}</td>
                    <td class="px-3 py-2 text-gray-500">${r.notes}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}
    </div>`;
}

// ── Full Comparison Tab ──────────────────────────
function renderComparisonTab() {
  const filtered = getFilteredRows();
  return `
    <div class="space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-gray-600">Status:</label>
          <select id="filter-status" onchange="applyFilters()" class="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="all">All</option>
            <option value="LARGE DIFF">Large Diff</option>
            <option value="MISSING">Missing</option>
            <option value="MODERATE DIFF (<5%)">Moderate Diff</option>
            <option value="SMALL DIFF (<1%)">Small Diff</option>
            <option value="ROUNDING">Rounding</option>
            <option value="MATCH">Match</option>
            <option value="NOT TRACKED">Not Tracked</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-gray-600">Type:</label>
          <select id="filter-type" onchange="applyFilters()" class="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="all">All</option>
            <option value="Input">Input</option>
            <option value="Output">Output</option>
          </select>
        </div>
        <input id="filter-search" type="text" placeholder="Search parameters…" oninput="applyFilters()"
          class="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-teal-500">
        <span id="filter-count" class="text-xs text-gray-500 ml-auto">${filtered.length} of ${state.comparisonRows.length} rows</span>
      </div>
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-xs">
          <thead class="bg-gray-50">
            <tr>${['GaBi Parameter','Model Parameter','Type','GaBi Value','Model Value','% Diff','Status','Notes']
              .map(h => `<th class="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}</tr>
          </thead>
          <tbody id="comparison-tbody" class="divide-y divide-gray-100">
            ${renderComparisonRows(filtered)}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderComparisonRows(rows) {
  if (!rows.length) return `<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">No rows match the current filter.</td></tr>`;
  return rows.map(r => `
    <tr class="hover:bg-gray-50 ${r.status === 'LARGE DIFF' || r.status === 'MISSING' ? 'bg-red-50' : ''}">
      <td class="px-3 py-2 font-mono text-gray-800">${r.gabiParam}</td>
      <td class="px-3 py-2 font-mono text-gray-700">${r.modelParam}</td>
      <td class="px-3 py-2 text-gray-500">${r.type}</td>
      <td class="px-3 py-2 font-mono">${fmt(r.gabiValue)}</td>
      <td class="px-3 py-2 font-mono">${r.modelValue !== null ? fmt(r.modelValue) : '—'}</td>
      <td class="px-3 py-2 font-mono">${r.pctDiff !== null ? fmtPct(r.pctDiff) : '—'}</td>
      <td class="px-3 py-2">${statusBadge(r.status)}</td>
      <td class="px-3 py-2 text-gray-400 max-w-xs truncate" title="${r.notes || ''}">${r.notes || ''}</td>
    </tr>`).join('');
}

function getFilteredRows() {
  const statusF = document.getElementById('filter-status')?.value || state.statusFilter;
  const typeF   = document.getElementById('filter-type')?.value   || state.typeFilter;
  const search  = (document.getElementById('filter-search')?.value || state.searchTerm).toLowerCase();
  return state.comparisonRows.filter(r => {
    if (statusF !== 'all' && r.status !== statusF) return false;
    if (typeF   !== 'all' && r.type   !== typeF)   return false;
    if (search  && !r.gabiParam.toLowerCase().includes(search) && !r.modelParam.toLowerCase().includes(search)) return false;
    return true;
  });
}

function applyFilters() {
  state.statusFilter = document.getElementById('filter-status')?.value || 'all';
  state.typeFilter   = document.getElementById('filter-type')?.value   || 'all';
  state.searchTerm   = document.getElementById('filter-search')?.value || '';
  const filtered = getFilteredRows();
  const tbody = document.getElementById('comparison-tbody');
  if (tbody) tbody.innerHTML = renderComparisonRows(filtered);
  const cnt = document.getElementById('filter-count');
  if (cnt) cnt.textContent = `${filtered.length} of ${state.comparisonRows.length} rows`;
}

// ── GaBi Inventory Outlier Tab ───────────────────
function renderGaBiInventoryTab() {
  const inventoryValues = computeInventoryValues(state.gabiModelData.params);
  const rows = buildInventoryComparison(inventoryValues);
  const flagged = rows.filter(r => r.status === 'Outside range').length;
  const checked = rows.filter(r => r.modelValue !== null).length;

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <p class="text-sm text-gray-500 max-w-2xl">
          Method: unweighted mean ± 2 SD · up to 6 reference programs · non-zero values only. A flag indicates the value warrants review — it does not confirm an error.
        </p>
        ${flagged > 0
          ? `<span class="bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-sm font-medium flex-shrink-0">${flagged} Flagged</span>`
          : `<span class="bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-1 text-sm font-medium flex-shrink-0">All Within Range</span>`}
      </div>
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-xs">
          <thead class="bg-gray-50">
            <tr>${['Parameter','Category','Value from Model','Unit','Normalisation','Mean','Std Dev','Lower','Upper','Z-Score','Status','Notes','LCIA Driver','Materiality']
              .map(h => `<th class="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}</tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${rows.map(r => `
              <tr class="${r.status === 'Outside range' ? 'bg-red-50' : r.modelValue === null ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}">
                <td class="px-3 py-2.5 font-medium text-gray-900">${r.parameter}</td>
                <td class="px-3 py-2.5 text-gray-500">${r.category}</td>
                <td class="px-3 py-2.5 font-mono font-semibold ${r.modelValue === null ? 'text-gray-400 italic' : r.status === 'Outside range' ? 'text-red-700' : 'text-gray-900'}">
                  ${r.modelValue !== null ? fmtSci(r.modelValue) : 'Not found'}</td>
                <td class="px-3 py-2.5 text-gray-500">${r.unit}</td>
                <td class="px-3 py-2.5 text-gray-500">${r.normalisation}</td>
                <td class="px-3 py-2.5 font-mono text-gray-700">${r.mean}</td>
                <td class="px-3 py-2.5 font-mono text-gray-600">${r.stdDev}</td>
                <td class="px-3 py-2.5 font-mono text-blue-700">${r.lower}</td>
                <td class="px-3 py-2.5 font-mono text-blue-700">${r.upper}</td>
                <td class="px-3 py-2.5 font-mono ${r.zScore !== null && Math.abs(r.zScore) > 2 ? 'text-red-600 font-semibold' : 'text-gray-700'}">${r.zScore !== null ? r.zScore.toFixed(3) : '—'}</td>
                <td class="px-3 py-2.5">${r.status ? statusBadge(r.status) : '—'}</td>
                <td class="px-3 py-2.5 text-gray-500 max-w-xs">${r.notes}</td>
                <td class="px-3 py-2.5 text-gray-600">${r.lciaDriver || '—'}</td>
                <td class="px-3 py-2.5">${materialityBadge(r.materiality)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── LCIA Outlier Tab (Option 2) ──────────────────
function renderLCIAOutlierTab() {
  const results = computeLCIAComparison(state.gabiLciaValues);
  const hasAny = results.some(r => r.modelValue !== null);
  const flagged = results.filter(r => r.status === 'Outside range').length;

  return `
    <div class="space-y-6">
      <!-- Reference stats -->
      <div>
        <h3 class="text-sm font-semibold text-gray-800 mb-3">Reference Distribution Statistics — 8 Programs</h3>
        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="w-full text-xs">
            <thead class="bg-gray-50">
              <tr>${['LCIA Indicator','Unit','n','Mean','Std Dev','CV (%)','Lower Bound','Upper Bound','Min','Max']
                .map(h => `<th class="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}</tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${LCIA_REFERENCE.map(r => `
                <tr class="hover:bg-gray-50">
                  <td class="px-3 py-2 font-medium text-gray-900">${r.indicator}</td>
                  <td class="px-3 py-2 text-gray-500">${r.unit}</td>
                  <td class="px-3 py-2 text-gray-600">${r.n}</td>
                  <td class="px-3 py-2 font-mono text-gray-900">${r.mean}</td>
                  <td class="px-3 py-2 font-mono text-gray-700">${r.stdDev}</td>
                  <td class="px-3 py-2 text-gray-600">${r.cv}</td>
                  <td class="px-3 py-2 font-mono text-blue-700">${r.lower}</td>
                  <td class="px-3 py-2 font-mono text-blue-700">${r.upper}</td>
                  <td class="px-3 py-2 font-mono text-gray-500">${r.min}</td>
                  <td class="px-3 py-2 font-mono text-gray-500">${r.max}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Value entry -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-800">Enter GaBi LCIA Results</h3>
          <span id="lcia-flag-summary">${hasAny ? (flagged > 0
            ? `<span class="bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-xs font-medium">${flagged} Outside Range</span>`
            : `<span class="bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-1 text-xs font-medium">All Within Range</span>`)
            : ''}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          ${LCIA_REFERENCE.map(r => {
            const val = state.gabiLciaValues[r.id];
            const parsed = val !== undefined && val !== '' ? parseFloat(val) : null;
            const inRange = parsed !== null && !isNaN(parsed) ? (parsed >= r.lower && parsed <= r.upper) : null;
            const zScore = parsed !== null && !isNaN(parsed) ? ((parsed - r.mean) / r.stdDev).toFixed(2) : null;
            return `
              <div id="lcia-card-${r.id}" class="border rounded-xl p-4 ${inRange === false ? 'border-red-300 bg-red-50' : inRange === true ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}">
                <label class="block text-sm font-medium text-gray-800 mb-0.5">${r.indicator}</label>
                <p class="text-xs text-gray-500 mb-2">${r.unit}</p>
                <input type="text" inputmode="decimal" id="lcia-val-${r.id}"
                  placeholder="e.g. 1.3706"
                  value="${val !== undefined ? val : ''}"
                  class="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white
                    ${inRange === false ? 'border-red-300' : inRange === true ? 'border-green-300' : 'border-gray-300'}"
                  oninput="refreshLCIATab(this, '${r.id}')">
                <div id="lcia-meta-${r.id}" class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span class="text-gray-400">Range: <span class="text-blue-600 font-medium">${r.lower} – ${r.upper}</span></span>
                  <span class="text-gray-400">Mean: <span class="font-medium">${r.mean}</span></span>
                  ${zScore !== null ? `<span class="${inRange === false ? 'text-red-600 font-semibold' : 'text-gray-500'}">Z: ${zScore}</span>` : ''}
                  ${inRange === true ? `<span class="text-green-600 font-medium">✓ Within range</span>` : ''}
                  ${inRange === false ? `<span class="text-red-600 font-medium">⚠ Outside range</span>` : ''}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Full results table (if any values entered) -->
      <div id="lcia-comparison-section">${hasAny ? `
        <h3 class="text-sm font-semibold text-gray-800 mb-3">Full Comparison Table</h3>
        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="w-full text-xs">
            <thead class="bg-gray-50">
              <tr>${['LCIA Indicator','Unit','Your Value','Mean','Std Dev','Lower','Upper','Z-Score','Status','Notes']
                .map(h => `<th class="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}</tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${results.map(r => `
                <tr class="${r.status === 'Outside range' ? 'bg-red-50' : r.modelValue === null ? 'opacity-40' : 'hover:bg-gray-50'}">
                  <td class="px-3 py-2 font-medium text-gray-900">${r.indicator}</td>
                  <td class="px-3 py-2 text-gray-500">${r.unit}</td>
                  <td class="px-3 py-2 font-mono font-semibold ${r.modelValue === null ? 'text-gray-400 italic' : r.status === 'Outside range' ? 'text-red-700' : 'text-gray-900'}">
                    ${r.modelValue !== null ? fmtSci(r.modelValue) : 'PENDING'}</td>
                  <td class="px-3 py-2 font-mono text-gray-700">${r.mean}</td>
                  <td class="px-3 py-2 font-mono text-gray-600">${r.stdDev}</td>
                  <td class="px-3 py-2 font-mono text-blue-700">${r.lower}</td>
                  <td class="px-3 py-2 font-mono text-blue-700">${r.upper}</td>
                  <td class="px-3 py-2 font-mono ${r.zScore !== null && Math.abs(r.zScore) > 2 ? 'text-red-600 font-semibold' : 'text-gray-700'}">${r.zScore !== null ? r.zScore.toFixed(3) : '—'}</td>
                  <td class="px-3 py-2">${r.status ? statusBadge(r.status) : '—'}</td>
                  <td class="px-3 py-2 text-gray-500 max-w-xs">${r.notes}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}</div>

      <!-- Raw reference by program -->
      <div>
        <h3 class="text-sm font-semibold text-gray-800 mb-3">Raw Reference Values by Program <span class="font-normal text-gray-500">(per 1 kg cotton lint)</span></h3>
        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="w-full text-xs">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2.5 text-left font-semibold text-gray-600">LCIA Indicator</th>
                <th class="px-3 py-2.5 text-left font-semibold text-gray-600">Unit</th>
                ${Object.keys(LCIA_REFERENCE[0].programs).map(p =>
                  `<th class="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">${p}</th>`).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${LCIA_REFERENCE.map(r => `
                <tr class="hover:bg-gray-50">
                  <td class="px-3 py-2 font-medium text-gray-900">${r.indicator}</td>
                  <td class="px-3 py-2 text-gray-500">${r.unit}</td>
                  ${Object.values(r.programs).map(v =>
                    `<td class="px-3 py-2 text-right font-mono text-gray-700">${v}</td>`).join('')}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// Called on every keystroke — surgically updates results without touching inputs
function refreshLCIATab(inputEl, id) {
  if (inputEl) state.gabiLciaValues[id] = inputEl.value;

  const results = computeLCIAComparison(state.gabiLciaValues);
  const hasAny = results.some(r => r.modelValue !== null);
  const flagged = results.filter(r => r.status === 'Outside range').length;

  // Update each card's border, input border, and meta display
  LCIA_REFERENCE.forEach(r => {
    const val = state.gabiLciaValues[r.id];
    const parsed = (val !== undefined && val !== '') ? parseFloat(val) : null;
    const inRange = (parsed !== null && !isNaN(parsed)) ? (parsed >= r.lower && parsed <= r.upper) : null;
    const zScore = (parsed !== null && !isNaN(parsed)) ? ((parsed - r.mean) / r.stdDev).toFixed(2) : null;

    const card = document.getElementById(`lcia-card-${r.id}`);
    if (card) card.className = `border rounded-xl p-4 ${inRange === false ? 'border-red-300 bg-red-50' : inRange === true ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`;

    const inp = document.getElementById(`lcia-val-${r.id}`);
    if (inp) {
      inp.className = inp.className.replace(/border-(red|green|gray)-\d+/g, '').trim()
        + ` ${inRange === false ? 'border-red-300' : inRange === true ? 'border-green-300' : 'border-gray-300'}`;
    }

    const meta = document.getElementById(`lcia-meta-${r.id}`);
    if (meta) meta.innerHTML = `
      <span class="text-gray-400">Range: <span class="text-blue-600 font-medium">${r.lower} – ${r.upper}</span></span>
      <span class="text-gray-400">Mean: <span class="font-medium">${r.mean}</span></span>
      ${zScore !== null ? `<span class="${inRange === false ? 'text-red-600 font-semibold' : 'text-gray-500'}">Z: ${zScore}</span>` : ''}
      ${inRange === true ? `<span class="text-green-600 font-medium">✓ Within range</span>` : ''}
      ${inRange === false ? `<span class="text-red-600 font-medium">⚠ Outside range</span>` : ''}`;
  });

  // Update flag summary badge
  const flagEl = document.getElementById('lcia-flag-summary');
  if (flagEl) flagEl.innerHTML = hasAny ? (flagged > 0
    ? `<span class="bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-xs font-medium">${flagged} Outside Range</span>`
    : `<span class="bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-1 text-xs font-medium">All Within Range</span>`) : '';

  // Update comparison table
  const compEl = document.getElementById('lcia-comparison-section');
  if (compEl) compEl.innerHTML = hasAny ? `
    <h3 class="text-sm font-semibold text-gray-800 mb-3">Full Comparison Table</h3>
    <div class="overflow-x-auto rounded-lg border border-gray-200">
      <table class="w-full text-xs">
        <thead class="bg-gray-50">
          <tr>${['LCIA Indicator','Unit','Your Value','Mean','Std Dev','Lower','Upper','Z-Score','Status','Notes']
            .map(h => `<th class="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}</tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${results.map(r => `
            <tr class="${r.status === 'Outside range' ? 'bg-red-50' : r.modelValue === null ? 'opacity-40' : 'hover:bg-gray-50'}">
              <td class="px-3 py-2 font-medium text-gray-900">${r.indicator}</td>
              <td class="px-3 py-2 text-gray-500">${r.unit}</td>
              <td class="px-3 py-2 font-mono font-semibold ${r.modelValue === null ? 'text-gray-400 italic' : r.status === 'Outside range' ? 'text-red-700' : 'text-gray-900'}">
                ${r.modelValue !== null ? fmtSci(r.modelValue) : 'PENDING'}</td>
              <td class="px-3 py-2 font-mono text-gray-700">${r.mean}</td>
              <td class="px-3 py-2 font-mono text-gray-600">${r.stdDev}</td>
              <td class="px-3 py-2 font-mono text-blue-700">${r.lower}</td>
              <td class="px-3 py-2 font-mono text-blue-700">${r.upper}</td>
              <td class="px-3 py-2 font-mono ${r.zScore !== null && Math.abs(r.zScore) > 2 ? 'text-red-600 font-semibold' : 'text-gray-700'}">${r.zScore !== null ? r.zScore.toFixed(3) : '—'}</td>
              <td class="px-3 py-2">${r.status ? statusBadge(r.status) : '—'}</td>
              <td class="px-3 py-2 text-gray-500 max-w-xs">${r.notes}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';
}

// ── Bootstrap ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderHome();
});
