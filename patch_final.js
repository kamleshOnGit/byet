/**
 * Final patch:
 * 1. Remove folder upload button, make existing Edit button open folder via webkitdirectory
 * 2. Fix ownBgColor to also read background-color from raw style attribute
 * 3. Fix BEE TD rendering: preserve entire TD innerHTML as a raw HTML component
 *    instead of decomposing through domNodeToComponents (which creates wrong structure)
 */
const fs = require('fs');
let content = fs.readFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', 'utf8');
let lines = content.split('\n');

// -----------------------------------------------------------------------
// FIX 1: ownBgColor — also read background-color from raw style attr string
// The browser DOMParser does parse inline styles into el.style, but let's
// also add a fallback to string-parse the style attr for safety
// -----------------------------------------------------------------------
const ownBgColorLine = lines.findIndex(l => l.includes('const ownBgColor'));
console.log('ownBgColor at line:', ownBgColorLine + 1, lines[ownBgColorLine].replace('\r', ''));

// Replace it with a version that also parses raw style attr
lines[ownBgColorLine] = 'const ownBgColor = (el) => {\r';
lines.splice(ownBgColorLine + 1, 0,
  '  const cssom = el?.style?.getPropertyValue?.(\'background-color\') || \'\';\r',
  '  if (cssom && cssom !== \'transparent\' && cssom !== \'rgba(0, 0, 0, 0)\') return cssom;\r',
  '  // Also parse raw style attr string (handles cases where CSSOM normalizes to empty)\r',
  '  const rawStyle = el?.getAttribute?.(\'style\') || \'\';\r',
  '  const match = rawStyle.split(\';\').find((p) => p.trim().toLowerCase().startsWith(\'background-color:\'));\r',
  '  const rawBg = match ? match.split(\':\').slice(1).join(\':\').trim() : \'\';\r',
  '  if (rawBg && rawBg !== \'transparent\' && rawBg !== \'rgba(0,0,0,0)\') return rawBg;\r',
  '  return el?.getAttribute?.(\'bgcolor\') || \'transparent\';\r',
  '};\r',
);
// Remove the old single-line version that follows
// After splice, the old line content is now shifted — find and remove the old one-liner
const oldOneLinerIdx = lines.findIndex((l, i) => i > ownBgColorLine + 9 && l.includes('const extractCssUrl'));
// Check line before extractCssUrl for the old ownBgColor (should now be gone - already replaced)
console.log('extractCssUrl at:', oldOneLinerIdx + 1, lines[oldOneLinerIdx]?.replace('\r', '').substring(0, 60));

// -----------------------------------------------------------------------
// FIX 2: BEE TD rendering — use innerHTML HTML component instead of decomposing
// In beeSectionTableToRows, replace domNodeToComponents call with a function
// that serializes the entire TD content as a preserved HTML block
// -----------------------------------------------------------------------
const beeComponentsLine = lines.findIndex(l =>
  l.includes('components: Array.from(td.childNodes || []).flatMap((child) => domNodeToComponents(child, assetBaseUrl))') &&
  lines.findIndex(l2 => l2.includes('beeSectionTableToRows')) > -1
);
// Find it within beeSectionTableToRows specifically
const beeStart = lines.findIndex(l => l.includes('const beeSectionTableToRows'));
const beeEnd = lines.findIndex((l, i) => i > beeStart && l.trim() === '};');
console.log('beeSectionTableToRows lines:', beeStart + 1, '-', beeEnd + 1);

const beeCompLine = lines.findIndex((l, i) =>
  i >= beeStart && i <= beeEnd &&
  l.includes('components: Array.from(td.childNodes')
);
console.log('BEE components line:', beeCompLine + 1, lines[beeCompLine]?.replace('\r', '').substring(0, 80));

if (beeCompLine > -1) {
  // Replace with innerHTML-based HTML component
  lines[beeCompLine] = '        components: [{\r';
  lines.splice(beeCompLine + 1, 0,
    '          id: createImportedDomId(),\r',
    '          type: COMPONENT_TYPES.HTML,\r',
    '          importedDomTree: true,\r',
    '          htmlContent: td.innerHTML || \'\',\r',
    '          settings: {},\r',
    '        }],\r',
  );
  console.log('BEE components line replaced with HTML block');
}

// -----------------------------------------------------------------------
// FIX 3: Remove folder upload button + its input, update Edit button input
// to use webkitdirectory so user selects folder directly
// -----------------------------------------------------------------------

// Remove lines from "Folder upload for templates..." comment to the closing </input>
const folderCommentIdx = lines.findIndex(l => l.includes('Folder upload for templates with local images'));
const folderInputEndIdx = lines.findIndex((l, i) => i > folderCommentIdx && l.includes('onChange={handleFileChange}') && l.includes('folderRef'));
// Actually find the second onChange to get the folder input's closing
const folderInputClose = lines.findIndex((l, i) => i >= folderInputEndIdx && l.trim() === '/>');
console.log('Folder comment at:', folderCommentIdx + 1, 'folderInputClose at:', folderInputClose + 1);

if (folderCommentIdx > -1 && folderInputClose > -1) {
  lines.splice(folderCommentIdx - 1, folderInputClose - folderCommentIdx + 2);
  console.log('Removed folder upload button and input');
}

// Update the existing file input to use webkitdirectory for folder selection
const fileInputIdx = lines.findIndex((l, i) => l.includes('ref={fileRef}') && l.includes('type="file"'));
console.log('fileRef input at line:', fileInputIdx + 1);
if (fileInputIdx > -1) {
  // Find the closing /> of the fileRef input
  const fileInputClose = lines.findIndex((l, i) => i >= fileInputIdx && l.trim() === '/>');
  console.log('fileRef input close at:', fileInputClose + 1);
  // Insert webkitdirectory before the closing />
  if (fileInputClose > -1) {
    lines.splice(fileInputClose, 0, '          webkitdirectory=""\r');
    console.log('Added webkitdirectory to existing file input');
  }
}

// Update the help text
const helpTextIdx = lines.findIndex(l => l.includes('For templates with local images, use the folder upload'));
if (helpTextIdx > -1) {
  lines[helpTextIdx] = '          Select the template folder to load local images automatically.\r';
  console.log('Updated help text');
}

// -----------------------------------------------------------------------
// Write out
// -----------------------------------------------------------------------
fs.writeFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', lines.join('\n'));

const finalContent = fs.readFileSync('C:/Users/Maste/Desktop/byet-1/src/emails/email-list.js', 'utf8');
console.log('\nVerification:');
console.log('ownBgColor multi-line:', finalContent.includes('const ownBgColor = (el) => {'));
console.log('webkitdirectory on fileRef:', finalContent.includes('webkitdirectory') && finalContent.includes('ref={fileRef}'));
console.log('folderRef input removed:', !finalContent.includes('webkitdirectory=""\r') || finalContent.split('webkitdirectory').length === 2);
console.log('BEE uses HTML block:', finalContent.includes('td.innerHTML'));
console.log('done');
