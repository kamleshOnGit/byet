import { COMPONENT_TYPES } from '../partials/componentTypes';

export const IR_NODE_KIND = {
  ELEMENT: 'element',
  TEXT: 'text',
  COMPONENT: 'component',
};

export const createIrId = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

export const TAG_TO_COMPONENT_TYPE = {
  img: COMPONENT_TYPES.IMAGE,
  a: COMPONENT_TYPES.LINK,
  span: COMPONENT_TYPES.SPAN,
  div: COMPONENT_TYPES.DIV,
  p: COMPONENT_TYPES.PARAGRAPH,
  h1: COMPONENT_TYPES.HEADER_1,
  h2: COMPONENT_TYPES.HEADER_2,
  h3: COMPONENT_TYPES.HEADER_3,
  hr: COMPONENT_TYPES.HR,
  ul: COMPONENT_TYPES.UNORDERED_LIST,
  ol: COMPONENT_TYPES.ORDERED_LIST,
  nav: COMPONENT_TYPES.NAV,
  header: COMPONENT_TYPES.HEADER,
  footer: COMPONENT_TYPES.FOOTER,
  aside: COMPONENT_TYPES.SIDEBAR,
};

export const DEFAULT_IR_DOCUMENT = () => ({
  version: 1,
  kind: 'document',
  id: createIrId(),
  meta: {
    title: '',
  },
  nodes: [],
});
