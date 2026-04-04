import React from 'react';
import { Box, Image, Text } from '@chakra-ui/react';
import { COMPONENT_TYPES } from './componentTypes';

// Email Components Renderer with Editable Fields
const updateComponent = (updatedComponent, parentId, rowId, columnId, setSections) => {
  setSections((prevSections) => {
    const updated = [...prevSections];
    const sectionIndex = updated.findIndex((s) => s.id === parentId);
    const rowIndex = updated[sectionIndex].rows.findIndex((r) => r.id === rowId);
    const columnIndex = updated[sectionIndex].rows[rowIndex].columns.findIndex((c) => c.id === columnId);

    const components = updated[sectionIndex].rows[rowIndex].columns[columnIndex].components;
    const componentIndex = components.findIndex((comp) => comp.id === updatedComponent.id);
    components[componentIndex] = updatedComponent;

    return updated;
  });
};

const EmailComponent = ({ component, setSections, parentId, rowId, columnId, onSelect, selectedTarget }) => {
  const { type, content } = component;

  const handleChange = (nextValue) => {
    const updatedComponent = (nextValue && typeof nextValue === 'object' && nextValue.target)
      ? { ...component, content: nextValue.target.value || '' }
      : (nextValue && typeof nextValue === 'object' ? nextValue : { ...component, content: nextValue || '' });
    updateComponent(updatedComponent, parentId, rowId, columnId, setSections);
  };

  const handleSelect = (e) => {
    if (e?.stopPropagation) {
      e.stopPropagation();
    }
    if (onSelect) {
      onSelect({
        kind: 'component',
        id: component.id,
        data: component,
      });
    }
  };

  const isSelected = selectedTarget?.kind === 'component' && selectedTarget?.id === component.id;

  // Apply styles from component settings
  const applyComponentStyles = () => {
    const s = component?.settings || {};
    const styles = {};

    // Background - always apply
    if (s.backgroundColor && s.backgroundColor !== 'transparent') {
      styles.backgroundColor = s.backgroundColor;
    }
    if (s.backgroundImage) {
      styles.backgroundImage = `url('${s.backgroundImage}')`;
      styles.backgroundSize = s.backgroundSize || 'cover';
      styles.backgroundPosition = s.backgroundPosition || 'center';
      styles.backgroundRepeat = s.backgroundRepeat || 'no-repeat';
    }

    // Padding
    if (s.padding && typeof s.padding === 'object') {
      const { top = 0, right = 0, bottom = 0, left = 0 } = s.padding;
      if (top || right || bottom || left) {
        styles.padding = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }

    // Margin
    if (s.margin && typeof s.margin === 'object') {
      const { top = 0, right = 0, bottom = 0, left = 0 } = s.margin;
      if (top || right || bottom || left) {
        styles.margin = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }

    // Border
    if (s.border && s.border !== 'none' && s.borderWidth) {
      styles.border = `${s.borderWidth}px ${s.border} ${s.borderColor || '#000'}`;
    }
    if (s.borderRadius) {
      styles.borderRadius = `${s.borderRadius}px`;
    }
    if (s.textAlign) {
      styles.textAlign = s.textAlign;
    }
    if (s.textColor) {
      styles.color = s.textColor;
    }
    if (s.fontFamily) {
      styles.fontFamily = s.fontFamily;
    }
    if (s.fontSize) {
      styles.fontSize = s.fontSize;
    }
    if (s.fontWeight) {
      styles.fontWeight = s.fontWeight;
    }
    if (s.lineHeight) {
      styles.lineHeight = s.lineHeight;
    }
    if (s.letterSpacing) {
      styles.letterSpacing = s.letterSpacing;
    }
    if (s.width) {
      styles.width = s.width;
    }
    if (s.height) {
      styles.height = s.height;
    }
    if (s.boxSizing) {
      styles.boxSizing = s.boxSizing;
    }

    return styles;
  };

  const renderContent = () => {
    // Apply styles
    const componentStyles = applyComponentStyles();
    const textEditorStyle = {
      width: '100%',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      padding: 0,
      margin: 0,
      resize: 'none',
      fontFamily: component.settings?.fontFamily || 'inherit',
      fontSize: component.settings?.fontSize || 'inherit',
      fontWeight: component.settings?.fontWeight || 'inherit',
      textAlign: component.settings?.textAlign || 'inherit',
      color: component.settings?.textColor || 'inherit',
      lineHeight: component.settings?.lineHeight || 'inherit',
      letterSpacing: component.settings?.letterSpacing || 'inherit',
    };

    switch (type) {
      case COMPONENT_TYPES.BUTTON:
        return (
          <Box
            as="a"
            onClick={handleSelect}
            style={{
              ...componentStyles,
              display: 'inline-block',
              cursor: 'pointer',
              backgroundColor: component.settings?.buttonColor || '#0066cc',
              color: component.settings?.buttonTextColor || '#ffffff',
              border: 'none',
              padding: componentStyles.padding || '10px 20px',
              borderRadius: componentStyles.borderRadius || '4px',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            {isSelected ? (
              <input
                type="text"
                value={content || 'Click Me'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  width: 'auto',
                  color: component.settings?.buttonTextColor || '#ffffff',
                }}
              />
            ) : (content || 'Click Me')}
          </Box>
        );
      case COMPONENT_TYPES.TEXT:
        return (
          <Box as="div" onClick={handleSelect} style={componentStyles}>
            {isSelected ? (
              <input
                type="text"
                value={content || 'This is a text block'}
                onChange={handleChange}
                style={textEditorStyle}
              />
            ) : (
              <Box as="span" whiteSpace="pre-wrap">{content || 'This is a text block'}</Box>
            )}
          </Box>
        );
      case COMPONENT_TYPES.PARAGRAPH:
        return (
          <Box as="p" onClick={handleSelect} style={{ margin: 0, ...componentStyles }}>
            {isSelected ? (
              <textarea
                value={content || 'This is a paragraph'}
                onChange={handleChange}
                style={textEditorStyle}
              />
            ) : (
              <Box as="span" whiteSpace="pre-wrap">{content || 'This is a paragraph'}</Box>
            )}
          </Box>
        );
      case COMPONENT_TYPES.ORDERED_LIST:
        return (
          <ol onClick={handleSelect} style={componentStyles}>
            {isSelected ? (
              <textarea
                value={content || '1. Item 1\n2. Item 2'}
                onChange={handleChange}
                style={textEditorStyle}
              />
            ) : (
              (content || '1. Item 1\n2. Item 2').split('\n').filter(Boolean).map((item, index) => (
                <li key={`${component.id}-ol-${index}`}>{item}</li>
              ))
            )}
          </ol>
        );
      case COMPONENT_TYPES.UNORDERED_LIST:
        return (
          <ul onClick={handleSelect} style={componentStyles}>
            {isSelected ? (
              <textarea
                value={content || '- Item 1\n- Item 2'}
                onChange={handleChange}
                style={textEditorStyle}
              />
            ) : (
              (content || '- Item 1\n- Item 2').split('\n').filter(Boolean).map((item, index) => (
                <li key={`${component.id}-ul-${index}`}>{item}</li>
              ))
            )}
          </ul>
        );
      case COMPONENT_TYPES.HEADER_1:
        return (
          <Box as="h1" onClick={handleSelect} style={{ margin: 0, fontWeight: 'bold', ...componentStyles }}>
            {isSelected ? (
              <input
                type="text"
                value={content || 'Header 1'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  fontWeight: component.settings?.fontWeight || 'bold',
                }}
              />
            ) : (content || 'Header 1')}
          </Box>
        );
      case COMPONENT_TYPES.HEADER_2:
        return (
          <Box as="h2" onClick={handleSelect} style={{ margin: 0, fontWeight: 'bold', ...componentStyles }}>
            {isSelected ? (
              <input
                type="text"
                value={content || 'Header 2'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  fontWeight: component.settings?.fontWeight || 'bold',
                }}
              />
            ) : (content || 'Header 2')}
          </Box>
        );
      case COMPONENT_TYPES.HEADER_3:
        return (
          <Box as="h3" onClick={handleSelect} style={{ margin: 0, fontWeight: 'bold', ...componentStyles }}>
            {isSelected ? (
              <input
                type="text"
                value={content || 'Header 3'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  fontWeight: component.settings?.fontWeight || 'bold',
                }}
              />
            ) : (content || 'Header 3')}
          </Box>
        );
      case COMPONENT_TYPES.IMAGE:
        // For images, don't apply padding that would reduce the image size
        const imageStyles = {
          textAlign: component.settings?.textAlign || 'center',
          backgroundColor: componentStyles.backgroundColor,
          margin: 0,
          padding: 0,
        };
        return (
          <Box onClick={handleSelect} style={{ width: '100%', ...imageStyles }}>
            <img
              src={component.imageUrl || 'https://dummyimage.com/100x50/cccccc/000000.png'}
              alt="Image"
              style={{
                width: component.settings?.width || 'auto',
                height: component.settings?.height || 'auto',
                maxWidth: '100%',
                display: 'inline-block',
                border: 'none',
                margin: 0,
                padding: 0,
                boxSizing: 'border-box',
              }}
            />
            {isSelected && (
              <input
                type="text"
                placeholder="Image URL"
                value={component.imageUrl || ''}
                onChange={(e) => handleChange({ ...component, imageUrl: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.LINK:
        return (
          <Box
            as="a"
            href={component.linkUrl || 'https://example.com'}
            onClick={handleSelect}
            style={{ ...componentStyles, color: component.settings?.linkColor || '#0066cc', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {isSelected ? (
              <input
                type="text"
                value={content || 'Visit our site'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  color: component.settings?.linkColor || '#0066cc',
                }}
              />
            ) : (content || 'Visit our site')}
          </Box>
        );
      case COMPONENT_TYPES.HEADING:
        return (
          <Box as="h2" onClick={handleSelect} style={{ margin: 0, fontWeight: 'bold', ...componentStyles }}>
            {isSelected ? (
              <input
                type="text"
                value={content || 'This is a heading'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  fontWeight: component.settings?.fontWeight || 'bold',
                }}
              />
            ) : (content || 'This is a heading')}
          </Box>
        );
      case COMPONENT_TYPES.HR:
        return <Box as="hr" onClick={handleSelect} style={{ border: 'none', borderTop: `1px solid ${component.settings?.borderColor || '#cccccc'}`, margin: 0, ...componentStyles }} />;
      case COMPONENT_TYPES.VIDEO:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="red.300" borderRadius="md" style={componentStyles}>
            <Box as="span" style={{ color: '#E53E3E', fontWeight: 'bold' }}>▶ Video Placeholder</Box>
            {isSelected && (
              <input
                type="text"
                placeholder="Video URL"
                value={component.videoUrl || ''}
                onChange={(e) => handleChange({ ...component, videoUrl: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.TABLE:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="purple.300" borderRadius="md" style={componentStyles}>
            <Box as="span" style={{ color: '#805AD5', fontWeight: 'bold' }}>▦ Table Placeholder</Box>
            {isSelected && (
              <textarea
                placeholder="Table content (CSV format)"
                value={component.tableData || 'Header 1,Header 2,Header 3\nRow 1 Col 1,Row 1 Col 2,Row 1 Col 3\nRow 2 Col 1,Row 2 Col 2,Row 2 Col 3'}
                onChange={(e) => handleChange({ ...component, tableData: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px', minHeight: '80px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.SPACE:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="gray.300" borderRadius="md" style={componentStyles}>
            {!isSelected && <Box h={`${component.height || 20}px`} />}
            {isSelected && (
              <input
                type="number"
                placeholder="Height (px)"
                value={component.height || 20}
                onChange={(e) => handleChange({ ...component, height: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.ICON:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="yellow.300" borderRadius="md" style={componentStyles}>
            <Box as="span" style={{ color: '#D69E2E', fontWeight: 'bold' }}>★ Icon Placeholder</Box>
            {isSelected && (
              <input
                type="text"
                placeholder="Icon class or name"
                value={component.iconName || 'star'}
                onChange={(e) => handleChange({ ...component, iconName: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.HTML:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="orange.300" borderRadius="md" style={componentStyles}>
            <Box dangerouslySetInnerHTML={{ __html: component.htmlContent || '<div>Custom HTML content</div>' }} />
            {isSelected && (
              <textarea
                placeholder="HTML content"
                value={component.htmlContent || '<div>Custom HTML content</div>'}
                onChange={(e) => handleChange({ ...component, htmlContent: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px', minHeight: '80px', fontFamily: 'monospace' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.MENU:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="teal.300" borderRadius="md" style={componentStyles}>
            <Box
              mb={3}
              display="flex"
              flexWrap="wrap"
              justifyContent={component.settings?.textAlign || 'center'}
              gap="8px"
            >
              {(component.menuItems || component.content || 'Home\nAbout\nServices\nContact')
                .split('\n')
                .filter(Boolean)
                .map((item, index) => (
                  <Box
                    as="span"
                    key={`${component.id}-menu-${index}`}
                    style={{
                      color: component.settings?.textColor || '#333333',
                      fontSize: component.settings?.fontSize || '16px',
                      fontWeight: component.settings?.fontWeight || 'normal',
                    }}
                  >
                    {item}
                  </Box>
                ))}
            </Box>
            {isSelected && (
              <textarea
                placeholder="Menu items (one per line)"
                value={component.menuItems || 'Home\nAbout\nServices\nContact'}
                onChange={(e) => handleChange({ ...component, menuItems: e.target.value })}
                style={{ width: '100%', background: 'transparent', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px', minHeight: '80px', color: component.settings?.textColor || '#333333', textAlign: component.settings?.textAlign || 'center' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.SOCIAL_LINK:
        return (
          <Box onClick={handleSelect} p={3} border="1px dashed" borderColor="blue.300" borderRadius="md" style={componentStyles}>
            <Box as="span" style={{ color: '#3182CE', fontWeight: 'bold', fontSize: '14px' }}>@ Social Link</Box>
            {isSelected && (
              <>
                <input
                  type="text"
                  placeholder="Social profile URL"
                  value={component.linkUrl || 'https://facebook.com'}
                  onChange={(e) => handleChange({ ...component, linkUrl: e.target.value })}
                  style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
                />
                <input
                  type="text"
                  placeholder="Label"
                  value={content || 'Facebook'}
                  onChange={handleChange}
                  style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
                />
              </>
            )}
          </Box>
        );
      case COMPONENT_TYPES.SOCIAL_ICONS:
        return (
          <Box onClick={handleSelect} p={3} border="1px dashed" borderColor="blue.200" borderRadius="md" style={componentStyles} display="flex" flexWrap="wrap" gap="8px" justifyContent="center">
            <Box as="span" style={{ width: '100%', color: '#3182CE', fontWeight: 'bold', fontSize: '14px', textAlign: 'center', display: 'block' }}>Social Icons</Box>
            {isSelected && (
              <textarea
                placeholder="Social URLs (one per line)"
                value={component.socialUrls || 'https://facebook.com\nhttps://twitter.com\nhttps://instagram.com'}
                onChange={(e) => handleChange({ ...component, socialUrls: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px', minHeight: '60px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.DIV:
        return (
          <Box
            as="div"
            onClick={handleSelect}
            style={{
              border: isSelected ? '1px dashed #3182ce' : '1px solid transparent',
              outline: 'none',
              minHeight: '10px',
              width: '100%',
              transition: 'border 0.2s ease',
              ...componentStyles
            }}
            _hover={{ border: isSelected ? '1px dashed #3182ce' : '1px solid rgba(0,0,0,0.1)' }}
          >
            {isSelected ? (
              <textarea
                value={content || 'Empty Div Content'}
                onChange={handleChange}
                style={{ ...textEditorStyle, minHeight: '60px' }}
              />
            ) : (
              <Box as="div" whiteSpace="pre-wrap" width="100%">{content || 'Empty Div Content'}</Box>
            )}
          </Box>
        );
      case COMPONENT_TYPES.NAV:
      case COMPONENT_TYPES.HEADER:
      case COMPONENT_TYPES.FOOTER:
      case COMPONENT_TYPES.SIDEBAR:
      case COMPONENT_TYPES.BANNER:
        const label = type.toUpperCase();
        return (
          <Box
            as="div"
            onClick={handleSelect}
            style={{
              border: isSelected ? '1px dashed #3182ce' : '1px solid rgba(0,0,0,0.05)',
              minHeight: '40px',
              width: '100%',
              position: 'relative',
              ...componentStyles
            }}
          >
            <Text
              position="absolute"
              top="-10px"
              left="10px"
              fontSize="10px"
              bg="white"
              px={1}
              color="gray.400"
              zIndex={1}
            >
              {label}
            </Text>
            {isSelected ? (
              <textarea
                value={content || `Empty ${label} Content`}
                onChange={handleChange}
                style={{ ...textEditorStyle, minHeight: '80px' }}
              />
            ) : (
              <Box as="div" p={2} whiteSpace="pre-wrap" width="100%">{content || `Empty ${label} Content`}</Box>
            )}
          </Box>
        );
      case COMPONENT_TYPES.SPAN:
        return (
          <Box
            as="span"
            onClick={handleSelect}
            style={{
              border: isSelected ? '1px dotted #3182ce' : '1px dotted transparent',
              display: 'inline-block',
              transition: 'border 0.2s ease',
              ...componentStyles
            }}
            _hover={{ border: isSelected ? '1px dotted #3182ce' : '1px dotted rgba(0,0,0,0.2)' }}
          >
            {isSelected ? (
              <input
                type="text"
                value={content || 'Span content'}
                onChange={handleChange}
                style={{ ...textEditorStyle, display: 'inline-block', width: 'auto' }}
              />
            ) : (content || 'Span content')}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      mb={0}
      borderRadius="md"
      style={{ outline: isSelected ? '2px solid #3182ce' : 'none' }}
    >
      {renderContent()}
    </Box>
  );
};

export default EmailComponent;
