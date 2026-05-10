import { COMPONENT_TYPES } from '../partials/componentTypes';
import { createComponentInstance } from '../partials/componentRegistry';
import { IR_NODE_KIND } from './schema';

export const createId = () => Date.now() + Math.floor(Math.random() * 100000);

export const mergeBox = (base = {}, extra = {}) => {
  const merged = { ...(base || {}), ...(extra || {}) };
  
  // Handle individual box model properties if shorthand not provided
  if (extra.top !== undefined) merged.top = extra.top;
  if (extra.right !== undefined) merged.right = extra.right;
  if (extra.bottom !== undefined) merged.bottom = extra.bottom;
  if (extra.left !== undefined) merged.left = extra.left;
  
  return merged;
};

const TEXT_STYLE_KEYS = [
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontFamily',
  'textAlign',
  'textColor',
  'textDecoration',
  'textTransform',
  'lineHeight',
  'letterSpacing',
  'whiteSpace',
  'wordBreak',
  'backgroundColor',
  'padding',
  'margin',
  'border',
  'borderColor',
  'borderWidth',
  'borderRadius',
  'display',
  'float',
  'alignSelf',
  'justifyContent',
  'alignItems',
  'flexDirection',
  'flexWrap',
  'overflow',
  'opacity',
  'boxSizing',
  'verticalAlign',
  // Additional important properties
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'transform',
  'transformOrigin',
  'textShadow',
  'boxShadow',
  'filter',
  'cursor',
  'transition',
  'animation',
  'visibility',
  'clear',
  'objectFit',
  'objectPosition',
];

const MEDIA_STYLE_KEYS = [
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'textAlign',
  'backgroundColor',
  'padding',
  'margin',
  'border',
  'borderColor',
  'borderWidth',
  'borderRadius',
  'display',
  'float',
  'alignSelf',
  'overflow',
  'opacity',
  'boxSizing',
  'verticalAlign',
  // Additional media properties
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'objectFit',
  'objectPosition',
  'filter',
  'transform',
  'cursor',
  'transition',
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
  
  // Deep merge settings to preserve all style information
  target.settings = {
    ...(target.settings || {}),
    ...effective,
    padding: mergeBox(target.settings?.padding || {}, effective.padding || {}),
    margin: mergeBox(target.settings?.margin || {}, effective.margin || {}),
    // Preserve individual border properties if border shorthand exists
    ...(effective.border && !target.settings?.borderTop ? { borderTop: effective.border } : {}),
    ...(effective.border && !target.settings?.borderRight ? { borderRight: effective.border } : {}),
    ...(effective.border && !target.settings?.borderBottom ? { borderBottom: effective.border } : {}),
    ...(effective.border && !target.settings?.borderLeft ? { borderLeft: effective.border } : {}),
  };
};

export const applyComponentSettings = (target, irNode, kind = 'text') => {
  if (!target || !irNode) return;
  const effective = getEffectiveSettings(irNode);
  const subset = pickSettings(effective, kind === 'media' ? MEDIA_STYLE_KEYS : TEXT_STYLE_KEYS);
  const own = irNode?.styleMap?.own || irNode?.ownSettings || {};
  target.settings = {
    ...(target.settings || {}),
    ...subset,
    padding: mergeBox(target.settings?.padding || {}, subset.padding || {}),
    margin: mergeBox(target.settings?.margin || {}, subset.margin || {}),
    // Own textColor/backgroundColor take priority over cascaded effective values —
    // a span with explicit color:#000 must not be overridden by an ancestor's color:#fff.
    ...(own.textColor ? { textColor: own.textColor } : {}),
    ...(own.backgroundColor ? { backgroundColor: own.backgroundColor } : {}),
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
  const semanticRole = `${node?.semanticRole || ''}`.toLowerCase();
  const keepGrouped = !!(node?.layoutHints?.keepRowsGrouped || node?.layoutHints?.preferSingleBlock);
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

  // Skip tracking and spacer elements
  if (node?.layoutHints?.shouldSkip) return true;

  // Be more conservative - preserve more structure
  if (['hero', 'product', 'social', 'legal', 'nav', 'logo', 'content_group', 'container', 'grid'].includes(semanticRole)) return false;
  
  // Enhanced style detection for layout-critical wrappers
  const hasLayoutCriticalStyle = !!(
    node?.ownSettings?.display?.includes('grid') ||
    node?.ownSettings?.display?.includes('flex') ||
    node?.ownSettings?.position !== 'static' ||
    node?.ownSettings?.float ||
    node?.ownSettings?.clear
  );
  
  if (hasLayoutCriticalStyle) return false;

  if (keepGrouped) return false;
  
  // Be more conservative about flattening divs - preserve structure
  if (tag === 'div') {
    // Only flatten simple divs without meaningful content
    if (hasOwnVisualStyle) return false;
    if (sig.hasNestedTable) return false;
    if (sig.hasButtonLike) return false;
    // Flatten only if it's a simple wrapper
    return !sig.hasText && !sig.hasImage && !sig.hasLink;
  }
  
  if (tag === 'center') return true;
  if (hasOwnVisualStyle) return false;
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
  delete comp.settings.color;
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

  const ownSettings = node?.styleMap?.own || node?.ownSettings || {};
  const effectiveSettings = node?.styleMap?.effective || node?.settings || {};

  if (componentType !== COMPONENT_TYPES.BUTTON && componentType !== COMPONENT_TYPES.LINK) {
    if (ownSettings.textAlign) {
      comp.settings.textAlign = ownSettings.textAlign;
    } else {
      delete comp.settings.textAlign;
    }
  }

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
    if (ownSettings.backgroundColor || effectiveSettings.backgroundColor) {
      comp.settings.buttonColor = ownSettings.backgroundColor || effectiveSettings.backgroundColor;
    }
    if (ownSettings.textColor || effectiveSettings.textColor) {
      comp.settings.buttonTextColor = ownSettings.textColor || effectiveSettings.textColor;
    }
    return comp;
  }

  if (componentType === COMPONENT_TYPES.LINK) {
    comp.linkUrl = node.props?.linkUrl || '';
    comp.content = node.props?.text || '';
    if (ownSettings.textColor || effectiveSettings.textColor) {
      comp.settings.linkColor = ownSettings.textColor || effectiveSettings.textColor;
    }
    return comp;
  }

  if (componentType === COMPONENT_TYPES.PARAGRAPH || componentType === COMPONENT_TYPES.SPAN || componentType === COMPONENT_TYPES.HEADER_1 || componentType === COMPONENT_TYPES.HEADER_2 || componentType === COMPONENT_TYPES.HEADER_3 || componentType === COMPONENT_TYPES.HEADER) {
    // Fix: Preserve text boundaries and avoid incorrect merging
    let content = node.props?.text || '';
    
    if (!content && node.children && node.children.length > 0) {
      // Extract text from children while preserving structure
      const childTexts = node.children.map((child) => {
        if (child.kind === 'text') {
          return child.text || '';
        } else if (child.props?.text) {
          return child.props.text;
        } else if (child.children && child.children.length > 0) {
          // Recursively extract from nested children
          return child.children.map((nestedChild) => {
            if (nestedChild.kind === 'text') {
              return nestedChild.text || '';
            }
            return nestedChild.props?.text || '';
          }).filter(Boolean).join(' ');
        }
        return '';
      }).filter(Boolean);
      
      // Join with proper spacing but don't over-merge
      content = childTexts.join(' ').trim();
    }
    
    comp.content = content;
    if (ownSettings.color) {
      comp.settings.color = ownSettings.color;
    } else {
      delete comp.settings.color;
    }
    return comp;
  }

  comp.content = node.props?.text || comp.content || '';
  return comp;
};

export const isColumnMeaningful = (column) => {
  if (!column) return false;
  return (column.components || []).length > 0 || (column.nestedRows || []).length > 0;
};
