/**
 * Final patch:
 * 1. Remove folder upload button + its input, remove folderRef useRef
 * 2. Make existing fileRef input use webkitdirectory for folder selection
 * 3. Fix ownBgColor to also parse raw style attr string (for BEE background-color)
 * 4. Fix BEE TD rendering: serialize td.innerHTML as HTML block instead of decomposing
 */
const fs = require('fs');
const content = fs.readFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', 'utf8');
const lines = content.split('\n');

const changed = {};

// -----------------------------------------------------------------------
// FIX 1: Remove folderRef useRef declaration (line 714)
// -----------------------------------------------------------------------
const folderRefDeclIdx = lines.findIndex(l => l.includes('folderRef') && l.includes('useRef'));
if (folderRefDeclIdx > -1) {
  lines.splice(folderRefDeclIdx, 1);
  changed.folderRefDecl = true;
  console.log('Removed folderRef useRef');
} else {
  console.error('ERROR: folderRef decl not found');
}

// -----------------------------------------------------------------------
// FIX 2: Remove folderRef.current reset in handleFileChange area (line ~838 before splice)
// -----------------------------------------------------------------------
const folderRefResetIdx = lines.findIndex(l => l.includes('folderRef.current') && l.includes('value'));
if (folderRefResetIdx > -1) {
  lines.splice(folderRefResetIdx, 1);
  changed.folderRefReset = true;
  console.log('Removed folderRef.current reset');
}

// -----------------------------------------------------------------------
// FIX 3: Update fileRef input to use webkitdirectory (after removing multiple & accept)
//   Also update the comment above it
// -----------------------------------------------------------------------
const fileInputCommentIdx = lines.findIndex(l => l.includes('Single-file or multi-file (folder) upload'));
if (fileInputCommentIdx > -1) {
  lines[fileInputCommentIdx] = '        {/* Folder upload — select folder containing template + images */}\r';
  changed.fileInputComment = true;
  console.log('Updated fileRef input comment');
}

const fileAcceptIdx = lines.findIndex(l => l.includes('accept=".html,.htm,text/html,image/*"'));
if (fileAcceptIdx > -1) {
  // Replace accept with webkitdirectory
  lines[fileAcceptIdx] = '          webkitdirectory=""\r';
  changed.fileAccept = true;
  console.log('Replaced accept with webkitdirectory on fileRef input');
}

// Remove the extra "multiple" line if it's right after webkitdirectory
const multipleIdx = lines.findIndex((l, i) => i >= fileAcceptIdx && i < fileAcceptIdx + 3 && l.trim() === 'multiple\r');
if (multipleIdx > -1) {
  // keep multiple - it's fine for folder upload
  console.log('keeping multiple attribute on fileRef input');
}

// -----------------------------------------------------------------------
// FIX 4: Remove folder button + its text + its input (lines ~914-938 area)
//         Find by the comment line
// -----------------------------------------------------------------------
const folderBlockStartIdx = lines.findIndex(l => l.includes('Folder upload for templates with local images'));
if (folderBlockStartIdx > -1) {
  // Find the end: the closing /> of the folderRef input
  let folderBlockEndIdx = -1;
  let seenFolderInput = false;
  for (let i = folderBlockStartIdx; i < folderBlockStartIdx + 40; i++) {
    if (lines[i] && lines[i].includes('ref={folderRef}')) seenFolderInput = true;
    if (seenFolderInput && lines[i] && lines[i].trim() === '/>\r') {
      folderBlockEndIdx = i;
      break;
    }
  }
  if (folderBlockEndIdx > -1) {
    // Also remove the blank line before comment if present
    const startWithBlank = (lines[folderBlockStartIdx - 1] || '').trim() === '' ? folderBlockStartIdx - 1 : folderBlockStartIdx;
    lines.splice(startWithBlank, folderBlockEndIdx - startWithBlank + 1);
    changed.folderBlock = true;
    console.log('Removed folder button block (lines', startWithBlank+1, '-', folderBlockEndIdx+1, ')');
  } else {
    console.error('ERROR: Could not find folderRef input closing in folder block');
  }
} else {
  console.error('ERROR: Folder button comment not found');
}

// -----------------------------------------------------------------------
// FIX 5: Update the help text beneath the Edit button
// -----------------------------------------------------------------------
const helpTextIdx = lines.findIndex(l => l.includes('For templates with local images, use the folder upload'));
if (helpTextIdx > -1) {
  lines[helpTextIdx] = '          Select the folder containing your template to load local images automatically.\r';
  changed.helpText = true;
  console.log('Updated help text');
}

// -----------------------------------------------------------------------
// FIX 6: Fix ownBgColor to also parse raw style attr string
// -----------------------------------------------------------------------
const ownBgColorIdx = lines.findIndex(l => l.includes('const ownBgColor'));
if (ownBgColorIdx > -1) {
  lines[ownBgColorIdx] = [
    'const ownBgColor = (el) => {',
    "  const cssom = styleValue(el, 'background-color');",
    "  if (cssom && cssom !== 'transparent' && cssom !== 'rgba(0, 0, 0, 0)') return cssom;",
    '  // Parse raw style attr string for cases where DOMParser normalizes differently',
    "  const rawStyle = el?.getAttribute?.('style') || '';",
    "  const parts = rawStyle.split(';');",
    "  const bgPart = parts.find((p) => p.trim().toLowerCase().startsWith('background-color:'));",
    "  const rawBg = bgPart ? bgPart.split(':').slice(1).join(':').trim() : '';",
    "  if (rawBg && rawBg !== 'transparent' && rawBg !== 'rgba(0,0,0,0)') return rawBg;",
    "  return el?.getAttribute?.('bgcolor') || 'transparent';",
    '};\r'
  ].join('\r\n');
  changed.ownBgColor = true;
  console.log('Updated ownBgColor to parse raw style attr');
} else {
  console.error('ERROR: ownBgColor not found');
}

// -----------------------------------------------------------------------
// FIX 7: BEE TD rendering — use innerHTML HTML component instead of decomposing
// -----------------------------------------------------------------------
// Need to find after fix 6 spliced lines — re-find
const beeStart = lines.findIndex(l => l.includes('const beeSectionTableToRows'));
const beeCompLineIdx = lines.findIndex((l, i) =>
  i >= beeStart &&
  l.includes('components: Array.from(td.childNodes') &&
  l.includes('domNodeToComponents')
);
if (beeCompLineIdx > -1) {
  lines[beeCompLineIdx] = [
    '        components: (() => {',
    '          // Preserve BEE block content as raw HTML to avoid structural decomposition',
    '          const html = td.innerHTML || \'\';',
    '          if (!html.trim()) return [];',
    '          return [{ id: createImportedDomId(), type: COMPONENT_TYPES.HTML, importedDomTree: true, htmlContent: html, settings: {} }];',
    '        })(),\r'
  ].join('\r\n');
  changed.beeComponents = true;
  console.log('Updated BEE TD components to use innerHTML HTML block');
} else {
  console.error('ERROR: BEE components domNodeToComponents line not found');
}

// -----------------------------------------------------------------------
// Write out
// -----------------------------------------------------------------------
const result = lines.join('\n');
fs.writeFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', result);

console.log('\nAll changes applied:', JSON.stringify(changed, null, 2));

// Verify
const verify = fs.readFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', 'utf8');
console.log('\nVerification:');
console.log('folderRef removed from useRef:', !verify.includes('const folderRef = useRef'));
console.log('folderRef input removed:', !verify.includes('ref={folderRef}'));
console.log('folder button removed:', !verify.includes('Edit (Upload Folder)'));
console.log('webkitdirectory on fileRef input:', verify.includes('webkitdirectory=""') && verify.includes('ref={fileRef}'));
console.log('ownBgColor multi-line:', verify.includes("const ownBgColor = (el) => {"));
console.log('BEE uses innerHTML:', verify.includes('td.innerHTML'));
