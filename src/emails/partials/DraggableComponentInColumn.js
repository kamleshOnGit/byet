import React from 'react';
import { Box } from '@chakra-ui/react';
import { useDrag, useDrop } from 'react-dnd';
import EmailComponent from './EmailComponent';
import { useEditorStore } from '../editorStore';

const DraggableComponentInColumn = ({ component, index, columnId, parentId, rowId, onSelect, selectedTarget }) => {
  const reorderComponentsInColumn = useEditorStore((state) => state.reorderComponentsInColumn);
  const updateSections = useEditorStore((state) => state.updateSections);

  const [, drag] = useDrag({
    type: 'COMPONENT',
    item: { index },
  });

  const [, drop] = useDrop({
    accept: 'COMPONENT',
    hover: (item) => {
      if (item.index !== index) {
        reorderComponentsInColumn(parentId, rowId, columnId, item.index, index);
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
        width: 'fit-content',
        maxWidth: '100%',
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
