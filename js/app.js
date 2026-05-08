// ─────────────────────────────────────────────
// Cotton LCA Tool — Main App
// ─────────────────────────────────────────────

// ── App State ──────────────────────────────────
const state = {
  // LCIA Check
  lciaModelFile: null,
  lciaModelData: null,
  lciaValues: {},
  // GaBi Check
  gabiModelFile: null,
  gabiModelData: null,
  gabiExportFile: null,
  gabiExportData: null,
  comparisonRows: [],
  activeGabiTab: 'summary',
  // Filters
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
  if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(3);
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

// ── Status Badge ────────────────────────────────
function statusBadge(status) {
  const classes = {
    'MATCH':              'bg-green-100 text-green-800 border border-green-200',
    'ROUNDING':           'bg-blue-100 text-blue-800 border border-blue-200',
    'SMALL DIFF (<1%)':   'bg-yellow-100 text-yellow-800 border border-yellow-200',
    'MODERATE DIFF (<5%)':'bg-orange-100 text-orange-800 border border-orange-200',
    'LARGE DIFF':         'bg-red-100 text-red-800 border border-red-200',
    'MISSING':            'bg-red-900 text-white',
    'NOT TRACKED':        'bg-gray-100 text-gray-500 border border-gray-200',
    'Within range':       'bg-green-100 text-green-800 border border-green-200',
    'Outside range':      'bg-red-100 text-red-800 border border-red-200',
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
          <button onclick="showPage('page-lcia'); initLCIAPage()"
            class="text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-md hover:border-green-300 transition-all group">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-200 transition-colors">
              <svg class="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Cotton Model Check</h3>
            <p class="text-gray-500 text-sm mb-4">Upload the Excel model and enter LCIA results to check against 8-program baseline reference distributions (mean ± 2 SD).</p>
            <div class="flex flex-wrap gap-2">
              <span class="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1">LCIA Outlier Check</span>
              <span class="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1">Pre-GaBi QC</span>
              <span class="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1">Reference Distributions</span>
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
            <p class="text-gray-500 text-sm mb-4">Upload the Excel model + GaBi export to verify all parameters transferred correctly. Flags rounding errors, missing params, and inventory outliers.</p>
            <div class="flex flex-wrap gap-2">
              <span class="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded px-2 py-1">Full Comparison</span>
              <span class="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded px-2 py-1">Inventory Outlier Check</span>
              <span class="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded px-2 py-1">Post-GaBi QC</span>
            </div>
            <div class="mt-5 flex items-center text-teal-700 font-medium text-sm group-hover:translate-x-1 transition-transform">
              Open Check <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </div>
          </button>
        </div>

        <p class="text-center text-xs text-gray-400 mt-10">
          Reference distributions: 8 programs (BC India, Agropima Peru, Materra India, OCA India, BC China, BC Tajikistan, BC Pakistan, BC Egypt) · per 1 kg cotton lint
        </p>
      </main>
    </div>`;
}

// ════════════════════════════════════════════════
// LCIA CHECK PAGE
// ════════════════════════════════════════════════
function initLCIAPage() {
  document.getElementById('page-lcia').innerHTML = `
    <div class="min-h-screen bg-gray-50">
      ${pageHeader('Cotton Model Check — LCIA Outlier Check')}
      <main class="max-w-6xl mx-auto px-4 py-8 space-y-8">

        <!-- Step 1: Upload model (optional context) -->
        <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-base font-semibold text-gray-800 mb-1">Step 1 — Upload Cotton Inc. Draft Model <span class="text-gray-400 font-normal text-sm">(optional, for metadata)</span></h2>
          <p class="text-sm text-gray-500 mb-4">Upload the model to auto-identify the program. LCIA values must be entered manually from GaBi results.</p>
          <div class="max-w-md">
            ${makeDropzone('lcia-model-input', 'Cotton Inc. Draft Model (.xlsx)')}
            ${fileStatusDiv('lcia-model-status')}
          </div>
        </section>

        <!-- Section 1: Reference Distributions -->
        <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100">
            <h2 class="text-base font-semibold text-gray-800">Section 1 — Reference Distribution Statistics</h2>
            <p class="text-xs text-gray-500 mt-1">Unweighted mean ± 2 SD across 8 reference programs · per 1 kg cotton lint</p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  ${['LCIA Indicator','Unit','n','Mean','Std Dev','CV (%)','Lower Bound','Upper Bound','Min Observed','Max Observed']
                    .map(h => `<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                ${LCIA_REFERENCE.map(r => `
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium text-gray-900">${r.indicator}</td>
                    <td class="px-4 py-3 text-gray-600">${r.unit}</td>
                    <td class="px-4 py-3 text-gray-600">${r.n}</td>
                    <td class="px-4 py-3 text-gray-900 font-mono">${r.mean}</td>
                    <td class="px-4 py-3 text-gray-900 font-mono">${r.stdDev}</td>
                    <td class="px-4 py-3 text-gray-600">${r.cv}</td>
                    <td class="px-4 py-3 text-blue-700 font-mono">${r.lower}</td>
                    <td class="px-4 py-3 text-blue-700 font-mono">${r.upper}</td>
                    <td class="px-4 py-3 text-gray-500 font-mono">${r.min}</td>
                    <td class="px-4 py-3 text-gray-500 font-mono">${r.max}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Section 2: Value Check -->
        <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100">
            <h2 class="text-base font-semibold text-gray-800">Section 2 — Cotton Inc. Value Check</h2>
            <p class="text-xs text-gray-500 mt-1">Enter LCIA results from GaBi below. Values will be checked against Mean ± 2 SD. Leave blank if not yet available.</p>
          </div>
          <div id="lcia-input-area" class="p-6">
            ${renderLCIAInputs()}
          </div>
          <div class="px-6 pb-6">
            <button onclick="runLCIACheck()" class="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm">
              Run Outlier Check
            </button>
          </div>
        </section>

        <!-- Results -->
        <div id="lcia-results"></div>

        <!-- Section 3: Raw Reference Values -->
        <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100">
            <h2 class="text-base font-semibold text-gray-800">Section 3 — Raw Reference Values by Program</h2>
            <p class="text-xs text-gray-500 mt-1">Per 1 kg cotton lint</p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">LCIA Indicator</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Unit</th>
                  ${Object.keys(LCIA_REFERENCE[0].programs).map(p =>
                    `<th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 whitespace-nowrap">${p}</th>`).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                ${LCIA_REFERENCE.map(r => `
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium text-gray-900">${r.indicator}</td>
                    <td class="px-4 py-3 text-gray-500">${r.unit}</td>
                    ${Object.values(r.programs).map(v =>
                      `<td class="px-4 py-3 text-right font-mono text-gray-700">${v}</td>`).join('')}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>`;

  // Wire up model file input
  document.getElementById('lcia-model-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const wb = await readWorkbook(file);
      state.lciaModelData = parseModelFile(wb);
      showFileStatus('lcia-model-status', file.name, state.lciaModelData.sheetName, Object.keys(state.lciaModelData.params).length);
    } catch (err) {
      showFileError('lcia-model-status', 'Failed to parse file: ' + err.message);
    }
  });
}

function renderLCIAInputs() {
  return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    ${LCIA_REFERENCE.map(r => `
      <div class="border border-gray-200 rounded-lg p-4">
        <label class="block text-sm font-medium text-gray-800 mb-1">${r.indicator}</label>
        <p class="text-xs text-gray-500 mb-2">${r.unit}</p>
        <input type="number" step="any" id="lcia-val-${r.id}"
          placeholder="Enter GaBi result…"
          value="${state.lciaValues[r.id] !== undefined ? state.lciaValues[r.id] : ''}"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          oninput="state.lciaValues['${r.id}'] = this.value">
        <div class="mt-2 flex gap-4 text-xs text-gray-400">
          <span>Range: <span class="font-medium text-blue-600">${r.lower} – ${r.upper}</span></span>
          <span>Mean: <span class="font-medium">${r.mean}</span></span>
        </div>
      </div>`).join('')}
  </div>`;
}

function runLCIACheck() {
  // Re-collect values from inputs
  LCIA_REFERENCE.forEach(r => {
    const el = document.getElementById(`lcia-val-${r.id}`);
    if (el) state.lciaValues[r.id] = el.value;
  });

  const results = computeLCIAComparison(state.lciaValues);
  const hasAny = results.some(r => r.modelValue !== null);

  const container = document.getElementById('lcia-results');
  if (!hasAny) {
    container.innerHTML = `<div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
      Enter at least one LCIA value above to see outlier check results.</div>`;
    return;
  }

  const flagged = results.filter(r => r.status === 'Outside range').length;
  const checked = results.filter(r => r.modelValue !== null).length;

  container.innerHTML = `
    <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-gray-800">Outlier Check Results</h2>
          <p class="text-xs text-gray-500 mt-1">${checked} indicator${checked !== 1 ? 's' : ''} checked · ${flagged} flag${flagged !== 1 ? 's' : ''}</p>
        </div>
        ${flagged > 0 ? `<span class="bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-sm font-medium">${flagged} Outside Range</span>` :
          `<span class="bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-1 text-sm font-medium">All Within Range</span>`}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              ${['LCIA Indicator','Unit','Your Value','Mean','Std Dev','Lower Bound','Upper Bound','Z-Score','Status','Notes']
                .map(h => `<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${results.map(r => `
              <tr class="${r.status === 'Outside range' ? 'bg-red-50' : r.modelValue === null ? 'opacity-50' : 'hover:bg-gray-50'}">
                <td class="px-4 py-3 font-medium text-gray-900">${r.indicator}</td>
                <td class="px-4 py-3 text-gray-500">${r.unit}</td>
                <td class="px-4 py-3 font-mono font-semibold ${r.modelValue === null ? 'text-gray-400 italic' : 'text-gray-900'}">
                  ${r.modelValue !== null ? fmtSci(r.modelValue) : 'PENDING'}</td>
                <td class="px-4 py-3 font-mono text-gray-700">${r.mean}</td>
                <td class="px-4 py-3 font-mono text-gray-600">${r.stdDev}</td>
                <td class="px-4 py-3 font-mono text-blue-700">${r.lower}</td>
                <td class="px-4 py-3 font-mono text-blue-700">${r.upper}</td>
                <td class="px-4 py-3 font-mono text-gray-700">${r.zScore !== null ? r.zScore.toFixed(3) : '—'}</td>
                <td class="px-4 py-3">${r.status ? statusBadge(r.status) : '—'}</td>
                <td class="px-4 py-3 text-xs text-gray-500 max-w-xs">${r.notes}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`;
}

// ════════════════════════════════════════════════
// GABI CHECK PAGE
// ════════════════════════════════════════════════
function initGaBiPage() {
  state.comparisonRows = [];
  state.activeGabiTab = 'summary';

  document.getElementById('page-gabi').innerHTML = `
    <div class="min-h-screen bg-gray-50">
      ${pageHeader('Exported GaBi Model Check')}
      <main class="max-w-7xl mx-auto px-4 py-8 space-y-6">

        <!-- File Uploads -->
        <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-base font-semibold text-gray-800 mb-4">Step 1 — Upload Files</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p class="text-sm font-medium text-gray-700 mb-2">Cotton Inc. Draft Model</p>
              ${makeDropzone('gabi-model-input', 'Cotton Inc. Draft Model (.xlsx)')}
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

        <!-- Results area -->
        <div id="gabi-results" class="hidden space-y-6">

          <!-- Tabs -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="border-b border-gray-200 px-2 flex gap-1 pt-2">
              ${[
                {id:'summary', label:'Summary'},
                {id:'comparison', label:'Full Comparison'},
                {id:'inventory', label:'Inventory Outlier Check'}
              ].map(tab => `
                <button onclick="switchGaBiTab('${tab.id}')" id="tab-btn-${tab.id}"
                  class="tab-btn px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px
                    ${tab.id === 'summary' ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}">
                  ${tab.label}
                </button>`).join('')}
            </div>
            <div id="gabi-tab-content" class="p-6"></div>
          </div>
        </div>

      </main>
    </div>`;

  // Wire up file inputs
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

  document.getElementById('gabi-export-input').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const wb = await readWorkbook(file);
      state.gabiExportData = parseGaBiFile(wb);
      state.gabiExportFile = file.name;
      const n = Object.keys(state.gabiExportData.params).length;
      showFileStatus('gabi-export-status', file.name, state.gabiExportData.processName || null, n);
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
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.id === `tab-btn-${tabId}`;
    btn.className = `tab-btn px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px ${
      isActive ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`;
  });
  const content = document.getElementById('gabi-tab-content');
  if (tabId === 'summary') content.innerHTML = renderSummaryTab();
  else if (tabId === 'comparison') {
    content.innerHTML = renderComparisonTab();
    wireComparisonFilters();
  }
  else if (tabId === 'inventory') content.innerHTML = renderInventoryTab();
}

// ── Summary Tab ─────────────────────────────────
function renderSummaryTab() {
  const summary = buildSummary(state.comparisonRows);
  const { counts, total, mappedCount, missingCount } = summary;

  const statuses = [
    { key: 'MATCH', label: 'Match', desc: 'Exact match (or confirmed name mapping matches)', color: 'green' },
    { key: 'ROUNDING', label: 'Rounding', desc: 'Difference < 1% — rounding only, no action needed', color: 'blue' },
    { key: 'SMALL DIFF (<1%)', label: 'Small Diff (<1%)', desc: 'Difference 0.01%–1% — monitor, likely acceptable', color: 'yellow' },
    { key: 'MODERATE DIFF (<5%)', label: 'Moderate Diff (<5%)', desc: 'Difference 1%–5% — review recommended', color: 'orange' },
    { key: 'LARGE DIFF', label: 'Large Diff (≥5%)', desc: 'Difference ≥ 5% — investigate immediately', color: 'red' },
    { key: 'MISSING', label: 'Missing', desc: 'GaBi param not found in model even after name mapping', color: 'rose' },
    { key: 'NOT TRACKED', label: 'Not Tracked', desc: 'Pesticide in GaBi with no model equivalent (all zero, confirmed)', color: 'gray' },
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
          ${state.gabiModelFile} vs. ${state.gabiExportFile}
          ${state.gabiExportData.processName ? ` · Process: <strong>${state.gabiExportData.processName}</strong>` : ''}
        </p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        ${statuses.map(s => `
          <div class="border rounded-xl p-4 ${colorMap[s.color]}">
            <div class="text-2xl font-bold">${counts[s.key] || 0}</div>
            <div class="text-xs font-semibold mt-1">${s.label}</div>
          </div>`).join('')}
      </div>

      <div class="grid grid-cols-3 gap-4 text-sm">
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
            <tr>
              ${['Status','Count','Description']
                .map(h => `<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">${h}</th>`).join('')}
            </tr>
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
          <h4 class="font-semibold text-red-800 mb-3 text-sm">⚠ Parameters Requiring Attention</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-xs text-red-700">
                  ${['GaBi Parameter','Model Parameter','Type','GaBi Value','Model Value','% Diff','Status','Notes']
                    .map(h => `<th class="px-3 py-2 text-left font-semibold">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-red-100">
                ${needsAttention.map(r => `
                  <tr class="bg-white">
                    <td class="px-3 py-2 font-mono text-xs text-gray-800">${r.gabiParam}</td>
                    <td class="px-3 py-2 font-mono text-xs text-gray-800">${r.modelParam}</td>
                    <td class="px-3 py-2 text-gray-600 text-xs">${r.type}</td>
                    <td class="px-3 py-2 font-mono text-xs">${fmt(r.gabiValue)}</td>
                    <td class="px-3 py-2 font-mono text-xs">${r.modelValue !== null ? fmt(r.modelValue) : '—'}</td>
                    <td class="px-3 py-2 font-mono text-xs">${r.pctDiff !== null ? fmtPct(r.pctDiff) : '—'}</td>
                    <td class="px-3 py-2">${statusBadge(r.status)}</td>
                    <td class="px-3 py-2 text-xs text-gray-500">${r.notes}</td>
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
      <!-- Filters -->
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
        <div class="flex items-center gap-2">
          <input id="filter-search" type="text" placeholder="Search parameters…"
            oninput="applyFilters()"
            class="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-teal-500">
        </div>
        <span id="filter-count" class="text-xs text-gray-500 ml-auto">${filtered.length} of ${state.comparisonRows.length} rows</span>
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-xs" id="comparison-table">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              ${['GaBi Parameter','Model Parameter','Type','GaBi Value','Model Value','% Diff','Status','Notes']
                .map(h => `<th class="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody id="comparison-tbody" class="divide-y divide-gray-100">
            ${renderComparisonRows(filtered)}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderComparisonRows(rows) {
  if (!rows.length) return `<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400 text-sm">No rows match the current filter.</td></tr>`;
  return rows.map(r => `
    <tr class="hover:bg-gray-50 ${r.status === 'LARGE DIFF' || r.status === 'MISSING' ? 'bg-red-50' : ''}">
      <td class="px-3 py-2 font-mono text-gray-800">${r.gabiParam}</td>
      <td class="px-3 py-2 font-mono text-gray-700">${r.modelParam}</td>
      <td class="px-3 py-2 text-gray-500">${r.type}</td>
      <td class="px-3 py-2 font-mono">${fmt(r.gabiValue)}</td>
      <td class="px-3 py-2 font-mono">${r.modelValue !== null ? fmt(r.modelValue) : '—'}</td>
      <td class="px-3 py-2 font-mono">${r.pctDiff !== null ? fmtPct(r.pctDiff) : '—'}</td>
      <td class="px-3 py-2">${statusBadge(r.status)}</td>
      <td class="px-3 py-2 text-gray-400 max-w-xs truncate" title="${r.notes}">${r.notes || ''}</td>
    </tr>`).join('');
}

function getFilteredRows() {
  return state.comparisonRows.filter(r => {
    if (state.statusFilter !== 'all' && r.status !== state.statusFilter) return false;
    if (state.typeFilter !== 'all' && r.type !== state.typeFilter) return false;
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      if (!r.gabiParam.toLowerCase().includes(term) && !r.modelParam.toLowerCase().includes(term)) return false;
    }
    return true;
  });
}

function wireComparisonFilters() {
  // Already wired via onchange/oninput in HTML
}

function applyFilters() {
  state.statusFilter = document.getElementById('filter-status')?.value || 'all';
  state.typeFilter = document.getElementById('filter-type')?.value || 'all';
  state.searchTerm = document.getElementById('filter-search')?.value || '';
  const filtered = getFilteredRows();
  const tbody = document.getElementById('comparison-tbody');
  if (tbody) tbody.innerHTML = renderComparisonRows(filtered);
  const cnt = document.getElementById('filter-count');
  if (cnt) cnt.textContent = `${filtered.length} of ${state.comparisonRows.length} rows`;
}

// ── Inventory Outlier Tab ────────────────────────
function renderInventoryTab() {
  const inventoryValues = computeInventoryValues(state.gabiModelData.params);
  const rows = buildInventoryComparison(inventoryValues);
  const flagged = rows.filter(r => r.status === 'Outside range').length;
  const checked = rows.filter(r => r.modelValue !== null).length;

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">Method: unweighted mean ± 2 SD across up to 6 reference programs. Non-zero values only. A flag indicates the value warrants review — it does not confirm an error.</p>
        </div>
        <div class="flex-shrink-0 ml-4">
          ${flagged > 0 ? `<span class="bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1 text-sm font-medium">${flagged} Flagged</span>` :
            `<span class="bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-1 text-sm font-medium">All Within Range</span>`}
        </div>
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-xs">
          <thead class="bg-gray-50">
            <tr>
              ${['Parameter','Category','Cotton Inc. Value','Unit','Normalisation','Mean','Std Dev','Lower Bound','Upper Bound','Z-Score','Status','Notes','LCIA Driver','Materiality']
                .map(h => `<th class="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${rows.map(r => `
              <tr class="${r.status === 'Outside range' ? 'bg-red-50' : r.modelValue === null ? 'opacity-60' : 'hover:bg-gray-50'}">
                <td class="px-3 py-2 font-medium text-gray-900">${r.parameter}</td>
                <td class="px-3 py-2 text-gray-500">${r.category}</td>
                <td class="px-3 py-2 font-mono font-semibold ${r.modelValue === null ? 'text-gray-400 italic' : 'text-gray-900'}">
                  ${r.modelValue !== null ? fmtSci(r.modelValue) : '—'}</td>
                <td class="px-3 py-2 text-gray-500">${r.unit}</td>
                <td class="px-3 py-2 text-gray-500">${r.normalisation}</td>
                <td class="px-3 py-2 font-mono text-gray-700">${r.mean}</td>
                <td class="px-3 py-2 font-mono text-gray-600">${r.stdDev}</td>
                <td class="px-3 py-2 font-mono text-blue-700">${r.lower}</td>
                <td class="px-3 py-2 font-mono text-blue-700">${r.upper}</td>
                <td class="px-3 py-2 font-mono text-gray-700">${r.zScore !== null ? r.zScore.toFixed(3) : '—'}</td>
                <td class="px-3 py-2">${r.status ? statusBadge(r.status) : '—'}</td>
                <td class="px-3 py-2 text-gray-500 max-w-xs">${r.notes}</td>
                <td class="px-3 py-2 text-gray-600">${r.lciaDriver || '—'}</td>
                <td class="px-3 py-2">${materialityBadge(r.materiality)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Shared Header ────────────────────────────────
function pageHeader(title) {
  return `
    <header class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto flex items-center gap-4">
        <button onclick="showPage('page-home')" class="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Home
        </button>
        <span class="text-gray-300">|</span>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <h1 class="text-sm font-semibold text-gray-900">${title}</h1>
        </div>
      </div>
    </header>`;
}

// ── Bootstrap ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderHome();
});
