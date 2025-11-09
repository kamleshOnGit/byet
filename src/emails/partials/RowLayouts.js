import React from 'react';
import { Box, Text, SimpleGrid, Button } from '@chakra-ui/react';
import { useDrag } from 'react-dnd';

// Common row layouts
const rowLayouts = [
  { 
    name: '1 Column', 
    layout: [{ size: 12, label: 'Column 1' }],
    preview: '│████████████│'
  },
  { 
    name: '2 Columns', 
    layout: [
      { size: 6, label: 'Column 1' }, 
      { size: 6, label: 'Column 2' }
    ],
    preview: '│██████│██████│'
  },
  { 
    name: '3 Columns', 
    layout: [
      { size: 4, label: 'Column 1' }, 
      { size: 4, label: 'Column 2' },
      { size: 4, label: 'Column 3' }
    ],
    preview: '│████│████│████│'
  },
  { 
    name: 'Left Sidebar', 
    layout: [
      { size: 4, label: 'Sidebar' }, 
      { size: 8, label: 'Content' }
    ],
    preview: '│████│████████│'
  },
  { 
    name: 'Right Sidebar', 
    layout: [
      { size: 8, label: 'Content' }, 
      { size: 4, label: 'Sidebar' }
    ],
    preview: '│████████│████│'
  },
  { 
    name: 'Three Equal', 
    layout: [
      { size: 4, label: 'Left' }, 
      { size: 4, label: 'Center' },
      { size: 4, label: 'Right' }
    ],
    preview: '│████│████│████│'
  },
  { 
    name: 'Wide Center', 
    layout: [
      { size: 3, label: 'Left' }, 
      { size: 6, label: 'Center' },
      { size: 3, label: 'Right' }
    ],
    preview: '│███│██████│███│'
  },
];

const DraggableRowLayout = ({ layout }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ROW_LAYOUT',
    item: { layout: layout.layout },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <Button
      ref={drag}
      p={3}
      bg="white"
      rounded="md"
      boxShadow="sm"
      cursor="grab"
      opacity={isDragging ? 0.5 : 1}
      _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
      w="100%"
      display="flex"
      flexDirection="column"
      alignItems="center"
      transition="all 0.2s ease"
      border="1px solid"
      borderColor="gray.200"
      mb={2}
    >
      <Text fontSize="xs" fontWeight="bold" mb={1}>{layout.name}</Text>
      <Text fontSize="xs" fontFamily="monospace" color="gray.500">
        {layout.preview}
      </Text>
    </Button>
  );
};

const RowLayouts = () => {
  return (
    <Box w="100%" h="100%" p={2}>
      <Text fontSize="sm" fontWeight="bold" mb={3} textAlign="center">
        Row Layouts
      </Text>
      <SimpleGrid columns={2} spacing={2}>
        {rowLayouts.map((layout, index) => (
          <DraggableRowLayout key={index} layout={layout} />
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default RowLayouts;
