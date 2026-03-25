import React from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useDrop } from 'react-dnd';
import { sectionStyle } from './componentStyles';
import DroppableRow from './DroppableRow';
import { moveRow } from './DroppableRow';
import { COMPONENT_TYPES } from './componentTypes';

// Droppable Section Component
const DroppableSection = ({ section, setComponents, updateSections, syncEditorToHtml, onSelect, selectedTarget }) => {
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      settings: {
        padding: { top: 10, right: 10, bottom: 10, left: 10 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        backgroundColor: '#ffffff',
        backgroundImage: '',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        border: 'none',
        borderColor: '#dddddd',
        borderWidth: 0,
        borderRadius: 0,
        boxSizing: 'border-box',
        letterSpacing: 'normal',
        lineHeight: 'normal',
      },
      columns: [
        {
          id: Date.now() + 1,
          label: 'Column 1',
          size: 6,
          components: [],
          settings: {
            padding: { top: 10, right: 10, bottom: 10, left: 10 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            backgroundColor: '#ffffff',
            backgroundImage: '',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            border: 'none',
            borderColor: '#cccccc',
            borderWidth: 0,
            borderRadius: 0,
            boxSizing: 'border-box',
            letterSpacing: 'normal',
            lineHeight: 'normal',
          },
        },
        {
          id: Date.now() + 2,
          label: 'Column 2',
          size: 6,
          components: [],
          settings: {
            padding: { top: 10, right: 10, bottom: 10, left: 10 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            backgroundColor: '#ffffff',
            backgroundImage: '',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            border: 'none',
            borderColor: '#cccccc',
            borderWidth: 0,
            borderRadius: 0,
            boxSizing: 'border-box',
            letterSpacing: 'normal',
            lineHeight: 'normal',
          },
        },
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
          moveRow={moveRow}
          updateSections={updateSections}
          syncEditorToHtml={syncEditorToHtml} // Pass syncEditorToHtml explicitly
          onSelect={onSelect}
          selectedTarget={selectedTarget}
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
