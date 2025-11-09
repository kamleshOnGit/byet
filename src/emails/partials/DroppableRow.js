import React from 'react';
import { Box, IconButton, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { DragHandleIcon, AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useDrag, useDrop } from 'react-dnd';
import { rowStyle } from './componentStyles';
import DroppableColumn from './DroppableColumn';

// Utility Functions
const addColumn = (size, row, setComponents, parentId) => {
  if (row.columns.reduce((sum, col) => sum + col.size, 0) + size <= 12) {
    const newColumn = {
      id: Date.now(),
      label: `Column ${row.columns.length + 1}`,
      size,
      components: [],
    };
    setComponents((prevSections) => {
      const updated = [...prevSections];
      const sectionIndex = updated.findIndex((s) => s.id === parentId);
      const rowIndex = updated[sectionIndex].rows.findIndex((r) => r.id === row.id);
      updated[sectionIndex].rows[rowIndex].columns.push(newColumn);
      return updated;
    });
  }
};

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
const DroppableRow = ({ row, setComponents, parentId, index, moveRow, updateSections, syncEditorToHtml, onSelect, selectedComponent }) => {
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

  return (
    <Box
      ref={(node) => drag(drop(node))}
      style={{
        ...rowStyle,
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
          selectedComponent={selectedComponent}
        />
      ))}
      <Box position="absolute" top="2px" right="2px">
        <IconButton
          onClick={duplicateRow}
          colorScheme="blue"
          size="xs"
          icon={<AddIcon />}
          ml={2}
        />
        <IconButton
          onClick={() => removeRow(row, setComponents, parentId)}
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
