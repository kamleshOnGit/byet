import React from 'react';
import { Box, Text, SimpleGrid } from '@chakra-ui/react';
import DraggableComponent from './DraggableComponent';
import { COMPONENT_TYPES } from './componentTypes';

// All components without categorization
const allComponents = [
  COMPONENT_TYPES.TEXT,
  COMPONENT_TYPES.HEADING,
  COMPONENT_TYPES.PARAGRAPH,
  COMPONENT_TYPES.HEADER_1,
  COMPONENT_TYPES.HEADER_2,
  COMPONENT_TYPES.HEADER_3,
  COMPONENT_TYPES.ORDERED_LIST,
  COMPONENT_TYPES.UNORDERED_LIST,
  COMPONENT_TYPES.IMAGE,
  COMPONENT_TYPES.BUTTON,
  COMPONENT_TYPES.LINK,
  COMPONENT_TYPES.SOCIAL_LINK,
  COMPONENT_TYPES.SOCIAL_ICONS,
  COMPONENT_TYPES.HR,
  COMPONENT_TYPES.VIDEO,
  COMPONENT_TYPES.TABLE,
  COMPONENT_TYPES.SPACE,
  COMPONENT_TYPES.ICON,
  COMPONENT_TYPES.HTML,
  COMPONENT_TYPES.MENU
];

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
          {allComponents.map((type) => (
            <DraggableComponent key={type} type={type} />
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default DraggableComponents;
