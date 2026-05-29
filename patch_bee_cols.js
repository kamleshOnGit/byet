/**
 * Patch beeSectionTableToRows to handle:
 * 1. Nested multi-column tables inside single-TD rows (rows 0,6,9,10 in this template)
 * 2. Skip empty spacer rows (rows 3,8,9)
 */
const fs = require('fs');
let content = fs.readFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', 'utf8');
const lines = content.split('\n');

// Find the beeSectionTableToRows function start and end
const startIdx = lines.findIndex(l => l.includes('const beeSectionTableToRows'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.trim() === '};');
console.log('beeSectionTableToRows lines:', startIdx+1, '-', endIdx+1);

// New implementation
const newImpl = [
  'const beeSectionTableToRows = (doc, assetBaseUrl = \'\') => {',
  '  const rowTables = Array.from(doc.querySelectorAll(\'table[class*="row row-"]\'));',
  '  const result = [];',
  '',
  '  rowTables.forEach((rowTable) => {',
  '    const bgColor = rowTable.getAttribute(\'bgcolor\') || ownBgColor(rowTable);',
  '    const contentTable = rowTable.querySelector(\'table.row-content\');',
  '    if (!contentTable) return;',
  '',
  '    let colTDs = Array.from(contentTable.querySelectorAll(\':scope > tbody > tr > td\'));',
  '',
  '    // If there is exactly one outer TD, check whether it contains a nested multi-column',
  '    // table (BEE "row row-N" with inner column layout rather than top-level TDs).',
  '    if (colTDs.length === 1) {',
  '      const singleTD = colTDs[0];',
  '      const directTables = Array.from(singleTD.children).filter((c) => c.tagName === \'TABLE\');',
  '      const innerColTable = directTables.find((t) => {',
  '        const innerTDs = Array.from(t.querySelectorAll(\':scope > tbody > tr > td\'));',
  '        return innerTDs.length > 1;',
  '      });',
  '      if (innerColTable) {',
  '        colTDs = Array.from(innerColTable.querySelectorAll(\':scope > tbody > tr > td\'));',
  '      }',
  '    }',
  '',
  '    // Skip empty spacer rows (no meaningful text or images)',
  '    const hasContent = colTDs.some((td) => {',
  '      const imgs = td.querySelectorAll(\'img\');',
  '      const txt = (td.textContent || \'\').replace(/\\s+/g, \' \').trim();',
  '      return imgs.length > 0 || txt.length > 2;',
  '    });',
  '    if (!hasContent) return;',
  '',
  '    const colCount = colTDs.length;',
  '',
  '    // Skip pure-spacer middle TDs (no width + no content) when computing sizes',
  '    // Compute grid sizes from percentage widths on content TDs',
  '    const rawSizes = colTDs.map((td) => pctToGridSize(td.getAttribute(\'width\') || \'\'));',
  '    let sizes;',
  '    if (rawSizes.every(Boolean)) {',
  '      const total = rawSizes.reduce((a, b) => a + b, 0);',
  '      const diff = 12 - total;',
  '      rawSizes[rawSizes.length - 1] += diff;',
  '      sizes = rawSizes;',
  '    } else {',
  '      // Some TDs lack width (spacer cols) — distribute evenly among content cols',
  '      const contentCount = rawSizes.filter(Boolean).length || colCount;',
  '      const base = Math.floor(12 / contentCount);',
  '      let assigned = 0;',
  '      sizes = rawSizes.map((s, idx) => {',
  '        if (s) { assigned += s; return s; }',
  '        // Spacer TD: give remaining space to last non-null col below',
  '        return idx === colCount - 1 ? 12 - assigned : base;',
  '      });',
  '      // Ensure sum is 12',
  '      const diff2 = 12 - sizes.reduce((a, b) => a + b, 0);',
  '      sizes[sizes.length - 1] += diff2;',
  '    }',
  '',
  '    result.push({',
  '      id: createImportedDomId(),',
  '      settings: compactSettings({ backgroundColor: bgColor, padding: { top: 0, right: 0, bottom: 0, left: 0 } }),',
  '      columns: colTDs.map((td, idx) => ({',
  '        id: createImportedDomId(),',
  '        size: sizes[idx],',
  '        settings: compactSettings({',
  '          backgroundColor: ownBgColor(td),',
  '          padding: { top: 0, right: 0, bottom: 0, left: 0 },',
  '        }),',
  '        components: Array.from(td.childNodes || []).flatMap((child) => domNodeToComponents(child, assetBaseUrl)),',
  '      })),',
  '    });',
  '  });',
  '',
  '  return result;',
  '};',
].map(l => '  '.repeat(0) + l + '\r');

// Replace lines startIdx to endIdx inclusive
lines.splice(startIdx, endIdx - startIdx + 1, ...newImpl);
fs.writeFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', lines.join('\n'));

const check = fs.readFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', 'utf8');
console.log('beeSectionTableToRows present:', check.includes('beeSectionTableToRows'));
console.log('innerColTable present:', check.includes('innerColTable'));
console.log('hasContent present:', check.includes('hasContent'));
console.log('done');
