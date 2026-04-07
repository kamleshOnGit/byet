import { COMPONENT_TYPES } from '../partials/componentTypes';
import { createComponentInstance } from '../partials/componentRegistry';
import { IR_NODE_KIND } from './schema';

const makeSectionSkeleton = () => {
  const now = Date.now();
  return [{
    id: now,
    rows: [{
      id: now + 1,
      settings: {
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        backgroundColor: 'transparent',
        backgroundImage: '',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        border: 'none',
        borderColor: '#dddddd',
        borderWidth: 0,
        borderRadius: 0,
      },
      columns: [{
        id: now + 2,
        label: 'Column 1',
        size: 12,
        settings: {
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          backgroundColor: 'transparent',
          backgroundImage: '',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          border: 'none',
          borderColor: '#cccccc',
          borderWidth: 0,
          borderRadius: 0,
        },
        components: [],
      }],
    }],
  }];
};

const pushComponentFromIr = (components, node) => {
  if (!node || node.kind !== IR_NODE_KIND.COMPONENT) return;

  const type = node.type;
  const comp = createComponentInstance(type);

  comp.id = Date.now() + Math.floor(Math.random() * 100000);
  comp.type = type;

  comp.settings = {
    ...(comp.settings || {}),
    ...(node.settings || {}),
  };

  if (type === COMPONENT_TYPES.HTML) {
    comp.htmlContent = node.props?.htmlContent || '';
    if (node.settings?.readOnly) {
      comp.readOnly = true;
    }
    return components.push(comp);
  }

  if (type === COMPONENT_TYPES.IMAGE) {
    comp.imageUrl = node.props?.imageUrl || '';
    comp.content = node.props?.alt || comp.content || '';
    if (node.props?.width) comp.settings.width = node.props.width;
    if (node.props?.height) comp.settings.height = node.props.height;
    return components.push(comp);
  }

  if (type === COMPONENT_TYPES.LINK) {
    comp.linkUrl = node.props?.linkUrl || '';
    comp.content = node.props?.text || '';
    return components.push(comp);
  }

  // Default text-bearing components
  if (typeof node.props?.text === 'string' && node.props.text.trim()) {
    comp.content = node.props.text;
  } else if (typeof node.text === 'string' && node.text.trim()) {
    comp.content = node.text;
  }

  return components.push(comp);
};

const walk = (node, components) => {
  if (!node) return;

  if (node.kind === IR_NODE_KIND.TEXT) {
    const comp = createComponentInstance(COMPONENT_TYPES.SPAN);
    comp.id = Date.now() + Math.floor(Math.random() * 100000);
    comp.type = COMPONENT_TYPES.SPAN;
    comp.content = node.text || '';
    components.push(comp);
    return;
  }

  if (node.kind === IR_NODE_KIND.COMPONENT) {
    pushComponentFromIr(components, node);
    // still walk children if any (for element-like components)
    (node.children || []).forEach((c) => walk(c, components));
    return;
  }

  // ELEMENT
  (node.children || []).forEach((c) => walk(c, components));
};

export const irToSections = (irDoc) => {
  const sections = makeSectionSkeleton();
  const components = sections[0].rows[0].columns[0].components;
  (irDoc?.nodes || []).forEach((n) => walk(n, components));
  return sections;
};
