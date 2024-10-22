import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EmailList from './emails/email-list';
import CreateTemplate from './emails/create-email';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Simple Nav component for navigation
function Nav() {
  return (
    <nav>
      <ul>
        <li>
          <a href='/'>Email List</a>
        </li>
        <li>
          <a href='/create'>Create Template</a>
        </li>
      </ul>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div>
        {/* Nav component always visible */}
        <Nav />

        {/* Routes control the content below the nav */}
        <div className='content'>
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
        </div>
      </div>
    </Router>
  );
}

export default App;
