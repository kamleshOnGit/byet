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

  return (
    <Box
      ref={(node) => drag(drop(node))}
      onClick={handleSelectRow}
      style={{
        ...rowStyle,
        border: isSelected ? '2px solid #3182ce' : rowStyle.border,
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
