import React from 'react';
import { Box, Text, SimpleGrid } from '@chakra-ui/react';
import DraggableComponent from './DraggableComponent';
import { COMPONENT_LIBRARY } from './componentRegistry';

const DraggableComponents = () => {
  return (
    <Box w="100%" h="100%" bg="white" borderRadius="md" boxShadow="sm" display="flex" flexDirection="column">
      <Text 
        fontSize="sm" 
        fontWeight="bold" 
        p={3} 
        textAlign="center" 
        borderBottom="1px solid" 
        borderColor="gray.200"
        bg="gray.50"
      >
        Components
      </Text>
      <Box flex="1" overflowY="auto" p={3}>
        <SimpleGrid columns={3} spacing={2}>
          {COMPONENT_LIBRARY.map((def) => (
            <DraggableComponent key={def.type} definition={def} />
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default DraggableComponents;
