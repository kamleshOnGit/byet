import { COMPONENT_TYPES } from './componentTypes';

export const COMPONENT_LIBRARY = [
  {
    type: COMPONENT_TYPES.TEXT,
    title: 'Text Block',
    defaults: { content: 'Default Text' },
  },
  {
    type: COMPONENT_TYPES.HEADING,
    title: 'Heading',
    defaults: { content: 'Default Heading' },
  },
  {
    type: COMPONENT_TYPES.PARAGRAPH,
    title: 'Paragraph',
    defaults: { content: 'Default Paragraph' },
  },
  {
    type: COMPONENT_TYPES.HEADER_1,
    title: 'Header 1',
    defaults: { content: 'Header 1' },
  },
  {
    type: COMPONENT_TYPES.HEADER_2,
    title: 'Header 2',
    defaults: { content: 'Header 2' },
  },
  {
    type: COMPONENT_TYPES.HEADER_3,
    title: 'Header 3',
    defaults: { content: 'Header 3' },
  },
  {
    type: COMPONENT_TYPES.ORDERED_LIST,
    title: 'Ordered List',
    defaults: { content: '1. Item 1\n2. Item 2' },
  },
  {
    type: COMPONENT_TYPES.UNORDERED_LIST,
    title: 'Unordered List',
    defaults: { content: '- Item 1\n- Item 2' },
  },
  {
    type: COMPONENT_TYPES.IMAGE,
    title: 'Image',
    defaults: {
      content: 'Default Image',
      imageUrl: 'https://dummyimage.com/100x50/cccccc/000000.png',
    },
  },
  {
    type: COMPONENT_TYPES.BUTTON,
    title: 'Button',
    defaults: {
      content: 'Click Me',
      linkUrl: 'https://example.com',
    },
  },
  {
    type: COMPONENT_TYPES.LINK,
    title: 'Link',
    defaults: {
      content: 'Default Link',
      linkUrl: 'https://example.com',
    },
  },
  {
    type: COMPONENT_TYPES.SOCIAL_LINK,
    title: 'Social Link',
    defaults: {
      content: 'Facebook',
      linkUrl: 'https://example.com',
    },
  },
  {
    type: COMPONENT_TYPES.SOCIAL_ICONS,
    title: 'Social Icons',
    defaults: {
      socialUrls: 'https://facebook.com\nhttps://twitter.com\nhttps://instagram.com',
    },
  },
  {
    type: COMPONENT_TYPES.HR,
    title: 'Horizontal Rule',
    defaults: { content: '' },
  },
  {
    type: COMPONENT_TYPES.VIDEO,
    title: 'Video',
    defaults: { videoUrl: 'https://example.com/video.mp4', content: 'Default Video' },
  },
  {
    type: COMPONENT_TYPES.TABLE,
    title: 'Table',
    defaults: {
      tableData: 'Header 1,Header 2,Header 3\nRow 1 Col 1,Row 1 Col 2,Row 1 Col 3\nRow 2 Col 1,Row 2 Col 2,Row 2 Col 3',
      content: '',
    },
  },
  {
    type: COMPONENT_TYPES.SPACE,
    title: 'Space',
    defaults: { height: 20, content: '' },
  },
  {
    type: COMPONENT_TYPES.ICON,
    title: 'Icon',
    defaults: { iconName: 'star', content: '' },
  },
  {
    type: COMPONENT_TYPES.HTML,
    title: 'HTML',
    defaults: { htmlContent: '<div>Custom HTML content</div>', content: '' },
  },
  {
    type: COMPONENT_TYPES.MENU,
    title: 'Menu',
    defaults: { menuItems: 'Home\nAbout\nServices\nContact', content: '' },
  },
  {
    type: COMPONENT_TYPES.DIV,
    title: 'Div',
    defaults: { content: 'This is a div block' },
  },
  {
    type: COMPONENT_TYPES.SPAN,
    title: 'Span',
    defaults: { content: 'This is a span element' },
  },
  {
    type: COMPONENT_TYPES.NAV,
    title: 'Navbar',
    defaults: { content: 'Home\nAbout\nServices\nContact' },
  },
  {
    type: COMPONENT_TYPES.HEADER,
    title: 'Header',
    defaults: { content: '' },
  },
  {
    type: COMPONENT_TYPES.FOOTER,
    title: 'Footer',
    defaults: { content: '' },
  },
  {
    type: COMPONENT_TYPES.SIDEBAR,
    title: 'Sidebar',
    defaults: { content: '' },
  },
  {
    type: COMPONENT_TYPES.BANNER,
    title: 'Banner/Hero',
    defaults: { content: '' },
  },
];

const defaultSettings = {
  padding: { top: 10, right: 10, bottom: 10, left: 10 },
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  fontSize: 'md',
  fontWeight: 'normal',
  textAlign: 'left',
  textColor: '#000000',
  backgroundColor: '#ffffff',
  backgroundImage: '',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  width: '100%',
  height: 'auto',
  border: 'none',
  borderColor: '#000000',
  borderWidth: 0,
  borderRadius: 0,
  boxSizing: 'border-box',
  letterSpacing: 'normal',
  lineHeight: 'normal',
};

export const createComponentInstance = (componentType) => {
  const def = COMPONENT_LIBRARY.find((d) => d.type === componentType);
  const now = Date.now();

  const base = {
    id: now + Math.floor(Math.random() * 100000),
    type: componentType,
    content: '',
    imageUrl: '',
    linkUrl: '',
    socialUrls: '',
    videoUrl: '',
    tableData: '',
    height: 0,
    iconName: '',
    htmlContent: '',
    menuItems: '',
    settings: { ...defaultSettings },
  };

  if (!def) return base;

  const defaults = def.defaults || {};

  return {
    ...base,
    ...defaults,
    settings: {
      ...(base.settings || {}),
      ...(defaults.settings || {}),
    },
  };
};
