// Excel file parsers using SheetJS

// Find the sheet name most similar to "seed cotton unginned"
function findModelSheet(sheetNames) {
  const targets = ['seed cotton (unginned)', 'seed cotton unginned', 'seed cotton', 'unginned', '1)'];
  const lower = sheetNames.map(n => n.toLowerCase());
  for (const t of targets) {
    const idx = lower.findIndex(n => n.includes(t));
    if (idx !== -1) return sheetNames[idx];
  }
  // Fallback: find any sheet with "model" in name
  const modelIdx = lower.findIndex(n => n.includes('model') && !n.includes('gabi'));
  if (modelIdx !== -1) return sheetNames[modelIdx];
  return sheetNames[0];
}

// Parse the Cotton Inc. Draft Model Excel file
// Returns { params: {name: {value, inputOutput, description}}, sheetName, lintOutput }
function parseModelFile(workbook) {
  const sheetName = findModelSheet(workbook.SheetNames);
  const ws = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Find header row: look for "Parameter" in column index 2
  let headerRow = -1;
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    if (data[i] && String(data[i][2] || '').trim() === 'Parameter') {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) {
    // Try any row with "Parameter" anywhere
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row.some(cell => String(cell || '').trim() === 'Parameter')) {
        headerRow = i;
        break;
      }
    }
  }

  const params = {};
  const startRow = headerRow >= 0 ? headerRow + 1 : 1;

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const paramName = String(row[2] || '').trim();
    if (!paramName || paramName === 'NaN' || paramName === 'Parameter' || paramName === 'Inputs' || paramName === 'Outputs') continue;

    const rawVal = row[5];
    let value = null;
    if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
      const parsed = parseFloat(rawVal);
      if (!isNaN(parsed)) value = parsed;
    }

    if (!params[paramName]) {
      params[paramName] = {
        value,
        inputOutput: String(row[1] || '').trim(),
        description: String(row[0] || '').trim()
      };
    }
  }

  // Extract lint output for normalization
  const lintOutput = params['O_cottonLint']?.value ?? null;

  return { params, sheetName, lintOutput };
}

// Parse GaBi export Excel file
// Returns { params: {name: {value, formula}}, processName }
function parseGaBiFile(workbook) {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Extract process name from row 2 col 2
  let processName = '';
  if (data[2] && data[2][2]) processName = String(data[2][2]).trim();

  // Find "Parameters" section
  let paramsHeaderRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && String(data[i][0] || '').trim() === 'Parameters') {
      paramsHeaderRow = i + 1; // header is next row
      break;
    }
  }

  if (paramsHeaderRow === -1) return { params: {}, processName };

  const params = {};
  // Parse from header+1 until we hit non-numeric value in col 2
  for (let i = paramsHeaderRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) break;
    const paramName = String(row[0] || '').trim();
    if (!paramName) continue;

    const rawVal = row[2];
    if (rawVal === null || rawVal === undefined) continue;
    const parsed = parseFloat(rawVal);
    // If value is not numeric (e.g., "Mass", "Energy"), stop - we've left the parameters section
    if (isNaN(parsed) && typeof rawVal === 'string' && !rawVal.match(/^-?[\d.]+/)) break;
    if (isNaN(parsed)) continue;

    params[paramName] = {
      value: parsed,
      formula: String(row[1] || '').trim(),
      comment: String(row[6] || '').trim()
    };
  }

  return { params, processName };
}

// Determine if a parameter name looks like a tracked pesticide emission
// (NOT TRACKED = pesticide emission that's zero in GaBi with no model equiv)
function isPesticideEmissionParam(name) {
  return /_[asw]$/.test(name) || name.endsWith('_a') || name.endsWith('_s') || name.endsWith('_w');
}
