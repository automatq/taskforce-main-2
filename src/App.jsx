import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import IntroLoader from './components/IntroLoader';
import LandingPage from './components/LandingPage';
import JobBoard from './pages/JobBoard';
import JobDetail from './pages/JobDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider } from './hooks/useAuth';

function App() {
  const [introComplete, setIntroComplete] = useState(false);
  const location = useLocation();
  const showIntro = location.pathname === '/' && !introComplete;

  return (
    <AuthProvider>
      {showIntro && <IntroLoader onComplete={() => setIntroComplete(true)} />}
      <div className="bg-[#FAFAFA] text-stone-600 text-xl font-light antialiased min-h-screen flex flex-col relative scroll-smooth font-sans">
        <Navbar />
        <main className="flex-grow pt-20">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/jobs" element={<JobBoard />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
