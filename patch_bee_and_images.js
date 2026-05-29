/**
 * Patch email-list.js to:
 * 1. Add folder upload (webkitdirectory) input for templates with local images
 * 2. Recognize BEE/Mailjet nl-container row structure in buildDomTreeImport
 */
const fs = require('fs');
let content = fs.readFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', 'utf8');
const lines = content.split('\n');

// -----------------------------------------------------------------------
// PATCH 1: Add BEE/nl-container template detection and import
// Insert a new helper `isBeeTemplate` and update buildDomTreeImport
// to recognise 'row row-N' tables and convert percentage widths to grid sizes
// -----------------------------------------------------------------------

// Find buildDomTreeImport
const buildIdx = lines.findIndex(l => l.includes('const buildDomTreeImport'));
console.log('buildDomTreeImport at line:', buildIdx + 1);

// Insert BEE helper before buildDomTreeImport
const beeHelper = [
  '',
  '/**',
  ' * Detect a BEE/Mailjet email template by its nl-container + row row-N structure.',
  ' */',
  'const isBeeTemplate = (doc) => {',
  '  return !!doc.querySelector(\'table.nl-container\') &&',
  '         doc.querySelectorAll(\'table[class*="row row-"]\').length > 0;',
  '};',
  '',
  '/**',
  ' * Convert a percentage width string (e.g. "58.333%") to a 12-grid size.',
  ' * Rounds to nearest integer, minimum 1.',
  ' */',
  'const pctToGridSize = (pctStr) => {',
  '  const val = parseFloat(pctStr);',
  '  if (!val || val <= 0) return null;',
  '  return Math.max(1, Math.round(val / 100 * 12));',
  '};',
  '',
  '/**',
  ' * Build editor rows from a BEE/Mailjet template.',
  ' * Each "row row-N" table becomes one editor row.',
  ' * Multi-column rows (row-content with multiple TDs) become multi-column editor rows.',
  ' */',
  'const beeSectionTableToRows = (doc, assetBaseUrl = \'\') => {',
  '  const rowTables = Array.from(doc.querySelectorAll(\'table[class*="row row-"]\'));',
  '  return rowTables.map((rowTable) => {',
  '    const bgColor = rowTable.getAttribute(\'bgcolor\') || ownBgColor(rowTable);',
  '    const contentTable = rowTable.querySelector(\'table.row-content\');',
  '    if (!contentTable) {',
  '      return {',
  '        id: createImportedDomId(),',
  '        settings: compactSettings({ backgroundColor: bgColor, padding: { top: 0, right: 0, bottom: 0, left: 0 } }),',
  '        columns: [{',
  '          id: createImportedDomId(),',
  '          size: 12,',
  '          settings: { backgroundColor: \'transparent\', padding: { top: 0, right: 0, bottom: 0, left: 0 } },',
  '          components: [domTableToComponent(rowTable, assetBaseUrl)],',
  '        }],',
  '      };',
  '    }',
  '',
  '    const colTDs = Array.from(contentTable.querySelectorAll(\':scope > tbody > tr > td\'));',
  '    const colCount = colTDs.length;',
  '',
  '    // Compute grid sizes from percentage widths on TDs',
  '    const rawSizes = colTDs.map((td) => pctToGridSize(td.getAttribute(\'width\') || \'\'));',
  '    let sizes;',
  '    if (rawSizes.every(Boolean)) {',
  '      const total = rawSizes.reduce((a, b) => a + b, 0);',
  '      const diff = 12 - total;',
  '      rawSizes[rawSizes.length - 1] += diff;',
  '      sizes = rawSizes;',
  '    } else {',
  '      const base = Math.floor(12 / colCount);',
  '      sizes = colTDs.map((_, idx) => idx === colCount - 1 ? 12 - base * (colCount - 1) : base);',
  '    }',
  '',
  '    return {',
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
  '    };',
  '  });',
  '};',
  '',
].map(l => l + '\r');

lines.splice(buildIdx, 0, ...beeHelper);
console.log('BEE helper inserted, new buildDomTreeImport at line:', lines.findIndex(l => l.includes('const buildDomTreeImport')) + 1);

// -----------------------------------------------------------------------
// PATCH 2: Update buildDomTreeImport to branch for BEE templates
// -----------------------------------------------------------------------
const buildIdx2 = lines.findIndex(l => l.includes('const buildDomTreeImport'));
// Find the 'rows:' line inside buildDomTreeImport
const rowsLineIdx = lines.findIndex((l, i) => i > buildIdx2 && l.trim().startsWith('rows:'));
console.log('rows: line at:', rowsLineIdx + 1, lines[rowsLineIdx].replace('\r',''));

// Replace that one line with a BEE-aware version
lines[rowsLineIdx] = '    rows: isBeeTemplate(doc) ? beeSectionTableToRows(doc, assetBaseUrl) : tables.flatMap((tableEl) => sectionTableToRows(tableEl, assetBaseUrl)),\r';
console.log('updated rows: line:', lines[rowsLineIdx].replace('\r',''));

// -----------------------------------------------------------------------
// PATCH 3: Add folder upload button to the JSX
// -----------------------------------------------------------------------
// Find the single-file input and add a folder input + button after it
const fileInputIdx = lines.findIndex(l => l.includes('ref={fileRef}') && l.includes('type="file"'));
console.log('fileRef input at line:', fileInputIdx + 1);

// Find the </VStack> closing tag
const vstackCloseIdx = lines.findIndex((l, i) => i > fileInputIdx && l.includes('</VStack>'));
console.log('</VStack> at line:', vstackCloseIdx + 1);

// Insert folder upload input + button before </VStack>
const folderUploadLines = [
  '',
  '        {/* Folder upload for templates with local images (webkitdirectory) */}',
  '        <Button',
  '          onClick={() => folderRef.current && folderRef.current.click()}',
  '          leftIcon={<EditIcon />}',
  '          variant="outline"',
  '          colorScheme="blue"',
  '          size="lg"',
  '          justifyContent="flex-start"',
  '          h="56px"',
  '          isDisabled={isImporting}',
  '        >',
  '          Edit (Upload Folder)',
  '        </Button>',
  '        <Text fontSize="xs" color="gray.400" textAlign="center">',
  '          Use folder upload when your template has local images in a subfolder.',
  '        </Text>',
  '        <input',
  '          ref={folderRef}',
  '          type="file"',
  '          style={{ display: \'none\' }}',
  '          webkitdirectory=""',
  '          multiple',
  '          onChange={handleFileChange}',
  '        />',
  '',
].map(l => '        ' + l.trimStart() + '\r');

// But don't double-add if already there
if (!content.includes('webkitdirectory')) {
  lines.splice(vstackCloseIdx, 0, ...folderUploadLines);
  console.log('Folder upload button inserted');
} else {
  console.log('webkitdirectory already present, skipping');
}

// -----------------------------------------------------------------------
// Write out
// -----------------------------------------------------------------------
fs.writeFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', lines.join('\n'));
console.log('done');
console.log('isBeeTemplate present:', lines.join('\n').includes('isBeeTemplate'));
console.log('beeSectionTableToRows present:', lines.join('\n').includes('beeSectionTableToRows'));
console.log('webkitdirectory present:', lines.join('\n').includes('webkitdirectory'));
