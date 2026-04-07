import { COMPONENT_TYPES } from '../partials/componentTypes';
import { DEFAULT_IR_DOCUMENT, IR_NODE_KIND, TAG_TO_COMPONENT_TYPE, createIrId } from '../ir/schema';

const pickAttributes = (el) => {
  if (!el || !el.getAttributeNames) return {};
  const out = {};
  el.getAttributeNames().forEach((name) => {
    const v = el.getAttribute(name);
    if (v !== null && v !== undefined) out[name] = `${v}`;
  });
  return out;
};

const styleValue = (styleText, prop) => {
  if (!styleText) return '';
  const re = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i');
  const m = `${styleText}`.match(re);
  return m ? `${m[1]}`.trim() : '';
};

const parseBoxValues = (value) => {
  if (!value) return null;
  const raw = `${value}`.trim();
  if (!raw) return null;
  const parts = raw.split(/\s+/).filter(Boolean);
  const [t, r, b, l] = (() => {
    if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
    if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
    if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
    return [parts[0], parts[1], parts[2], parts[3]];
  })();

  const toNum = (v) => {
    const n = Number.parseFloat(`${v}`.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  return {
    top: toNum(t),
    right: toNum(r),
    bottom: toNum(b),
    left: toNum(l),
  };
};

const countAncestorTables = (el) => {
  let cur = el?.parentElement;
  let depth = 0;
  while (cur) {
    if (`${cur.tagName || ''}`.toLowerCase() === 'table') depth += 1;
    cur = cur.parentElement;
  }
  return depth;
};

const computeBaselineTableNesting = (rootEl) => {
  if (!rootEl?.querySelectorAll) return 0;
  const tables = Array.from(rootEl.querySelectorAll('table'));
  const depths = tables.map((t) => countAncestorTables(t));
  const positiveDepths = depths.filter((d) => d > 0);
  if (!positiveDepths.length) return 0;
  return Math.min(...positiveDepths);
};

const isComplexHtmlBlock = (el, ctx) => {
  if (!el?.querySelectorAll) return false;
  const tag = `${el.tagName || ''}`.toLowerCase();
  const name = `${el.getAttribute?.('name') || ''}`.toLowerCase();
  const id = `${el.getAttribute?.('id') || ''}`.toLowerCase();
  const cls = `${el.getAttribute?.('class') || ''}`.toLowerCase();

  const tableAncestorDepth = ctx?.tableAncestorDepth || 0;
  const baselineTableAncestorDepth = ctx?.baselineTableAncestorDepth || 0;
  const complexTableDepthThreshold = baselineTableAncestorDepth + 1;

  const tableCount = el.querySelectorAll('table').length;
  const imgCount = el.querySelectorAll('img').length;
  const linkCount = el.querySelectorAll('a').length;
  const nodeCount = el.querySelectorAll('*').length;

  const looksSemanticSection =
    name.includes('footer') || id.includes('footer') || cls.includes('footer') ||
    name.includes('header') || id.includes('header') || cls.includes('header') ||
    name.includes('navbar') || id.includes('navbar') || cls.includes('navbar');

  if (tag === 'table') {
    // If the block is extremely table-nested, keep it as a read-only HTML blob.
    // Still avoid blobifying the very outer wrapper table; only blobify nested tables.
    if (tableAncestorDepth >= complexTableDepthThreshold && tableCount > 4) return true;
    if (tableAncestorDepth >= complexTableDepthThreshold + 1 && tableCount >= 2) return true;
    if (looksSemanticSection && tableAncestorDepth >= complexTableDepthThreshold && tableCount >= 2) return true;
    if (tableAncestorDepth >= complexTableDepthThreshold + 1 && nodeCount >= 220 && (imgCount + linkCount) <= 6) return true;
  }

  // Semantic markers like "bmeFooter" frequently appear on huge wrapper elements.
  // Only treat them as complex when they are also table-heavy / deeply nested.
  if (looksSemanticSection && tableAncestorDepth >= complexTableDepthThreshold && tableCount >= 3 && nodeCount >= 160) return true;
  if (tableAncestorDepth >= complexTableDepthThreshold + 1 && nodeCount >= 320) return true;

  return false;
};

const parseInlineSettings = (el) => {
  const style = el?.getAttribute?.('style') || '';
  const out = {};

  const bg = styleValue(style, 'background-color');
  if (bg) out.backgroundColor = bg;

  const color = styleValue(style, 'color');
  if (color) out.textColor = color;

  const fs = styleValue(style, 'font-size');
  if (fs) out.fontSize = fs;

  const fw = styleValue(style, 'font-weight');
  if (fw) out.fontWeight = fw;

  const ff = styleValue(style, 'font-family');
  if (ff) out.fontFamily = ff;

  const ta = styleValue(style, 'text-align');
  if (ta) out.textAlign = ta;

  const bgImg = styleValue(style, 'background-image');
  if (bgImg) {
    const urlMatch = bgImg.match(/url\((['"]?)(.*?)\1\)/i);
    out.backgroundImage = urlMatch ? urlMatch[2] : bgImg;
  }
  const bgSize = styleValue(style, 'background-size');
  if (bgSize) out.backgroundSize = bgSize;
  const bgPos = styleValue(style, 'background-position');
  if (bgPos) out.backgroundPosition = bgPos;
  const bgRepeat = styleValue(style, 'background-repeat');
  if (bgRepeat) out.backgroundRepeat = bgRepeat;

  const padding = parseBoxValues(styleValue(style, 'padding'));
  const margin = parseBoxValues(styleValue(style, 'margin'));
  if (padding) out.padding = padding;
  if (margin) out.margin = margin;

  const borderStyle = styleValue(style, 'border-style') || styleValue(style, 'border');
  const borderWidth = styleValue(style, 'border-width');
  const borderColor = styleValue(style, 'border-color');
  if (borderStyle) out.border = borderStyle.includes('none') ? 'none' : 'solid';
  if (borderWidth) {
    const n = Number.parseFloat(`${borderWidth}`.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(n)) out.borderWidth = n;
  }
  if (borderColor) out.borderColor = borderColor;

  const br = styleValue(style, 'border-radius');
  if (br) {
    const n = Number.parseFloat(`${br}`.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(n)) out.borderRadius = n;
  }

  const w = styleValue(style, 'width');
  if (w) out.width = w;
  const h = styleValue(style, 'height');
  if (h) out.height = h;

  return out;
};

const isNoiseTag = (tag) => {
  return ['script', 'style', 'meta', 'link', 'head', 'noscript'].includes(tag);
};

const nodeFromDom = (node, ctx) => {
  if (!node) return null;

  if (node.nodeType === Node.TEXT_NODE) {
    const t = `${node.textContent || ''}`;
    const trimmed = t.replace(/\s+/g, ' ');
    if (!trimmed.trim()) return null;
    return {
      id: createIrId(),
      kind: IR_NODE_KIND.TEXT,
      text: trimmed,
    };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node;
  const tag = `${el.tagName || ''}`.toLowerCase();
  if (!tag || isNoiseTag(tag)) return null;

  const nextCtx = {
    baselineTableAncestorDepth: ctx?.baselineTableAncestorDepth || 0,
    tableAncestorDepth: (ctx?.tableAncestorDepth || 0) + (tag === 'table' ? 1 : 0),
  };

  const attrs = pickAttributes(el);
  const settings = parseInlineSettings(el);

  const bgAttr = attrs.bgcolor || attrs.background;
  if (bgAttr && !settings.backgroundColor) {
    settings.backgroundColor = bgAttr;
  }

  if (isComplexHtmlBlock(el, nextCtx)) {
    return {
      id: createIrId(),
      kind: IR_NODE_KIND.COMPONENT,
      type: COMPONENT_TYPES.HTML,
      tag,
      attrs,
      settings: { ...settings, readOnly: true },
      props: {
        htmlContent: el.outerHTML || '',
      },
      children: [],
    };
  }

  const mappedType = TAG_TO_COMPONENT_TYPE[tag] || '';
  const children = Array.from(el.childNodes || [])
    .map((c) => nodeFromDom(c, nextCtx))
    .filter(Boolean);

  const base = {
    id: createIrId(),
    kind: IR_NODE_KIND.ELEMENT,
    tag,
    attrs,
    settings,
    children,
  };

  if (tag === 'img') {
    return {
      ...base,
      kind: IR_NODE_KIND.COMPONENT,
      type: COMPONENT_TYPES.IMAGE,
      props: {
        imageUrl: attrs.src || '',
        alt: attrs.alt || '',
        width: attrs.width || '',
        height: attrs.height || '',
      },
      children: [],
    };
  }

  if (tag === 'a') {
    const text = `${el.textContent || ''}`.replace(/\s+/g, ' ').trim();
    return {
      ...base,
      kind: IR_NODE_KIND.COMPONENT,
      type: COMPONENT_TYPES.LINK,
      props: {
        linkUrl: attrs.href || '',
        text,
      },
      children: [],
    };
  }

  if (mappedType) {
    return {
      ...base,
      kind: IR_NODE_KIND.COMPONENT,
      type: mappedType,
      props: {
        text: `${el.textContent || ''}`,
      },
    };
  }

  return base;
};

export const htmlToIr = (htmlText) => {
  const doc = DEFAULT_IR_DOCUMENT();
  const parser = new DOMParser();
  const dom = parser.parseFromString(htmlText || '', 'text/html');
  const body = dom.body;

  const baselineTableAncestorDepth = computeBaselineTableNesting(body);
  const rootCtx = { baselineTableAncestorDepth, tableAncestorDepth: 0 };

  const nodes = Array.from(body?.childNodes || [])
    .map((n) => nodeFromDom(n, rootCtx))
    .filter(Boolean);

  doc.nodes = nodes;
  return doc;
};
