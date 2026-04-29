import { ReactNode, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from './pages/home';
import { ChatPage } from './pages/chat';
import { ProfilePage } from './pages/profile';
import { PricingPage } from './pages/pricing';
import './styles/globals.css';

function App() {
  useEffect(() => {
    // Initialize app
    console.log('🚀 AAJA Live initialized');
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
        <Toaster position="bottom-center" />
      </div>
    </Router>
  );
}

export default App;
