import { COMPONENT_TYPES } from '../partials/componentTypes';
import { createComponentInstance } from '../partials/componentRegistry';
import { IR_NODE_KIND } from './schema';

export const createId = () => Date.now() + Math.floor(Math.random() * 100000);

export const mergeBox = (base = {}, extra = {}) => ({ ...(base || {}), ...(extra || {}) });

const TEXT_STYLE_KEYS = [
  'fontSize',
  'fontWeight',
  'fontFamily',
  'textAlign',
  'textColor',
  'lineHeight',
  'letterSpacing',
  'backgroundColor',
  'padding',
  'margin',
  'border',
  'borderColor',
  'borderWidth',
  'borderRadius',
];

const MEDIA_STYLE_KEYS = [
  'width',
  'height',
  'maxWidth',
  'textAlign',
  'backgroundColor',
  'padding',
  'margin',
  'border',
  'borderColor',
  'borderWidth',
  'borderRadius',
];

const pickSettings = (settings = {}, keys = []) => {
  const out = {};
  keys.forEach((key) => {
    if (settings[key] !== undefined) out[key] = settings[key];
  });
  return out;
};

export const getEffectiveSettings = (node) => ({
  ...(node?.styleMap?.effective || node?.settings || {}),
  padding: mergeBox(node?.styleMap?.effective?.padding || node?.settings?.padding, {}),
  margin: mergeBox(node?.styleMap?.effective?.margin || node?.settings?.margin, {}),
});

export const applyEffectiveSettings = (target, irNode) => {
  if (!target || !irNode) return;
  const effective = getEffectiveSettings(irNode);
  target.settings = {
    ...(target.settings || {}),
    ...effective,
    padding: mergeBox(target.settings?.padding || {}, effective.padding || {}),
    margin: mergeBox(target.settings?.margin || {}, effective.margin || {}),
  };
};

export const applyComponentSettings = (target, irNode, kind = 'text') => {
  if (!target || !irNode) return;
  const effective = getEffectiveSettings(irNode);
  const subset = pickSettings(effective, kind === 'media' ? MEDIA_STYLE_KEYS : TEXT_STYLE_KEYS);
  target.settings = {
    ...(target.settings || {}),
    ...subset,
    padding: mergeBox(target.settings?.padding || {}, subset.padding || {}),
    margin: mergeBox(target.settings?.margin || {}, subset.margin || {}),
  };
};

export const isMeaningfulText = (value) => `${value || ''}`.replace(/\s+/g, ' ').trim().length > 0;

export const hasRenderableContentSignature = (node) => {
  const sig = node?.contentSignature || {};
  return !!(sig.hasText || sig.hasImage || sig.hasLink || sig.hasButtonLike);
};

export const shouldFlattenWrapper = (node) => {
  if (!node || node.kind !== IR_NODE_KIND.ELEMENT) return false;
  const tag = `${node.tag || ''}`.toLowerCase();
  if (['tbody', 'thead', 'tfoot'].includes(tag)) return true;
  if (!['div', 'span', 'section', 'article', 'center', 'p'].includes(tag)) return false;

  const sig = node.contentSignature || {};
  const hasOwnVisualStyle = !!(
    node?.ownSettings?.backgroundColor ||
    node?.ownSettings?.backgroundImage ||
    node?.ownSettings?.borderWidth ||
    node?.ownSettings?.borderRadius ||
    node?.ownSettings?.padding ||
    node?.ownSettings?.margin ||
    node?.ownSettings?.width ||
    node?.ownSettings?.height
  );

  if (tag === 'div' || tag === 'center') return true;
  if (hasOwnVisualStyle) return false;
  if (sig.hasNestedTable || sig.hasButtonLike) return false;
  if (tag === 'p') return false;
  return true;
};

export const inferColumnSize = (node, siblingCount = 1) => {
  const rawColspan = parseInt(node?.attrs?.colspan, 10);
  if (Number.isFinite(rawColspan) && rawColspan > 0) {
    return Math.max(1, Math.min(12, rawColspan * Math.max(1, Math.floor(12 / Math.max(rawColspan, 1)))));
  }
  return Math.max(1, Math.floor(12 / Math.max(1, siblingCount)));
};

export const createScanMeta = (sourceNode = null, role = 'node', confidence = 0.5, reasons = []) => ({
  role,
  confidence,
  reasons: Array.from(new Set(reasons.filter(Boolean))),
  sourceId: sourceNode?.id || null,
  sourceTag: sourceNode?.tag || null,
});

export const addScanReasons = (target, reasons = [], confidence = null) => {
  if (!target) return;
  target._scan = target._scan || createScanMeta(null);
  target._scan.reasons = Array.from(new Set([...(target._scan.reasons || []), ...reasons.filter(Boolean)]));
  if (typeof confidence === 'number') {
    target._scan.confidence = confidence;
  }
};

export const createTextComponent = (node) => {
  const comp = createComponentInstance(COMPONENT_TYPES.SPAN);
  comp.id = createId();
  comp.type = COMPONENT_TYPES.SPAN;
  comp.content = node.text || '';
  applyComponentSettings(comp, node, 'text');
  return comp;
};

export const createRawHtmlComponent = (node) => {
  const comp = createComponentInstance(COMPONENT_TYPES.HTML);
  comp.id = createId();
  comp.type = COMPONENT_TYPES.HTML;
  comp.htmlContent = node?.outerHTML || '';
  comp.content = '';
  applyComponentSettings(comp, node, 'text');
  comp._scan = {
    confidence: 0.35,
    reasons: ['raw_html_fallback'],
    sourceId: node?.id || null,
    sourceTag: node?.tag || null,
  };
  return comp;
};

export const createComponentFromIr = (node) => {
  const isButtonLikeLink = node.type === COMPONENT_TYPES.LINK && node.contentSignature?.hasButtonLike;
  const componentType = isButtonLikeLink ? COMPONENT_TYPES.BUTTON : (node.type || COMPONENT_TYPES.SPAN);
  const comp = createComponentInstance(componentType);
  comp.id = createId();
  comp.type = componentType;
  applyComponentSettings(comp, node, componentType === COMPONENT_TYPES.IMAGE ? 'media' : 'text');

  if (componentType === COMPONENT_TYPES.IMAGE) {
    comp.imageUrl = node.props?.imageUrl || '';
    comp.content = node.props?.alt || comp.content || '';
    if (node.props?.width) comp.settings.width = node.props.width;
    if (node.props?.height) comp.settings.height = node.props.height;
    return comp;
  }

  if (componentType === COMPONENT_TYPES.BUTTON) {
    comp.linkUrl = node.props?.linkUrl || '';
    comp.content = node.props?.text || '';
    if (node?.styleMap?.effective?.backgroundColor) {
      comp.settings.buttonColor = node.styleMap.effective.backgroundColor;
    }
    if (node?.styleMap?.effective?.textColor) {
      comp.settings.buttonTextColor = node.styleMap.effective.textColor;
    }
    return comp;
  }

  if (componentType === COMPONENT_TYPES.LINK) {
    comp.linkUrl = node.props?.linkUrl || '';
    comp.content = node.props?.text || '';
    if (node?.styleMap?.effective?.textColor) {
      comp.settings.linkColor = node.styleMap.effective.textColor;
    }
    return comp;
  }

  if (componentType === COMPONENT_TYPES.PARAGRAPH || componentType === COMPONENT_TYPES.SPAN || componentType === COMPONENT_TYPES.HEADER_1 || componentType === COMPONENT_TYPES.HEADER_2 || componentType === COMPONENT_TYPES.HEADER_3 || componentType === COMPONENT_TYPES.HEADER) {
    comp.content = node.props?.text || node.children?.map((child) => child.text || child.props?.text || '').join(' ') || '';
    return comp;
  }

  comp.content = node.props?.text || comp.content || '';
  return comp;
};

export const isColumnMeaningful = (column) => {
  if (!column) return false;
  if ((column.components || []).length > 0) return true;
  if ((column.nestedRows || []).length > 0) return true;
  const bg = column.settings?.backgroundColor;
  return !!(bg && bg !== 'transparent');
};
