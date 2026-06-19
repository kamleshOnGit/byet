import React from 'react';
import { Box } from '@chakra-ui/react';
import { useDrop } from 'react-dnd';
import { COMPONENT_TYPES } from './componentTypes';
import { columnParentStyle } from './componentStyles';
import DraggableComponentInColumn from './DraggableComponentInColumn';
import { createComponentInstance } from './componentRegistry';
import { useEditorStore } from '../editorStore';

const DroppableColumn = ({ column, colSpan, parentId, rowId, syncEditorToHtml, onSelect, selectedTarget }) => {
  const addComponentToColumn = useEditorStore((state) => state.addComponentToColumn);

  const [, drop] = useDrop({
    accept: Object.values(COMPONENT_TYPES),
    drop: (item, monitor) => {
      if (monitor.didDrop()) {
        return undefined;
      }
      const newComponent = createComponentInstance(item.type);
      addComponentToColumn(parentId, rowId, column.id, newComponent);
      syncEditorToHtml();


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
    // Do NOT apply imported border styles to editor columns — they come from HTML source
    // elements like table wrappers and produce wrong white/colored borders in the editor.
    if (s.borderRadius || s.borderRadius === 0) {
      out.borderRadius = `${s.borderRadius}px`;
    }
    if (s.textAlign) {
      out.textAlign = s.textAlign;
    }
    // Note: don't apply float or display from imported settings here — they break
    // the flex-based editor column layout. The row uses display:flex with flex children.
    if (s.alignSelf) {
      out.alignSelf = s.alignSelf;
    }
    if (s.justifyContent) {
      out.justifyContent = s.justifyContent;
    }
    if (s.alignItems) {
      out.alignItems = s.alignItems;
    }
    if (s.flexDirection) {
      out.flexDirection = s.flexDirection;
    }
    if (s.flexWrap) {
      out.flexWrap = s.flexWrap;
    }
    // Do NOT apply imported width/height to editor columns — column width
    // is controlled by col.size (flex layout), not inherited CSS pixel values.
    if (s.minHeight) {
      out.minHeight = s.minHeight;
    }
    if (s.maxHeight) {
      out.maxHeight = s.maxHeight;
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

  const basis = `${((Number(colSpan) || 12) / 12) * 100}%`;

  return (
    <Box
      ref={drop}
      onClick={handleSelectColumn}
      _hover={{ outline: isSelected ? '2px solid #3182ce' : '1px dashed #cbd5e0' }}
      style={{
        ...columnParentStyle(colSpan),
        ...colSettingsStyle,
        flex: `0 0 ${basis}`,
        width: basis,
        maxWidth: basis,
        minWidth: 0,
        boxSizing: 'border-box',
        outline: isSelected ? '2px solid #3182ce' : 'none',
        display: 'flex',
        flexDirection: column?.settings?.flexDirection || 'column',
        justifyContent: column?.settings?.justifyContent || 'flex-start',
        alignItems: column?.settings?.alignItems || (column?.settings?.textAlign === 'center' ? 'center' : (column?.settings?.textAlign === 'right' ? 'flex-end' : 'stretch')),
        overflow: 'hidden',
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
            onSelect={onSelect}
            selectedTarget={selectedTarget}
          />
        ))}

      {/* Render nestedRows — multi-column sub-layouts from complex template imports.
          These are shown read-only in the editor as a visual preview row so the user
          can see the imported content.  They can be promoted to full editor rows via
          the store once the user interacts with them. */}
      {(column.nestedRows || []).length > 0 && (
        <Box width="100%" mt={0}>
          {(column.nestedRows || []).map((nestedRow) => (
            <Box
              key={nestedRow.id}
              display="flex"
              flexDirection="row"
              width="100%"
              style={{
                backgroundColor: nestedRow?.settings?.backgroundColor && nestedRow.settings.backgroundColor !== 'transparent'
                  ? nestedRow.settings.backgroundColor : undefined,
              }}
            >
              {(nestedRow.columns || []).map((nestedCol) => {
                const nestedBasis = `${(((Number(nestedCol.size) || 12) / 12) * 100)}%`;
                return (
                  <Box
                    key={nestedCol.id}
                    style={{
                      flex: `0 0 ${nestedBasis}`,
                      width: nestedBasis,
                      maxWidth: nestedBasis,
                      minWidth: 0,
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      backgroundColor: nestedCol?.settings?.backgroundColor && nestedCol.settings.backgroundColor !== 'transparent'
                        ? nestedCol.settings.backgroundColor : undefined,
                      padding: nestedCol?.settings?.padding
                        ? `${nestedCol.settings.padding.top || 0}px ${nestedCol.settings.padding.right || 0}px ${nestedCol.settings.padding.bottom || 0}px ${nestedCol.settings.padding.left || 0}px`
                        : undefined,
                    }}
                  >
                    {(nestedCol.components || []).map((nestedComp, nestedIdx) => (
                      <DraggableComponentInColumn
                        key={nestedComp.id}
                        component={nestedComp}
                        index={nestedIdx}
                        columnId={nestedCol.id}
                        parentId={parentId}
                        rowId={rowId}
                        onSelect={onSelect}
                        selectedTarget={selectedTarget}
                      />
                    ))}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default DroppableColumn;
