import React, { useState } from 'react';
import { Box, Tabs, TabList, Tab, TabPanels, TabPanel } from '@chakra-ui/react';
import DraggableComponents from './DraggableComponents';
import RowLayouts from './RowLayouts';
import SettingsPanel from './SettingsPanel';

const EditorTabs = ({ selectedComponent, onComponentUpdate }) => {
  const [activeTab, setActiveTab] = useState(0);

  // Tab configuration
  const tabs = [
    {
      name: 'Contents',
      component: <DraggableComponents />
    },
    {
      name: 'Rows',
      component: <RowLayouts />
    },
    {
      name: 'Settings',
      component: <SettingsPanel 
        selectedComponent={selectedComponent} 
        onUpdateComponent={onComponentUpdate} 
      />
    }
  ];

  return (
    <Box w="100%" h="100%" bg="white" borderRadius="md" boxShadow="sm" display="flex" flexDirection="column">
      <Tabs
        variant="soft-rounded"
        colorScheme="blue"
        index={activeTab}
        onChange={setActiveTab}
        h="100%"
        display="flex"
        flexDirection="column"
      >
        <TabList
          display="flex"
          justifyContent="center"
          p={2}
          borderBottom="1px solid"
          borderColor="gray.200"
          flexWrap="wrap"
          bg="white"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              fontSize="sm"
              fontWeight="medium"
              py={2}
              px={4}
              mx={1}
              my={1}
              _selected={{
                color: 'white',
                bg: 'blue.500'
              }}
              _hover={{
                bg: 'gray.100'
              }}
              borderRadius="full"
            >
              {tab.name}
            </Tab>
          ))}
        </TabList>

        <TabPanels flex="1" overflowY="auto">
          {tabs.map((tab, index) => (
            <TabPanel key={index} h="100%" p={0}>
              {tab.component}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default EditorTabs;
