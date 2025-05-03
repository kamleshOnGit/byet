import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EmailList from './emails/email-list';
import CreateTemplate from './emails/create-email';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Box, ChakraProvider, Flex, Link, Text } from '@chakra-ui/react';

// Updated Nav component using Chakra UI elements
function Nav() {
  return (
    <Flex as="nav" bg="teal.500" p={4} color="white" justify="space-between">
      <Link href="/" _hover={{ textDecoration: 'none', color: 'teal.200' }}>
        <Text fontSize="lg" fontWeight="bold">Email List</Text>
      </Link>
      <Link href="/create" _hover={{ textDecoration: 'none', color: 'teal.200' }}>
        <Text fontSize="lg" fontWeight="bold">Create Template</Text>
      </Link>
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
