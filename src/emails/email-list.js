import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Text, VStack, Alert, AlertIcon, AlertDescription, CloseButton, Progress } from '@chakra-ui/react';
import { AddIcon, EditIcon } from '@chakra-ui/icons';
import { parseHtmlToSections } from './utils/htmlParser';
import { htmlToIr } from './import/htmlToIr';
import { irToSections, scanIrToStructureMap } from './ir/irToSections';
import { COMPONENT_TYPES } from './partials/componentTypes';

// ---------------------------------------------------------------------------
// Asset inlining — converts local relative image src values to data: URIs so
// they display correctly inside the editor regardless of CORS or file:/// rules.
// ---------------------------------------------------------------------------

/**
 * Walk all image File objects from a FileList (folder upload) and build a map
 * of  filename → data: URI  so we can patch <img src="..."> values inline.
 * Also handles single-file uploads: we inline any images already present in
 * the HTML that have file:// or absolute paths by fetching them.
 */
const buildAssetDataUrlMap = async (imageFiles = []) => {
  const map = {};
  await Promise.all(
    Array.from(imageFiles).map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            map[file.name] = reader.result || '';
            // Also store by webkitRelativePath basename for folder uploads
            if (file.webkitRelativePath) {
              map[file.webkitRelativePath] = reader.result || '';
            }
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        })
    )
  );
  return map;
};

/**
 * Replace all <img src="..."> values in raw HTML text with data: URIs from
 * the asset map.  Handles:
 *   - Bare filenames:        images/logo.png  → map["images/logo.png"]
 *   - Relative paths:        ../images/x.jpg  → map["../images/x.jpg"]
 *   - Already-absolute file: file:///C:/…     → left as-is (no map entry)
 *   - data:/http(s)          → left untouched
 */
const patchHtmlImageSrcs = (htmlText, assetMap) => {
  if (!assetMap || Object.keys(assetMap).length === 0) return htmlText;
  return htmlText.replace(/(<img\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi, (match, prefix, quote, src) => {
    // Skip already-inlined or remote assets
    if (/^(data:|https?:|cid:|#)/i.test(src)) return match;
    // Try exact match first
    if (assetMap[src]) return `${prefix}${quote}${assetMap[src]}${quote}`;
    // Try basename match (strip path prefix)
    const basename = src.replace(/.*[/\\]/, '');
    if (assetMap[basename]) return `${prefix}${quote}${assetMap[basename]}${quote}`;
    return match;
  });
};

// ---------------------------------------------------------------------------
// URL normalization helpers
// ---------------------------------------------------------------------------
const normalizeImportedUrl = (value, assetBaseUrl) => {
  if (!value) return '';
  const raw = `${value}`.trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('cid:') || raw.startsWith('#')) return raw;
  if (/^(https?:|file:|mailto:|tel:)/i.test(raw)) return raw;
  if (!assetBaseUrl) return raw;
  try {
    return new URL(raw, assetBaseUrl).toString();
  } catch {
    return raw;
  }
};

const normalizeImportedComponentUrls = (component = {}, assetBaseUrl = '') => ({
  ...component,
  imageUrl: normalizeImportedUrl(component?.imageUrl || '', assetBaseUrl),
  linkUrl: normalizeImportedUrl(component?.linkUrl || '', assetBaseUrl),
  settings: {
    ...(component?.settings || {}),
    backgroundImage: normalizeImportedUrl(component?.settings?.backgroundImage || '', assetBaseUrl),
  },
  tableRows: (component?.tableRows || []).map((tableRow) => ({
    ...tableRow,
    settings: {
      ...(tableRow?.settings || {}),
      backgroundImage: normalizeImportedUrl(tableRow?.settings?.backgroundImage || '', assetBaseUrl),
    },
    cells: (tableRow?.cells || []).map((cell) => ({
      ...cell,
      settings: {
        ...(cell?.settings || {}),
        backgroundImage: normalizeImportedUrl(cell?.settings?.backgroundImage || '', assetBaseUrl),
      },
      components: (cell?.components || []).map((nested) => normalizeImportedComponentUrls(nested, assetBaseUrl)),
    })),
  })),
});

const normalizeImportedSectionsUrls = (sections = [], assetBaseUrl = '') =>
  sections.map((section) => ({
    ...section,
    settings: {
      ...(section?.settings || {}),
      backgroundImage: normalizeImportedUrl(section?.settings?.backgroundImage || '', assetBaseUrl),
    },
    rows: (section?.rows || []).map((row) => ({
      ...row,
      settings: {
        ...(row?.settings || {}),
        backgroundImage: normalizeImportedUrl(row?.settings?.backgroundImage || '', assetBaseUrl),
      },
      columns: (row?.columns || []).map((column) => ({
        ...column,
        settings: {
          ...(column?.settings || {}),
          backgroundImage: normalizeImportedUrl(column?.settings?.backgroundImage || '', assetBaseUrl),
        },
        components: (column?.components || []).map((component) => normalizeImportedComponentUrls(component, assetBaseUrl)),
      })),
    })),
  }));

const getSavedFromBaseUrl = (htmlText = '') => {
  const match = `${htmlText}`.match(/saved from url=\([^)]*\)(https?:\/\/[^\s>]+)/i);
  const rawUrl = match?.[1] || '';
  if (!rawUrl) return '';
  try {
    return new URL('.', rawUrl).toString();
  } catch {
    return '';
  }
};

const getLocalFileBaseUrl = (htmlFile) => {
  const rawPath = htmlFile?.path || htmlFile?.mozFullPath || '';
  if (!rawPath) return '';
  try {
    const normalized = rawPath.replace(/\\/g, '/').replace(/\/[^/]*$/, '/');
    return `file:///${normalized.replace(/^\/+/, '')}`;
  } catch {
    return '';
  }
};

// ---------------------------------------------------------------------------
// Fix 7: Quality scoring — count renderable components, not just presence.
// Returns { count, score } so callers can compare parsers numerically.
// ---------------------------------------------------------------------------
const countImportedComponents = (sections = []) => {
  let count = 0;
  let hasMultiColumn = false;
  sections.forEach((section) => {
    (section?.rows || []).forEach((row) => {
      const cols = row?.columns || [];
      if (cols.length > 1) hasMultiColumn = true;
      cols.forEach((column) => {
        count += (column?.components || []).length;
        // Components inside nestedRows count too
        (column?.nestedRows || []).forEach((nestedRow) => {
          (nestedRow?.columns || []).forEach((nc) => {
            count += (nc?.components || []).length;
          });
        });
      });
    });
  });
  // Bonus: multi-column layouts are structurally richer → prefer them
  return { count, score: count + (hasMultiColumn ? 10 : 0) };
};

// eslint-disable-next-line no-unused-vars
const hasRenderableImportedContent = (sections = []) =>
  countImportedComponents(sections).count > 0;

// ---------------------------------------------------------------------------
// Fix 8 (enhanced): Div-layout detection — identify templates whose primary
// layout structure is div-based so the div-walk scanner is used instead of
// the dominant-table heuristic.
//
// Detects two cases:
//  a) Well-known email-builder class markers (Unlayer u-row-container / u-col,
//     BEE bee-row / bee-column, Chamaileon cm-block, etc.)
//  b) Structurally: no <table> at all, or divs vastly outnumber tables and
//     there are very few tables (pure CSS-grid / flexbox templates).
//
// NOTE: Hybrid templates (outer <table> wrapper + div rows inside) are
// detected via the class markers — the simple ratio test is kept only as a
// fallback for truly table-free layouts.
// ---------------------------------------------------------------------------
const isDivBasedTemplate = (htmlText = '') => {
  // Class-based markers for popular div-layout email builders
  const DIV_LAYOUT_CLASS_PATTERNS = [
    /class="[^"]*\bu-row-container\b[^"]*"/,  // Unlayer
    /class="[^"]*\bu-row\b[^"]*"/,            // Unlayer
    /class="[^"]*\bu-col\b[^"]*"/,            // Unlayer
    /class="[^"]*\bbee-row\b[^"]*"/,          // BEE Free
    /class="[^"]*\bbee-col\b[^"]*"/,          // BEE Free
    /class="[^"]*\bbee-block\b[^"]*"/,        // BEE Free
    /class="[^"]*\bcm-block\b[^"]*"/,         // Chamaileon
    /class="[^"]*\bstripo-row\b[^"]*"/,       // Stripo div variant
    /class="[^"]*\bemail-row-container\b[^"]*"/, // generic
  ];
  if (DIV_LAYOUT_CLASS_PATTERNS.some((re) => re.test(htmlText))) return true;

  // Structural fallback: no tables or divs vastly outnumber tables
  const lower = htmlText.toLowerCase();
  const tableMatches = (lower.match(/<table\b/g) || []).length;
  const divMatches = (lower.match(/<div\b/g) || []).length;
  return tableMatches === 0 || (divMatches > 0 && tableMatches < 2 && divMatches > tableMatches * 3);
};

let importedDomIdCounter = 0;
const createImportedDomId = () => Date.now() + (++importedDomIdCounter);

const styleValue = (el, prop) => el?.style?.getPropertyValue?.(prop) || '';
const ownBgColor = (el) => {
  const cssom = styleValue(el, 'background-color');
  if (cssom && cssom !== 'transparent' && cssom !== 'rgba(0, 0, 0, 0)') return cssom;
  // Parse raw style attr string for cases where DOMParser normalizes differently
  const rawStyle = el?.getAttribute?.('style') || '';
  const parts = rawStyle.split(';');
  const bgPart = parts.find((p) => p.trim().toLowerCase().startsWith('background-color:'));
  const rawBg = bgPart ? bgPart.split(':').slice(1).join(':').trim() : '';
  if (rawBg && rawBg !== 'transparent' && rawBg !== 'rgba(0,0,0,0)') return rawBg;
  return el?.getAttribute?.('bgcolor') || 'transparent';
};
const extractCssUrl = (value = '') => {
  const match = `${value}`.match(/url\((['"]?)(.*?)\1\)/i);
  return match?.[2] || '';
};
const ownBgImage = (el, assetBaseUrl = '') => {
  const styleBg = extractCssUrl(styleValue(el, 'background-image'));
  const attrBg = el?.getAttribute?.('background') || '';
  return normalizeImportedUrl(styleBg || attrBg, assetBaseUrl);
};
const ownWidth = (el) => {
  const width = el?.getAttribute?.('width') || styleValue(el, 'width') || '';
  return width && /^\d+$/.test(width) ? `${width}px` : width;
};
const tableLayoutSettings = (el) => {
  const align = `${el?.getAttribute?.('align') || ''}`.toLowerCase();
  const cssFloat = styleValue(el, 'float') || (align === 'left' || align === 'right' ? align : '');
  const width = ownWidth(el) || styleValue(el, 'max-width') || '';
  return compactSettings({
    width: width || '100%',
    maxWidth: styleValue(el, 'max-width') || undefined,
    display: styleValue(el, 'display') || undefined,
    float: cssFloat || undefined,
    marginLeft: align === 'center' ? 'auto' : undefined,
    marginRight: align === 'center' ? 'auto' : undefined,
  });
};
const isHiddenDomNode = (el) => {
  const style = `${el?.getAttribute?.('style') || ''}`.toLowerCase();
  const cls = `${el?.getAttribute?.('class') || ''}`.toLowerCase();
  return (
    /display\s*:\s*none/.test(style) ||
    /mso-hide\s*:\s*all/.test(style) ||
    /max-height\s*:\s*0/.test(style) ||
    /\bes-hidden\b/.test(cls) ||
    el?.getAttribute?.('hidden') !== null
  );
};
const boxFromPadding = (el) => ({
  top: parseInt(styleValue(el, 'padding-top') || styleValue(el, 'padding') || 0, 10) || 0,
  right: parseInt(styleValue(el, 'padding-right') || styleValue(el, 'padding') || 0, 10) || 0,
  bottom: parseInt(styleValue(el, 'padding-bottom') || styleValue(el, 'padding') || 0, 10) || 0,
  left: parseInt(styleValue(el, 'padding-left') || styleValue(el, 'padding') || 0, 10) || 0,
});
const textSettingsFromElement = (el) => ({
  textAlign: styleValue(el, 'text-align') || el?.getAttribute?.('align') || undefined,
  textColor: styleValue(el, 'color') || undefined,
  fontSize: styleValue(el, 'font-size') || undefined,
  fontWeight: styleValue(el, 'font-weight') || undefined,
  fontFamily: styleValue(el, 'font-family') || undefined,
  lineHeight: styleValue(el, 'line-height') || undefined,
});
const compactSettings = (settings) => Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined && value !== ''));

const isComplexStripoTemplate = (htmlText = '') => {
  const lower = `${htmlText}`.toLowerCase();
  if (!/\bes-(wrapper|content|header|footer|content-body|header-body|footer-body)\b/.test(lower)) return false;
  const sectionBodyCount = (lower.match(/\bes-(content|header|footer)-body\b/g) || []).length;
  const backgroundImageCount = (lower.match(/background-image\s*:|<[^>]+\sbackground=/g) || []).length;
  const tableCount = (lower.match(/<table\b/g) || []).length;
  return backgroundImageCount > 0 || sectionBodyCount >= 8 || tableCount >= 90;
};

const shouldUseDomTreeImport = (htmlText = '') => {
  const lower = `${htmlText}`.toLowerCase();
  const tableCount = (lower.match(/<table\b/g) || []).length;
  if (isComplexStripoTemplate(htmlText)) return true;
  return /\becw\b/.test(lower) && /\blayout-\d+\b/.test(lower) && tableCount >= 20;
};

const domNodeToComponents = (node, assetBaseUrl = '') => {
  if (!node) return [];
  if (node.nodeType === Node.TEXT_NODE) {
    const text = `${node.textContent || ''}`.replace(/\s+/g, ' ').trim();
    return text ? [{
      id: createImportedDomId(),
      type: COMPONENT_TYPES.SPAN,
      content: text,
      settings: {},
    }] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const tag = `${node.tagName || ''}`.toLowerCase();
  if (['style', 'script', 'meta', 'title', 'link'].includes(tag)) return [];
  if (isHiddenDomNode(node)) return [];
  if (tag === 'table') return [domTableToComponent(node, assetBaseUrl)];
  if (tag === 'img') {
    return [{
      id: createImportedDomId(),
      type: COMPONENT_TYPES.IMAGE,
      content: node.getAttribute('alt') || '',
      imageUrl: normalizeImportedUrl(node.getAttribute('src') || '', assetBaseUrl),
      settings: compactSettings({
        ...textSettingsFromElement(node),
        width: ownWidth(node) || styleValue(node, 'max-width') || undefined,
        height: node.getAttribute('height') || styleValue(node, 'height') || undefined,
        backgroundColor: ownBgColor(node),
        backgroundImage: ownBgImage(node, assetBaseUrl),
        backgroundSize: styleValue(node, 'background-size') || undefined,
        backgroundPosition: styleValue(node, 'background-position') || undefined,
        backgroundRepeat: styleValue(node, 'background-repeat') || undefined,
        padding: boxFromPadding(node),
      }),
    }];
  }

  const text = Array.from(node.childNodes || []).every((child) => child.nodeType === Node.TEXT_NODE)
    ? `${node.textContent || ''}`.replace(/\s+/g, ' ').trim()
    : '';
  if (text) {
    const isHeading = /^h[1-3]$/.test(tag);
    return [{
      id: createImportedDomId(),
      type: isHeading ? COMPONENT_TYPES.HEADING : COMPONENT_TYPES.SPAN,
      content: text,
      linkUrl: tag === 'a' ? normalizeImportedUrl(node.getAttribute('href') || '', assetBaseUrl) : '',
      settings: compactSettings({
        ...textSettingsFromElement(node),
        backgroundColor: ownBgColor(node),
        backgroundImage: ownBgImage(node, assetBaseUrl),
        backgroundSize: styleValue(node, 'background-size') || undefined,
        backgroundPosition: styleValue(node, 'background-position') || undefined,
        backgroundRepeat: styleValue(node, 'background-repeat') || undefined,
        padding: boxFromPadding(node),
        width: ownWidth(node) || undefined,
      }),
    }];
  }

  return Array.from(node.childNodes || []).flatMap((child) => domNodeToComponents(child, assetBaseUrl));
};


/**
 * Detect whether a TD/TH cell contains multiple sibling float tables
 * (Stripo es-left / es-right two-column product card pattern).
 * Float is ignored by flex containers, so these cells must be rendered
 * as a single raw-HTML block component to preserve their side-by-side layout.
 */
const cellHasFloatTables = (cell) => {
  const directTables = Array.from(cell.querySelectorAll(':scope > table'));
  const floated = directTables.filter((t) => {
    const cls = '' + (t.getAttribute('class') || '');
    const styleAttr = '' + (t.getAttribute('style') || '');
    const align = '' + (t.getAttribute('align') || '');
    return (
      (cls.includes('es-left') || cls.includes('es-right')) ||
      (styleAttr.includes('float:left') || styleAttr.includes('float: left') || styleAttr.includes('float:right') || styleAttr.includes('float: right')) ||
      align === 'left' ||
      align === 'right'
    );
  });
  return floated.length >= 2;
};

/**
 * Serialize a cell inner HTML as a single imported-DOM HTML component
 * wrapped in a clearfix block.
 */
const domTableToComponent = (tableEl, assetBaseUrl = '') => {
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
      const floatTables = Array.from(cells[0].querySelectorAll(":scope > table"));
      const colCount = floatTables.length;
      // Compute proportional grid sizes from inner-TD pixel widths
      const innerWidths = floatTables.map((ft) => {
        const innerTD = ft.querySelector("td");
        // Parse width from style attr using split — avoids regex backslash issues
        const styleStr = innerTD ? (innerTD.getAttribute("style") || "") : "";
        const widthPart = styleStr.split(";").find((p) => p.trim().toLowerCase().startsWith("width:"));
        const styleW = widthPart ? parseInt(widthPart.split(":")[1], 10) : 0;
        const attrW = innerTD ? parseInt(innerTD.getAttribute("width") || "0", 10) : 0;
        return styleW || attrW || 0;
      });
      const totalW = innerWidths.reduce((a, b) => a + b, 0);
      // Convert pixel ratios to 12-grid sizes; ensure they sum to 12
      let sizes;
      if (totalW > 0) {
        const rawSizes = innerWidths.map((w) => Math.max(1, Math.round((w / totalW) * 12)));
        const diff = 12 - rawSizes.reduce((a, b) => a + b, 0);
        rawSizes[rawSizes.length - 1] += diff; // absorb rounding error in last column
        sizes = rawSizes;
      } else {
        const baseSize = Math.floor(12 / colCount);
        sizes = floatTables.map((_, idx) => idx === colCount - 1 ? 12 - baseSize * (colCount - 1) : baseSize);
      }
      return {
        id: createImportedDomId(),
        settings: compactSettings({
          backgroundColor: ownBgColor(tr) || ownBgColor(cells[0]),
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        }),
        columns: floatTables.map((ft, idx) => floatTableToColumn(ft, sizes[idx], assetBaseUrl)),
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


/**
 * Detect a BEE/Mailjet email template by its nl-container + row row-N structure.
 */
const isBeeTemplate = (doc) => {
  return !!doc.querySelector('table.nl-container') &&
         doc.querySelectorAll('table[class*="row row-"]').length > 0;
};

/**
 * Convert a percentage width string (e.g. "58.333%") to a 12-grid size.
 * Rounds to nearest integer, minimum 1.
 */
const pctToGridSize = (pctStr) => {
  const val = parseFloat(pctStr);
  if (!val || val <= 0) return null;
  return Math.max(1, Math.round(val / 100 * 12));
};

/**
 * Build editor rows from a BEE/Mailjet template.
 * Each "row row-N" table becomes one editor row.
 * Multi-column rows (row-content with multiple TDs) become multi-column editor rows.
 */
const beeSectionTableToRows = (doc, assetBaseUrl = '') => {
  const rowTables = Array.from(doc.querySelectorAll('table[class*="row row-"]'));
  const result = [];

  rowTables.forEach((rowTable) => {
    const bgColor = rowTable.getAttribute('bgcolor') || ownBgColor(rowTable);
    const contentTable = rowTable.querySelector('table.row-content');
    if (!contentTable) return;

    let colTDs = Array.from(contentTable.querySelectorAll(':scope > tbody > tr > td'));

    // If there is exactly one outer TD, check whether it contains a nested multi-column
    // table (BEE "row row-N" with inner column layout rather than top-level TDs).
    if (colTDs.length === 1) {
      const singleTD = colTDs[0];
      const directTables = Array.from(singleTD.children).filter((c) => c.tagName === 'TABLE');
      const innerColTable = directTables.find((t) => {
        const innerTDs = Array.from(t.querySelectorAll(':scope > tbody > tr > td'));
        return innerTDs.length > 1;
      });
      if (innerColTable) {
        colTDs = Array.from(innerColTable.querySelectorAll(':scope > tbody > tr > td'));
      }
    }

    // Skip empty spacer rows (no meaningful text or images)
    const hasContent = colTDs.some((td) => {
      const imgs = td.querySelectorAll('img');
      const txt = (td.textContent || '').replace(/\s+/g, ' ').trim();
      return imgs.length > 0 || txt.length > 2;
    });
    if (!hasContent) return;

    // Remove pure-spacer TDs (no width attr AND no content/images) before building columns
    const contentTDs = colTDs.filter((td) => {
    const hasWidth = !!td.getAttribute('width');
    const hasImg = td.querySelectorAll('img').length > 0;
      const hasTxt = (td.textContent || "").split(" ").join("").trim().length > 0;
    return hasWidth || hasImg || hasTxt;
    });
    const activeTDs = contentTDs.length > 0 ? contentTDs : colTDs;
    const colCount = activeTDs.length;
    
    // Compute grid sizes from percentage widths on content TDs
    const rawSizes = activeTDs.map((td) => pctToGridSize(td.getAttribute('width') || ''));
    let sizes;
    if (rawSizes.every(Boolean)) {
    const total = rawSizes.reduce((a, b) => a + b, 0);
    const diff = 12 - total;
    rawSizes[rawSizes.length - 1] += diff;
    sizes = rawSizes;
    } else {
    const base = Math.floor(12 / colCount);
    sizes = activeTDs.map((_, idx) => idx === colCount - 1 ? 12 - base * (colCount - 1) : base);
    }
    result.push({
      id: createImportedDomId(),
      settings: compactSettings({ backgroundColor: bgColor, padding: { top: 0, right: 0, bottom: 0, left: 0 } }),
      columns: activeTDs.map((td, idx) => ({
        id: createImportedDomId(),
        size: sizes[idx],
        settings: compactSettings({
          backgroundColor: ownBgColor(td),
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        }),
        components: (() => {
          // Preserve BEE block content as raw HTML to avoid structural decomposition
          const html = td.innerHTML || '';
          if (!html.trim()) return [];
          return [{ id: createImportedDomId(), type: COMPONENT_TYPES.HTML, importedDomTree: true, htmlContent: html, settings: {} }];
        })(),
      })),
    });
  });

  return result;
};

const buildDomTreeImport = (htmlText = '', assetBaseUrl = '') => {
  importedDomIdCounter = 0;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText || '', 'text/html');
  // Prefer es-*-body tables (content level) — they contain the float-pair TRs directly.
  // The outer es-content/es-header/es-footer wrappers are one level up and break sectionTableToRows.
  const sectionBodyTables = Array.from(doc.querySelectorAll('table.es-header-body, table.es-content-body, table.es-footer-body'));
  const stripoWrapperTables = Array.from(doc.querySelectorAll('table.es-header, table.es-content, table.es-footer'));
  const tables = sectionBodyTables.length > 0 ? sectionBodyTables : (stripoWrapperTables.length > 0 ? stripoWrapperTables : Array.from(doc.body?.querySelectorAll?.('table') || []).slice(0, 1));

  const now = createImportedDomId();
  return [{
    id: now,
    settings: { backgroundColor: 'transparent', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    rows: isBeeTemplate(doc) ? beeSectionTableToRows(doc, assetBaseUrl) : tables.flatMap((tableEl) => sectionTableToRows(tableEl, assetBaseUrl)),
  }];
};

const EmailList = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleCreate = () => {
    navigate('/create');
  };

  const handleEditClick = () => {
    if (fileRef.current) fileRef.current.click();
  };

  // Fix 9: central error display helper
  const showImportError = (msg) => {
    setImportError(msg);
    setTimeout(() => setImportError(''), 8000);
  };

  const processImport = async (htmlFile, siblingImageFiles = []) => {
    setIsImporting(true);
    setImportError('');
    try {
      // File size guard (10 MB)
      if (htmlFile.size > 10 * 1024 * 1024) {
        showImportError('File is too large (max 10 MB). Please use a smaller template.');
        return;
      }

      let text = await htmlFile.text();

      // Fix 1: Build asset map from sibling image files (folder upload)
      // and patch relative <img src> values with data: URIs inline.
      const assetMap = siblingImageFiles.length > 0
        ? await buildAssetDataUrlMap(siblingImageFiles)
        : {};
      if (Object.keys(assetMap).length > 0) {
        text = patchHtmlImageSrcs(text, assetMap);
      }

      // Fall back: try to resolve a base URL from saved-from comment
      const assetBaseUrl = getSavedFromBaseUrl(text) || getLocalFileBaseUrl(htmlFile);
      const domTreeImport = shouldUseDomTreeImport(text);

      // Fix 8: choose parsing strategy based on template structure
      const divBased = isDivBasedTemplate(text);

      // ---- Legacy parser (always runs as baseline) ----
      let parsedTemplate = null;
      try {
        parsedTemplate = parseHtmlToSections(text);
      } catch (legacyErr) {
        console.warn('Legacy parser error:', legacyErr);
      }

      if (!parsedTemplate) {
        // Legacy parser returned nothing meaningful
        if (!divBased) {
          showImportError('Could not parse the HTML template. The file may be corrupted or use an unsupported structure.');
          return;
        }
      }

      // ---- IR parser ----
      let importedIr = null;
      let mappedIrSections = [];
      try {
        importedIr = htmlToIr(text, { assetBaseUrl, isDivBased: divBased });
        let irScan = { sections: [] };
        irScan = scanIrToStructureMap(importedIr, { allowDivWalk: divBased });
        mappedIrSections = irScan.sections?.length > 0 ? irScan.sections : irToSections(importedIr);
      } catch (irErr) {
        console.warn('IR structure mapping failed:', irErr);
      }

      const legacySections = parsedTemplate
        ? (Array.isArray(parsedTemplate) ? parsedTemplate : parsedTemplate.sections)
        : [];
      const importedTemplateSettings = parsedTemplate && !Array.isArray(parsedTemplate)
        ? parsedTemplate.templateSettings
        : null;

      // Fix 7: quality scoring — pick the parser that produced more components
      const irQuality = countImportedComponents(mappedIrSections);
      const legacyQuality = countImportedComponents(legacySections);

      let importedSections;
      let chosenParser;
      if (domTreeImport) {
        importedSections = normalizeImportedSectionsUrls(buildDomTreeImport(text, assetBaseUrl), assetBaseUrl);
        chosenParser = 'dom-tree';
      } else if (irQuality.score >= legacyQuality.score && irQuality.count > 0) {
        importedSections = normalizeImportedSectionsUrls(mappedIrSections, assetBaseUrl);
        chosenParser = 'ir';
      } else if (legacyQuality.count > 0) {
        importedSections = normalizeImportedSectionsUrls(legacySections, assetBaseUrl);
        chosenParser = 'legacy';
      } else {
        // Fix 9: neither parser extracted anything
        showImportError(
          'No editable content could be found in the template. ' +
          'The file may use unsupported markup (e.g., CSS grid, SVG-only layout).'
        );
        return;
      }

      console.info(`[import] Using ${chosenParser} parser. IR score=${irQuality.score}, legacy score=${legacyQuality.score}`);

      navigate('/create', {
        state: {
          importedSections,
          importedTemplateSettings,
          importedIr,
        },
      });
    } catch (err) {
      console.error('Failed to import file:', err);
      // Fix 9: surface the error to the user
      showImportError(
        `Import failed: ${err?.message || 'Unknown error'}. ` +
        'Please check the file and try again.'
      );
    } finally {
      setIsImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e?.target?.files || []);
    if (files.length === 0) return;
    const htmlFile = files.find((f) => /\.(html|htm)$/i.test(f.name));
    if (!htmlFile) {
      showImportError('Please select an HTML file (.html or .htm).');
      return;
    }
    const imageFiles = files.filter((f) => /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i.test(f.name));
    await processImport(htmlFile, imageFiles);
  };

  return (
    <Box minH="calc(100vh - 72px)" display="flex" alignItems="center" justifyContent="center" p={8}>
      <VStack spacing={6} align="stretch" w="340px">
        {importError && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertDescription fontSize="sm" flex="1">{importError}</AlertDescription>
            <CloseButton size="sm" onClick={() => setImportError('')} ml={2} />
          </Alert>
        )}

        {isImporting && (
          <Box>
            <Text fontSize="sm" color="gray.500" mb={1}>Importing template…</Text>
            <Progress size="xs" isIndeterminate colorScheme="teal" borderRadius="full" />
          </Box>
        )}

        <Button
          onClick={handleCreate}
          leftIcon={<AddIcon />}
          colorScheme="teal"
          size="lg"
          justifyContent="flex-start"
          h="56px"
          isDisabled={isImporting}
        >
          Create
        </Button>

        <Button
          onClick={handleEditClick}
          leftIcon={<EditIcon />}
          variant="outline"
          colorScheme="teal"
          size="lg"
          justifyContent="flex-start"
          h="56px"
          isDisabled={isImporting}
          isLoading={isImporting}
          loadingText="Importing…"
        >
          Edit (Upload Template)
        </Button>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Upload an HTML email template to edit and download.
          Select your .html template. To include local images, also select them at the same time.
        </Text>

        {/* File upload — select .html template and any local images together */}
        <input
          ref={fileRef}
          type="file"
          accept=".html,.htm,text/html,image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </VStack>
    </Box>
  );
};

export default EmailList;
