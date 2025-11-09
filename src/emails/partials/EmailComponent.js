import React from 'react';
import { Box, Button, Text, Divider, Image, Link, Heading } from '@chakra-ui/react';
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

const EmailComponent = ({ component, setSections, parentId, rowId, columnId, onSelect, selectedComponent }) => {
  const { type, content } = component;

  const handleChange = (e) => {
    const value = e?.target?.value || ''; // Safely access e.target.value
    const updatedComponent = { ...component, content: value };
    updateComponent(updatedComponent, parentId, rowId, columnId, setSections);
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(component);
    }
  };

  // Apply styles from component settings
  const applyComponentStyles = () => {
    if (!component.settings) return {};
    
    const { padding, margin, backgroundColor, width, height, border, borderColor, borderWidth, borderRadius, fontSize, fontWeight, textAlign, textColor } = component.settings;
    
    const styles = {
      padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
      margin: `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`,
      backgroundColor: backgroundColor || '#ffffff',
      width: width || '100%',
      height: height || 'auto',
      border: border !== 'none' ? `${borderWidth || 0}px ${border || 'solid'} ${borderColor || '#000000'}` : 'none',
      borderRadius: `${borderRadius || 0}px`,
    };
    
    // Add text styles if they exist
    if (fontSize) styles.fontSize = fontSize;
    if (fontWeight) styles.fontWeight = fontWeight;
    if (textAlign) styles.textAlign = textAlign;
    if (textColor) styles.color = textColor;
    
    return styles;
  };
  
  const renderContent = () => {
    // Apply styles
    const componentStyles = applyComponentStyles();
    
    switch (type) {
      case COMPONENT_TYPES.BUTTON:
        return (
          <Button 
            onClick={handleSelect}
            style={{
              ...componentStyles,
              backgroundColor: component.settings?.buttonColor || '#0066cc',
              color: component.settings?.buttonTextColor || '#ffffff',
              border: 'none',
            }}
          >
            <input
              type="text"
              value={content || 'Click Me'}
              onChange={handleChange}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: component.settings?.buttonTextColor || '#ffffff',
                fontSize: component.settings?.fontSize || 'md',
                fontWeight: component.settings?.fontWeight || 'normal',
                textAlign: component.settings?.textAlign || 'left',
              }}
            />
          </Button>
        );
      case COMPONENT_TYPES.TEXT:
        return (
          <Text onClick={handleSelect} style={componentStyles}>
            <input
              type="text"
              value={content || 'This is a text block'}
              onChange={handleChange}
              style={{ 
                background: 'transparent', 
                border: 'none',
                fontSize: component.settings?.fontSize || 'md',
                fontWeight: component.settings?.fontWeight || 'normal',
                textAlign: component.settings?.textAlign || 'left',
                color: component.settings?.textColor || '#000000',
              }}
            />
          </Text>
        );
      case COMPONENT_TYPES.PARAGRAPH:
        return (
          <Text onClick={handleSelect} style={componentStyles}>
            <textarea
              value={content || 'This is a paragraph'}
              onChange={handleChange}
              style={{ 
                width: '100%', 
                background: 'transparent', 
                border: '1px solid gray', 
                borderRadius: '4px',
                fontSize: component.settings?.fontSize || 'md',
                fontWeight: component.settings?.fontWeight || 'normal',
                textAlign: component.settings?.textAlign || 'left',
                color: component.settings?.textColor || '#000000',
              }}
            />
          </Text>
        );
      case COMPONENT_TYPES.ORDERED_LIST:
        return (
          <ol onClick={handleSelect} style={componentStyles}>
            <textarea
              value={content || '1. Item 1\n2. Item 2'}
              onChange={handleChange}
              style={{ 
                width: '100%', 
                background: 'transparent', 
                border: '1px solid gray', 
                borderRadius: '4px',
                fontSize: component.settings?.fontSize || 'md',
                fontWeight: component.settings?.fontWeight || 'normal',
                textAlign: component.settings?.textAlign || 'left',
                color: component.settings?.textColor || '#000000',
              }}
            />
          </ol>
        );
      case COMPONENT_TYPES.UNORDERED_LIST:
        return (
          <ul onClick={handleSelect} style={componentStyles}>
            <textarea
              value={content || '- Item 1\n- Item 2'}
              onChange={handleChange}
              style={{ 
                width: '100%', 
                background: 'transparent', 
                border: '1px solid gray', 
                borderRadius: '4px',
                fontSize: component.settings?.fontSize || 'md',
                fontWeight: component.settings?.fontWeight || 'normal',
                textAlign: component.settings?.textAlign || 'left',
                color: component.settings?.textColor || '#000000',
              }}
            />
          </ul>
        );
      case COMPONENT_TYPES.HEADER_1:
        return (
          <Heading size="lg" onClick={handleSelect} style={componentStyles}>
            <input
              type="text"
              value={content || 'Header 1'}
              onChange={handleChange}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                fontWeight: 'bold',
                fontSize: component.settings?.fontSize || 'lg',
                textAlign: component.settings?.textAlign || 'left',
                color: component.settings?.textColor || '#000000',
              }}
            />
          </Heading>
        );
      case COMPONENT_TYPES.HEADER_2:
        return (
          <Heading size="md" onClick={handleSelect} style={componentStyles}>
            <input
              type="text"
              value={content || 'Header 2'}
              onChange={handleChange}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                fontWeight: 'bold',
                fontSize: component.settings?.fontSize || 'md',
                textAlign: component.settings?.textAlign || 'left',
                color: component.settings?.textColor || '#000000',
              }}
            />
          </Heading>
        );
      case COMPONENT_TYPES.HEADER_3:
        return (
          <Heading size="sm" onClick={handleSelect} style={componentStyles}>
            <input
              type="text"
              value={content || 'Header 3'}
              onChange={handleChange}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                fontWeight: 'bold',
                fontSize: component.settings?.fontSize || 'sm',
                textAlign: component.settings?.textAlign || 'left',
                color: component.settings?.textColor || '#000000',
              }}
            />
          </Heading>
        );
      case COMPONENT_TYPES.IMAGE:
        return (
          <Box onClick={handleSelect} style={componentStyles}>
            <Image
              src={component.imageUrl || 'https://dummyimage.com/100x50/cccccc/000000.png'}
              alt="Placeholder Image"
            />
            <input
              type="text"
              placeholder="Image URL"
              value={component.imageUrl}
              onChange={(e) => handleChange({ ...component, imageUrl: e.target.value })}
              style={{ border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
            />
          </Box>
        );
      case COMPONENT_TYPES.LINK:
        return (
          <Link 
            href={component.linkUrl || 'https://example.com'} 
            onClick={handleSelect}
            style={componentStyles}
          >
            <input
              type="text"
              value={content || 'Visit our site'}
              onChange={handleChange}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: component.settings?.linkColor || '#0066cc',
                fontSize: component.settings?.fontSize || 'md',
                fontWeight: component.settings?.fontWeight || 'normal',
                textAlign: component.settings?.textAlign || 'left',
              }}
            />
          </Link>
        );
      case COMPONENT_TYPES.HEADING:
        return (
          <Heading size="md" onClick={handleSelect} style={componentStyles}>
            <input
              type="text"
              value={content || 'This is a heading'}
              onChange={handleChange}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                fontWeight: 'bold',
                fontSize: component.settings?.fontSize || 'md',
                textAlign: component.settings?.textAlign || 'left',
                color: component.settings?.textColor || '#000000',
              }}
            />
          </Heading>
        );
      case COMPONENT_TYPES.HR:
        return <Divider onClick={handleSelect} style={componentStyles} />;
      case COMPONENT_TYPES.VIDEO:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="red.300" borderRadius="md" style={componentStyles}>
            <Text color="red.500" fontWeight="bold">▶ Video Placeholder</Text>
            <input
              type="text"
              placeholder="Video URL"
              value={component.videoUrl || ''}
              onChange={(e) => handleChange({ ...component, videoUrl: e.target.value })}
              style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
            />
          </Box>
        );
      case COMPONENT_TYPES.TABLE:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="purple.300" borderRadius="md" style={componentStyles}>
            <Text color="purple.500" fontWeight="bold">▦ Table Placeholder</Text>
            <textarea
              placeholder="Table content (CSV format)"
              value={component.tableData || 'Header 1,Header 2,Header 3\nRow 1 Col 1,Row 1 Col 2,Row 1 Col 3\nRow 2 Col 1,Row 2 Col 2,Row 2 Col 3'}
              onChange={(e) => handleChange({ ...component, tableData: e.target.value })}
              style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px', minHeight: '80px' }}
            />
          </Box>
        );
      case COMPONENT_TYPES.SPACE:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="gray.300" borderRadius="md" style={componentStyles}>
            <Text color="gray.500" fontWeight="bold">␣ Space Placeholder</Text>
            <input
              type="number"
              placeholder="Height (px)"
              value={component.height || 20}
              onChange={(e) => handleChange({ ...component, height: parseInt(e.target.value) || 0 })}
              style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
            />
          </Box>
        );
      case COMPONENT_TYPES.ICON:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="yellow.300" borderRadius="md" style={componentStyles}>
            <Text color="yellow.500" fontWeight="bold">★ Icon Placeholder</Text>
            <input
              type="text"
              placeholder="Icon class or name"
              value={component.iconName || 'star'}
              onChange={(e) => handleChange({ ...component, iconName: e.target.value })}
              style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
            />
          </Box>
        );
      case COMPONENT_TYPES.HTML:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="orange.300" borderRadius="md" style={componentStyles}>
            <Text color="orange.500" fontWeight="bold">{'<>'} HTML Placeholder</Text>
            <textarea
              placeholder="HTML content"
              value={component.htmlContent || '<div>Custom HTML content</div>'}
              onChange={(e) => handleChange({ ...component, htmlContent: e.target.value })}
              style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px', minHeight: '80px', fontFamily: 'monospace' }}
            />
          </Box>
        );
      case COMPONENT_TYPES.MENU:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="teal.300" borderRadius="md" style={componentStyles}>
            <Text color="teal.500" fontWeight="bold">☰ Menu Placeholder</Text>
            <textarea
              placeholder="Menu items (one per line)"
              value={component.menuItems || 'Home\nAbout\nServices\nContact'}
              onChange={(e) => handleChange({ ...component, menuItems: e.target.value })}
              style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px', minHeight: '80px' }}
            />
          </Box>
        );
      default:
        return null;
    }
  };

  // Check if this component is selected
  const isSelected = selectedComponent && selectedComponent.id === component.id;
  
  return (
    <Box 
      mb={4}
      border={isSelected ? "2px solid blue" : "none"}
      borderRadius="md"
      p={isSelected ? "2px" : "0"}
    >
      {renderContent()}
    </Box>
  );
};

export default EmailComponent;
