import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Heading, IconButton } from '@chakra-ui/react';
import { AddIcon, EditIcon, SettingsIcon, ViewIcon } from '@chakra-ui/icons';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useLocation } from 'react-router-dom';
import EditorTabs from './EditorTabs';
import DroppableSection from './DroppableSection';
import { COMPONENT_TYPES } from './componentTypes';

const initialSections = () => [
  {
    id: Date.now(),
    rows: [
      {
        id: Date.now() + 1,
        settings: {
          padding: { top: 10, right: 10, bottom: 10, left: 10 },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          backgroundColor: '#ffffff',
          border: 'none',
          borderColor: '#dddddd',
        },
        columns: [
          {
            id: Date.now() + 2,
            label: 'Column 1',
            size: 6,
            settings: {
              padding: { top: 10, right: 10, bottom: 10, left: 10 },
              margin: { top: 0, right: 0, bottom: 0, left: 0 },
              backgroundColor: '#ffffff',
              border: 'none',
              borderColor: '#cccccc',
            },
            components: [
              {
                id: Date.now() + 4,
                type: COMPONENT_TYPES.TEXT,
                content: 'Welcome to the Email Editor!',
                settings: {
                  padding: { top: 10, right: 10, bottom: 10, left: 10 },
                  margin: { top: 0, right: 0, bottom: 0, left: 0 },
                  fontSize: 'md',
                  fontWeight: 'normal',
                  textAlign: 'left',
                  textColor: '#000000',
                  backgroundColor: '#ffffff',
                  border: 'none',
                },
              },
            ],
          },
          {
            id: Date.now() + 3,
            label: 'Column 2',
            size: 6,
            settings: {
              padding: { top: 10, right: 10, bottom: 10, left: 10 },
              margin: { top: 0, right: 0, bottom: 0, left: 0 },
              backgroundColor: '#ffffff',
              border: 'none',
              borderColor: '#cccccc',
            },
            components: [
              {
                id: Date.now() + 5,
                type: COMPONENT_TYPES.BUTTON,
                content: 'Click Me',
                settings: {
                  padding: { top: 10, right: 20, bottom: 10, left: 20 },
                  margin: { top: 0, right: 0, bottom: 0, left: 0 },
                  fontSize: 'md',
                  fontWeight: 'normal',
                  textAlign: 'center',
                  textColor: '#ffffff',
                  backgroundColor: '#0066cc',
                  width: 'auto',
                  height: 'auto',
                  border: 'none',
                  borderRadius: 4,
                  buttonColor: '#0066cc',
                  buttonTextColor: '#ffffff',
                },
              },
            ],
          },
        ],
      },
    ],
  },
];

const safeNumber = (value, fallback) => {
  const n = Number.parseInt(`${value}`.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
};

const locateTarget = (sections, target) => {
  if (!target) return null;
  const { kind, id } = target;
  for (const section of sections) {
    for (const row of section.rows) {
      if (kind === 'row' && row.id === id) {
        return { ...target, sectionId: section.id, data: row };
      }
      for (const column of row.columns) {
        if (kind === 'column' && column.id === id) {
          return { ...target, sectionId: section.id, rowId: row.id, data: column };
        }
        if (kind === 'component') {
          const found = column.components.find((comp) => comp.id === id);
          if (found) {
            return {
              ...target,
              sectionId: section.id,
              rowId: row.id,
              columnId: column.id,
              data: found,
            };
          }
        }
      }
    }
  }
  return null;
};

const getInitialComponentTarget = (sections) => {
  const section = sections[0];
  const row = section?.rows?.[0];
  const column = row?.columns?.[0];
  const component = column?.components?.[0];
  if (!component) return null;
  return {
    kind: 'component',
    id: component.id,
    sectionId: section.id,
    rowId: row.id,
    columnId: column.id,
    data: component,
  };
};

// Main CreateTemplate Component
const CreateTemplate = () => {
  const location = useLocation();
  const [sections, setSections] = useState(initialSections());
  const [selectedTarget, setSelectedTarget] = useState(() => getInitialComponentTarget(sections));

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

  const [templateSettings, setTemplateSettings] = useState({
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    fontWeight: 'normal',
    lineHeight: '1.5',
    textColor: '#000000',
    bodyBackgroundColor: '#f5f5f5',
    bodyBackgroundImage: '',
    bodyBackgroundSize: 'cover',
    bodyBackgroundPosition: 'center',
    bodyBackgroundRepeat: 'no-repeat',
    containerBackgroundColor: '#ffffff',
    containerWidth: '600px',
    containerMinHeight: 'auto',
    containerPadding: '20px',
  });

  // Add state to toggle between Editor View and Code Preview
  const [isEditorView, setIsEditorView] = useState(true);
  // Add state for HTML content and browser view toggle
  const [htmlContent, setHtmlContent] = useState('<div>Write your HTML here</div>');
  const [isBrowserView, setIsBrowserView] = useState(false);

  useEffect(() => {
    const importedSections = location?.state?.importedSections;
    const importedTemplateSettings = location?.state?.importedTemplateSettings;
    if (!importedSections) return;

    setSections(importedSections);
    if (importedTemplateSettings) {
      setTemplateSettings((prev) => ({
        ...prev,
        ...importedTemplateSettings,
      }));
    }
    setSelectedTarget(getInitialComponentTarget(importedSections));
    setIsEditorView(true);
    setIsBrowserView(false);
  }, [location?.state?.importedSections, location?.state?.importedTemplateSettings]);

  // Ensure updateSections is defined in the correct scope
  const updateSections = (updater) => {
    setSections((prevSections) => {
      const updatedSections = updater(prevSections);
      syncEditorToHtml(); // Generate HTML after updating sections
      return updatedSections;
    });
  };

  const addSection = () => {
    const newSection = {
      id: Date.now(),
      rows: [
        {
          id: Date.now() + 1,
          columns: [
            { id: Date.now() + 2, label: 'Column 1', size: 4, components: [] },
            { id: Date.now() + 3, label: 'Column 2', size: 4, components: [] },
          ],
        },
      ],
    };
    updateSections((prev) => [...prev, newSection]);
  };

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
      if (s.lineHeight) parts.push(`line-height:${normalizeCssValue(s.lineHeight)};`);
      if (s.letterSpacing) parts.push(`letter-spacing:${normalizeCssValue(s.letterSpacing)};`);
      return parts.join('');
    };

    const makeDimensionStyle = (s) => {
      if (!s) return '';
      const parts = [];
      const width = normalizeCssValue(s.width, '');
      const height = normalizeCssValue(s.height, '');
      if (width) parts.push(`width:${width};`);
      if (height) parts.push(`height:${height};`);
      return parts.join('');
    };

    const makeBoxStyle = (s, options = {}) => {
      const {
        includePadding = true,
        includeMargin = false,
        includeText = true,
        includeBackground = true,
        includeDimensions = true,
      } = options;
      const parts = [];
      if (includePadding) parts.push(makePaddingStyle(s?.padding));
      if (includeMargin) parts.push(makeMarginStyle(s?.margin));
      if (includeBackground) parts.push(makeBackgroundStyle(s));
      if (includeText) parts.push(makeTextStyle(s));
      if (includeDimensions) parts.push(makeDimensionStyle(s));
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

    const renderComponent = (component) => {
      const s = component?.settings || {};
      const wrapperStyle = [
        makeBoxStyle(s, { includePadding: true, includeMargin: false, includeText: true, includeBackground: true, includeDimensions: true }),
        'mso-line-height-rule:exactly;',
      ].join('');
      const spacerAfter = Number.isFinite(s?.margin?.bottom) ? s.margin.bottom : 0;

      const wrap = (inner) => `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
          <tr>
            <td style="${wrapperStyle}">
              ${inner}
            </td>
          </tr>
        </table>
        ${makeSpacerTable(spacerAfter)}
      `;

      switch (component.type) {
        case COMPONENT_TYPES.TEXT:
          return wrap(`<div style="margin:0;${makeTextStyle(s)}">${renderRichText(component.content)}</div>`);
        case COMPONENT_TYPES.HEADING:
        case COMPONENT_TYPES.HEADER_1:
          return wrap(`<h1 style="margin:0;${makeTextStyle(s)}${s.fontWeight ? '' : 'font-weight:700;'}">${renderRichText(component.content)}</h1>`);
        case COMPONENT_TYPES.HEADER_2:
          return wrap(`<h2 style="margin:0;${makeTextStyle(s)}${s.fontWeight ? '' : 'font-weight:700;'}">${renderRichText(component.content)}</h2>`);
        case COMPONENT_TYPES.HEADER_3:
          return wrap(`<h3 style="margin:0;${makeTextStyle(s)}${s.fontWeight ? '' : 'font-weight:700;'}">${renderRichText(component.content)}</h3>`);
        case COMPONENT_TYPES.PARAGRAPH:
          return wrap(`<p style="margin:0;${makeTextStyle(s)}">${renderRichText(component.content)}</p>`);
        case COMPONENT_TYPES.ORDERED_LIST:
          return wrap(`<ol style="margin:0;padding-left:20px;${makeTextStyle(s)}${s.listStyleType ? `list-style-type:${escapeHtml(s.listStyleType)};` : ''}">${(component.content || '').split('\n').filter(Boolean).map((item) => `<li>${renderRichText(item)}</li>`).join('')}</ol>`);
        case COMPONENT_TYPES.UNORDERED_LIST:
          return wrap(`<ul style="margin:0;padding-left:20px;${makeTextStyle(s)}${s.listStyleType ? `list-style-type:${escapeHtml(s.listStyleType)};` : ''}">${(component.content || '').split('\n').filter(Boolean).map((item) => `<li>${renderRichText(item)}</li>`).join('')}</ul>`);
        case COMPONENT_TYPES.IMAGE: {
          const width = normalizeCssValue(s.width || component.imageWidth, '');
          const height = normalizeCssValue(s.height || component.imageHeight, '');
          const sizeStyle = `${width ? `width:${width};max-width:${width};` : 'max-width:100%;width:auto;'}${height ? `height:${height};` : 'height:auto;'}`;
          return wrap(`<img src="${escapeHtml(component.imageUrl) || ''}" alt="${escapeHtml(component.content) || ''}" style="display:block;border:0;outline:none;text-decoration:none;${sizeStyle}" />`);
        }
        case COMPONENT_TYPES.LINK:
          return wrap(`<a href="${escapeHtml(component.linkUrl) || '#'}" style="display:inline-block;${makeTextStyle({ ...s, textColor: s.linkColor || s.textColor || '#0066cc' })}text-decoration:underline;">${renderRichText(component.content)}</a>`);
        case COMPONENT_TYPES.BUTTON: {
          const buttonBg = s.buttonColor || s.backgroundColor || '#0066cc';
          const buttonText = s.buttonTextColor || s.textColor || '#ffffff';
          const buttonStyle = [
            'display:inline-block;',
            makePaddingStyle(s.padding || { top: 10, right: 20, bottom: 10, left: 20 }),
            `background-color:${buttonBg};`,
            `color:${buttonText};`,
            makeTextStyle({ ...s, textColor: buttonText }),
            makeBorderStyle(s),
            makeRadiusStyle({ borderRadius: s.borderRadius || 4 }),
          ].join('');
          return wrap(`<a href="${escapeHtml(component.linkUrl) || '#'}" target="_blank" style="${buttonStyle}">${renderRichText(component.content || 'Click Me')}</a>`);
        }
        case COMPONENT_TYPES.SOCIAL_LINK:
          return wrap(`<a href="${escapeHtml(component.linkUrl) || '#'}" target="_blank" style="display:inline-block;${makeTextStyle({ ...s, textColor: s.linkColor || s.textColor || '#0066cc' })}text-decoration:underline;">${renderRichText(component.content || 'Social Link')}</a>`);
        case COMPONENT_TYPES.SOCIAL_ICONS: {
          const urls = (component.socialUrls || '').split('\n').filter(Boolean);
          const icons = urls.map((url) => `<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;margin:0 4px;"><img src="https://dummyimage.com/32x32/cccccc/000000.png&text=S" alt="social" width="32" height="32" style="display:block;border:0;outline:none;" /></a>`).join('');
          return wrap(`<div style="text-align:${s.textAlign || 'center'};">${icons || '<span>Social Icons</span>'}</div>`);
        }
        case COMPONENT_TYPES.HR:
          return wrap(`<div style="border-top:1px solid ${s.borderColor || '#cccccc'};font-size:0;line-height:0;">&nbsp;</div>`);
        case COMPONENT_TYPES.VIDEO:
          return wrap(`<a href="${escapeHtml(component.videoUrl) || '#'}" target="_blank"><img src="https://dummyimage.com/600x338/000000/ffffff.png&text=Video" alt="Video" style="display:block;max-width:100%;height:auto;border:0;" /></a>`);
        case COMPONENT_TYPES.SPACE:
          return makeSpacerTable(component.height || 20);
        case COMPONENT_TYPES.ICON:
          return wrap(`<div style="${makeTextStyle(s)}text-align:${s.textAlign || 'center'};font-size:${normalizeCssValue(s.fontSize, '24px')};">${escapeHtml(component.iconName) || '★'}</div>`);
        case COMPONENT_TYPES.HTML:
          return wrap(component.htmlContent || '');
        case COMPONENT_TYPES.MENU: {
          const items = (component.menuItems || component.content || '').split('\n').filter(Boolean);
          const links = items.map((item) => `<a href="#" style="display:inline-block;padding:0 8px;${makeTextStyle({ ...s, textColor: s.textColor || '#333333' })}text-decoration:none;">${escapeHtml(item)}</a>`).join('');
          return wrap(`<div style="text-align:${s.textAlign || 'center'};">${links}</div>`);
        }
        case COMPONENT_TYPES.DIV:
          return wrap(`<div style="margin:0;${makeTextStyle(s)}${makeBoxStyle(s, { includeBackground: true, includePadding: true, includeBorder: true, includeRadius: true })}">${renderRichText(component.content)}</div>`);
        case COMPONENT_TYPES.SPAN:
          return wrap(`<span style="${makeTextStyle(s)}${makeBoxStyle(s, { includeBackground: true, includePadding: true, includeBorder: true, includeRadius: true })}">${renderRichText(component.content)}</span>`);
        case COMPONENT_TYPES.NAV: {
          const items = (component.content || '').split('\n').filter(Boolean);
          const links = items.map((item) => `<a href="#" style="display:inline-block;padding:0 10px;${makeTextStyle(s)}text-decoration:none;">${escapeHtml(item)}</a>`).join('');
          return wrap(`<div style="text-align:${s.textAlign || 'center'};${makeBoxStyle(s, { includeBackground: true, includePadding: true, includeBorder: true, includeRadius: true })}">${links || '<span>Navigation</span>'}</div>`);
        }
        case COMPONENT_TYPES.HEADER:
        case COMPONENT_TYPES.FOOTER:
        case COMPONENT_TYPES.SIDEBAR:
        case COMPONENT_TYPES.BANNER:
          return wrap(`<div style="margin:0;${makeTextStyle(s)}${makeBoxStyle(s, { includeBackground: true, includePadding: true, includeBorder: true, includeRadius: true })}">${renderRichText(component.content)}</div>`);
        default:
          return wrap(`<div style="margin:0;${makeTextStyle(s)}">${renderRichText(component.content)}</div>`);
      }
    };

    const makeColumnTdStyle = (column) => {
      const s = column?.settings || {};
      return `${makeBoxStyle(s, { includePadding: true, includeMargin: false, includeText: true, includeBackground: true, includeDimensions: true })}vertical-align:top;`;
    };

    const makeRowCellStyle = (row) => {
      const s = row?.settings || {};
      return `${makeBoxStyle(s, { includePadding: true, includeMargin: false, includeText: true, includeBackground: true, includeDimensions: true })}vertical-align:top;`;
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
            @media only screen and (max-width: 620px) {
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
                                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                    <tr>
                                      <td style="${rowCellStyle}">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                          <tr>
                                            ${columns
                                              .map((column) => {
                                                const widthPct = Math.round(((column.size || 12) / 12) * 100);
                                                const tdStyle = makeColumnTdStyle(column);
                                                const content = (column.components || []).map((c) => renderComponent(c)).join('');
                                                return `
                                                  <td class="stack-column-cell" width="${widthPct}%" style="${tdStyle}">
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
    setSelectedTarget((prev) => locateTarget(sections, prev));
  }, [sections]);

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

  const handleTargetUpdate = (updatedTarget) => {
    if (!updatedTarget) return;

    updateSections((prevSections) => {
      const updated = [...prevSections];

      if (updatedTarget.kind === 'component') {
        for (let s = 0; s < updated.length; s++) {
          const section = updated[s];
          for (let r = 0; r < section.rows.length; r++) {
            const row = section.rows[r];
            for (let c = 0; c < row.columns.length; c++) {
              const column = row.columns[c];
              const componentIndex = column.components.findIndex((comp) => comp.id === updatedTarget.id);
              if (componentIndex !== -1) {
                updated[s].rows[r].columns[c].components[componentIndex] = {
                  ...updated[s].rows[r].columns[c].components[componentIndex],
                  settings: updatedTarget.settings,
                };
                return updated;
              }
            }
          }
        }
      }

      if (updatedTarget.kind === 'column') {
        for (let s = 0; s < updated.length; s++) {
          const section = updated[s];
          for (let r = 0; r < section.rows.length; r++) {
            const row = section.rows[r];
            const columnIndex = row.columns.findIndex((col) => col.id === updatedTarget.id);
            if (columnIndex !== -1) {
              updated[s].rows[r].columns[columnIndex] = {
                ...updated[s].rows[r].columns[columnIndex],
                settings: updatedTarget.settings,
              };
              return updated;
            }
          }
        }
      }

      if (updatedTarget.kind === 'row') {
        for (let s = 0; s < updated.length; s++) {
          const section = updated[s];
          const rowIndex = section.rows.findIndex((row) => row.id === updatedTarget.id);
          if (rowIndex !== -1) {
            updated[s].rows[rowIndex] = {
              ...updated[s].rows[rowIndex],
              settings: updatedTarget.settings,
            };
            return updated;
          }
        }
      }

      return updated;
    });
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
                      setComponents={setSections} // Pass 'setSections' as 'setComponents'
                      updateSections={updateSections} // Pass updateSections explicitly
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
              onTemplateSettingsChange={setTemplateSettings}
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
            icon={<EditIcon />} // Icon for editor
            colorScheme={isEditorView ? "blue" : "gray"}
            onClick={() => { setIsEditorView(true); setIsBrowserView(false); }} // Toggle to editor view
            aria-label="Editor"
          />
          <IconButton
            icon={<SettingsIcon />} // Icon for code preview
            colorScheme={!isEditorView && !isBrowserView ? "green" : "gray"}
            onClick={() => { setIsEditorView(false); setIsBrowserView(false); }} // Toggle to code preview
            aria-label="Code Preview"
          />
          <IconButton
            icon={<ViewIcon />} // Icon for browser view
            colorScheme={isBrowserView ? "purple" : "gray"}
            onClick={() => { setIsEditorView(false); setIsBrowserView(true); }} // Toggle to browser view
            aria-label="Browser View"
          />
        </Box>
      </Box>
    </DndProvider>
  );
};

export default CreateTemplate;
