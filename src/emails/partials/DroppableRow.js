import React from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { DragHandleIcon, AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useDrag, useDrop } from 'react-dnd';
import { rowStyle } from './componentStyles';
import DroppableColumn from './DroppableColumn';

// Utility Functions
const removeRow = (row, setComponents, parentId) => {
  setComponents((prevSections) => {
    const updated = [...prevSections];
    const sectionIndex = updated.findIndex((s) => s.id === parentId);
    updated[sectionIndex].rows = updated[sectionIndex].rows.filter((r) => r.id !== row.id);
    return updated;
  });
};

const moveRow = (dragIndex, hoverIndex, setComponents) => {
  setComponents((prevSections) => {
    const updated = [...prevSections];

    updated.forEach((section) => {
      const rows = section.rows;
      const [draggedRow] = rows.splice(dragIndex, 1);
      rows.splice(hoverIndex, 0, draggedRow);
    });

    return updated;
  });
};

// Droppable Row Component
const DroppableRow = ({ row, setComponents, parentId, index, moveRow, updateSections, syncEditorToHtml, onSelect, selectedTarget }) => {
  console.log('DroppableRow received syncEditorToHtml:', typeof syncEditorToHtml);

  const [, drag] = useDrag({
    type: 'ROW',
    item: { index },
  });

  const [, drop] = useDrop({
    accept: 'ROW',
    hover: (item) => {
      if (item.index !== index) {
        moveRow(item.index, index, setComponents);
        item.index = index;
      }
    },
  });

  // Function to duplicate the row
  const duplicateRow = () => {
    const newRow = {
      id: Date.now(),
      settings: { ...(row.settings || {}) },
      columns: row.columns.map(col => ({
        ...col,
        id: Date.now() + Math.random(),
        components: col.components.map(comp => ({
          ...comp,
          id: Date.now() + Math.random()
        }))
      }))
    };
    
    updateSections((prevSections) => {
      const updated = [...prevSections];
      const sectionIndex = updated.findIndex((s) => s.id === parentId);
      const rowIndex = updated[sectionIndex].rows.findIndex((r) => r.id === row.id);
      updated[sectionIndex].rows.splice(rowIndex + 1, 0, newRow);
      return updated;
    });
  };

  const isSelected = selectedTarget?.kind === 'row' && selectedTarget?.id === row.id;

  const handleSelectRow = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect({
        kind: 'row',
        id: row.id,
        data: row,
      });
    }
  };

  // Merge row.settings into editor display
  const rowSettingsStyle = (() => {
    const s = row?.settings || {};
    const out = {};
    // Always apply background color from settings
    if (s.backgroundColor && s.backgroundColor !== 'transparent') {
      out.backgroundColor = s.backgroundColor;
    }
    // Apply background image
    if (s.backgroundImage) {
      out.backgroundImage = `url('${s.backgroundImage}')`;
      out.backgroundSize = s.backgroundSize || 'cover';
      out.backgroundPosition = s.backgroundPosition || 'center';
      out.backgroundRepeat = s.backgroundRepeat || 'no-repeat';
    }
    if (s.padding && typeof s.padding === 'object') {
      const { top = 0, right = 0, bottom = 0, left = 0 } = s.padding;
      if (top || right || bottom || left) {
        out.padding = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }
    if (s.margin && typeof s.margin === 'object') {
      const { top = 0, right = 0, bottom = 0, left = 0 } = s.margin;
      if (top || right || bottom || left) {
        out.margin = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }
    if (s.border && s.border !== 'none' && s.borderWidth) {
      out.border = `${s.borderWidth}px ${s.border} ${s.borderColor || '#000000'}`;
    }
    if (s.textAlign) {
      out.textAlign = s.textAlign;
    }
    if (s.boxSizing) {
      out.boxSizing = s.boxSizing;
    }
    if (s.width) {
      out.width = s.width;
    }
    if (s.height) {
      out.height = s.height;
    }
    if (s.minHeight) {
      out.minHeight = s.minHeight;
    }
    if (s.color) {
      out.color = s.color;
    }
    if (s.textColor) {
      out.color = s.textColor;
    }
    if (s.fontFamily) {
      out.fontFamily = s.fontFamily;
    }
    if (s.fontSize) {
      out.fontSize = s.fontSize;
    }
    if (s.fontWeight) {
      out.fontWeight = s.fontWeight;
    }
    if (s.lineHeight) {
      out.lineHeight = s.lineHeight;
    }
    if (s.letterSpacing) {
      out.letterSpacing = s.letterSpacing;
    }
    if (s.borderRadius) {
      out.borderRadius = `${s.borderRadius}px`;
    } else if (s.borderRadius === 0) {
      out.borderRadius = '0px';
    }
    if (s.display) {
      out.display = s.display;
    }
    if (s.justifyContent) {
      out.justifyContent = s.justifyContent;
    }
    if (s.alignItems) {
      out.alignItems = s.alignItems;
    }
    if (s.flexWrap) {
      out.flexWrap = s.flexWrap;
    }
    if (s.flexDirection) {
      out.flexDirection = s.flexDirection;
    }
    if (s.overflow) {
      out.overflow = s.overflow;
    }
    if (s.maxWidth) {
      out.maxWidth = s.maxWidth;
    }
    if (s.minWidth) {
      out.minWidth = s.minWidth;
    }
    if (s.maxHeight) {
      out.maxHeight = s.maxHeight;
    }
    if (s.minHeight) {
      out.minHeight = s.minHeight;
    }
    return out;
  })();

  return (
    <Box
      ref={(node) => drag(drop(node))}
      onClick={handleSelectRow}
      style={{
        ...rowStyle,
        ...rowSettingsStyle,
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        outline: isSelected ? '2px solid #3182ce' : 'none',
      }}
    >
      <Box position="absolute" top="2px" left="2px">
        <DragHandleIcon cursor="grab" />
      </Box>
      {row.columns.map((col) => (
        <DroppableColumn
          key={col.id}
          column={col}
          setComponents={setComponents}
          colSpan={col.size}
          parentId={parentId}
          rowId={row.id}
          updateSections={updateSections}
          syncEditorToHtml={syncEditorToHtml} // Pass syncEditorToHtml explicitly
          onSelect={onSelect}
          selectedTarget={selectedTarget}
        />
      ))}
      <Box position="absolute" top="2px" right="2px">
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            duplicateRow();
          }}
          colorScheme="blue"
          size="xs"
          icon={<AddIcon />}
          ml={2}
        />
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            removeRow(row, setComponents, parentId);
          }}
          colorScheme="red"
          size="xs"
          icon={<DeleteIcon />}
          ml={2}
        />
      </Box>
    </Box>
  );
};

export default DroppableRow;
export { moveRow };
