import React from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useDrop } from 'react-dnd';
import { sectionStyle } from './componentStyles';
import DroppableRow from './DroppableRow';
import { moveRow } from './DroppableRow';
import { COMPONENT_TYPES } from './componentTypes';
import { useEditorStore } from '../editorStore';

// Droppable Section Component
const DroppableSection = ({ section, syncEditorToHtml, onSelect, selectedTarget }) => {
  const addRowToSection = useEditorStore((state) => state.addRowToSection);
  const removeSectionById = useEditorStore((state) => state.removeSection);

  const addRow = () => {
    const newRow = {
      id: Date.now(),
      settings: {
        padding: { top: 10, right: 10, bottom: 10, left: 10 },
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
            backgroundColor: 'transparent',
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
            backgroundColor: 'transparent',
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
    addRowToSection(section.id, newRow);
  };

  const removeSection = () => {
    removeSectionById(section.id);
  };

  const [{ isOver }, drop] = useDrop({
    accept: [...Object.values(COMPONENT_TYPES), 'ROW_LAYOUT'],
    drop: (item, monitor) => {
      // Handle row layout drops
      if (item.layout) {
        const newRow = {
          id: Date.now(),
          settings: {
            padding: { top: 10, right: 10, bottom: 10, left: 10 },
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
            boxSizing: 'border-box',
            letterSpacing: 'normal',
            lineHeight: 'normal',
          },
          columns: item.layout.map((col, index) => ({
            ...col,
            id: Date.now() + index + 1,
            components: [],
            settings: {
              padding: { top: 10, right: 10, bottom: 10, left: 10 },
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
              boxSizing: 'border-box',
              letterSpacing: 'normal',
              lineHeight: 'normal',
            }
          }))
        };

        addRowToSection(section.id, newRow);
        
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

  const sectionSettingsStyle = (() => {
    const s = section?.settings || {};
    const out = {};
    if (s.backgroundColor && s.backgroundColor !== 'transparent') {
      out.backgroundColor = s.backgroundColor;
    }
    if (s.backgroundImage) {
      out.backgroundImage = `url('${s.backgroundImage}')`;
      out.backgroundSize = s.backgroundSize || 'cover';
      out.backgroundPosition = s.backgroundPosition || 'center top';
      out.backgroundRepeat = s.backgroundRepeat || 'no-repeat';
    }
    if (s.padding && typeof s.padding === 'object') {
      const { top = 0, right = 0, bottom = 0, left = 0 } = s.padding;
      if (top || right || bottom || left) {
        out.padding = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }
    return out;
  })();

  // Update section style when row layout is being dragged over
  const updatedSectionStyle = {
    ...sectionStyle,
    ...sectionSettingsStyle,
    backgroundColor: isOver ? 'rgba(24, 144, 255, 0.06)' : (sectionSettingsStyle.backgroundColor || sectionStyle.backgroundColor),
    border: isOver ? '2px dashed #1890ff' : sectionStyle.border
  };
  
  return (
    <Box ref={drop} style={updatedSectionStyle} position="relative">
      {/* Existing rows - show all rows in editor, including empty ones */}
      {(section.rows || []).map((row, index) => (
        <DroppableRow
          key={row.id}
          row={row}
          parentId={section.id}
          index={index}
          moveRow={moveRow}
          syncEditorToHtml={syncEditorToHtml}
          onSelect={onSelect}
          selectedTarget={selectedTarget}
        />
      ))}
      {/* Drop zone for adding new rows at the bottom */}
      <Box
        mt={2}
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="40px"
        border={isOver ? '2px dashed #1890ff' : '1px dashed #d9d9d9'}
        borderRadius="4px"
        bg={isOver ? 'rgba(24, 144, 255, 0.1)' : 'transparent'}
        color={isOver ? '#1890ff' : '#999'}
        fontSize="sm"
        p={2}
        textAlign="center"
        cursor="pointer"
        onClick={addRow}
      >
        {isOver ? 'Drop row layout here' : '+ Click or drag row layout here'}
      </Box>
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
