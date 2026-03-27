import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EmailList from './emails/email-list';
import CreateTemplate from './emails/create-email';
import { useLocation } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Box, ChakraProvider, Flex, Text } from '@chakra-ui/react';

// Updated Nav component using Chakra UI elements
function Nav() {
  const location = useLocation();
  const isCreate = location?.pathname === '/create';

  return (
    <Flex as="nav" bg="teal.500" p={4} color="white" justify={isCreate ? 'flex-start' : 'center'}>
      <Text fontSize="lg" fontWeight="bold">Templato</Text>
    </Flex>
  );
}

function App() {
  return (
    <ChakraProvider>
      <Box>
        {/* Nav component always visible */}
        <Router>
          <Nav />

          {/* Routes control the content below the nav */}
          <Box className='content' p={4}>
            <Routes>
              <Route path='/' element={<EmailList />} />

              {/* Wrap CreateTemplate in DndProvider */}
              <Route
                path='/create'
                element={
                  <DndProvider backend={HTML5Backend}>
                    <CreateTemplate />
                  </DndProvider>
                }
              />
            </Routes>
          </Box>
        </Router>
      </Box>
    </ChakraProvider>
  );
}

export default App;
