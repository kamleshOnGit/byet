import { COMPONENT_TYPES } from '../partials/componentTypes';
import { DEFAULT_IR_DOCUMENT, IR_NODE_KIND, TAG_TO_COMPONENT_TYPE, createIrId } from '../ir/schema';

const normalizeImportedUrl = (value, assetBaseUrl) => {
  if (!value) return '';
  const raw = `${value}`.trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('cid:') || raw.startsWith('#')) return raw;
  if (/^(https?:|file:|mailto:|tel:)/i.test(raw)) return raw;
  if (!assetBaseUrl) return raw;
  try {
    return new URL(raw, assetBaseUrl).toString();
  } catch (err) {
    return raw;
  }
};

const pickAttributes = (el) => {
  if (!el || !el.getAttributeNames) return {};
  const out = {};
  el.getAttributeNames().forEach((name) => {
    const v = el.getAttribute(name);
    if (v !== null && v !== undefined) out[name] = `${v}`;
  });
  return out;
};

const mergeSettings = (base = {}, own = {}) => ({
  ...base,
  ...own,
  padding: own.padding || base.padding ? { ...(base.padding || {}), ...(own.padding || {}) } : undefined,
  margin: own.margin || base.margin ? { ...(base.margin || {}), ...(own.margin || {}) } : undefined,
});

const getContentSignature = (el) => {
  const signature = {
    hasText: false,
    hasImage: false,
    hasLink: false,
    hasButtonLike: false,
    hasInlineWrapper: false,
    hasBlockWrapper: false,
    hasNestedTable: false,
    hasStyledNode: false,
    tags: [],
  };

  if (!el || el.nodeType !== Node.ELEMENT_NODE) return signature;

  const tagSet = new Set();
  const nodes = [el, ...Array.from(el.querySelectorAll?.('*') || [])];
  nodes.forEach((node) => {
    const tag = `${node.tagName || ''}`.toLowerCase();
    if (!tag) return;
    tagSet.add(tag);

    const text = `${node.textContent || ''}`.replace(/\s+/g, ' ').trim();
    const style = node.getAttribute?.('style') || '';

    if (text) signature.hasText = true;
    if (tag === 'img') signature.hasImage = true;
    if (tag === 'a') {
      signature.hasLink = true;
      if (styleValue(style, 'background-color') || styleValue(style, 'padding')) {
        signature.hasButtonLike = true;
      }
    }
    if (tag === 'button') signature.hasButtonLike = true;
    if (['span', 'strong', 'b', 'em', 'i', 'u', 'font'].includes(tag)) signature.hasInlineWrapper = true;
    if (['div', 'section', 'article', 'center'].includes(tag) && node !== el) signature.hasBlockWrapper = true;
    if (tag === 'table' && node !== el) signature.hasNestedTable = true;
    if (style.trim() || node.getAttribute?.('bgcolor') || node.getAttribute?.('align')) signature.hasStyledNode = true;
  });

  signature.tags = Array.from(tagSet);
  return signature;
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


const parseInlineSettings = (el, assetBaseUrl) => {
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
    out.backgroundImage = normalizeImportedUrl(urlMatch ? urlMatch[2] : bgImg, assetBaseUrl);
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
    const parentPath = ctx?.path || [];
    return {
      id: createIrId(),
      kind: IR_NODE_KIND.TEXT,
      text: trimmed,
      relation: {
        parentId: ctx?.parentId || null,
        parentTag: ctx?.parentTag || null,
        depth: ctx?.depth || 0,
        path: [...parentPath, '#text'],
        childIndex: ctx?.childIndex ?? 0,
      },
      styleMap: {
        inherited: ctx?.effectiveSettings || {},
        own: {},
        effective: ctx?.effectiveSettings || {},
      },
    };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node;
  const tag = `${el.tagName || ''}`.toLowerCase();
  if (!tag || isNoiseTag(tag)) return null;

  const attrs = pickAttributes(el);
  const ownSettings = parseInlineSettings(el, ctx?.assetBaseUrl);

  const bgAttr = attrs.bgcolor || attrs.background;
  if (bgAttr && !ownSettings.backgroundColor) {
    ownSettings.backgroundColor = bgAttr;
  }

  const alignAttr = attrs.align || '';
  if (alignAttr && !ownSettings.textAlign) {
    ownSettings.textAlign = `${alignAttr}`.toLowerCase();
  }

  const effectiveSettings = mergeSettings(ctx?.effectiveSettings || {}, ownSettings);
  const nodeId = createIrId();
  const nodePath = [...(ctx?.path || []), tag];
  const contentSignature = getContentSignature(el);

  const nextCtx = {
    depth: (ctx?.depth || 0) + 1,
    parentId: nodeId,
    parentTag: tag,
    path: nodePath,
    effectiveSettings,
    assetBaseUrl: ctx?.assetBaseUrl,
  };

  const mappedType = TAG_TO_COMPONENT_TYPE[tag] || '';
  const children = Array.from(el.childNodes || [])
    .map((c, index) => nodeFromDom(c, { ...nextCtx, childIndex: index }))
    .filter(Boolean);

  const base = {
    id: nodeId,
    kind: IR_NODE_KIND.ELEMENT,
    tag,
    attrs,
    settings: effectiveSettings,
    ownSettings,
    children,
    outerHTML: el.outerHTML,
    relation: {
      parentId: ctx?.parentId || null,
      parentTag: ctx?.parentTag || null,
      depth: ctx?.depth || 0,
      path: nodePath,
      childIndex: ctx?.childIndex ?? 0,
    },
    styleMap: {
      inherited: ctx?.effectiveSettings || {},
      own: ownSettings,
      effective: effectiveSettings,
    },
    contentSignature,
  };

  if (tag === 'img') {
    return {
      ...base,
      kind: IR_NODE_KIND.COMPONENT,
      type: COMPONENT_TYPES.IMAGE,
      props: {
        imageUrl: normalizeImportedUrl(attrs.src || '', ctx?.assetBaseUrl),
        alt: attrs.alt || '',
        width: attrs.width || '',
        height: attrs.height || '',
      },
      children: [],
    };
  }

  if (tag === 'a') {
    const text = `${el.textContent || ''}`.replace(/\s+/g, ' ').trim();
    const directImageChildren = children.filter((child) => child?.kind === IR_NODE_KIND.COMPONENT && child?.type === COMPONENT_TYPES.IMAGE);
    if (directImageChildren.length > 0 && !text) {
      return {
        ...base,
        children: directImageChildren,
      };
    }
    return {
      ...base,
      kind: IR_NODE_KIND.COMPONENT,
      type: COMPONENT_TYPES.LINK,
      props: {
        linkUrl: normalizeImportedUrl(attrs.href || '', ctx?.assetBaseUrl),
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

export const htmlToIr = (htmlText, options = {}) => {
  const doc = DEFAULT_IR_DOCUMENT();
  const parser = new DOMParser();
  const dom = parser.parseFromString(htmlText || '', 'text/html');
  const body = dom.body;

  const rootCtx = { depth: 0, assetBaseUrl: options.assetBaseUrl || '' };

  const nodes = Array.from(body?.childNodes || [])
    .map((n) => nodeFromDom(n, rootCtx))
    .filter(Boolean);

  doc.nodes = nodes;
  return doc;
};
