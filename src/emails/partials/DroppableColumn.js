import React from 'react';
import { Box } from '@chakra-ui/react';
import { useDrop } from 'react-dnd';
import { COMPONENT_TYPES } from './componentTypes';
import { columnParentStyle } from './componentStyles';
import DraggableComponentInColumn from './DraggableComponentInColumn';
import { createComponentInstance } from './componentRegistry';

const DroppableColumn = ({ column, colSpan, parentId, rowId, updateSections, syncEditorToHtml, onSelect, selectedTarget }) => {
  const [, drop] = useDrop({
    accept: Object.values(COMPONENT_TYPES),
    drop: (item) => {
      const newComponent = createComponentInstance(item.type);
      updateSections((prevSections) => {
        const updated = [...prevSections];
        const sectionIndex = updated.findIndex((s) => s.id === parentId);
        const rowIndex = updated[sectionIndex].rows.findIndex((r) => r.id === rowId);
        const columnIndex = updated[sectionIndex].rows[rowIndex].columns.findIndex((c) => c.id === column.id);

        if (!updated[sectionIndex].rows[rowIndex].columns[columnIndex].components) {
          updated[sectionIndex].rows[rowIndex].columns[columnIndex].components = [];
        }

        updated[sectionIndex].rows[rowIndex].columns[columnIndex].components.push(newComponent);
        return updated;
      });

      // Ensure HTML is synchronized after the drop event
      if (typeof syncEditorToHtml === 'function') {
        syncEditorToHtml();
      } else {
        console.error('syncEditorToHtml is not a function');
      }

      return { droppedInColumn: true };
    },
  });

  // Check if this column is selected (when no component is selected but column itself might be)
  // For now, we'll just focus on component selection visualization
  const isSelected = selectedTarget?.kind === 'column' && selectedTarget?.id === column.id;

  const handleSelectColumn = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect({
        kind: 'column',
        id: column.id,
        data: column,
      });
    }
  };
  
  // Merge column.settings into editor display
  const colSettingsStyle = (() => {
    const s = column?.settings || {};
    const out = {};
    // Always apply background color
    if (s.backgroundColor && s.backgroundColor !== 'transparent') {
      out.backgroundColor = s.backgroundColor;
    }
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
    if (s.borderRadius) {
      out.borderRadius = `${s.borderRadius}px`;
    }
    if (s.textAlign) {
      out.textAlign = s.textAlign;
    }
    if (s.boxSizing) {
      out.boxSizing = s.boxSizing;
    }
    if (s.display) {
      out.display = s.display;
    }
    if (s.float) {
      out.float = s.float;
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
    return out;
  })();

  return (
    <Box
      ref={drop}
      onClick={handleSelectColumn}
      style={{
        ...columnParentStyle(colSpan),
        ...colSettingsStyle,
        outline: isSelected ? '2px solid #3182ce' : 'none',
        display: column?.settings?.display || 'flex',
        flexDirection: column?.settings?.flexDirection || 'column',
        height: '100%',
        minHeight: 'min-content',
        flex: '1 0 auto',
        justifyContent: column?.settings?.justifyContent || 'flex-start',
        alignItems: column?.settings?.alignItems || (column?.settings?.textAlign === 'center' ? 'center' : (column?.settings?.textAlign === 'right' ? 'flex-end' : 'stretch')),
        overflow: 'visible',
      }}
    >
      {isSelected && <Box position="absolute" top="2px" right="6px" fontSize="xs" color="gray.500" zIndex={1}>{column.label}</Box>}
      {column.components &&
        column.components.map((comp, compIndex) => (
          <DraggableComponentInColumn
            key={comp.id}
            component={comp}
            index={compIndex}
            columnId={column.id}
            parentId={parentId}
            rowId={rowId}
            updateSections={updateSections}
            onSelect={onSelect}
            selectedTarget={selectedTarget}
          />
        ))}
    </Box>
  );
};

export default DroppableColumn;
