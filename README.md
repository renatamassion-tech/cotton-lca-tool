# Cotton LCA QC Tool

A browser-based quality-check tool for Cascale cotton LCA models. No installation required — just open `index.html`.

## Features

### 1. Cotton Model Check (Pre-GaBi)
Upload the Cotton Inc. Draft Model Excel file and enter LCIA results from GaBi to check against 8-program baseline reference distributions (mean ± 2 SD).

- Reference distribution statistics (8 programs, per 1 kg cotton lint)
- LCIA value entry with instant outlier flagging
- Z-score calculation per indicator
- Raw reference values by program (BC India, Agropima Peru, Materra India, OCA India, BC China, BC Tajikistan, BC Pakistan, BC Egypt)

### 2. Exported GaBi Model Check (Post-GaBi)
Upload both the Cotton Inc. Draft Model and a GaBi export to verify all parameters transferred correctly.

- **Summary** — Status counts (Match, Rounding, Small/Moderate/Large Diff, Missing, Not Tracked)
- **Full Comparison** — Parameter-by-parameter table with % difference, sortable and filterable
- **Inventory Outlier Check** — Auto-populated from the model; 16 key parameters checked against reference distributions

## How to Use

**Option A — Open directly in browser:**
Double-click `index.html`. Note: file upload works in most browsers; Chrome/Edge recommended.

**Option B — Serve locally (recommended for best compatibility):**
```bash
# Python 3
python -m http.server 3737
# Then open http://localhost:3737 in your browser
```

## Input File Formats

**Cotton Inc. Draft Model (.xlsx)**
- The tool automatically finds the tab closest to "seed cotton (unginned) model"
- Required columns: Parameter (col C), Input/Output (col B), Values (col F)

**GaBi Export (.xlsx)**
- Standard GaBi "LCA for Experts" export format
- The tool reads the Parameters section automatically

## Reference Data

Reference distributions are hardcoded from `Cotton_GaBi_Model_Comparison_1.xlsx` (baseline comparison file). To update baselines, edit `js/reference-data.js`.

## Making Edits

Each file has a focused role — easy to update without touching the rest:

| File | What to edit |
|------|-------------|
| `js/reference-data.js` | LCIA/inventory reference distributions, name mappings |
| `js/parsers.js` | How Excel files are read and parameters extracted |
| `js/comparison.js` | Comparison logic, status thresholds, outlier calculations |
| `js/app.js` | UI rendering, page layout, event handling |
| `index.html` | CDN versions, page shell |

## Updating Reference Baselines

Edit `LCIA_REFERENCE` and `INVENTORY_REFERENCE` arrays in `js/reference-data.js`. Each entry has `mean`, `stdDev`, `lower`, `upper`, `min`, `max` and per-program values.

## Name Mappings

When GaBi uses different parameter names than the model, mappings are defined in `NAME_MAPPINGS` in `js/reference-data.js`. Add new mappings there as needed.
