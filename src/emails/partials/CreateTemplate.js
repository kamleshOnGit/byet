import React, { useEffect, useCallback } from 'react';
import { Box, Button, Heading, IconButton } from '@chakra-ui/react';
import { AddIcon, ArrowBackIcon, ArrowForwardIcon, EditIcon, SettingsIcon, ViewIcon } from '@chakra-ui/icons';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useLocation } from 'react-router-dom';
import EditorTabs from './EditorTabs';
import DroppableSection from './DroppableSection';
import { COMPONENT_TYPES } from './componentTypes';
import { DUMMY_IMAGE_URL, DUMMY_LINK_URL } from './componentRegistry';
import { useEditorStore } from '../editorStore';

const safeNumber = (value, fallback) => {
  const n = Number.parseInt(`${value}`.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
};

// Main CreateTemplate Component
const CreateTemplate = () => {
  const location = useLocation();
  const sections = useEditorStore((state) => state.sections);
  const selectedTarget = useEditorStore((state) => state.selectedTarget);
  const templateSettings = useEditorStore((state) => state.templateSettings);
  const isEditorView = useEditorStore((state) => state.isEditorView);
  const isBrowserView = useEditorStore((state) => state.isBrowserView);
  const historyPastLength = useEditorStore((state) => state.history.past.length);
  const historyFutureLength = useEditorStore((state) => state.history.future.length);
  const initializeEditor = useEditorStore((state) => state.initializeEditor);
  const setSelectedTarget = useEditorStore((state) => state.setSelectedTarget);
  const setEditorViewMode = useEditorStore((state) => state.setEditorViewMode);
  const updateTemplateSettings = useEditorStore((state) => state.updateTemplateSettings);
  const addSection = useEditorStore((state) => state.addSection);
  const handleTargetUpdate = useEditorStore((state) => state.updateTargetSettings);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const [htmlContent, setHtmlContent] = React.useState('<div>Write your HTML here</div>');

  const normalizeEditorCssValue = (value, fallback = '') => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'number') return `${value}px`;
    const raw = `${value}`.trim();
    if (/^\d+(?:\.\d+)?$/.test(raw)) return `${raw}px`;
    const sizeTokenMap = {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
    };
    return sizeTokenMap[raw] || raw || fallback;
  };

  useEffect(() => {
    const importedSections = location?.state?.importedSections;
    const importedTemplateSettings = location?.state?.importedTemplateSettings;
    initializeEditor({ importedSections, importedTemplateSettings });
  }, [initializeEditor, location?.state?.importedSections, location?.state?.importedTemplateSettings]);

  // Wrap syncEditorToHtml in useCallback to prevent it from changing on every render
  const syncEditorToHtml = useCallback(() => {
    const escapeHtml = (text) => {
      if (!text) return '';
      return `${text}`
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const safeNumber = (value, fallback) => {
      const n = Number.parseInt(`${value}`.replace(/[^0-9]/g, ''), 10);
      return Number.isFinite(n) ? n : fallback;
    };

    const sizeTokenMap = {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
    };

    const normalizeCssValue = (value, fallback = '') => {
      if (value === undefined || value === null || value === '') return fallback;
      if (typeof value === 'number') return `${value}px`;
      const raw = `${value}`.trim();
      return sizeTokenMap[raw] || raw || fallback;
    };

    const containerWidthPx = safeNumber(templateSettings.containerWidth, 600);
    const containerWidthValue = normalizeCssValue(templateSettings.containerWidth, `${containerWidthPx}px`);

    const makePaddingStyle = (padding) => {
      if (!padding) return '';
      const t = padding?.top ?? 0;
      const r = padding?.right ?? 0;
      const b = padding?.bottom ?? 0;
      const l = padding?.left ?? 0;
      if (!(t || r || b || l)) return '';
      return `padding:${t}px ${r}px ${b}px ${l}px;`;
    };

    const makeMarginStyle = (margin) => {
      if (!margin) return '';
      const t = margin?.top ?? 0;
      const r = margin?.right ?? 0;
      const b = margin?.bottom ?? 0;
      const l = margin?.left ?? 0;
      if (!(t || r || b || l)) return '';
      return `margin:${t}px ${r}px ${b}px ${l}px;`;
    };

    const makeBorderStyle = (s) => {
      if (!s || !s.border || s.border === 'none') return '';
      if (/\d/.test(`${s.border}`)) return `border:${s.border};`;
      const w = Number.isFinite(s.borderWidth) && s.borderWidth > 0 ? s.borderWidth : 1;
      return `border:${w}px ${s.border || 'solid'} ${s.borderColor || '#000000'};`;
    };

    const makeRadiusStyle = (s) => {
      const radius = normalizeCssValue(s?.borderRadius, '');
      return radius ? `border-radius:${radius};` : '';
    };

    const makeBackgroundStyle = (s) => {
      if (!s) return '';
      const parts = [];
      if (s.backgroundColor && s.backgroundColor !== 'transparent') {
        parts.push(`background-color:${s.backgroundColor};`);
      }
      if (s.backgroundImage) {
        parts.push(`background-image:url('${escapeHtml(s.backgroundImage)}');`);
        parts.push(`background-size:${normalizeCssValue(s.backgroundSize, 'cover')};`);
        parts.push(`background-position:${normalizeCssValue(s.backgroundPosition, 'center')};`);
        parts.push(`background-repeat:${normalizeCssValue(s.backgroundRepeat, 'no-repeat')};`);
      }
      return parts.join('');
    };

    const makeTextStyle = (s) => {
      if (!s) return '';
      const parts = [];
      if (s.textAlign) parts.push(`text-align:${s.textAlign};`);
      if (s.textColor) parts.push(`color:${s.textColor};`);
      if (s.fontFamily) parts.push(`font-family:${s.fontFamily};`);
      if (s.fontSize) parts.push(`font-size:${normalizeCssValue(s.fontSize)};`);
      if (s.fontWeight) parts.push(`font-weight:${s.fontWeight};`);
      if (s.fontStyle) parts.push(`font-style:${s.fontStyle};`);
      if (s.textDecoration) parts.push(`text-decoration:${s.textDecoration};`);
      if (s.textTransform) parts.push(`text-transform:${s.textTransform};`);
      if (s.lineHeight) parts.push(`line-height:${normalizeCssValue(s.lineHeight)};`);
      if (s.letterSpacing) parts.push(`letter-spacing:${normalizeCssValue(s.letterSpacing)};`);
      if (s.whiteSpace) parts.push(`white-space:${s.whiteSpace};`);
      if (s.wordBreak) parts.push(`word-break:${s.wordBreak};`);
      return parts.join('');
    };

    const makeDimensionStyle = (s) => {
      if (!s) return '';
      const parts = [];
      const width = normalizeCssValue(s.width, '');
      const height = normalizeCssValue(s.height, '');
      const minWidth = normalizeCssValue(s.minWidth, '');
      const maxWidth = normalizeCssValue(s.maxWidth, '');
      const minHeight = normalizeCssValue(s.minHeight, '');
      const maxHeight = normalizeCssValue(s.maxHeight, '');
      if (width) parts.push(`width:${width};`);
      if (height) parts.push(`height:${height};`);
      if (minWidth) parts.push(`min-width:${minWidth};`);
      if (maxWidth) parts.push(`max-width:${maxWidth};`);
      if (minHeight) parts.push(`min-height:${minHeight};`);
      if (maxHeight) parts.push(`max-height:${maxHeight};`);
      return parts.join('');
    };

    const makeLayoutStyle = (s, options = {}) => {
      const {
        includeDisplay = true,
        includeFloat = true,
        includeFlex = true,
      } = options;
      if (!s) return '';
      const parts = [];
      if (includeDisplay && s.display) parts.push(`display:${s.display};`);
      if (includeFloat && s.float) parts.push(`float:${s.float};`);
      if (includeFlex && s.alignSelf) parts.push(`align-self:${s.alignSelf};`);
      if (includeFlex && s.justifyContent) parts.push(`justify-content:${s.justifyContent};`);
      if (includeFlex && s.alignItems) parts.push(`align-items:${s.alignItems};`);
      if (includeFlex && s.flexDirection) parts.push(`flex-direction:${s.flexDirection};`);
      if (includeFlex && s.flexWrap) parts.push(`flex-wrap:${s.flexWrap};`);
      if (s.overflow) parts.push(`overflow:${s.overflow};`);
      if (s.opacity) parts.push(`opacity:${s.opacity};`);
      return parts.join('');
    };

    const makeBoxStyle = (s, options = {}) => {
      const {
        includePadding = true,
        includeMargin = false,
        includeText = true,
        includeBackground = true,
        includeDimensions = true,
        includeDisplay = true,
        includeFloat = true,
        includeFlex = true,
      } = options;
      const parts = [];
      if (includePadding) parts.push(makePaddingStyle(s?.padding));
      if (includeMargin) parts.push(makeMarginStyle(s?.margin));
      if (includeBackground) parts.push(makeBackgroundStyle(s));
      if (includeText) parts.push(makeTextStyle(s));
      if (includeDimensions) parts.push(makeDimensionStyle(s));
      parts.push(makeLayoutStyle(s, { includeDisplay, includeFloat, includeFlex }));
      parts.push(makeBorderStyle(s));
      parts.push(makeRadiusStyle(s));
      if (s?.boxSizing) parts.push(`box-sizing:${s.boxSizing};`);
      return parts.join('');
    };

    const makeSpacerTable = (height) => {
      const px = safeNumber(height, 0);
      if (px <= 0) return '';
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td height="${px}" style="font-size:${px}px;line-height:${px}px;">&nbsp;</td></tr></table>`;
    };

    const renderRichText = (text) => escapeHtml(text || '').replace(/\n/g, '<br />');

    const isFlexColumn = (s) => s?.display === 'flex' && (s?.flexDirection === 'column' || s?.flexDirection === 'column-reverse');

    const isFlexRow = (s) => s?.display === 'flex' && (!s?.flexDirection || s?.flexDirection === 'row' || s?.flexDirection === 'row-reverse');

    const resolveHorizontalAlign = (s) => {
      const horizontalSource = isFlexColumn(s) ? s?.alignItems : s?.justifyContent;
      if (horizontalSource === 'flex-end') return 'right';
      if (horizontalSource === 'center') return 'center';
      if (horizontalSource === 'space-between' || horizontalSource === 'space-around' || horizontalSource === 'space-evenly') return 'center';
      if (s?.textAlign === 'right') return 'right';
      if (s?.textAlign === 'center') return 'center';
      if (s?.alignItems === 'flex-end') return 'right';
      if (s?.alignItems === 'center') return 'center';
      return 'left';
    };

    const resolveVerticalAlign = (s) => {
      const verticalSource = isFlexColumn(s) ? s?.justifyContent : s?.alignItems;
      if (verticalSource === 'center') return 'middle';
      if (verticalSource === 'flex-end') return 'bottom';
      return 'top';
    };

    const makeFlexFallbackTableStyle = (s, blockStyle) => {
      const align = resolveHorizontalAlign(s);
      const parts = [blockStyle, 'border-collapse:collapse;', 'width:100%;'];
      if (s?.display === 'flex') parts.push('display:table;');
      if (align === 'center') parts.push('margin-left:auto;margin-right:auto;');
      if (align === 'right') parts.push('margin-left:auto;');
      return parts.join('');
    };

    const renderNavLikeLinks = (items, s, blockStyle, gapPx = 8) => {
      const align = resolveHorizontalAlign(s);
      const linkStyle = makeTextStyle({ ...s, textColor: s.textColor || '#333333', textDecoration: s.textDecoration || 'none' });
      const distributionSource = isFlexColumn(s) ? s?.alignItems : s?.justifyContent;
      const shouldDistribute = distributionSource === 'space-between' || distributionSource === 'space-around' || distributionSource === 'space-evenly';
      if (shouldDistribute && items.length > 1) {
        return `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${makeFlexFallbackTableStyle(s, blockStyle)}">
            <tr>
              ${items.map((item) => `<td align="center" style="padding:0 ${gapPx}px;"><a href="#" style="display:inline-block;${linkStyle}">${escapeHtml(item)}</a></td>`).join('')}
            </tr>
          </table>
        `;
      }
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${makeFlexFallbackTableStyle(s, blockStyle)}">
          <tr>
            <td align="${align}" style="text-align:${align};vertical-align:${resolveVerticalAlign(s)};">
              ${items.map((item, index) => `<a href="#" style="display:inline-block;padding:0 ${gapPx}px;${index === 0 ? '' : 'margin-left:0;'}${linkStyle}">${escapeHtml(item)}</a>`).join('')}
            </td>
          </tr>
        </table>
      `;
    };

    const renderAlignedTextBlock = (content, s, blockStyle) => {
      const align = resolveHorizontalAlign(s);
      const verticalAlign = resolveVerticalAlign(s);
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${makeFlexFallbackTableStyle(s, blockStyle)}">
          <tr>
            <td align="${align}" style="text-align:${align};vertical-align:${verticalAlign};${makeTextStyle(s)}">
              ${renderRichText(content)}
            </td>
          </tr>
        </table>
      `;
    };

    const renderBasicTextTag = (tagName, content, s, extraStyle = '') => {
      if (s?.display === 'flex') {
        return renderAlignedTextBlock(content, s, extraStyle);
      }
      return `<${tagName} style="margin:0;${makeTextStyle(s)}${extraStyle}">${renderRichText(content)}</${tagName}>`;
    };

    const renderComponent = (component) => {
      const s = component?.settings || {};
      const wrapperStyle = [
        makeBoxStyle(s, { includePadding: true, includeMargin: false, includeText: false, includeBackground: true, includeDimensions: true, includeDisplay: false, includeFloat: false, includeFlex: false }),
        'mso-line-height-rule:exactly;',
      ].join('');
      const safeBlockStyle = makeBoxStyle(s, { includeBackground: true, includePadding: true, includeBorder: true, includeRadius: true, includeDisplay: false, includeFloat: false, includeFlex: false });
      const spacerAfter = Number.isFinite(s?.margin?.bottom) ? s.margin.bottom : 0;

      const wrap = (inner) => `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
          <tr>
            <td>
              <div style="${wrapperStyle}">
                ${inner}
              </div>
            </td>
          </tr>
        </table>
        ${makeSpacerTable(spacerAfter)}
      `;

      switch (component.type) {
        case COMPONENT_TYPES.TEXT:
          return wrap(renderBasicTextTag('div', component.content, s));
        case COMPONENT_TYPES.HEADING:
        case COMPONENT_TYPES.HEADER_1:
          return wrap(renderBasicTextTag('h1', component.content, s, s.fontWeight ? '' : 'font-weight:700;'));
        case COMPONENT_TYPES.HEADER_2:
          return wrap(renderBasicTextTag('h2', component.content, s, s.fontWeight ? '' : 'font-weight:700;'));
        case COMPONENT_TYPES.HEADER_3:
          return wrap(renderBasicTextTag('h3', component.content, s, s.fontWeight ? '' : 'font-weight:700;'));
        case COMPONENT_TYPES.PARAGRAPH:
          return wrap(renderBasicTextTag('p', component.content, s));
        case COMPONENT_TYPES.ORDERED_LIST:
          return wrap(`<ol style="margin:0;padding-left:20px;${makeTextStyle(s)}${s.listStyleType ? `list-style-type:${escapeHtml(s.listStyleType)};` : ''}${s.listStylePosition ? `list-style-position:${escapeHtml(s.listStylePosition)};` : ''}">${(component.content || '').split('\n').filter(Boolean).map((item) => `<li>${renderRichText(item)}</li>`).join('')}</ol>`);
        case COMPONENT_TYPES.UNORDERED_LIST:
          return wrap(`<ul style="margin:0;padding-left:20px;${makeTextStyle(s)}${s.listStyleType ? `list-style-type:${escapeHtml(s.listStyleType)};` : ''}${s.listStylePosition ? `list-style-position:${escapeHtml(s.listStylePosition)};` : ''}">${(component.content || '').split('\n').filter(Boolean).map((item) => `<li>${renderRichText(item)}</li>`).join('')}</ul>`);
        case COMPONENT_TYPES.IMAGE: {
          const width = normalizeCssValue(s.width, '');
          const height = normalizeCssValue(s.height, '');
          const maxWidth = normalizeCssValue(s.maxWidth, '');
          const minWidth = normalizeCssValue(s.minWidth, '');
          const minHeight = normalizeCssValue(s.minHeight, '');
          const maxHeight = normalizeCssValue(s.maxHeight, '');
          const sizeStyle = `${width ? `width:${width};max-width:${width};` : `width:100%;max-width:${maxWidth || '100%'};`}${height ? `height:${height};` : 'height:auto;'}${minWidth ? `min-width:${minWidth};` : ''}${minHeight ? `min-height:${minHeight};` : ''}${maxHeight ? `max-height:${maxHeight};` : ''}display:block;${makeBorderStyle(s)}${makeRadiusStyle(s)}${makeBackgroundStyle(s)}box-sizing:border-box;`;
          return wrap(`<img src="${escapeHtml(component.imageUrl || DUMMY_IMAGE_URL)}" alt="${escapeHtml(component.content) || ''}" style="display:block;border:0;outline:none;text-decoration:none;${sizeStyle}" />`);
        }
        case COMPONENT_TYPES.LINK:
          return wrap(`<a href="${escapeHtml(component.linkUrl || DUMMY_LINK_URL)}" style="${s.display ? `display:${s.display};` : 'display:inline-block;'}${s.float ? `float:${s.float};` : ''}${makeTextStyle({ ...s, textColor: s.linkColor || s.textColor || '#0066cc', textDecoration: s.textDecoration || 'underline' })}">${renderRichText(component.content || 'Visit our placeholder')}</a>`);
        case COMPONENT_TYPES.BUTTON: {
          const buttonBg = s.buttonColor || s.backgroundColor || '#0066cc';
          const buttonText = s.buttonTextColor || s.textColor || '#ffffff';
          const buttonStyle = [
            s.display ? `display:${s.display};` : 'display:inline-block;',
            s.float ? `float:${s.float};` : '',
            makePaddingStyle(s.padding || { top: 10, right: 20, bottom: 10, left: 20 }),
            `background-color:${buttonBg};`,
            `color:${buttonText};`,
            makeTextStyle({ ...s, textColor: buttonText }),
            makeBorderStyle(s),
            makeRadiusStyle({ borderRadius: s.borderRadius || 4 }),
          ].join('');
          return wrap(`<a href="${escapeHtml(component.linkUrl || DUMMY_LINK_URL)}" target="_blank" style="${buttonStyle}">${renderRichText(component.content || 'Click Me')}</a>`);
        }
        case COMPONENT_TYPES.SOCIAL_LINK:
          return wrap(`<a href="${escapeHtml(component.linkUrl || DUMMY_LINK_URL)}" target="_blank" style="${s.display ? `display:${s.display};` : 'display:inline-block;'}${s.float ? `float:${s.float};` : ''}${makeTextStyle({ ...s, textColor: s.linkColor || s.textColor || '#0066cc', textDecoration: s.textDecoration || 'underline' })}">${renderRichText(component.content || 'Social Link')}</a>`);
        case COMPONENT_TYPES.SOCIAL_ICONS: {
          const urls = (component.socialUrls || '').split('\n').filter(Boolean);
          const icons = urls.map((url) => `<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;margin:0 4px;"><img src="https://dummyimage.com/32x32/cccccc/000000.png&text=S" alt="social" width="32" height="32" style="display:block;border:0;outline:none;" /></a>`).join('');
          return wrap(`<div style="${s.textAlign ? `text-align:${s.textAlign};` : ''}${safeBlockStyle}">${icons || '<span>Social Icons</span>'}</div>`);
        }
        case COMPONENT_TYPES.TABLE: {
          const tableRows = component.tableRows || [];
          if (tableRows.length > 0) {
            const tableSettings = component.settings || {};
            return wrap(`
              <table role="presentation" width="100%" cellspacing="${Number.parseInt(tableSettings.cellSpacing, 10) || 0}" cellpadding="${Number.parseInt(tableSettings.cellPadding, 10) || 0}" border="0" style="border-collapse:${escapeHtml(tableSettings.borderCollapse || 'collapse')};${safeBlockStyle}">
                ${tableRows.map((tableRow) => `
                  <tr style="${tableRow.settings?.height ? `height:${escapeHtml(tableRow.settings.height)};` : ''}${tableRow.settings?.backgroundColor && tableRow.settings.backgroundColor !== 'transparent' ? `background-color:${escapeHtml(tableRow.settings.backgroundColor)};` : ''}">
                    ${(tableRow.cells || []).map((cell) => `
                      <td colspan="${Math.max(1, Number.parseInt(cell.colSpan, 10) || 1)}" rowspan="${Math.max(1, Number.parseInt(cell.rowSpan, 10) || 1)}" style="width:${escapeHtml(cell.settings?.width || cell.width || `${Math.floor(100 / ((tableRow.cells || []).length || 1))}%`)};vertical-align:${escapeHtml(cell.settings?.verticalAlign || 'top')};padding:${Number.parseInt(tableSettings.cellPadding, 10) || 0}px;border:1px solid #e9d8fd;${cell.settings?.backgroundColor && cell.settings.backgroundColor !== 'transparent' ? `background-color:${escapeHtml(cell.settings.backgroundColor)};` : ''}${cell.settings?.height ? `height:${escapeHtml(cell.settings.height)};` : ''}">
                        ${(cell.components || []).map((nestedComponent) => renderComponent(nestedComponent)).join('') || '&nbsp;'}
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </table>
            `);
          }
          const rows = (component.tableData || '').split('\n').filter(Boolean).map((line) => line.split(','));
          return wrap(`
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;${safeBlockStyle}">
              ${rows.map((cells) => `<tr>${cells.map((cell) => `<td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(cell.trim())}</td>`).join('')}</tr>`).join('')}
            </table>
          `);
        }
        case COMPONENT_TYPES.HR:
          return wrap(`<div style="border-top:${Number.isFinite(s.borderWidth) && s.borderWidth > 0 ? s.borderWidth : 1}px ${s.border || 'solid'} ${s.borderColor || '#cccccc'};font-size:0;line-height:0;">&nbsp;</div>`);
        case COMPONENT_TYPES.VIDEO:
          return wrap(`<a href="${escapeHtml(component.videoUrl || DUMMY_LINK_URL)}" target="_blank"><img src="https://dummyimage.com/600x338/000000/ffffff.png&text=Video" alt="Video" style="display:block;max-width:100%;height:auto;border:0;" /></a>`);
        case COMPONENT_TYPES.SPACE:
          return makeSpacerTable(component.height || 20);
        case COMPONENT_TYPES.ICON:
          return wrap(`<div style="${makeTextStyle(s)}${s.textAlign ? `text-align:${s.textAlign};` : ''}${safeBlockStyle}font-size:${normalizeCssValue(s.fontSize, '24px')};">${escapeHtml(component.iconName) || '★'}</div>`);
        case COMPONENT_TYPES.HTML:
          return wrap(component.htmlContent || '');
        case COMPONENT_TYPES.MENU: {
          const items = (component.menuItems || component.content || '').split('\n').filter(Boolean);
          return wrap(renderNavLikeLinks(items, s, safeBlockStyle, 8));
        }
        case COMPONENT_TYPES.DIV:
          return wrap(renderBasicTextTag('div', component.content, s, safeBlockStyle));
        case COMPONENT_TYPES.SPAN:
          return wrap(renderBasicTextTag('span', component.content, s, safeBlockStyle));
        case COMPONENT_TYPES.NAV: {
          const items = (component.content || '').split('\n').filter(Boolean);
          return wrap(items.length ? renderNavLikeLinks(items, s, safeBlockStyle, 10) : renderAlignedTextBlock('Navigation', s, safeBlockStyle));
        }
        case COMPONENT_TYPES.HEADER:
        case COMPONENT_TYPES.FOOTER:
        case COMPONENT_TYPES.SIDEBAR:
        case COMPONENT_TYPES.BANNER:
          return wrap(renderAlignedTextBlock(component.content, s, safeBlockStyle));
        default:
          return wrap(renderBasicTextTag('div', component.content, s));
      }
    };

    const makeColumnTdStyle = (column) => {
      const s = column?.settings || {};
      return `${makeBoxStyle(s, { includePadding: true, includeMargin: false, includeText: true, includeBackground: true, includeDimensions: true, includeDisplay: false, includeFloat: false, includeFlex: false })}vertical-align:top;`;
    };

    const makeRowCellStyle = (row) => {
      const s = row?.settings || {};
      return `${makeBoxStyle(s, { includePadding: true, includeMargin: false, includeText: true, includeBackground: true, includeDimensions: true, includeDisplay: false, includeFloat: false, includeFlex: false })}vertical-align:top;`;
    };

    const bodyVisualStyle = makeBackgroundStyle({
      backgroundColor: templateSettings.bodyBackgroundColor,
      backgroundImage: templateSettings.bodyBackgroundImage,
      backgroundSize: templateSettings.bodyBackgroundSize,
      backgroundPosition: templateSettings.bodyBackgroundPosition,
      backgroundRepeat: templateSettings.bodyBackgroundRepeat,
    });
    const templateTypographyStyle = makeTextStyle(templateSettings);
    const containerStyle = [
      `width:100%;max-width:${containerWidthValue};`,
      templateSettings.containerBackgroundColor && templateSettings.containerBackgroundColor !== 'transparent' ? `background-color:${templateSettings.containerBackgroundColor};` : '',
      templateSettings.containerPadding ? `padding:${templateSettings.containerPadding};` : '',
      templateSettings.containerMinHeight && templateSettings.containerMinHeight !== 'auto' ? `min-height:${templateSettings.containerMinHeight};` : '',
      templateTypographyStyle,
    ].join('');

    const html = `
      <!doctype html>
      <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta name="x-apple-disable-message-reformatting" />
          <title>Email</title>
          <!--[if mso]>
            <xml>
              <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          <![endif]-->
          <style>
            table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
            a { text-decoration: none; }
            @media only screen and (max-width: 480px) {
              .container { width: 100% !important; }
              .stack-column,
              .stack-column-cell { display: block !important; width: 100% !important; max-width: 100% !important; }
              .mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
            }
          </style>
        </head>
        <body style="margin:0;padding:0;${bodyVisualStyle}${templateTypographyStyle}">
          <center style="width:100%;${bodyVisualStyle}${templateTypographyStyle}">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${bodyVisualStyle}">
              <tr>
                <td align="center" style="padding:0;" class="mobile-padding">
                  <!--[if mso]>
                    <table role="presentation" width="${containerWidthPx}" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td>
                  <![endif]-->
                  <table role="presentation" width="${containerWidthPx}" cellspacing="0" cellpadding="0" border="0" class="container" style="${containerStyle}">
                    <tr>
                      <td style="vertical-align:top;">
                        ${sections
                          .map((section) => {
                            const rows = section.rows || [];
                            return rows
                              .map((row) => {
                                const columns = row.columns || [];
                                const rowCellStyle = makeRowCellStyle(row);
                                const rowSpacer = Number.isFinite(row?.settings?.margin?.bottom) ? row.settings.margin.bottom : 0;
                                const rowInner = `
                                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;table-layout:fixed;width:100%;">
                                    <tr>
                                      <td style="${rowCellStyle}">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;table-layout:fixed;width:100%;">
                                          <tr>
                                            ${columns
                                              .map((column) => {
                                                const widthPct = Math.round(((column.size || 12) / 12) * 100);
                                                const tdStyle = makeColumnTdStyle(column);
                                                const content = (column.components || []).map((c) => renderComponent(c)).join('');
                                                return `
                                                  <td class="stack-column-cell" width="${widthPct}%" style="width:${widthPct}%;max-width:${widthPct}%;${tdStyle}">
                                                    ${content}
                                                  </td>
                                                `;
                                              })
                                              .join('')}
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  ${makeSpacerTable(rowSpacer)}
                                `;
                                return rowInner;
                              })
                              .join('');
                          })
                          .join('')}
                      </td>
                    </tr>
                  </table>
                  <!--[if mso]>
                        </td>
                      </tr>
                    </table>
                  <![endif]-->
                </td>
              </tr>
            </table>
          </center>
        </body>
      </html>
    `;

    setHtmlContent(html);
  }, [sections, templateSettings]);

  useEffect(() => {
    console.log('Sections updated, syncing HTML...'); // Log when sections are updated
    syncEditorToHtml();
  }, [sections, syncEditorToHtml]);

  // Ensure proper synchronization and rendering in browser view
  useEffect(() => {
    // Only sync when sections change or when switching to browser view
    if (isBrowserView) {
      syncEditorToHtml();
    }
  }, [sections, isBrowserView, syncEditorToHtml]);

  useEffect(() => {
    // Ensure editor view syncs only when toggled
    if (isEditorView) {
      syncEditorToHtml();
    }
  }, [isEditorView, syncEditorToHtml]);

  // Generate initial HTML content immediately after initializing sections
  useEffect(() => {
    syncEditorToHtml();
  }, [syncEditorToHtml]);

  // Debugging: Log the generated HTML content
  useEffect(() => {
    console.log("Generated HTML Content:", htmlContent);
  }, [htmlContent]);

  // Define handleSaveTemplate to save template state to localStorage and download the generated HTML as an .html file
  const handleSaveTemplate = () => {
    try {
      const payload = {
        sections,
        templateSettings,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem('byet.emailTemplate', JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save template to localStorage:', e);
    }

    try {
      const blob = new Blob([htmlContent || ''], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-template-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download HTML:', e);
    }
  };

  const editorBodyStyle = {
    backgroundColor: templateSettings.bodyBackgroundColor || 'transparent',
    backgroundImage: templateSettings.bodyBackgroundImage ? `url('${templateSettings.bodyBackgroundImage}')` : undefined,
    backgroundSize: templateSettings.bodyBackgroundSize || undefined,
    backgroundPosition: templateSettings.bodyBackgroundPosition || undefined,
    backgroundRepeat: templateSettings.bodyBackgroundRepeat || undefined,
    color: templateSettings.textColor || undefined,
    fontFamily: templateSettings.fontFamily || undefined,
    fontSize: normalizeEditorCssValue(templateSettings.fontSize) || undefined,
    fontWeight: templateSettings.fontWeight || undefined,
    lineHeight: normalizeEditorCssValue(templateSettings.lineHeight) || undefined,
    minHeight: '100%',
    padding: '24px',
  };

  const containerWidthPxForEditor = safeNumber(templateSettings.containerWidth, 600);
  const editorCanvasMaxWidth = `${Math.min(containerWidthPxForEditor + 320, 1200)}px`;

  const editorContainerStyle = {
    width: '100%',
    maxWidth: editorCanvasMaxWidth,
    minHeight: templateSettings.containerMinHeight && templateSettings.containerMinHeight !== 'auto'
      ? templateSettings.containerMinHeight
      : undefined,
    padding: templateSettings.containerPadding || '0px',
    backgroundColor: templateSettings.containerBackgroundColor && templateSettings.containerBackgroundColor !== 'transparent'
      ? templateSettings.containerBackgroundColor
      : 'transparent',
    margin: '0 auto',
    boxSizing: 'border-box',
    overflowX: 'hidden',
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Box display="flex" flexDirection="column" h="100vh">
        <Box flex="1" display="flex" overflow="hidden">
          {/* Left: Email Preview Area */}
          {isEditorView ? (
            <Box flex="5" p={4} bg="gray.50" overflowY="auto">
              <Heading size="lg" mb={4}>
                Editor View
              </Heading>
              <Box style={editorBodyStyle} border="1px solid #ddd" borderRadius="8px">
                <Box style={editorContainerStyle}>
                  {sections.map((section) => (
                    <DroppableSection
                      key={section.id}
                      section={section}
                      syncEditorToHtml={syncEditorToHtml} // Pass syncEditorToHtml explicitly
                      onSelect={setSelectedTarget}
                      selectedTarget={selectedTarget}
                    />
                  ))}
                </Box>
              </Box>
              <IconButton
                onClick={addSection}
                colorScheme="green"
                size="xs" // Made icon smaller
                icon={<AddIcon />}
              />
            </Box>
          ) : isBrowserView ? (
            <Box flex="5" p={4} bg="gray.200" borderLeftWidth="1px" overflow="hidden">
              <Heading size="lg" mb={4}>
                Browser View
              </Heading>
              <Box
                style={{ padding: '16px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', height: 'calc(100% - 60px)' }}
              >
                <iframe
                  title="email-preview"
                  srcDoc={htmlContent}
                  sandbox="allow-same-origin"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </Box>
            </Box>
          ) : (
            <Box flex="3" p={4} bg="gray.100" overflow="hidden">
              <Heading size="lg" mb={4}>
                Code Preview
              </Heading>
              <Box
                as="pre"
                p={4}
                bg="white"
                border="1px solid #ddd"
                borderRadius="8px"
                overflow="auto"
                maxHeight="400px"
              >
                {JSON.stringify(sections, null, 2)}
              </Box>
            </Box>
          )}

          {/* Right: Editor Tabs */}
          <Box w="20%" p={0} bg="white" borderLeftWidth="1px" minHeight="400px" boxShadow="md" h="100%" overflow="hidden" flexShrink={0}>
            <EditorTabs 
              selectedTarget={selectedTarget}
              onTargetUpdate={handleTargetUpdate}
              templateSettings={templateSettings}
              onTemplateSettingsChange={updateTemplateSettings}
            />
          </Box>
        </Box>

        {/* Bottom: Save Button */}
        <Box p={4} bg="gray.200" borderTopWidth="1px" textAlign="center">
          <Button onClick={handleSaveTemplate} colorScheme="blue" p={3} rounded="md" ml={4}>
            Save Template
          </Button>
        </Box>

        {/* Top Center: Editor and Preview Buttons */}
        <Box position="absolute" top="4" left="50%" transform="translateX(-50%)" display="flex" gap="4">
          <IconButton
            icon={<ArrowBackIcon />}
            colorScheme={historyPastLength > 0 ? 'orange' : 'gray'}
            onClick={undo}
            aria-label="Undo"
            isDisabled={historyPastLength === 0}
          />
          <IconButton
            icon={<ArrowForwardIcon />}
            colorScheme={historyFutureLength > 0 ? 'orange' : 'gray'}
            onClick={redo}
            aria-label="Redo"
            isDisabled={historyFutureLength === 0}
          />
          <IconButton
            icon={<EditIcon />} // Icon for editor
            colorScheme={isEditorView ? "blue" : "gray"}
            onClick={() => { setEditorViewMode('editor'); }} // Toggle to editor view
            aria-label="Editor"
          />
          <IconButton
            icon={<SettingsIcon />} // Icon for code preview
            colorScheme={!isEditorView && !isBrowserView ? "green" : "gray"}
            onClick={() => { setEditorViewMode('code'); }} // Toggle to code preview
            aria-label="Code Preview"
          />
          <IconButton
            icon={<ViewIcon />} // Icon for browser view
            colorScheme={isBrowserView ? "purple" : "gray"}
            onClick={() => { setEditorViewMode('browser'); }} // Toggle to browser view
            aria-label="Browser View"
          />
        </Box>
      </Box>
    </DndProvider>
  );
};

export default CreateTemplate;
