import React from 'react';
import { Box } from '@chakra-ui/react';
import { useDrag, useDrop } from 'react-dnd';
import EmailComponent from './EmailComponent';

const DraggableComponentInColumn = ({ component, index, columnId, parentId, rowId, updateSections, onSelect, selectedTarget }) => {
  const [, drag] = useDrag({
    type: 'COMPONENT',
    item: { index },
  });

  const [, drop] = useDrop({
    accept: 'COMPONENT',
    hover: (item) => {
      if (item.index !== index) {
        updateSections((prevSections) => {
          const updated = [...prevSections];
          const sectionIndex = updated.findIndex((s) => s.id === parentId);
          const rowIndex = updated[sectionIndex].rows.findIndex((r) => r.id === rowId);
          const columnIndex = updated[sectionIndex].rows[rowIndex].columns.findIndex((c) => c.id === columnId);

          const components = updated[sectionIndex].rows[rowIndex].columns[columnIndex].components;
          const [draggedComponent] = components.splice(item.index, 1);
          components.splice(index, 0, draggedComponent);

          return updated;
        });
        item.index = index;
      }
    },
  });

  // Check if this component is selected
  const isSelected = selectedTarget?.kind === 'component' && selectedTarget?.id === component.id;
  
  return (
    <Box
      ref={(node) => drag(drop(node))}
      style={{
        border: '1px solid transparent',
        margin: '4px 0',
        padding: 0,
        backgroundColor: 'transparent',
        cursor: 'grab',
        outline: isSelected ? '2px solid #3182ce' : 'none',
        boxShadow: 'none',
      }}
    >
      <EmailComponent
        component={component}
        parentId={parentId}
        rowId={rowId}
        columnId={columnId}
        setSections={updateSections} // Pass updateSections instead of setSections
        onSelect={onSelect}
        selectedTarget={selectedTarget}
      />
    </Box>
  );
};

export default DraggableComponentInColumn;
