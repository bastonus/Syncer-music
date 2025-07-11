import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SharePage from './pages/SharePage';
import SettingsPage from './pages/SettingsPage'; // Import the new page
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/share/:shareId" element={<SharePage />} />
          <Route path="/settings" element={<SettingsPage />} /> {/* Add the settings route */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
