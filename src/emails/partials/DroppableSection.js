import React from 'react';
import { Box, Heading, IconButton } from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useDrop } from 'react-dnd';
import { sectionStyle } from './componentStyles';
import DroppableRow from './DroppableRow';
import { COMPONENT_TYPES } from './componentTypes';

// Droppable Section Component
const DroppableSection = ({ section, setComponents, updateSections, syncEditorToHtml, onSelect, selectedComponent }) => {
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      columns: [
        { id: Date.now() + 1, label: 'Column 1', size: 6, components: [] },
        { id: Date.now() + 2, label: 'Column 2', size: 6, components: [] },
      ],
    };
    updateSections((prevSections) => {
      const updated = [...prevSections];
      const sectionIndex = updated.findIndex((s) => s.id === section.id);
      updated[sectionIndex].rows.push(newRow);
      return updated;
    });
  };

  const removeSection = () => {
    setComponents((prevSections) => prevSections.filter((s) => s.id !== section.id));
  };

  const [{ isOver }, drop] = useDrop({
    accept: [...Object.values(COMPONENT_TYPES), 'ROW_LAYOUT'],
    drop: (item, monitor) => {
      // Handle row layout drops
      if (item.layout) {
        const newRow = {
          id: Date.now(),
          columns: item.layout.map((col, index) => ({
            ...col,
            id: Date.now() + index + 1,
            components: []
          }))
        };
        
        updateSections((prevSections) => {
          const updated = [...prevSections];
          const sectionIndex = updated.findIndex((s) => s.id === section.id);
          updated[sectionIndex].rows.push(newRow);
          return updated;
        });
        
        // Ensure HTML is synchronized after the drop event
        if (typeof syncEditorToHtml === 'function') {
          syncEditorToHtml();
        }
      }
      // Handle component drops
      else if (item.type) {
        // If dropping a component directly on the section, add it to the first row's first column
        if (section.rows.length > 0 && section.rows[0].columns.length > 0) {
          const firstColumn = section.rows[0].columns[0];
          const newComponent = {
            id: Date.now(),
            type: item.type,
            content: (() => {
              switch (item.type) {
                case COMPONENT_TYPES.TEXT:
                  return 'Default Text';
                case COMPONENT_TYPES.HEADING:
                  return 'Default Heading';
                case COMPONENT_TYPES.PARAGRAPH:
                  return 'Default Paragraph';
                case COMPONENT_TYPES.ORDERED_LIST:
                  return '1. Item 1\n2. Item 2';
                case COMPONENT_TYPES.UNORDERED_LIST:
                  return '- Item 1\n- Item 2';
                case COMPONENT_TYPES.LINK:
                  return 'Default Link';
                case COMPONENT_TYPES.IMAGE:
                  return 'Default Image';
                case COMPONENT_TYPES.VIDEO:
                  return 'Default Video';
                case COMPONENT_TYPES.TABLE:
                  return 'Header 1,Header 2,Header 3\nRow 1 Col 1,Row 1 Col 2,Row 1 Col 3\nRow 2 Col 1,Row 2 Col 2,Row 2 Col 3';
                case COMPONENT_TYPES.SPACE:
                  return '';
                case COMPONENT_TYPES.ICON:
                  return 'star';
                case COMPONENT_TYPES.HTML:
                  return '<div>Custom HTML content</div>';
                case COMPONENT_TYPES.MENU:
                  return 'Home\nAbout\nServices\nContact';
                default:
                  return '';
              }
            })(),
            imageUrl: item.type === COMPONENT_TYPES.IMAGE ? 'https://dummyimage.com/100x50/cccccc/000000.png' : '',
            linkUrl: item.type === COMPONENT_TYPES.LINK ? 'https://example.com' : '',
            font: { size: 'md', weight: 'normal', family: 'Arial' },
            videoUrl: item.type === COMPONENT_TYPES.VIDEO ? 'https://example.com/video.mp4' : '',
            tableData: item.type === COMPONENT_TYPES.TABLE ? 'Header 1,Header 2,Header 3\nRow 1 Col 1,Row 1 Col 2,Row 1 Col 3\nRow 2 Col 1,Row 2 Col 2,Row 2 Col 3' : '',
            height: item.type === COMPONENT_TYPES.SPACE ? 20 : 0,
            iconName: item.type === COMPONENT_TYPES.ICON ? 'star' : '',
            htmlContent: item.type === COMPONENT_TYPES.HTML ? '<div>Custom HTML content</div>' : '',
            menuItems: item.type === COMPONENT_TYPES.MENU ? 'Home\nAbout\nServices\nContact' : '',
            // Add default styling properties
            settings: {
              padding: { top: 10, right: 10, bottom: 10, left: 10 },
              margin: { top: 0, right: 0, bottom: 0, left: 0 },
              fontSize: 'md',
              fontWeight: 'normal',
              textAlign: 'left',
              textColor: '#000000',
              backgroundColor: '#ffffff',
              width: '100%',
              height: 'auto',
              border: 'none',
              borderColor: '#000000',
              borderWidth: 0,
              borderRadius: 0,
            }
          };
          
          updateSections((prevSections) => {
            const updated = [...prevSections];
            const sectionIndex = updated.findIndex((s) => s.id === section.id);
            const rowIndex = 0; // First row
            const columnIndex = 0; // First column
            
            if (!updated[sectionIndex].rows[rowIndex].columns[columnIndex].components) {
              updated[sectionIndex].rows[rowIndex].columns[columnIndex].components = [];
            }
            
            updated[sectionIndex].rows[rowIndex].columns[columnIndex].components.push(newComponent);
            return updated;
          });
          
          // Ensure HTML is synchronized after the drop event
          if (typeof syncEditorToHtml === 'function') {
            syncEditorToHtml();
          }
        }
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    })
  });

  // Update section style when row layout is being dragged over
  const updatedSectionStyle = {
    ...sectionStyle,
    backgroundColor: isOver ? '#e6f7ff' : sectionStyle.backgroundColor,
    border: isOver ? '2px dashed #1890ff' : sectionStyle.border
  };
  
  return (
    <Box ref={drop} style={updatedSectionStyle} position="relative">
      {section.rows.map((row, index) => (
        <DroppableRow
          key={row.id}
          row={row}
          setComponents={setComponents}
          parentId={section.id}
          index={index}
          moveRow={DroppableRow.moveRow}
          updateSections={updateSections}
          syncEditorToHtml={syncEditorToHtml} // Pass syncEditorToHtml explicitly
          onSelect={onSelect}
          selectedComponent={selectedComponent}
        />
      ))}
      <Box position="absolute" top="4px" right="4px">
        <IconButton
          onClick={addRow}
          colorScheme="green"
          size="xs"
          icon={<AddIcon />}
          mr={2}
        />
        <IconButton
          onClick={removeSection}
          colorScheme="red"
          size="xs" // Made icon smaller
          icon={<DeleteIcon />}
        />
      </Box>
    </Box>
  );
};

export default DroppableSection;
