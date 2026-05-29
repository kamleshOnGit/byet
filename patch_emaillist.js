const fs = require('fs');
let content = fs.readFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', 'utf8');

const startMarker = 'const cellToHtmlComponent';
const endMarker = '\nconst EmailList';
const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.log('markers not found', startIdx, endIdx); process.exit(1);
}

const newBlock = `const domTableToComponent = (tableEl, assetBaseUrl = '') => {
  const directRows = Array.from(tableEl.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tfoot > tr, :scope > tr'));
  return {
    id: createImportedDomId(),
    type: COMPONENT_TYPES.TABLE,
    content: '',
    importedDomTree: true,
    settings: compactSettings({
      ...tableLayoutSettings(tableEl),
      backgroundColor: ownBgColor(tableEl),
      backgroundImage: ownBgImage(tableEl, assetBaseUrl),
      backgroundSize: styleValue(tableEl, 'background-size') || undefined,
      backgroundPosition: styleValue(tableEl, 'background-position') || undefined,
      backgroundRepeat: styleValue(tableEl, 'background-repeat') || undefined,
      borderCollapse: styleValue(tableEl, 'border-collapse') || 'collapse',
      cellSpacing: tableEl.getAttribute('cellspacing') || '0',
      cellPadding: tableEl.getAttribute('cellpadding') || '0',
      padding: boxFromPadding(tableEl),
    }),
    tableRows: directRows.map((tr) => ({
      id: createImportedDomId(),
      settings: compactSettings({
        backgroundColor: ownBgColor(tr),
        backgroundImage: ownBgImage(tr, assetBaseUrl),
        backgroundSize: styleValue(tr, 'background-size') || undefined,
        backgroundPosition: styleValue(tr, 'background-position') || undefined,
        backgroundRepeat: styleValue(tr, 'background-repeat') || undefined,
        height: tr.getAttribute('height') || styleValue(tr, 'height') || undefined,
        ...textSettingsFromElement(tr),
      }),
      cells: Array.from(tr.children || [])
        .filter((cell) => ['td', 'th'].includes(String(cell.tagName || '').toLowerCase()))
        .map((cell) => ({
          id: createImportedDomId(),
          width: ownWidth(cell) || undefined,
          colSpan: parseInt(cell.getAttribute('colspan') || '1', 10) || 1,
          rowSpan: parseInt(cell.getAttribute('rowspan') || '1', 10) || 1,
          settings: compactSettings({
            ...textSettingsFromElement(cell),
            backgroundColor: ownBgColor(cell),
            backgroundImage: ownBgImage(cell, assetBaseUrl),
            backgroundSize: styleValue(cell, 'background-size') || undefined,
            backgroundPosition: styleValue(cell, 'background-position') || undefined,
            backgroundRepeat: styleValue(cell, 'background-repeat') || undefined,
            verticalAlign: styleValue(cell, 'vertical-align') || cell.getAttribute('valign') || 'top',
            width: ownWidth(cell) || undefined,
            display: styleValue(cell, 'display') || undefined,
            float: styleValue(cell, 'float') || undefined,
            height: cell.getAttribute('height') || styleValue(cell, 'height') || undefined,
            padding: boxFromPadding(cell),
          }),
          components: Array.from(cell.childNodes || []).flatMap((child) => domNodeToComponents(child, assetBaseUrl)),
        })),
    })).filter((row) => row.cells.length > 0),
  };
};

/**
 * Build an editor column from a float table (es-left / es-right).
 * The float table stays as a fully-editable TABLE component.
 */
const floatTableToColumn = (tableEl, colSize, assetBaseUrl = '') => ({
  id: createImportedDomId(),
  size: colSize,
  settings: { backgroundColor: 'transparent', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
  components: [domTableToComponent(tableEl, assetBaseUrl)],
});

/**
 * Build one TABLE component wrapping a single TR from a section table.
 * Used for non-float rows so each TR becomes its own editor row (one
 * component per row keeps the structure clean and editable).
 */
const trToTableComponent = (tableEl, tr, cells, assetBaseUrl = '') => ({
  id: createImportedDomId(),
  type: COMPONENT_TYPES.TABLE,
  content: '',
  importedDomTree: true,
  settings: compactSettings({
    ...tableLayoutSettings(tableEl),
    backgroundColor: ownBgColor(tableEl),
    backgroundImage: ownBgImage(tableEl, assetBaseUrl),
    backgroundSize: styleValue(tableEl, 'background-size') || undefined,
    backgroundPosition: styleValue(tableEl, 'background-position') || undefined,
    backgroundRepeat: styleValue(tableEl, 'background-repeat') || undefined,
    borderCollapse: styleValue(tableEl, 'border-collapse') || 'collapse',
    cellSpacing: tableEl.getAttribute('cellspacing') || '0',
    cellPadding: tableEl.getAttribute('cellpadding') || '0',
    padding: boxFromPadding(tableEl),
  }),
  tableRows: [{
    id: createImportedDomId(),
    settings: compactSettings({
      backgroundColor: ownBgColor(tr),
      backgroundImage: ownBgImage(tr, assetBaseUrl),
      backgroundSize: styleValue(tr, 'background-size') || undefined,
      backgroundPosition: styleValue(tr, 'background-position') || undefined,
      backgroundRepeat: styleValue(tr, 'background-repeat') || undefined,
      height: tr.getAttribute('height') || styleValue(tr, 'height') || undefined,
      ...textSettingsFromElement(tr),
    }),
    cells: cells.map((cell) => ({
      id: createImportedDomId(),
      width: ownWidth(cell) || undefined,
      colSpan: parseInt(cell.getAttribute('colspan') || '1', 10) || 1,
      rowSpan: parseInt(cell.getAttribute('rowspan') || '1', 10) || 1,
      settings: compactSettings({
        ...textSettingsFromElement(cell),
        backgroundColor: ownBgColor(cell),
        backgroundImage: ownBgImage(cell, assetBaseUrl),
        backgroundSize: styleValue(cell, 'background-size') || undefined,
        backgroundPosition: styleValue(cell, 'background-position') || undefined,
        backgroundRepeat: styleValue(cell, 'background-repeat') || undefined,
        verticalAlign: styleValue(cell, 'vertical-align') || cell.getAttribute('valign') || 'top',
        width: ownWidth(cell) || undefined,
        display: styleValue(cell, 'display') || undefined,
        float: styleValue(cell, 'float') || undefined,
        height: cell.getAttribute('height') || styleValue(cell, 'height') || undefined,
        padding: boxFromPadding(cell),
      }),
      components: Array.from(cell.childNodes || []).flatMap(
        (child) => domNodeToComponents(child, assetBaseUrl)
      ),
    })),
  }],
});

/**
 * Convert a Stripo section table into an array of editor rows.
 *
 * For each <tr> in the section table:
 *   - If the tr has a single <td> containing 2+ sibling float tables (es-left/es-right),
 *     emit a multi-column editor row — one column per float table.
 *     This gives full editability and side-by-side layout via flex columns.
 *   - Otherwise emit a single-column row with a TABLE component for that TR.
 */
const sectionTableToRows = (tableEl, assetBaseUrl = '') => {
  const directRows = Array.from(
    tableEl.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tfoot > tr, :scope > tr')
  );

  if (directRows.length === 0) {
    return [{
      id: createImportedDomId(),
      settings: compactSettings({ backgroundColor: ownBgColor(tableEl), padding: { top: 0, right: 0, bottom: 0, left: 0 } }),
      columns: [{
        id: createImportedDomId(),
        size: 12,
        settings: { backgroundColor: 'transparent', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        components: [domTableToComponent(tableEl, assetBaseUrl)],
      }],
    }];
  }

  return directRows.map((tr) => {
    const cells = Array.from(tr.children || []).filter(
      (c) => ['td', 'th'].includes(String(c.tagName || '').toLowerCase())
    );

    // Float-table row: split float tables into separate editable columns
    if (cells.length === 1 && cellHasFloatTables(cells[0])) {
      const floatTables = Array.from(cells[0].querySelectorAll(':scope > table'));
      const colCount = floatTables.length;
      const baseSize = Math.floor(12 / colCount);
      return {
        id: createImportedDomId(),
        settings: compactSettings({
          backgroundColor: ownBgColor(tr) || ownBgColor(cells[0]),
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        }),
        columns: floatTables.map((ft, idx) => {
          const size = idx === colCount - 1 ? 12 - baseSize * (colCount - 1) : baseSize;
          return floatTableToColumn(ft, size, assetBaseUrl);
        }),
      };
    }

    // Normal row: one single-column editor row wrapping this TR as a TABLE component
    return {
      id: createImportedDomId(),
      settings: compactSettings({
        backgroundColor: ownBgColor(tr),
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
      }),
      columns: [{
        id: createImportedDomId(),
        size: 12,
        settings: { backgroundColor: 'transparent', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        components: [trToTableComponent(tableEl, tr, cells, assetBaseUrl)],
      }],
    };
  });
};

const buildDomTreeImport = (htmlText = '', assetBaseUrl = '') => {
  importedDomIdCounter = 0;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText || '', 'text/html');
  const stripoSectionTables = Array.from(doc.querySelectorAll('table.es-header, table.es-content, table.es-footer'));
  const sectionTables = stripoSectionTables.length > 0
    ? stripoSectionTables
    : Array.from(doc.querySelectorAll('table.es-header-body, table.es-content-body, table.es-footer-body'));
  const tables = sectionTables.length > 0 ? sectionTables : Array.from(doc.body?.querySelectorAll?.('table') || []).slice(0, 1);
  const now = createImportedDomId();

  return [{
    id: now,
    settings: { backgroundColor: 'transparent', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    rows: tables.flatMap((tableEl) => sectionTableToRows(tableEl, assetBaseUrl)),
  }];
};
`;

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

const result = before + newBlock + after;
fs.writeFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', result);
console.log('done');
console.log('cellHasFloatTables present:', result.includes('cellHasFloatTables'));
console.log('sectionTableToRows present:', result.includes('sectionTableToRows'));
console.log('floatTableToColumn present:', result.includes('floatTableToColumn'));
console.log('trToTableComponent present:', result.includes('trToTableComponent'));
console.log('buildDomTreeImport present:', result.includes('buildDomTreeImport'));
