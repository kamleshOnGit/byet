// Temporary fix script - delete after running
const fs = require('fs');
let content = fs.readFileSync('src/emails/import/htmlToIr.js', 'utf8');

// Remove bad function if it exists
const fnStart = content.indexOf('stripMsoConditionals = (html)');
if (fnStart !== -1) {
  const lineStart = content.lastIndexOf('\n', fnStart);
  const exportStart = content.indexOf('export const htmlToIr');
  content = content.substring(0, lineStart) + '\n' + content.substring(exportStart);
  console.log('Removed bad function');
}

const exportIdx = content.indexOf('export const htmlToIr');
if (exportIdx === -1) {
  console.error('ERROR: export const htmlToIr not found');
  process.exit(1);
}

// Write the regex patterns with correct backslashes
// Each regex is built without shell escaping issues
const msoHiddenRegex = /<!--\[if[\s\S]*?\[endif\]-->/gi.toString();
const msoRevealedRegex = /<!--\[if[\s\S]*?\[endif\]-->/gi.toString(); // same structure
const vmlBlockRegex = /<v:[a-z][a-z0-9]*[\s\S]*?<\/v:[a-z][a-z0-9]*>/gi.toString();
const vmlSelfCloseRegex = /<v:[a-z][a-z0-9]*[^>]*\/>/gi.toString();

console.log('Regex 1:', msoHiddenRegex);
console.log('Regex 2:', msoRevealedRegex);

const correctFn = `// Strip MSO/VML conditional comments before parsing to prevent ghost TDs.
// <!--[if mso]>...<![endif]--> blocks can contain <td> tags that the HTML5 parser
// partially leaks into the DOM, creating spurious extra columns in the editor.
const stripMsoConditionals = (html) => {
  if (!html) return html;
  let result = String(html);
  // Remove MSO downlevel-hidden conditional comments: <!--[if mso]>...<![endif]-->
  result = result.replace(` + /<!--\[if[\s\S]*?\[endif\]-->/gi.toString() + `, '');
  // Remove downlevel-revealed conditional comments: <![if !...]>...<![endif]>
  result = result.replace(` + /<!\[if[\s\S]*?\[endif\]>/gi.toString() + `, '');
  // Remove VML v: elements (v:roundrect, v:stroke, etc.)
  result = result.replace(` + /<v:[a-z][a-z0-9]*[\s\S]*?<\/v:[a-z][a-z0-9]*>/gi.toString() + `, '');
  result = result.replace(` + /<v:[a-z][a-z0-9]*[^>]*\/>/gi.toString() + `, '');
  return result;
};

`;

console.log('Function to insert:');
console.log(correctFn);

content = content.substring(0, exportIdx) + correctFn + content.substring(exportIdx);
fs.writeFileSync('src/emails/import/htmlToIr.js', content);
console.log('Done. File length:', content.length);
