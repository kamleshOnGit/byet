import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EmailList from './emails/email-list';
import CreateTemplate from './emails/create-email';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
