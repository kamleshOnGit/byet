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
const resolveAssetFromMap = (rawValue = '', assetMap = {}) => {
  const value = `${rawValue || ''}`.trim();
  if (!value || /^(data:|https?:|cid:|#|mailto:|tel:)/i.test(value)) return '';
  if (assetMap[value]) return assetMap[value];
  const normalized = value.replace(/^\.\//, '').replace(/\\/g, '/');
  if (assetMap[normalized]) return assetMap[normalized];
  const basename = normalized.replace(/.*\//, '');
  return assetMap[basename] || '';
};

const patchHtmlImageSrcs = (htmlText, assetMap) => {
  if (!assetMap || Object.keys(assetMap).length === 0) return htmlText;
  let patched = htmlText.replace(/\b(src|background)\s*=\s*(["'])([^"']+)\2/gi, (match, attr, quote, src) => {
    const resolved = resolveAssetFromMap(src, assetMap);
    return resolved ? `${attr}=${quote}${resolved}${quote}` : match;
  });
  patched = patched.replace(/\bsrcset\s*=\s*(["'])([^"']+)\1/gi, (match, quote, srcset) => {
    const nextSrcset = `${srcset}`.split(',').map((part) => {
      const bits = part.trim().split(/\s+/);
      const resolved = resolveAssetFromMap(bits[0], assetMap);
      return resolved ? [resolved, ...bits.slice(1)].join(' ') : part.trim();
    }).join(', ');
    return `srcset=${quote}${nextSrcset}${quote}`;
  });
  patched = patched.replace(/url\((['"]?)([^)'"]+)\1\)/gi, (match, quote, url) => {
    const resolved = resolveAssetFromMap(url, assetMap);
    return resolved ? `url(${quote || "'"}${resolved}${quote || "'"})` : match;
  });
  return patched;
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
  const isVisibleBg = (value) => {
    const raw = `${value || ''}`.trim().toLowerCase().replace(/\s+/g, '');
    return !!raw && raw !== 'transparent' && raw !== 'rgba(0,0,0,0)';
  };
  const cssom = styleValue(el, 'background-color');
  if (isVisibleBg(cssom)) return cssom;
  // Parse raw style attr string for cases where DOMParser normalizes differently
  const rawStyle = el?.getAttribute?.('style') || '';
  const parts = rawStyle.split(';');
  const bgPart = parts.find((p) => p.trim().toLowerCase().startsWith('background-color:'));
  const rawBg = bgPart ? bgPart.split(':').slice(1).join(':').trim() : '';
  if (isVisibleBg(rawBg)) return rawBg;
  const attrBg = el?.getAttribute?.('bgcolor') || '';
  return isVisibleBg(attrBg) ? attrBg : '';
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
  if (/\bgenerated-grid\b/.test(lower) && /\bstack-column-cell\b/.test(lower)) return true;
  if (/\bnl-container\b/.test(lower) && /\brow-content\b/.test(lower) && /\bcolumn-\d+\b/.test(lower)) return true;
  if (/\bu-row-container\b/.test(lower) && /\bu-row\b/.test(lower) && /\bu-col\b/.test(lower)) return true;
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
const getDirectFloatTables = (cell) => {
  const directTables = Array.from(cell.querySelectorAll(':scope > table'));
  return directTables.filter((t) => {
    const cls = `${t.getAttribute('class') || ''}`;
    const styleAttr = `${t.getAttribute('style') || ''}`;
    const align = `${t.getAttribute('align') || ''}`.toLowerCase();
    const isFloated = (
      cls.includes('es-left') ||
      cls.includes('es-right') ||
      styleAttr.includes('float:left') ||
      styleAttr.includes('float: left') ||
      styleAttr.includes('float:right') ||
      styleAttr.includes('float: right') ||
      align === 'left' ||
      align === 'right'
    );
    if (!isFloated || isHiddenDomNode(t)) return false;
    const text = `${t.textContent || ''}`.replace(/\s+/g, ' ').trim();
    return text.length > 0 || t.querySelectorAll('img').length > 0;
  });
};

const cellHasFloatTables = (cell) => getDirectFloatTables(cell).length >= 2;

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
const floatTableToColumn = (tableEl, colSize, assetBaseUrl = '', fallbackBg = '') => {
  const firstCell = tableEl.querySelector?.('td, th');
  return {
    id: createImportedDomId(),
    size: colSize,
    settings: {
      backgroundColor: ownBgColor(tableEl) || ownBgColor(firstCell) || fallbackBg || 'transparent',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    components: [domTableToComponent(tableEl, assetBaseUrl)],
  };
};

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
      const floatTables = getDirectFloatTables(cells[0]);
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
      const sizes = normalizeGridSizes(innerWidths, colCount);
      const rowBackgroundColor = ownBgColor(tr) || ownBgColor(cells[0]);
      return {
        id: createImportedDomId(),
        settings: compactSettings({
          backgroundColor: rowBackgroundColor || 'transparent',
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        }),
        columns: floatTables.map((ft, idx) => floatTableToColumn(ft, sizes[idx], assetBaseUrl, rowBackgroundColor)),
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

const normalizeGridSizes = (weights = [], count = weights.length) => {
  const safeCount = Math.max(1, count || 1);
  const usableWeights = weights.slice(0, safeCount).map((value) => Number.parseFloat(value) || 0);
  const totalWeight = usableWeights.reduce((sum, value) => sum + value, 0);
  if (totalWeight <= 0) {
    const base = Math.floor(12 / safeCount);
    return Array.from({ length: safeCount }, (_, index) => index === safeCount - 1 ? 12 - base * (safeCount - 1) : base);
  }
  const sizes = usableWeights.map((value) => Math.max(1, Math.round((value / totalWeight) * 12)));
  let total = sizes.reduce((sum, value) => sum + value, 0);
  while (total > 12) {
    const index = sizes.reduce((best, value, currentIndex) => value > sizes[best] ? currentIndex : best, 0);
    if (sizes[index] <= 1) break;
    sizes[index] -= 1;
    total -= 1;
  }
  while (total < 12) {
    const index = sizes.reduce((best, value, currentIndex) => value > sizes[best] ? currentIndex : best, 0);
    sizes[index] += 1;
    total += 1;
  }
  return sizes;
};

const firstMeaningfulElement = (root, selector) => root?.querySelector?.(selector) || null;

const beeTextFrom = (el) => `${el?.textContent || ''}`.replace(/\s+/g, ' ').trim();

const beeEditableComponentFromBlock = (blockEl, assetBaseUrl = '') => {
  const cls = `${blockEl?.getAttribute?.('class') || ''}`;
  if (!blockEl || isHiddenDomNode(blockEl)) return [];

  if (/\bspacer_block\b/.test(cls)) {
    const height = parseInt(styleValue(blockEl, 'height') || styleValue(blockEl, 'line-height') || '0', 10) || 0;
    return height > 0 ? [{ id: createImportedDomId(), type: COMPONENT_TYPES.SPACE, height, content: '', settings: { height: `${height}px` } }] : [];
  }

  const img = firstMeaningfulElement(blockEl, 'img');
  if (img && /\bimage_block\b|\bicons_block\b/.test(cls)) {
    const pad = img.closest?.('td.pad') || blockEl;
    return [{
      id: createImportedDomId(),
      type: COMPONENT_TYPES.IMAGE,
      content: img.getAttribute('alt') || img.getAttribute('title') || '',
      imageUrl: normalizeImportedUrl(img.getAttribute('src') || '', assetBaseUrl),
      linkUrl: normalizeImportedUrl(img.closest?.('a')?.getAttribute?.('href') || '', assetBaseUrl),
      settings: compactSettings({
        width: ownWidth(img) || styleValue(img, 'width') || undefined,
        maxWidth: styleValue(img, 'max-width') || undefined,
        height: img.getAttribute('height') || styleValue(img, 'height') || undefined,
        textAlign: pad.getAttribute?.('align') || styleValue(pad, 'text-align') || undefined,
        padding: boxFromPadding(pad),
      }),
    }];
  }

  const heading = firstMeaningfulElement(blockEl, 'h1, h2, h3');
  if (heading && /\bheading_block\b/.test(cls)) {
    const pad = heading.closest?.('td.pad') || blockEl;
    return [{
      id: createImportedDomId(),
      type: COMPONENT_TYPES.HEADING,
      content: beeTextFrom(heading),
      settings: compactSettings({
        ...textSettingsFromElement(heading),
        textColor: styleValue(heading, 'color') || undefined,
        padding: boxFromPadding(pad),
      }),
    }];
  }

  const button = firstMeaningfulElement(blockEl, 'span.button, a.v-button, a');
  if (button && /\bbutton_block\b/.test(cls)) {
    const link = button.closest?.('a') || (button.tagName?.toLowerCase?.() === 'a' ? button : null);
    const buttonEl = button.matches?.('span.button') ? button : firstMeaningfulElement(button, 'span.button') || button;
    const pad = button.closest?.('td.pad') || blockEl;
    return [{
      id: createImportedDomId(),
      type: COMPONENT_TYPES.BUTTON,
      content: beeTextFrom(buttonEl),
      linkUrl: normalizeImportedUrl(link?.getAttribute?.('href') || '', assetBaseUrl),
      settings: compactSettings({
        buttonColor: styleValue(buttonEl, 'background-color') || undefined,
        buttonTextColor: styleValue(buttonEl, 'color') || undefined,
        borderRadius: parseInt(styleValue(buttonEl, 'border-radius') || '0', 10) || undefined,
        fontFamily: styleValue(buttonEl, 'font-family') || undefined,
        fontSize: styleValue(buttonEl, 'font-size') || undefined,
        fontWeight: styleValue(buttonEl, 'font-weight') || undefined,
        textAlign: pad.getAttribute?.('align') || styleValue(pad, 'text-align') || undefined,
        padding: boxFromPadding(buttonEl.querySelector?.('.btn-pad') || buttonEl),
      }),
    }];
  }

  const paragraph = firstMeaningfulElement(blockEl, 'p, div');
  if (paragraph && /\bparagraph_block\b/.test(cls)) {
    const textRoot = paragraph.closest?.('div') || paragraph;
    const pad = paragraph.closest?.('td.pad') || blockEl;
    return [{
      id: createImportedDomId(),
      type: COMPONENT_TYPES.PARAGRAPH,
      content: beeTextFrom(paragraph),
      settings: compactSettings({
        ...textSettingsFromElement(textRoot),
        textColor: styleValue(textRoot, 'color') || undefined,
        padding: boxFromPadding(pad),
      }),
    }];
  }

  const nested = Array.from(blockEl.children || []).flatMap((child) => beeEditableComponentFromBlock(child, assetBaseUrl));
  if (nested.length > 0) return nested;
  const html = blockEl.outerHTML || '';
  return html.trim() ? [{ id: createImportedDomId(), type: COMPONENT_TYPES.HTML, importedDomTree: true, htmlContent: html, settings: {} }] : [];
};

const beeEditableComponentsFromCell = (td, assetBaseUrl = '') => {
  const components = Array.from(td.children || []).flatMap((child) => beeEditableComponentFromBlock(child, assetBaseUrl));
  if (components.length > 0) return components;
  const html = td.innerHTML || '';
  return html.trim() ? [{ id: createImportedDomId(), type: COMPONENT_TYPES.HTML, importedDomTree: true, htmlContent: html, settings: {} }] : [];
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

    const rowContentBgColor = ownBgColor(contentTable);
    let colTDs = Array.from(contentTable.querySelectorAll(':scope > tbody > tr > td')).filter((td) => {
      const cls = `${td.getAttribute?.('class') || ''}`;
      return !/\bgap\b/.test(cls);
    });

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
        colTDs = Array.from(innerColTable.querySelectorAll(':scope > tbody > tr > td')).filter((td) => {
          const cls = `${td.getAttribute?.('class') || ''}`;
          return !/\bgap\b/.test(cls);
        });
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
    const sizes = rawSizes.every(Boolean)
      ? normalizeGridSizes(rawSizes, colCount)
      : normalizeGridSizes([], colCount);
    result.push({
      id: createImportedDomId(),
      settings: compactSettings({
        backgroundColor: bgColor || rowContentBgColor || 'transparent',
        padding: boxFromPadding(contentTable),
      }),
      columns: activeTDs.map((td, idx) => ({
        id: createImportedDomId(),
        size: sizes[idx],
        settings: compactSettings({
          backgroundColor: ownBgColor(td) || rowContentBgColor || 'transparent',
          padding: boxFromPadding(td),
          verticalAlign: styleValue(td, 'vertical-align') || td.getAttribute?.('valign') || 'top',
        }),
        components: beeEditableComponentsFromCell(td, assetBaseUrl),
      })),
    });
  });

  return result;
};

const sectionSettingsFromTable = (tableEl, assetBaseUrl = '') => {
  const wrapperCell = tableEl.closest?.('td');
  const wrapperTable = tableEl.closest?.('table.es-header, table.es-content, table.es-footer');
  return compactSettings({
    backgroundColor: ownBgColor(wrapperCell) || ownBgColor(wrapperTable) || ownBgColor(tableEl) || 'transparent',
    backgroundImage: ownBgImage(wrapperCell, assetBaseUrl) || ownBgImage(wrapperTable, assetBaseUrl) || ownBgImage(tableEl, assetBaseUrl) || undefined,
    backgroundSize: styleValue(wrapperCell, 'background-size') || styleValue(wrapperTable, 'background-size') || styleValue(tableEl, 'background-size') || undefined,
    backgroundPosition: styleValue(wrapperCell, 'background-position') || styleValue(wrapperTable, 'background-position') || styleValue(tableEl, 'background-position') || undefined,
    backgroundRepeat: styleValue(wrapperCell, 'background-repeat') || styleValue(wrapperTable, 'background-repeat') || styleValue(tableEl, 'background-repeat') || undefined,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  });
};

const isAppGeneratedTemplate = (doc) => {
  return doc.querySelectorAll?.('td.generated-grid.stack-column-cell, td.stack-column-cell.generated-grid').length > 0;
};

const isUnlayerTemplate = (doc) => {
  return doc.querySelectorAll?.('.u-row-container .u-row .u-col').length > 0;
};

const unlayerColumnSize = (colEl) => {
  const cls = `${colEl.getAttribute?.('class') || ''}`;
  const pctClass = cls.match(/\bu-col-(\d+)p(\d+)\b/);
  if (pctClass) return Math.max(1, Math.round((Number.parseFloat(`${pctClass[1]}.${pctClass[2]}`) / 100) * 12));
  const wholeClass = cls.match(/\bu-col-(\d+)\b/);
  if (wholeClass) return Math.max(1, Math.round((Number.parseFloat(wholeClass[1]) / 100) * 12));
  const minWidth = Number.parseFloat(styleValue(colEl, 'min-width')) || 0;
  const rowEl = colEl.closest?.('.u-row');
  const rowWidth = Number.parseFloat(styleValue(rowEl, 'max-width')) || Number.parseFloat(styleValue(rowEl, 'width')) || 0;
  return minWidth && rowWidth ? Math.max(1, Math.round((minWidth / rowWidth) * 12)) : null;
};

const unlayerColumnContentRoot = (colEl) => {
  const wrappers = Array.from(colEl.querySelectorAll?.('div') || []);
  return wrappers.find((el) => `${el.getAttribute?.('style') || ''}`.includes('box-sizing: border-box')) || colEl;
};

const buildUnlayerImport = (doc, assetBaseUrl = '') => {
  const rows = Array.from(doc.querySelectorAll?.('.u-row') || []).map((rowEl) => {
    const rowContainer = rowEl.closest?.('.u-row-container');
    const columns = Array.from(rowEl.querySelectorAll?.('.u-col') || []).filter((colEl) => colEl.closest?.('.u-row') === rowEl);
    const sizes = normalizeGridSizes(columns.map(unlayerColumnSize), columns.length || 1);
    return {
      id: createImportedDomId(),
      settings: compactSettings({
        backgroundColor: ownBgColor(rowEl) || ownBgColor(rowContainer) || 'transparent',
        backgroundImage: ownBgImage(rowContainer, assetBaseUrl) || ownBgImage(rowEl, assetBaseUrl) || undefined,
        backgroundSize: styleValue(rowContainer, 'background-size') || styleValue(rowEl, 'background-size') || undefined,
        backgroundPosition: styleValue(rowContainer, 'background-position') || styleValue(rowEl, 'background-position') || undefined,
        backgroundRepeat: styleValue(rowContainer, 'background-repeat') || styleValue(rowEl, 'background-repeat') || undefined,
        padding: boxFromPadding(rowContainer),
      }),
      columns: columns.map((colEl, index) => {
        const contentRoot = unlayerColumnContentRoot(colEl);
        return {
          id: createImportedDomId(),
          size: sizes[index],
          settings: compactSettings({
            backgroundColor: ownBgColor(colEl) || ownBgColor(contentRoot) || 'transparent',
            padding: boxFromPadding(contentRoot),
            verticalAlign: styleValue(colEl, 'vertical-align') || 'top',
          }),
          components: Array.from(contentRoot.childNodes || []).flatMap((child) => domNodeToComponents(child, assetBaseUrl)),
        };
      }),
    };
  }).filter((row) => row.columns.length > 0);

  return [{
    id: createImportedDomId(),
    settings: { backgroundColor: ownBgColor(doc.body) || 'transparent', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    rows,
  }];
};

const buildAppGeneratedImport = (doc, assetBaseUrl = '') => {
  const rows = [];
  const rowEls = Array.from(doc.querySelectorAll?.('tr') || []);
  rowEls.forEach((tr) => {
    const cells = Array.from(tr.children || []).filter((cell) => {
      const cls = `${cell.getAttribute?.('class') || ''}`;
      return /\bgenerated-grid\b/.test(cls) && /\bstack-column-cell\b/.test(cls);
    });
    if (cells.length === 0) return;

    const rawSizes = cells.map((cell) => {
      const width = cell.getAttribute?.('width') || styleValue(cell, 'width') || '';
      if (`${width}`.trim().endsWith('%')) return pctToGridSize(width);
      const pct = Number.parseFloat(`${width}`.replace('%', ''));
      return Number.isFinite(pct) ? Math.max(1, Math.round((pct / 100) * 12)) : null;
    });
    const sizes = rawSizes.every(Boolean) ? normalizeGridSizes(rawSizes, cells.length) : normalizeGridSizes([], cells.length);
    const rowWrapperCell = tr.closest?.('td:not(.generated-grid)');
    const rowBackgroundColor = ownBgColor(tr) || ownBgColor(rowWrapperCell);

    rows.push({
      id: createImportedDomId(),
      settings: compactSettings({
        backgroundColor: rowBackgroundColor || 'transparent',
        padding: boxFromPadding(rowWrapperCell),
      }),
      columns: cells.map((cell, index) => ({
        id: createImportedDomId(),
        size: sizes[index],
        settings: compactSettings({
          backgroundColor: ownBgColor(cell) || 'transparent',
          padding: boxFromPadding(cell),
          verticalAlign: styleValue(cell, 'vertical-align') || cell.getAttribute?.('valign') || 'top',
        }),
        components: Array.from(cell.childNodes || []).flatMap((child) => domNodeToComponents(child, assetBaseUrl)),
      })),
    });
  });

  return [{
    id: createImportedDomId(),
    settings: { backgroundColor: ownBgColor(doc.body) || 'transparent', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    rows,
  }];
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

  if (isAppGeneratedTemplate(doc)) {
    return buildAppGeneratedImport(doc, assetBaseUrl);
  }

  if (isUnlayerTemplate(doc)) {
    return buildUnlayerImport(doc, assetBaseUrl);
  }

  if (isBeeTemplate(doc)) {
    const now = createImportedDomId();
    return [{
      id: now,
      settings: { backgroundColor: 'transparent', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
      rows: beeSectionTableToRows(doc, assetBaseUrl),
    }];
  }

  if (sectionBodyTables.length > 0) {
    return sectionBodyTables.map((tableEl) => ({
      id: createImportedDomId(),
      settings: sectionSettingsFromTable(tableEl, assetBaseUrl),
      rows: sectionTableToRows(tableEl, assetBaseUrl),
    }));
  }

  const now = createImportedDomId();
  return [{
    id: now,
    settings: { backgroundColor: 'transparent', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    rows: tables.flatMap((tableEl) => sectionTableToRows(tableEl, assetBaseUrl)),
  }];
};

const EmailList = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleCreate = () => {
    navigate('/create');
  };

  const handleEditClick = () => {
    if (fileRef.current) fileRef.current.click();
  };

  const handleFolderImportClick = () => {
    if (folderRef.current) folderRef.current.click();
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
      if (folderRef.current) folderRef.current.value = '';
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
          Edit HTML File
        </Button>

        <Button
          onClick={handleFolderImportClick}
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
          Edit Template Folder
        </Button>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Upload a single HTML file, or upload the full template folder when it has local images/assets.
        </Text>

        {/* File upload — select .html template and optional local images together */}
        <input
          ref={fileRef}
          type="file"
          accept=".html,.htm,text/html,image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Folder upload — select a template folder containing HTML and local assets */}
        <input
          ref={folderRef}
          type="file"
          accept=".html,.htm,text/html,image/*"
          multiple
          webkitdirectory=""
          directory=""
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </VStack>
    </Box>
  );
};

export default EmailList;
