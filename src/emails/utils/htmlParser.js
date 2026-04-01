import { COMPONENT_TYPES } from '../partials/componentTypes';

/**
 * Sophisticated HTML Email Template Parser
 * Preserves styles, structure, and layout for round-trip editing
 */

// ============================================================================
// STYLE EXTRACTION UTILITIES
// ============================================================================

const extractStyleValue = (styleText, propName) => {
  const style = `${styleText || ''}`;
  const re = new RegExp(`(^|;)\\s*${propName}\\s*:\\s*([^;]+)`, 'i');
  const match = style.match(re);
  return match ? `${match[2]}`.trim() : '';
};

const extractColor = (el, propName = 'background-color') => {
  if (!el || !el.getAttribute) return '';
  const styleVal = extractStyleValue(el.getAttribute('style') || '', propName);
  if (styleVal && styleVal !== 'transparent' && styleVal !== 'rgba(0, 0, 0, 0)') return styleVal;
  if (propName === 'background-color') {
    const bgAttr = el.getAttribute('bgcolor');
    if (bgAttr) return `${bgAttr}`.trim();
  }
  return '';
};

const findClosestColor = (el, propName = 'background-color', maxDepth = 8) => {
  let node = el;
  for (let i = 0; i < maxDepth && node; i++) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const color = extractColor(node, propName);
      if (color) return color;
    }
    node = node.parentElement;
  }
  return '';
};

const parsePxValue = (val) => {
  const n = Number.parseFloat(`${val || ''}`.replace(/px|pt|em|rem/gi, '').trim());
  return Number.isFinite(n) ? n : null;
};

const normalizeDimensionValue = (value) => {
  const raw = `${value || ''}`.trim();
  if (!raw) return '';
  if (/^\d+(?:\.\d+)?$/.test(raw)) return `${raw}px`;
  return raw;
};

const parseBoxShorthand = (styleText, propName) => {
  const out = { top: 0, right: 0, bottom: 0, left: 0 };
  const p = extractStyleValue(styleText, propName);
  if (p) {
    const parts = p.split(/\s+/).filter(Boolean).slice(0, 4);
    const nums = parts.map(parsePxValue).filter((n) => n !== null);
    if (nums.length === 1) { out.top = out.right = out.bottom = out.left = nums[0]; }
    else if (nums.length === 2) { out.top = out.bottom = nums[0]; out.left = out.right = nums[1]; }
    else if (nums.length === 3) { out.top = nums[0]; out.left = out.right = nums[1]; out.bottom = nums[2]; }
    else if (nums.length >= 4) { out.top = nums[0]; out.right = nums[1]; out.bottom = nums[2]; out.left = nums[3]; }
  }
  ['top', 'right', 'bottom', 'left'].forEach((dir) => {
    const val = parsePxValue(extractStyleValue(styleText, `${propName}-${dir}`));
    if (val !== null) out[dir] = val;
  });
  return out;
};

const parsePadding = (styleText) => parseBoxShorthand(styleText, 'padding');
const parseMargin = (styleText) => parseBoxShorthand(styleText, 'margin');

const extractAlign = (el) => {
  if (!el || !el.getAttribute) return '';
  const attr = `${el.getAttribute('align') || ''}`.trim().toLowerCase();
  if (['left', 'center', 'right'].includes(attr)) return attr;
  const styleAlign = extractStyleValue(el.getAttribute('style') || '', 'text-align').toLowerCase();
  if (['left', 'center', 'right'].includes(styleAlign)) return styleAlign;
  return '';
};

const extractFontStyles = (el) => {
  if (!el || !el.getAttribute) return {};
  const style = el.getAttribute('style') || '';
  const result = {};
  const fontSize = extractStyleValue(style, 'font-size');
  if (fontSize) result.fontSize = fontSize;
  const fontWeight = extractStyleValue(style, 'font-weight');
  if (fontWeight) result.fontWeight = fontWeight;
  const fontFamily = extractStyleValue(style, 'font-family');
  if (fontFamily) result.fontFamily = fontFamily;
  const lineHeight = extractStyleValue(style, 'line-height');
  if (lineHeight) result.lineHeight = lineHeight;
  const color = extractStyleValue(style, 'color');
  if (color) result.textColor = color;
  const letterSpacing = extractStyleValue(style, 'letter-spacing');
  if (letterSpacing) result.letterSpacing = letterSpacing;
  return result;
};

const extractBorderStyles = (styleText) => {
  const border = extractStyleValue(styleText, 'border');
  const borderColor = extractStyleValue(styleText, 'border-color');
  const borderWidth = parsePxValue(extractStyleValue(styleText, 'border-width'));
  const borderRadius = parsePxValue(extractStyleValue(styleText, 'border-radius'));
  return {
    border: border || 'none',
    borderColor: borderColor || '#000000',
    borderWidth: borderWidth !== null ? borderWidth : 0,
    borderRadius: borderRadius !== null ? borderRadius : 0,
  };
};

const extractBackgroundImage = (styleText) => {
  let bgImg = extractStyleValue(styleText, 'background-image');
  if (!bgImg) {
    const bgShorthand = extractStyleValue(styleText, 'background');
    if (bgShorthand) bgImg = bgShorthand;
  }
  if (!bgImg) return '';
  const urlMatch = bgImg.match(/url\(\s*['"]?([^'"()]+)['"]?\s*\)/i);
  return urlMatch ? urlMatch[1] : '';
};

const extractDimensions = (el) => {
  if (!el || !el.getAttribute) return {};
  const style = el.getAttribute('style') || '';
  const result = {};
  const width = el.getAttribute('width') || extractStyleValue(style, 'width');
  if (width) result.width = normalizeDimensionValue(width);
  const height = el.getAttribute('height') || extractStyleValue(style, 'height');
  if (height) result.height = normalizeDimensionValue(height);
  return result;
};

const extractBackgroundSettings = (el) => {
  if (!el || !el.getAttribute) {
    return {
      backgroundColor: '',
      backgroundImage: '',
      backgroundSize: '',
      backgroundPosition: '',
      backgroundRepeat: '',
    };
  }
  const style = el.getAttribute('style') || '';
  return {
    backgroundColor: extractColor(el, 'background-color') || '',
    backgroundImage: extractBackgroundImage(style) || '',
    backgroundSize: extractStyleValue(style, 'background-size') || '',
    backgroundPosition: extractStyleValue(style, 'background-position') || '',
    backgroundRepeat: extractStyleValue(style, 'background-repeat') || '',
  };
};

const findLikelyContentWidth = (root) => {
  if (!root) return '600px';
  const rawCandidates = Array.from(root.querySelectorAll?.('*') || []).map((el) => {
    const style = el.getAttribute?.('style') || '';
    return el.getAttribute?.('width') || extractStyleValue(style, 'max-width') || extractStyleValue(style, 'width') || '';
  });
  const candidates = rawCandidates
    .map((value) => `${value || ''}`.trim())
    .filter(Boolean)
    .map((value) => {
      if (value.endsWith('%')) return null;
      const match = value.match(/(\d+(?:\.\d+)?)/);
      if (!match) return null;
      const px = Math.round(Number.parseFloat(match[1]));
      return (px >= 320 && px <= 800) ? px : null;
    })
    .filter((value) => Number.isFinite(value));
  if (candidates.length === 0) return '600px';

  const counts = new Map();
  candidates.forEach((px) => counts.set(px, (counts.get(px) || 0) + 1));
  const best = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return Math.abs(a[0] - 600) - Math.abs(b[0] - 600);
  })[0]?.[0];
  return `${best || 600}px`;
};

const extractTemplateSettings = (body, referenceEl = null) => {
  const bodyStyle = body?.getAttribute?.('style') || '';
  const bodyFont = extractFontStyles(body);
  const refFont = extractFontStyles(referenceEl);
  const bodyBg = extractColor(body, 'background-color') || findClosestColor(referenceEl || body, 'background-color', 4) || '#ffffff';
  const bodyBgImage = extractBackgroundImage(bodyStyle) || extractBackgroundImage(referenceEl?.getAttribute?.('style') || '');
  const bodyBgSize = extractStyleValue(bodyStyle, 'background-size') || extractStyleValue(referenceEl?.getAttribute?.('style') || '', 'background-size') || '';
  const bodyBgPosition = extractStyleValue(bodyStyle, 'background-position') || extractStyleValue(referenceEl?.getAttribute?.('style') || '', 'background-position') || '';
  const bodyBgRepeat = extractStyleValue(bodyStyle, 'background-repeat') || extractStyleValue(referenceEl?.getAttribute?.('style') || '', 'background-repeat') || '';
  const refBg = extractColor(referenceEl, 'background-color');

  return {
    fontFamily: bodyFont.fontFamily || refFont.fontFamily || 'Arial, sans-serif',
    fontSize: bodyFont.fontSize || refFont.fontSize || '14px',
    fontWeight: bodyFont.fontWeight || refFont.fontWeight || 'normal',
    lineHeight: bodyFont.lineHeight || refFont.lineHeight || '1.5',
    textColor: bodyFont.textColor || refFont.textColor || '#000000',
    bodyBackgroundColor: bodyBg || '#ffffff',
    bodyBackgroundImage: bodyBgImage || '',
    bodyBackgroundSize: bodyBgSize || 'cover',
    bodyBackgroundPosition: bodyBgPosition || 'center',
    bodyBackgroundRepeat: bodyBgRepeat || 'no-repeat',
    containerBackgroundColor: (refBg && refBg !== bodyBg) ? refBg : 'transparent',
    containerWidth: findLikelyContentWidth(referenceEl || body),
    containerMinHeight: 'auto',
    containerPadding: '0px',
  };
};

// Walk up DOM to collect inherited font styles (closest ancestor wins)
const collectInheritedStyles = (el) => {
  if (!el) return {};
  const collected = {};
  let node = el;
  for (let i = 0; i < 10 && node && node.nodeType === Node.ELEMENT_NODE; i++) {
    const fs = extractFontStyles(node);
    Object.keys(fs).forEach((key) => { if (!collected[key] && fs[key]) collected[key] = fs[key]; });
    const align = extractAlign(node);
    if (!collected.textAlign && align) collected.textAlign = align;
    node = node.parentElement;
  }
  return collected;
};

// ============================================================================
// LAYOUT DETECTION UTILITIES
// ============================================================================

const isHiddenElement = (el) => {
  if (!el || !el.getAttribute) return false;
  const style = `${el.getAttribute('style') || ''}`.toLowerCase();
  return style.includes('display:none') || style.includes('display: none');
};

const isNoiseTable = (tableEl) => {
  if (!tableEl) return false;
  if (isHiddenElement(tableEl)) return true;
  // Tracking pixels / spacer tables: single cell with only a tiny image or nbsp
  const rows = getDirectTableRows(tableEl);
  if (rows.length === 1 && rows[0].cells?.length === 1) {
    const cell = rows[0].cells[0];
    const text = `${cell.textContent || ''}`.replace(/[\s\u00a0]+/g, '').trim();
    const imgs = Array.from(cell.querySelectorAll?.('img') || []);
    if (text.length === 0 && imgs.length === 0) return true;
    if (imgs.length === 1 && imgs[0].width <= 2 && imgs[0].height <= 2) return true;
  }
  return false;
};

const isDividerTable = (tableEl) => {
  if (!tableEl) return false;
  // A divider table has 1 row, 1 cell, only empty content or border-based visual
  const rows = getDirectTableRows(tableEl);
  if (rows.length !== 1) return false;
  const cells = Array.from(rows[0].cells || []);
  if (cells.length !== 1) return false;
  const text = `${cells[0].textContent || ''}`.replace(/[\s\u00a0]+/g, '').trim();
  const hasImg = cells[0].querySelector?.('img');
  if (text.length === 0 && !hasImg) {
    const style = cells[0].getAttribute?.('style') || '';
    if (style.includes('border-top') || style.includes('min-width: 1px')) return true;
  }
  return false;
};

const getDirectTableRows = (tableEl) => {
  if (!tableEl) return [];
  const rows = [];
  const tBodies = Array.from(tableEl.tBodies || []);
  if (tBodies.length > 0) {
    for (const tb of tBodies) {
      rows.push(...Array.from(tb.children || []).filter((c) => `${c.tagName || ''}`.toLowerCase() === 'tr'));
    }
    return rows;
  }
  return Array.from(tableEl.children || []).filter((c) => `${c.tagName || ''}`.toLowerCase() === 'tr');
};

const getTableScore = (tableEl) => {
  const directRows = getDirectTableRows(tableEl);
  const directRowCount = directRows.length;
  const directCellCount = directRows.reduce((sum, r) => sum + (r.cells ? r.cells.length : 0), 0);
  const width = (tableEl.getAttribute?.('width') || extractStyleValue(tableEl.getAttribute?.('style') || '', 'width') || '').toLowerCase();
  let bonus = 0;
  // Prefer tables with many direct rows (section containers)
  if (directRowCount >= 3) bonus += directRowCount * 1000;
  // Prefer typical email widths (500-700px)
  const pxMatch = `${width}`.match(/(\d+)/);
  if (pxMatch) {
    const px = parseInt(pxMatch[1], 10);
    if (px >= 500 && px <= 700) bonus += 3000;
  }
  // Slight bonus for 100% width (layout tables)
  if (width === '100%') bonus += 200;
  // Bonus for tables that have colored rows (section containers)
  let coloredRows = 0;
  directRows.forEach((r) => {
    const tds = Array.from(r.cells || []);
    tds.forEach((td) => {
      const bg = extractColor(td, 'background-color');
      if (bg && bg !== '#ffffff' && bg !== 'rgb(255, 255, 255)') coloredRows++;
    });
  });
  bonus += coloredRows * 500;
  return bonus + directRowCount * 200 + directCellCount * 20;
};

// ============================================================================
// COMPONENT EXTRACTION
// ============================================================================

const makeId = () => Date.now() + Math.floor(Math.random() * 100000);

const isDecorativeSeparator = (text) => {
  const cleaned = `${text || ''}`.replace(/[\s_\-=.*~─—]+/g, '').trim();
  return cleaned.length === 0;
};

const isLeafTextElement = (el) => {
  if (!el) return false;
  const children = Array.from(el.children || []);
  // Block-level children → not a leaf
  const blockTags = ['table', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'img'];
  if (children.some((c) => blockTags.includes(`${c.tagName || ''}`.toLowerCase()))) return false;
  // Links inside → recurse to preserve them
  if (children.some((c) => `${c.tagName || ''}`.toLowerCase() === 'a')) return false;
  // Multiple inline children (ignoring br) → container, not leaf
  const meaningful = children.filter((c) => `${c.tagName || ''}`.toLowerCase() !== 'br');
  return meaningful.length <= 1;
};

const createComponentSettings = (el, baseSettings = {}) => {
  const defaults = {
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    fontSize: '',
    fontWeight: '',
    fontFamily: '',
    textAlign: '',
    textColor: '',
    backgroundColor: 'transparent',
    backgroundImage: '',
    backgroundSize: '',
    backgroundPosition: '',
    backgroundRepeat: '',
    border: 'none',
    borderColor: '#000000',
    borderWidth: 0,
    borderRadius: 0,
    letterSpacing: '',
    lineHeight: '',
    linkColor: '#0066cc',
    buttonColor: '#0066cc',
    buttonTextColor: '#ffffff',
    listStyleType: 'disc',
    width: '',
    height: '',
    boxSizing: 'border-box',
  };
  if (!el || !el.getAttribute) return { ...defaults, ...baseSettings };

  const inherited = collectInheritedStyles(el);
  const directFont = extractFontStyles(el);
  const style = el.getAttribute('style') || '';
  const padding = parsePadding(style);
  const margin = parseMargin(style);
  const borderStyles = extractBorderStyles(style);
  const bgSettings = extractBackgroundSettings(el);
  const align = extractAlign(el);
  const dims = extractDimensions(el);

  return {
    ...defaults,
    ...inherited,
    ...directFont,
    padding,
    margin,
    ...bgSettings,
    ...dims,
    textAlign: align || inherited.textAlign || defaults.textAlign,
    ...borderStyles,
    ...baseSettings,
  };
};

const extractComponentsFromElement = (node, components = []) => {
  if (!node) return;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = `${node.textContent || ''}`.replace(/\s+/g, ' ').trim();
    if (text && !isDecorativeSeparator(text)) {
      components.push({
        id: makeId(),
        type: COMPONENT_TYPES.PARAGRAPH,
        content: text,
        settings: createComponentSettings(node.parentElement),
      });
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node;
  const tag = `${el.tagName || ''}`.toLowerCase();

  // Skip noise
  if (['script', 'style', 'meta', 'link', 'head', 'br'].includes(tag)) return;

  // Skip noise/divider tables
  if (tag === 'table') {
    if (isNoiseTable(el) || isDividerTable(el)) return;
  }

  const directLinkChildren = Array.from(el.children || []).filter((child) => `${child.tagName || ''}`.toLowerCase() === 'a');
  const directNonLinkChildren = Array.from(el.children || []).filter((child) => `${child.tagName || ''}`.toLowerCase() !== 'a' && `${child.tagName || ''}`.toLowerCase() !== 'br');
  if (tag !== 'a' && directLinkChildren.length >= 2 && directNonLinkChildren.length === 0) {
    const items = directLinkChildren
      .map((link) => `${link.textContent || ''}`.replace(/\s+/g, ' ').trim())
      .filter((text) => text && !isDecorativeSeparator(text));
    if (items.length >= 2) {
      components.push({
        id: makeId(),
        type: COMPONENT_TYPES.MENU,
        content: items.join('\n'),
        menuItems: items.join('\n'),
        settings: createComponentSettings(el),
      });
      return;
    }
  }

  // Headers
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
    const text = `${el.textContent || ''}`.replace(/\s+/g, ' ').trim();
    if (text && !isDecorativeSeparator(text)) {
      const typeMap = { h1: COMPONENT_TYPES.HEADER_1, h2: COMPONENT_TYPES.HEADER_2, h3: COMPONENT_TYPES.HEADER_3 };
      components.push({
        id: makeId(),
        type: typeMap[tag] || COMPONENT_TYPES.HEADER_3,
        content: text,
        settings: createComponentSettings(el),
      });
    }
    return;
  }

  // Paragraph
  if (tag === 'p') {
    const text = `${el.textContent || ''}`.replace(/\s+/g, ' ').trim();
    if (text && !isDecorativeSeparator(text)) {
      components.push({ id: makeId(), type: COMPONENT_TYPES.PARAGRAPH, content: text, settings: createComponentSettings(el) });
    }
    return;
  }

  // Links
  if (tag === 'a') {
    const href = el.getAttribute('href') || '#';
    const text = `${el.textContent || ''}`.replace(/\s+/g, ' ').trim();
    if (!text || isDecorativeSeparator(text)) return;

    // Check if the link contains an image
    const innerImg = el.querySelector('img');
    if (innerImg) {
      const src = innerImg.getAttribute('src') || '';
      if (src) {
        const dims = extractDimensions(innerImg);
        const w = Number.parseInt(dims.width || '0', 10);
        const h = Number.parseInt(dims.height || '0', 10);
        if (!(w <= 1 && h <= 1)) {
          components.push({ id: makeId(), type: COMPONENT_TYPES.IMAGE, imageUrl: src, content: innerImg.getAttribute('alt') || '', settings: createComponentSettings(innerImg, { ...dims, linkUrl: href }) });
          return;
        }
      }
    }

    const bg = extractColor(el, 'background-color') || findClosestColor(el, 'background-color');
    const color = extractColor(el, 'color');
    const inheritedColor = collectInheritedStyles(el).textColor;
    const finalColor = color || inheritedColor;

    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      components.push({ id: makeId(), type: COMPONENT_TYPES.BUTTON, content: text, linkUrl: href, settings: createComponentSettings(el, { buttonColor: bg, buttonTextColor: finalColor || '#ffffff' }) });
    } else {
      components.push({ id: makeId(), type: COMPONENT_TYPES.LINK, content: text, linkUrl: href, settings: createComponentSettings(el, { linkColor: finalColor || '#0066cc' }) });
    }
    return;
  }

  // Images
  if (tag === 'img') {
    const src = el.getAttribute('src') || '';
    if (!src) return;
    const dims = extractDimensions(el);
    const w = Number.parseInt(dims.width || '0', 10);
    const h = Number.parseInt(dims.height || '0', 10);
    if (w <= 1 && h <= 1) return; // Skip tracking pixels
    components.push({ id: makeId(), type: COMPONENT_TYPES.IMAGE, imageUrl: src, content: el.getAttribute('alt') || '', settings: createComponentSettings(el, dims) });
    return;
  }

  // Lists
  if (tag === 'ol') {
    const items = Array.from(el.querySelectorAll('li')).map((li) => li.textContent || '').join('\n');
    components.push({ id: makeId(), type: COMPONENT_TYPES.ORDERED_LIST, content: items, settings: createComponentSettings(el, { listStyleType: 'decimal' }) });
    return;
  }
  if (tag === 'ul') {
    const items = Array.from(el.querySelectorAll('li')).map((li) => li.textContent || '').join('\n');
    components.push({ id: makeId(), type: COMPONENT_TYPES.UNORDERED_LIST, content: items, settings: createComponentSettings(el, { listStyleType: 'disc' }) });
    return;
  }

  // Buttons
  if (tag === 'button') {
    const text = `${el.textContent || ''}`.replace(/\s+/g, ' ').trim();
    if (text) {
      const bg = extractColor(el, 'background-color') || '#0066cc';
      const color = extractColor(el, 'color') || '#ffffff';
      components.push({ id: makeId(), type: COMPONENT_TYPES.BUTTON, content: text, linkUrl: '#', settings: createComponentSettings(el, { buttonColor: bg, buttonTextColor: color }) });
    }
    return;
  }

  // Helper: split childNodes at <br> boundaries and push each segment as a component
  const extractBrSplitSegments = (parentEl) => {
    const segments = [];
    let buf = '';
    Array.from(parentEl.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE && `${child.tagName || ''}`.toLowerCase() === 'br') {
        if (buf.trim()) segments.push(buf.trim());
        buf = '';
      } else {
        buf += child.textContent || '';
      }
    });
    if (buf.trim()) segments.push(buf.trim());
    let pushed = false;
    segments.forEach((seg) => {
      const cleaned = seg.replace(/\s+/g, ' ').trim();
      if (cleaned && !isDecorativeSeparator(cleaned)) {
        components.push({ id: makeId(), type: COMPONENT_TYPES.PARAGRAPH, content: cleaned, settings: createComponentSettings(parentEl) });
        pushed = true;
      }
    });
    return pushed;
  };

  // Styled inline containers — extract as styled paragraph if leaf text
  if (['span', 'strong', 'b', 'em', 'i', 'u', 'font', 'center'].includes(tag)) {
    if (isLeafTextElement(el)) {
      // Check for <br> inside — split segments
      const hasBr = Array.from(el.childNodes).some((c) => c.nodeType === Node.ELEMENT_NODE && `${c.tagName || ''}`.toLowerCase() === 'br');
      if (hasBr) {
        if (extractBrSplitSegments(el)) return;
      }
      const text = `${el.textContent || ''}`.replace(/\s+/g, ' ').trim();
      if (text && !isDecorativeSeparator(text)) {
        components.push({ id: makeId(), type: COMPONENT_TYPES.PARAGRAPH, content: text, settings: createComponentSettings(el) });
        return;
      }
    }
  }

  // Leaf-text divs — treat as paragraph
  if (tag === 'div' && isLeafTextElement(el)) {
    const hasBr = Array.from(el.childNodes).some((c) => c.nodeType === Node.ELEMENT_NODE && `${c.tagName || ''}`.toLowerCase() === 'br');
    if (hasBr) {
      if (extractBrSplitSegments(el)) return;
    }
    const text = `${el.textContent || ''}`.replace(/\s+/g, ' ').trim();
    if (text && !isDecorativeSeparator(text)) {
      components.push({ id: makeId(), type: COMPONENT_TYPES.PARAGRAPH, content: text, settings: createComponentSettings(el) });
      return;
    }
  }

  // Recurse into children
  Array.from(el.childNodes || []).forEach((child) => extractComponentsFromElement(child, components));
};

const deduplicateComponents = (components) => {
  const deduped = [];
  const seen = new Set();
  for (const c of components) {
    const key = `${c.type}|${c.content || ''}|${c.imageUrl || ''}|${c.linkUrl || ''}`.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }
  return deduped;
};

// ============================================================================
// COLUMN WIDTH CALCULATION
// ============================================================================

const parseWidthToFraction = (raw) => {
  if (!raw) return null;
  const v = `${raw}`.trim();
  if (v.endsWith('%')) {
    const pct = Number.parseFloat(v.replace('%', ''));
    if (Number.isFinite(pct)) return pct / 100;
  }
  const px = Number.parseFloat(v.replace(/px|pt/gi, ''));
  if (Number.isFinite(px) && px > 0) return px;
  return null;
};

const normalizeColumnSizes = (sizes) => {
  const total = sizes.reduce((sum, n) => sum + n, 0);
  if (total === 12) return sizes;
  if (total <= 0) return sizes.map(() => 1);
  const scaled = sizes.map((n) => Math.max(1, Math.round((n / total) * 12)));
  const scaledTotal = scaled.reduce((sum, n) => sum + n, 0);
  if (scaledTotal === 12) return scaled;
  const fixed = [...scaled];
  fixed[fixed.length - 1] = Math.max(1, fixed[fixed.length - 1] + (12 - scaledTotal));
  return fixed;
};

// ============================================================================
// ROW/COLUMN CREATION
// ============================================================================

const createColumnFromCell = (td, index, size, rowIndex, now) => {
  const components = [];
  extractComponentsFromElement(td, components);
  const deduped = deduplicateComponents(components);

  const style = td.getAttribute('style') || '';
  const bg = extractColor(td, 'background-color');
  const padding = parsePadding(style);
  const margin = parseMargin(style);
  const align = extractAlign(td);
  const borderStyles = extractBorderStyles(style);
  const bgImage = extractBackgroundImage(style);
  const dims = extractDimensions(td);

  if (align) {
    deduped.forEach((c) => { c.settings = { ...(c.settings || {}), textAlign: align }; });
  }

  return {
    id: now + rowIndex * 1000 + index + 2,
    label: `Column ${index + 1}`,
    size,
    settings: { ...defaultColSettings(), padding, margin, backgroundColor: bg || 'transparent', backgroundImage: bgImage, ...borderStyles, ...dims },
    components: deduped,
  };
};

// Compute column sizes from cells, always ensuring total = 12
const computeColumnSizes = (cells) => {
  const meaningfulCells = cells.filter((c) => {
    const text = `${c.textContent || ''}`.trim();
    const hasImg = c.querySelector?.('img');
    const wAttr = c.getAttribute?.('width') || '';
    const wStyle = extractStyleValue(c.getAttribute?.('style') || '', 'width');
    const raw = `${wAttr || wStyle || ''}`.trim();
    const hasContent = (text.length > 0 && !isDecorativeSeparator(text)) || hasImg;
    if (!hasContent) return false;
    if (!raw) return true;
    if (raw.endsWith('%')) {
      const pct = Number.parseFloat(raw.replace('%', ''));
      return !Number.isFinite(pct) || pct >= 12;
    }
    const px = Number.parseFloat(raw.replace(/px|pt/gi, ''));
    return !Number.isFinite(px) || px >= 50;
  });
  const activeCells = meaningfulCells.length >= 2 ? meaningfulCells : cells;

  const rawSizes = activeCells.map((c) => {
    const wAttr = c.getAttribute?.('width') || '';
    const wStyle = extractStyleValue(c.getAttribute?.('style') || '', 'width');
    const raw = wAttr || wStyle;
    const frac = parseWidthToFraction(raw);
    if (typeof frac === 'number' && frac > 0 && frac <= 1) return Math.max(1, Math.round(frac * 12));
    if (typeof frac === 'number' && frac > 1) return frac; // px value
    return null;
  });

  // If we have px values, convert proportionally
  const hasPx = rawSizes.some((v) => typeof v === 'number' && v > 12);
  if (hasPx) {
    const totalPx = rawSizes.reduce((s, v) => s + (typeof v === 'number' && v > 12 ? v : 0), 0);
    if (totalPx > 0) {
      const pxSizes = rawSizes.map((v) => typeof v === 'number' && v > 12 ? Math.max(1, Math.round((v / totalPx) * 12)) : Math.max(1, Math.round(12 / activeCells.length)));
      return normalizeColumnSizes(pxSizes);
    }
  }

  // Use fraction-based or equal distribution
  const sizes = rawSizes.map((v) => (typeof v === 'number' && v >= 1 && v <= 12) ? v : Math.max(1, Math.round(12 / activeCells.length)));
  return normalizeColumnSizes(sizes);
};

// Find meaningful multi-column table rows inside a cell (for product grids)
// Only returns outermost multi-col rows with 2-4 content cells
const findMultiColTableRows = (td) => {
  if (!td) return [];
  const results = [];
  const allTables = Array.from(td.querySelectorAll?.('table') || []);

  for (const table of allTables) {
    if (isNoiseTable(table) || isDividerTable(table)) continue;
    // Skip tables nested inside an already-found multi-col row
    const isNested = results.some((r) => r.table.contains(table));
    if (isNested) continue;

    const rows = getDirectTableRows(table);
    for (const row of rows) {
      const cells = Array.from(row.cells || []);
      // Only 2-4 cells count as meaningful content columns
      if (cells.length < 2 || cells.length > 4) continue;

      const contentCells = cells.filter((c) => {
        const text = `${c.textContent || ''}`.trim();
        const hasImg = c.querySelector?.('img');
        return (text.length > 0 && !isDecorativeSeparator(text)) || hasImg;
      });
      if (contentCells.length < 2) continue;

      // Avoid rows that are mostly tiny spacer cells
      const meaningfulWidthCells = cells.filter((c) => {
        const wAttr = c.getAttribute?.('width') || '';
        const wStyle = extractStyleValue(c.getAttribute?.('style') || '', 'width');
        const raw = `${wAttr || wStyle || ''}`.trim();
        if (!raw) return true;
        if (raw.endsWith('%')) {
          const pct = Number.parseFloat(raw.replace('%', ''));
          return !Number.isFinite(pct) || pct >= 15;
        }
        const px = Number.parseFloat(raw.replace(/px|pt/gi, ''));
        return !Number.isFinite(px) || px >= 60;
      });
      if (meaningfulWidthCells.length < 2) continue;

      // Skip if already covered by a parent result
      const alreadyCovered = results.some((r) => r.table.contains(table) || table.contains(r.table));
      if (alreadyCovered) continue;

      results.push({ table, row, cells: contentCells });
    }
  }
  return results;
};

// Get bg color for a row: check tr, first td, nested bmeHolder tds, then walk up
const getRowBg = (tr, tds) => {
  let bg = extractColor(tr, 'background-color');
  if (bg) return bg;
  if (tds.length > 0) {
    bg = extractColor(tds[0], 'background-color');
    if (bg) return bg;
    // Check nested td elements (bmeHolder pattern)
    const nestedTds = Array.from(tds[0].querySelectorAll?.('td') || []);
    for (const ntd of nestedTds) {
      bg = extractColor(ntd, 'background-color');
      if (bg) return bg;
    }
  }
  bg = findClosestColor(tr, 'background-color');
  return bg || '';
};

// Get background image for a row
const getRowBgImage = (tr, tds) => {
  let bgImg = extractBackgroundImage(tr.getAttribute?.('style') || '');
  if (bgImg) return bgImg;
  if (tds.length > 0) {
    bgImg = extractBackgroundImage(tds[0].getAttribute?.('style') || '');
    if (bgImg) return bgImg;
  }
  return '';
};

const defaultRowSettings = () => ({
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  backgroundColor: 'transparent',
  backgroundImage: '',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  border: 'none',
  borderColor: '#000000',
  borderWidth: 0,
  borderRadius: 0,
});

const defaultColSettings = () => ({
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  backgroundColor: 'transparent',
  backgroundImage: '',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  border: 'none',
  borderColor: '#000000',
  borderWidth: 0,
  borderRadius: 0,
});

// Template-agnostic: find content blocks inside a section cell
// Detects wrapper divs, direct tables, or falls back to flat extraction
const findContentBlockElements = (sectionTd) => {
  if (!sectionTd) return [];
  const blocks = [];

  // Strategy 1: wrapper divs that contain tables (works for Benchmark, Mailchimp, etc.)
  const directDivs = Array.from(sectionTd.children || []).filter((c) =>
    `${c.tagName || ''}`.toLowerCase() === 'div'
  );
  for (const div of directDivs) {
    const innerTable = div.querySelector?.('table');
    if (innerTable && !isNoiseTable(innerTable) && !isDividerTable(innerTable)) {
      blocks.push(innerTable);
    }
  }
  if (blocks.length > 0) return blocks;

  // Strategy 2: direct child tables
  const directTables = Array.from(sectionTd.children || []).filter((c) =>
    `${c.tagName || ''}`.toLowerCase() === 'table' && !isNoiseTable(c) && !isDividerTable(c)
  );
  if (directTables.length > 0) return directTables;

  // Strategy 3: look inside nested wrapper tables for content tables
  const nestedTables = Array.from(sectionTd.querySelectorAll?.('table') || []);
  const contentTables = nestedTables.filter((t) => {
    if (isNoiseTable(t) || isDividerTable(t)) return false;
    const text = `${t.textContent || ''}`.trim();
    const hasImg = t.querySelector?.('img');
    return (text.length > 0 && !isDecorativeSeparator(text)) || hasImg;
  });
  // Take only "leaf" content tables (no child tables with content)
  const leafTables = contentTables.filter((t) => {
    return !contentTables.some((other) => other !== t && t.contains(other));
  });
  if (leafTables.length > 1) return leafTables;

  if (contentTables.length > 0) return contentTables.slice(0, 12);

  // Fallback: treat entire section as one block
  return [sectionTd];
};

// Process section td into editor rows (template-agnostic)
// sectionBg and sectionBgImage are applied directly to every created row
const processContentBlocks = (sectionTd, rowIndexBase, now, sectionBg = '', sectionBgImage = '') => {
  const editorRows = [];
  const rowBg = sectionBg || '#ffffff';
  const rowBgImg = sectionBgImage || '';
  const makeRowSettings = () => ({ ...defaultRowSettings(), backgroundColor: rowBg, backgroundImage: rowBgImg });
  const makeColSettings = () => ({ ...defaultColSettings(), backgroundColor: rowBg });
  const withSectionBg = (col) => ({
    ...col,
    settings: {
      ...(col.settings || {}),
      backgroundColor: (col.settings?.backgroundColor && col.settings.backgroundColor !== '#ffffff' && col.settings.backgroundColor !== 'transparent') ? col.settings.backgroundColor : rowBg,
    },
  });

  // FIRST: Check for multi-column rows in the entire sectionTd before breaking into blocks
  const multiColRows = findMultiColTableRows(sectionTd);
  if (multiColRows.length > 0) {
    multiColRows.forEach((mcr, mIdx) => {
      const sizes = computeColumnSizes(mcr.cells);
      const columns = mcr.cells.map((td, i) => withSectionBg(createColumnFromCell(td, i, sizes[i], rowIndexBase * 100 + mIdx, now)));
      if (columns.some((c) => c.components.length > 0)) {
        editorRows.push({
          id: now + rowIndexBase * 100 + mIdx + 1,
          settings: makeRowSettings(),
          columns,
        });
      }
    });
    if (editorRows.length > 0) {
      return editorRows;
    }
  }

  // SECOND: Fall back to content block processing
  const blocks = findContentBlockElements(sectionTd);

  if (blocks.length === 0) return editorRows;

  // If only 1 block and it's the sectionTd itself, do flat extraction
  if (blocks.length === 1 && blocks[0] === sectionTd) {
    const comps = [];
    extractComponentsFromElement(sectionTd, comps);
    const deduped = deduplicateComponents(comps);
    if (deduped.length > 0) {
      editorRows.push({
        id: now + rowIndexBase * 100 + 1,
        settings: makeRowSettings(),
        columns: [{ id: now + rowIndexBase * 100 + 2, label: 'Column 1', size: 12, settings: makeColSettings(), components: deduped }],
      });
    }
    return editorRows;
  }

  // Process each content block
  blocks.forEach((block, bIdx) => {
    if (isNoiseTable(block) || isDividerTable(block)) return;

    const multiColRows = findMultiColTableRows(block);
    if (multiColRows.length > 0) {
      multiColRows.forEach((mcr, mIdx) => {
        const sizes = computeColumnSizes(mcr.cells);
        const columns = mcr.cells.map((td, i) => withSectionBg(createColumnFromCell(td, i, sizes[i], rowIndexBase * 100 + bIdx * 10 + mIdx, now)));
        if (columns.some((c) => c.components.length > 0)) {
          editorRows.push({
            id: now + rowIndexBase * 100 + bIdx * 10 + mIdx + 1,
            settings: makeRowSettings(),
            columns,
          });
        }
      });
      return;
    }

    const comps = [];
    extractComponentsFromElement(block, comps);
    const deduped = deduplicateComponents(comps);
    if (deduped.length === 0) return;

    editorRows.push({
      id: now + rowIndexBase * 100 + bIdx + 1,
      settings: makeRowSettings(),
      columns: [{ id: now + rowIndexBase * 100 + bIdx + 2, label: 'Column 1', size: 12, settings: makeColSettings(), components: deduped }],
    });
  });

  return editorRows;
};

// ============================================================================
// DIV-BASED SECTION DETECTION (for Unlayer, Stripo, modern templates)
// ============================================================================

const extractBgFromElement = (el) => {
  if (!el || !el.getAttribute) return { bg: '', bgImage: '' };
  const style = el.getAttribute('style') || '';
  const bg = extractColor(el, 'background-color') || '';
  const bgImage = extractBackgroundImage(style);
  return { bg, bgImage };
};

const findDivSections = (body) => {
  // Look for div-based row containers (Unlayer pattern: div.u-row-container)
  const rowContainers = Array.from(body.querySelectorAll?.('div') || []).filter((div) => {
    const cls = `${div.className || ''}`.toLowerCase();
    const style = `${div.getAttribute?.('style') || ''}`.toLowerCase();
    // Unlayer: u-row-container; Stripo: section; generic: row containers with background
    return cls.includes('u-row-container') || cls.includes('section') ||
      (style.includes('background') && div.children?.length >= 1 && div.querySelector?.('table'));
  });
  if (rowContainers.length < 2) return null;
  return rowContainers;
};

const processDivSection = (divContainer, sectionIndex, now) => {
  const { bg, bgImage } = extractBgFromElement(divContainer);
  // Also check child divs for bg
  let sectionBg = bg;
  let sectionBgImage = bgImage;
  if (!sectionBg) {
    Array.from(divContainer.children || []).forEach((child) => {
      if (!sectionBg) {
        const childBg = extractColor(child, 'background-color');
        if (childBg) sectionBg = childBg;
      }
      if (!sectionBgImage) {
        const childBgImg = extractBackgroundImage(child.getAttribute?.('style') || '');
        if (childBgImg) sectionBgImage = childBgImg;
      }
    });
  }

  const rowBg = sectionBg || '#ffffff';
  const rowBgImg = sectionBgImage || '';

  // Find columns inside this section (div.u-col or table-cell divs)
  const colDivs = Array.from(divContainer.querySelectorAll?.('div') || []).filter((d) => {
    const cls = `${d.className || ''}`.toLowerCase();
    const style = `${d.getAttribute?.('style') || ''}`.toLowerCase();
    return cls.includes('u-col') || (style.includes('display: table-cell') || style.includes('display:table-cell'));
  });

  if (colDivs.length > 1) {
    const sizes = colDivs.map(() => Math.max(1, Math.round(12 / colDivs.length)));
    const normalized = normalizeColumnSizes(sizes);
    const columns = colDivs.map((colDiv, i) => {
      const comps = [];
      extractComponentsFromElement(colDiv, comps);
      const deduped = deduplicateComponents(comps);
      const colBg = extractColor(colDiv, 'background-color');
      return {
        id: now + sectionIndex * 1000 + i + 2,
        label: `Column ${i + 1}`,
        size: normalized[i],
        settings: { ...defaultColSettings(), backgroundColor: colBg || rowBg },
        components: deduped,
      };
    });
    if (columns.some((c) => c.components.length > 0)) {
      return [{
        id: now + sectionIndex * 100 + 1,
        settings: { ...defaultRowSettings(), backgroundColor: rowBg, backgroundImage: rowBgImg },
        columns,
      }];
    }
  }

  // Single column: extract all content from this section container
  const comps = [];
  extractComponentsFromElement(divContainer, comps);
  const deduped = deduplicateComponents(comps);
  if (deduped.length > 0) {
    return [{
      id: now + sectionIndex * 100 + 1,
      settings: { ...defaultRowSettings(), backgroundColor: rowBg, backgroundImage: rowBgImg },
      columns: [{
        id: now + sectionIndex * 100 + 2,
        label: 'Column 1',
        size: 12,
        settings: { ...defaultColSettings(), backgroundColor: rowBg },
        components: deduped,
      }],
    }];
  }
  return [];
};

// ============================================================================
// MAIN PARSER
// ============================================================================

export const parseHtmlToSections = (htmlText) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText || '', 'text/html');
    const body = doc.body;
    const now = Date.now();

    // Strategy 1: Try div-based section detection (Unlayer, Stripo, modern templates)
    const divSections = findDivSections(body);
    if (divSections && divSections.length >= 2) {
      const allRows = [];
      divSections.forEach((div, idx) => {
        const rows = processDivSection(div, idx, now);
        allRows.push(...rows);
      });
      if (allRows.length > 0) {
        const compactedRows = allRows.filter((r) => {
          const cols = Array.from(r.columns || []);
          const hasComponents = cols.some((c) => (c.components || []).length > 0);
          if (hasComponents) return true;
          const bg = r.settings?.backgroundColor;
          const bgImg = r.settings?.backgroundImage;
          return !!(bgImg || (bg && bg !== '#ffffff' && bg !== 'transparent'));
        });
        if (compactedRows.length > 0) {
          return {
            sections: [{ id: now, rows: compactedRows }],
            templateSettings: extractTemplateSettings(body, divSections[0]),
          };
        }
      }
    }

    // Strategy 2: Table-based templates — find the best content table by structure
    const tables = Array.from(body?.querySelectorAll?.('table') || []);
    const candidates = tables.filter((t) => !isNoiseTable(t));
    const mainTable = candidates.reduce((best, t) => {
      const score = getTableScore(t);
      if (!best) return t;
      return score > getTableScore(best) ? t : best;
    }, null);

    if (mainTable) {
      const mainRows = getDirectTableRows(mainTable);
      const allSectionRows = [];

      mainRows.forEach((tr, sectionIndex) => {
        const tds = Array.from(tr.cells || []);
        if (tds.length === 0) return;

        const sectionBg = getRowBg(tr, tds);
        const sectionBgImage = getRowBgImage(tr, tds);
        let contentRows;

        if (tds.length > 1) {
          const sizes = computeColumnSizes(tds);
          const columns = tds.map((td, i) => {
            const column = createColumnFromCell(td, i, sizes[i], sectionIndex, now);
            return {
              ...column,
              settings: {
                ...(column.settings || {}),
                backgroundColor: (column.settings?.backgroundColor && column.settings.backgroundColor !== '#ffffff' && column.settings.backgroundColor !== 'transparent') ? column.settings.backgroundColor : (sectionBg || 'transparent'),
              },
            };
          });
          contentRows = [{
            id: now + sectionIndex * 100 + 1,
            settings: { ...defaultRowSettings(), backgroundColor: sectionBg || '#ffffff', backgroundImage: sectionBgImage },
            columns,
          }];
        } else {
          contentRows = processContentBlocks(tds[0], sectionIndex, now, sectionBg, sectionBgImage);
        }

        // Propagate section background to ALL content rows
        if (contentRows.length > 0 && sectionBg) {
          contentRows.forEach((row) => {
            if (!row.settings.backgroundColor || row.settings.backgroundColor === '#ffffff') {
              row.settings.backgroundColor = sectionBg;
            }
          });
        }

        allSectionRows.push(...contentRows);
      });

      const compactedRows = allSectionRows.filter((r) => {
        const cols = Array.from(r.columns || []);
        const hasComponents = cols.some((c) => (c.components || []).length > 0);
        if (hasComponents) return true;
        const bg = r.settings?.backgroundColor;
        const bgImg = r.settings?.backgroundImage;
        return !!(bgImg || (bg && bg !== '#ffffff' && bg !== 'transparent'));
      });

      return {
        sections: [{ id: now, rows: compactedRows }],
        templateSettings: extractTemplateSettings(body, mainTable),
      };
    }

    // Fallback: no table structure
    const components = [];
    extractComponentsFromElement(body, components);
    const deduped = deduplicateComponents(components);
    return {
      sections: [{
        id: now,
        rows: [{
          id: now + 1,
          settings: { padding: { top: 10, right: 10, bottom: 10, left: 10 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, backgroundColor: 'transparent', border: 'none', borderColor: '#dddddd', borderWidth: 0, borderRadius: 0 },
          columns: [{
            id: now + 2, label: 'Column 1', size: 12,
            settings: { padding: { top: 10, right: 10, bottom: 10, left: 10 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, backgroundColor: 'transparent', border: 'none', borderColor: '#cccccc', borderWidth: 0, borderRadius: 0 },
            components: deduped,
          }],
        }],
      }],
      templateSettings: extractTemplateSettings(body, body),
    };
  } catch (e) {
    console.error('Failed to parse uploaded HTML:', e);
    return null;
  }
};
