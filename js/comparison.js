// Parameter comparison logic for GaBi vs Model check

const STATUS_THRESHOLDS = {
  MATCH: 0.0001,      // <0.01% treated as exact match
  ROUNDING: 0.01,     // <1% = rounding only
  SMALL_DIFF: 1,      // 1-5%
  MODERATE_DIFF: 5,   // 5%+
};

function classifyStatus(pctDiff) {
  const abs = Math.abs(pctDiff);
  if (abs < STATUS_THRESHOLDS.MATCH) return 'MATCH';
  if (abs < STATUS_THRESHOLDS.ROUNDING) return 'ROUNDING';
  if (abs < STATUS_THRESHOLDS.SMALL_DIFF) return 'SMALL DIFF (<1%)';
  if (abs < STATUS_THRESHOLDS.MODERATE_DIFF) return 'MODERATE DIFF (<5%)';
  return 'LARGE DIFF';
}

// Determine Input or Output type for a GaBi param using model's info
function getParamType(gabiName, modelParams, mappedModelName) {
  const lookup = mappedModelName || gabiName;
  return modelParams[lookup]?.inputOutput || 'Input';
}

// Build the full comparison table
// Returns array of row objects sorted by |%diff| descending
function buildComparison(gabiParams, modelParams) {
  const rows = [];
  const usedModelParams = new Set();

  for (const [gabiName, gabiData] of Object.entries(gabiParams)) {
    const gabiVal = gabiData.value;

    // Try direct model match
    let modelName = null;
    let modelVal = null;
    let note = '';
    let isMapped = false;

    if (modelParams[gabiName] !== undefined) {
      modelName = gabiName;
      modelVal = modelParams[gabiName].value;
    } else if (NAME_MAPPINGS[gabiName]) {
      const mapping = NAME_MAPPINGS[gabiName];
      modelName = mapping.modelParam;
      modelVal = modelParams[modelName]?.value ?? null;
      note = mapping.note;
      isMapped = true;
    }

    if (modelName !== null && modelVal !== null) {
      usedModelParams.add(modelName);
      const type = getParamType(gabiName, modelParams, isMapped ? modelName : null);

      let pctDiff = 0;
      let status = 'MATCH';
      if (modelVal === 0 && gabiVal === 0) {
        status = 'MATCH';
        pctDiff = 0;
      } else if (modelVal === 0) {
        pctDiff = 100;
        status = 'LARGE DIFF';
      } else {
        pctDiff = Math.abs((gabiVal - modelVal) / modelVal) * 100;
        status = classifyStatus(pctDiff);
      }

      rows.push({
        gabiParam: gabiName,
        modelParam: modelName,
        type,
        gabiValue: gabiVal,
        modelValue: modelVal,
        pctDiff,
        status,
        notes: note,
        isMapped
      });
    } else {
      // No model match found
      const type = isPesticideEmissionParam(gabiName) ? 'Output' : 'Input';
      if (gabiVal === 0) {
        rows.push({
          gabiParam: gabiName,
          modelParam: '—',
          type,
          gabiValue: gabiVal,
          modelValue: null,
          pctDiff: null,
          status: 'NOT TRACKED',
          notes: 'Pesticide in GaBi with no model equivalent (all zero, confirmed)',
          isMapped: false
        });
      } else {
        rows.push({
          gabiParam: gabiName,
          modelParam: '—',
          type,
          gabiValue: gabiVal,
          modelValue: null,
          pctDiff: null,
          status: 'MISSING',
          notes: 'GaBi param not found in model even after name mapping',
          isMapped: false
        });
      }
    }
  }

  // Sort: LARGE DIFF first, then MISSING, then MODERATE, then SMALL, then ROUNDING, then MATCH, then NOT TRACKED
  const statusOrder = {
    'LARGE DIFF': 0, 'MISSING': 1, 'MODERATE DIFF (<5%)': 2,
    'SMALL DIFF (<1%)': 3, 'ROUNDING': 4, 'MATCH': 5, 'NOT TRACKED': 6
  };
  rows.sort((a, b) => {
    const orderDiff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
    if (orderDiff !== 0) return orderDiff;
    return (b.pctDiff ?? 0) - (a.pctDiff ?? 0);
  });

  return rows;
}

// Build summary counts
function buildSummary(rows) {
  const counts = {
    'MATCH': 0, 'ROUNDING': 0, 'SMALL DIFF (<1%)': 0,
    'MODERATE DIFF (<5%)': 0, 'LARGE DIFF': 0,
    'MISSING': 0, 'NOT TRACKED': 0
  };
  let mappedCount = 0;
  for (const row of rows) {
    counts[row.status] = (counts[row.status] || 0) + 1;
    if (row.isMapped) mappedCount++;
  }
  return { counts, total: rows.length, mappedCount, missingCount: counts['MISSING'] };
}

// Compute outlier check values from model parameters
function computeInventoryValues(modelParams) {
  const p = modelParams;
  const lint = p['O_cottonLint']?.value;

  function val(name, alt) {
    return p[name]?.value ?? (alt ? p[alt]?.value : null) ?? null;
  }

  function norm(numeratorName, alt) {
    const num = val(numeratorName, alt);
    if (num === null || !lint) return null;
    return num / lint;
  }

  return {
    'FertN_Nitrogen': val('FertN_Nitrogen'),
    'Fert_Phosphor': val('Fert_Phosphor'),
    'Fert_Potas': val('Fert_Potas', 'Fert_Potas_t'),
    'FertN_Manure': val('FertN_Manure'),
    'Glyphosate': val('Glyphosate'),
    'acephate': val('acephate'),
    'Thidiazuron': val('Thidiazuron'),
    'ginning_percent': val('ginning_percent'),
    'TTL_NFert_norm': norm('TTL_NFert'),
    'TTL_Fert_norm': norm('TTL_Fert'),
    'TTL_Pesticide_norm': norm('TTL_Pesticide'),
    'TTL_IrrigatedWa_norm': norm('TTL_IrrigatedWa'),
    'TTL_Diesel_norm': norm('TTL_Diesel_i_MJ'),
    'TTL_Phospho_norm': norm('TTL_Phospho'),
    'TTL_Potassium_norm': norm('TTL_Potassium'),
    'TTL_Manure_norm': norm('TTL_Manure'),
  };
}

// Map inventory reference rows to computed values
function buildInventoryComparison(inventoryValues) {
  const paramToValueKey = {
    'N fertiliser rate': 'FertN_Nitrogen',
    'P fertiliser rate': 'Fert_Phosphor',
    'K fertiliser rate': 'Fert_Potas',
    'Manure application rate': 'FertN_Manure',
    'Glyphosate rate': 'Glyphosate',
    'Acephate rate': 'acephate',
    'Thidiazuron (PGR) rate': 'Thidiazuron',
    'Ginning percentage': 'ginning_percent',
    'Total N fertiliser / lint': 'TTL_NFert_norm',
    'Total fertiliser / lint': 'TTL_Fert_norm',
    'Total pesticide / lint': 'TTL_Pesticide_norm',
    'Irrigated water intensity': 'TTL_IrrigatedWa_norm',
    'Diesel energy intensity': 'TTL_Diesel_norm',
    'Total P fertiliser / lint': 'TTL_Phospho_norm',
    'Total K fertiliser / lint': 'TTL_Potassium_norm',
    'Total manure / lint': 'TTL_Manure_norm',
  };

  return INVENTORY_REFERENCE.map(ref => {
    const key = paramToValueKey[ref.parameter];
    const modelValue = key ? inventoryValues[key] : null;
    let zScore = null;
    let status = null;

    if (modelValue !== null && modelValue !== undefined) {
      zScore = (modelValue - ref.mean) / ref.stdDev;
      if (modelValue >= ref.lower && modelValue <= ref.upper) {
        status = 'Within range';
      } else {
        status = 'Outside range';
      }
    }

    return { ...ref, modelValue, zScore, status };
  });
}

// Compute LCIA outlier check
function computeLCIAComparison(lciaValues) {
  return LCIA_REFERENCE.map(ref => {
    const val = lciaValues[ref.id];
    const modelValue = (val !== undefined && val !== null && val !== '') ? parseFloat(val) : null;
    let zScore = null;
    let status = null;

    if (modelValue !== null && !isNaN(modelValue)) {
      zScore = (modelValue - ref.mean) / ref.stdDev;
      if (modelValue >= ref.lower && modelValue <= ref.upper) {
        status = 'Within range';
      } else {
        status = 'Outside range';
      }
    }

    return { ...ref, modelValue, zScore, status };
  });
}
