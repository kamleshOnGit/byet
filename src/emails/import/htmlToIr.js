import { COMPONENT_TYPES } from '../partials/componentTypes';
import { DEFAULT_IR_DOCUMENT, IR_NODE_KIND, TAG_TO_COMPONENT_TYPE, createIrId } from '../ir/schema';

const SEMANTIC_KEYWORDS = {
  nav: ['nav', 'menu', 'links', 'categories', 'offers', 'contact', 'hotel'],
  social: ['social', 'follow', 'facebook', 'twitter', 'instagram', 'youtube', 'linkedin'],
  legal: ['footer', 'unsubscribe', 'manage subscription', 'report abuse', 'forward email', 'privacy'],
  hero: ['hero', 'banner', 'intro', 'featured', 'city bike'],
  product: ['product', 'bike', 'price', 'shop now', 'buy now', 'trekking', 'road', 'mountain', 'city', 'add to cart'],
  logo: ['logo', 'brand', 'branding'],
  header: ['header', 'top', 'masthead'],
  // Email-specific additions
  preheader: ['preheader', 'view in browser', 'view this email', 'web version', 'permission'],
  permission: ['permission', 'add us to address book', 'safe senders', 'view this email in your browser'],
  tracking: ['tracking', 'web beacon', 'pixel', 'open tracking'],
  spacer: ['spacer', 'divider', 'separator', 'gap', 'line', 'gutter'],
  // E-commerce specific
  cart: ['cart', 'basket', 'checkout', 'shop now', 'buy now', 'purchase'],
  price: ['price', 'cost', 'amount', '$', '€', '£'],
  product_card: ['product', 'item', 'sku', 'add to cart', 'shop now'],
  // Layout specific
  container: ['container', 'wrapper', 'main-content', 'body-content', 'main column'],
  grid: ['grid', 'row', 'column', 'col-'],
  card: ['card', 'box', 'panel'],
};

const collectNodeTokens = (el) => {
  const tag = `${el?.tagName || ''}`.toLowerCase();
  const id = `${el?.id || ''}`.toLowerCase();
  const cls = `${el?.className || ''}`.toLowerCase();
  const name = `${el?.getAttribute?.('name') || ''}`.toLowerCase();
  const role = `${el?.getAttribute?.('role') || ''}`.toLowerCase();
  const text = `${el?.textContent || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
  return `${tag} ${id} ${cls} ${name} ${role} ${text}`;
};

const matchesKeywordGroup = (haystack, keywords = []) => keywords.some((keyword) => haystack.includes(keyword));

const detectSemanticRole = (el, signature = {}) => {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
  const tag = `${el.tagName || ''}`.toLowerCase();
  const tokens = collectNodeTokens(el);
  const directLinks = Array.from(el.querySelectorAll?.(':scope a') || []).length;
  const directImages = Array.from(el.querySelectorAll?.(':scope img') || []).length;

  if (tag === 'nav' || matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.nav) || (directLinks >= 3 && !signature.hasNestedTable)) return 'nav';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.social)) return 'social';
  if (tag === 'footer' || matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.legal)) return 'legal';
  if (tag === 'header' || matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.header)) return 'header';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.hero)) return 'hero';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.logo) || (directImages === 1 && !signature.hasText && /logo|brand/.test(tokens))) return 'logo';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.product)) return 'product';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.preheader)) return 'preheader';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.permission)) return 'permission';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.tracking)) return 'tracking';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.spacer)) return 'spacer';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.cart)) return 'cart';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.price)) return 'price';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.product_card)) return 'product_card';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.container)) return 'container';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.grid)) return 'grid';
  if (matchesKeywordGroup(tokens, SEMANTIC_KEYWORDS.card)) return 'card';
  if (tag === 'table' && signature.hasNestedTable && !signature.hasLink && !signature.hasButtonLike && !signature.hasImage) return 'wrapper';
  if (signature.hasNestedTable && (signature.hasText || signature.hasImage || signature.hasLink)) return 'content_group';
  return '';
};

const detectLayoutHints = (el, signature = {}, semanticRole = '') => {
  const tag = `${el?.tagName || ''}`.toLowerCase();
  const text = `${el?.textContent || ''}`.replace(/\s+/g, ' ').trim();
  const tokens = collectNodeTokens(el);
  const linkCount = Array.from(el?.querySelectorAll?.('a') || []).length;
  const imageCount = Array.from(el?.querySelectorAll?.('img') || []).length;
  const directTables = Array.from(el?.children || []).filter((child) => `${child?.tagName || ''}`.toLowerCase() === 'table').length;
  return {
    keepRowsGrouped: ['hero', 'product', 'social', 'legal', 'content_group', 'product_card', 'card'].includes(semanticRole),
    preferSingleBlock: ['logo', 'hero', 'product', 'social', 'legal', 'preheader', 'permission'].includes(semanticRole),
    isLikelyWrapper: semanticRole === 'wrapper' || (tag === 'table' && directTables === 1 && !text && !imageCount),
    isLikelyNavCluster: semanticRole === 'nav' || (linkCount >= 3 && imageCount === 0),
    isLikelyMixedMediaBlock: ((imageCount > 0 && linkCount > 0) || (imageCount > 0 && text.length > 0)),
    isLikelyContainer: semanticRole === 'container' || (tag === 'table' && /container|wrapper|main/.test(tokens)),
    isLikelyGrid: semanticRole === 'grid' || /grid|col-|row-/.test(text),
    isLikelyTracking: semanticRole === 'tracking' || /tracking|pixel|beacon/.test(tokens),
    // Skip tracking pixels AND pure gutter/spacer TDs (no text, no images) 
    shouldSkip: semanticRole === 'tracking' || (semanticRole === 'spacer' && !signature.hasText && !signature.hasImage && !signature.hasLink),
  };
};

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
      // Detect 'bulletproof button': <a> with a child span having display:table + bg + border-radius
      if (!signature.hasButtonLike) {
        const spanKids = Array.from(node.children || []).filter(c => c.tagName && c.tagName.toLowerCase() === 'span');
        for (const sp of spanKids) {
          const spStyle = (sp.getAttribute && sp.getAttribute('style')) || '';
          if (/display\s*:\s*table\b/i.test(spStyle) && /background-color\s*:/i.test(spStyle) && /border-radius\s*:/i.test(spStyle)) {
            signature.hasButtonLike = true;
            break;
          }
        }
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

  const fst = styleValue(style, 'font-style');
  if (fst) out.fontStyle = fst;

  const ff = styleValue(style, 'font-family');
  if (ff) out.fontFamily = ff;

  const ta = styleValue(style, 'text-align');
  if (ta) out.textAlign = ta;

  const td = styleValue(style, 'text-decoration');
  if (td) out.textDecoration = td;

  const tt = styleValue(style, 'text-transform');
  if (tt) out.textTransform = tt;

  const lh = styleValue(style, 'line-height');
  if (lh) out.lineHeight = lh;

  const ls = styleValue(style, 'letter-spacing');
  if (ls) out.letterSpacing = ls;

  const ws = styleValue(style, 'white-space');
  if (ws) out.whiteSpace = ws;

  const wb = styleValue(style, 'word-break');
  if (wb) out.wordBreak = wb;

  const va = styleValue(style, 'vertical-align');
  if (va) out.verticalAlign = va;

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

  const minW = styleValue(style, 'min-width');
  if (minW) out.minWidth = minW;
  const maxW = styleValue(style, 'max-width');
  if (maxW) out.maxWidth = maxW;
  const minH = styleValue(style, 'min-height');
  if (minH) out.minHeight = minH;
  const maxH = styleValue(style, 'max-height');
  if (maxH) out.maxHeight = maxH;

  const display = styleValue(style, 'display');
  if (display) out.display = display;
  const float = styleValue(style, 'float');
  if (float) out.float = float;
  const alignSelf = styleValue(style, 'align-self');
  if (alignSelf) out.alignSelf = alignSelf;
  const justifyContent = styleValue(style, 'justify-content');
  if (justifyContent) out.justifyContent = justifyContent;
  const alignItems = styleValue(style, 'align-items');
  if (alignItems) out.alignItems = alignItems;
  const flexDirection = styleValue(style, 'flex-direction');
  if (flexDirection) out.flexDirection = flexDirection;
  const flexWrap = styleValue(style, 'flex-wrap');
  if (flexWrap) out.flexWrap = flexWrap;
  const overflow = styleValue(style, 'overflow');
  if (overflow) out.overflow = overflow;
  const opacity = styleValue(style, 'opacity');
  if (opacity) out.opacity = opacity;

  const boxSizing = styleValue(style, 'box-sizing');
  if (boxSizing) out.boxSizing = boxSizing;
  const position = styleValue(style, 'position');
  if (position) out.position = position;
  const top = styleValue(style, 'top');
  if (top) out.top = top;
  const right = styleValue(style, 'right');
  if (right) out.right = right;
  const bottom = styleValue(style, 'bottom');
  if (bottom) out.bottom = bottom;
  const left = styleValue(style, 'left');
  if (left) out.left = left;
  const zIndex = styleValue(style, 'z-index');
  if (zIndex) out.zIndex = zIndex;
  const clear = styleValue(style, 'clear');
  if (clear) out.clear = clear;
  const transform = styleValue(style, 'transform');
  if (transform) out.transform = transform;
  const boxShadow = styleValue(style, 'box-shadow');
  if (boxShadow) out.boxShadow = boxShadow;
  const gridTemplateColumns = styleValue(style, 'grid-template-columns');
  if (gridTemplateColumns) out.gridTemplateColumns = gridTemplateColumns;
  const gap = styleValue(style, 'gap');
  if (gap) out.gap = gap;

  return out;
};

const isNoiseTag = (tag) => {
  return ['script', 'style', 'meta', 'link', 'head', 'noscript'].includes(tag);
};

const nodeFromDom = (node, ctx) => {
  if (!node) return null;

  if (node.nodeType === Node.TEXT_NODE) {
    const t = `${node.textContent || ''}`;
    const trimmed = t.replace(/[ \t]+/g, ' ').replace(/[\n\r]+/g, ' ').trim();
    if (!trimmed) return null;
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
  const semanticRole = detectSemanticRole(el, contentSignature);
  const layoutHints = detectLayoutHints(el, contentSignature, semanticRole);

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
    semanticRole,
    layoutHints,
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
    // Extract button styling from span-as-button (child span: display:table + background-color + border-radius)
    let spanButtonBg = '';
    let spanButtonTextColor = '';
    let spanButtonRadius = 0;
    for (const sp of Array.from(el.children || [])) {
      if (`${sp.tagName || ''}`.toLowerCase() !== 'span') continue;
      const spStyle = sp.getAttribute ? (sp.getAttribute('style') || '') : '';
      if (/display\s*:\s*table\b/i.test(spStyle) && /background-color\s*:/i.test(spStyle)) {
        spanButtonBg = styleValue(spStyle, 'background-color');
        const brRaw = styleValue(spStyle, 'border-radius');
        spanButtonRadius = brRaw ? (parseFloat(brRaw) || 0) : 0;
        const innerSpans = Array.from(sp.querySelectorAll ? sp.querySelectorAll('span') : []);
        for (const inner of innerSpans) {
          const tc = styleValue(inner.getAttribute ? (inner.getAttribute('style') || '') : '', 'color');
          if (tc) { spanButtonTextColor = tc; break; }
        }
        if (!spanButtonTextColor) {
          spanButtonTextColor = styleValue(el.getAttribute ? (el.getAttribute('style') || '') : '', 'color');
        }
        break;
      }
    }
    const mergedOwnSettings = spanButtonBg
      ? { ...ownSettings, backgroundColor: spanButtonBg, ...(spanButtonTextColor ? { textColor: spanButtonTextColor } : {}), ...(spanButtonRadius ? { borderRadius: spanButtonRadius } : {}) }
      : ownSettings;
    return {
      ...base,
      ownSettings: mergedOwnSettings,
      styleMap: { ...base.styleMap, own: mergedOwnSettings },
      kind: IR_NODE_KIND.COMPONENT,
      type: COMPONENT_TYPES.LINK,
      props: {
        linkUrl: normalizeImportedUrl(attrs.href || '', (ctx && ctx.assetBaseUrl) || ''),
        text,
        ...(spanButtonBg ? { buttonColor: spanButtonBg } : {}),
        ...(spanButtonTextColor ? { buttonTextColor: spanButtonTextColor } : {}),
        ...(spanButtonRadius ? { buttonRadius: spanButtonRadius } : {}),
      },
      children: [],
    };
  }

  // Fix 3: Don't prematurely collapse elements that have rich inner content
  // (nested images, links, styled spans, nested tables) into a plain-text
  // component — that discards all child nodes and formatting.
  // Only apply the direct TAG→COMPONENT mapping when the element is truly
  // a simple leaf: no child ELEMENT nodes of significance.
  if (mappedType) {
    const hasRichChildren =
      contentSignature.hasImage ||
      contentSignature.hasLink ||
      contentSignature.hasButtonLike ||
      contentSignature.hasNestedTable ||
      // More than one inline wrapper suggests formatted rich text that needs
      // to be preserved as raw HTML rather than collapsed to plain string.
      (contentSignature.hasInlineWrapper && children.some(
        (c) => c.kind === IR_NODE_KIND.COMPONENT || (c.kind === IR_NODE_KIND.ELEMENT && c.children?.length > 0)
      ));

    if (!hasRichChildren) {
      // Safe to collapse: simple text-only element
      return {
        ...base,
        kind: IR_NODE_KIND.COMPONENT,
        type: mappedType,
        props: {
          text: `${el.textContent || ''}`.replace(/\s+/g, ' ').trim(),
        },
        children: [],
      };
    }
    // Has rich children — fall through as a structural ELEMENT so children
    // are preserved and scanIrStructure can render them properly.
    // Tag hint is preserved on the node so downstream code can still identify it.
    return {
      ...base,
      _mappedType: mappedType, // hint for downstream (non-breaking)
      children,
    };
  }

  return base;
};

// ---------------------------------------------------------------------------
// Fix 2: Upgraded MSO / VML / Office namespace cleaner.
// Handles all known Outlook-specific constructs that leak ghost DOM nodes:
//   <!--[if mso]>…<![endif]-->   downlevel-hidden IE/MSO conditionals
//   <![if !mso]>…<![endif]>      downlevel-revealed conditionals
//   <v:…>                        VML elements (v: namespace)
//   <o:p>, <o:v>, <o:…>          Office namespace elements (o: namespace)
//   xmlns:o / xmlns:v            Namespace declarations (benign but noisy)
//   mso-* inline style values    Left in-place (they are ignored by DOMParser)
// ---------------------------------------------------------------------------
const stripMsoConditionals = (html) => {
  if (!html) return html;
  let result = String(html);

  // 1. Remove MSO downlevel-hidden conditional blocks: <!--[if mso]>…<![endif]-->
  //    Use a two-pass approach: greedy first, then leftover fragments.
  result = result.replace(/<!--\[if\b[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
  // Leftover opening tags that weren't closed (malformed)
  result = result.replace(/<!--\[if\b[^\]]*\]>[\s\S]*?$/gi, '');

  // 2. Remove downlevel-revealed conditionals: <![if !mso]>…<![endif]>
  result = result.replace(/<!\[if\b[^\]]*\]>[\s\S]*?<!\[endif\]>/gi, '');

  // 3. Remove VML paired elements: <v:tagname …>…</v:tagname>
  result = result.replace(/<v:[a-z][a-z0-9]*(?:\s[^>]*)?>[\s\S]*?<\/v:[a-z][a-z0-9]*>/gi, '');
  // Remove VML self-closing elements: <v:tagname … />
  result = result.replace(/<v:[a-z][a-z0-9]*(?:\s[^>]*)?\/?>/gi, '');

  // 4. Fix 2 (new): Remove Office namespace paired elements: <o:p>, <o:v>, etc.
  result = result.replace(/<o:[a-z][a-z0-9]*(?:\s[^>]*)?>[\s\S]*?<\/o:[a-z][a-z0-9]*>/gi, '');
  // Remove Office namespace self-closing elements
  result = result.replace(/<o:[a-z][a-z0-9]*(?:\s[^>]*)?\/?>/gi, '');

  // 5. Remove xml namespace declarations that confuse some parsers
  result = result.replace(/\s+xmlns:[a-z]+\s*=\s*["'][^"']*["']/gi, '');

  return result;
};

export const htmlToIr = (htmlText, options = {}) => {
  const doc = DEFAULT_IR_DOCUMENT();
  const parser = new DOMParser();
  const cleanedHtml = stripMsoConditionals(htmlText || '');
  const dom = parser.parseFromString(cleanedHtml, 'text/html');
  const body = dom.body;

  const rootCtx = { depth: 0, assetBaseUrl: options.assetBaseUrl || '' };

  const nodes = Array.from(body?.childNodes || [])
    .map((n) => nodeFromDom(n, rootCtx))
    .filter(Boolean);

  doc.nodes = nodes;
  return doc;
};
