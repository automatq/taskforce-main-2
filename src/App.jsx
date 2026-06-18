import { useState } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import IntroLoader from './components/IntroLoader';
import LandingPage from './components/LandingPage';
import JobBoard from './pages/JobBoard';
import JobDetail from './pages/JobDetail';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Jobs from './pages/admin/Jobs';
import Applicants from './pages/admin/Applicants';
import Agents from './pages/admin/Agents';
import Employers from './pages/admin/Employers';
import Billing from './pages/admin/Billing';
import Documents from './pages/admin/Documents';
import Settings from './pages/admin/Settings';
import { AuthProvider } from './hooks/useAuth';

// Public marketing/job-board shell — light theme with Navbar/Footer chrome.
function PublicLayout() {
  const [introComplete, setIntroComplete] = useState(false);
  const location = useLocation();
  const showIntro = location.pathname === '/' && !introComplete;

  return (
    <>
      {showIntro && <IntroLoader onComplete={() => setIntroComplete(true)} />}
      <div className="bg-[#FAFAFA] text-stone-600 text-xl font-light antialiased min-h-screen flex flex-col relative scroll-smooth font-sans">
        <Navbar />
        <main className="flex-grow pt-20">
          <Outlet />
        </main>
        <Footer />
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Admin login (dark, standalone — matches /admin exactly) */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* Admin app shell (dark) with nested sections */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="applicants" element={<Applicants />} />
          <Route path="agents" element={<Agents />} />
          <Route path="employers" element={<Employers />} />
          <Route path="billing" element={<Billing />} />
          <Route path="documents" element={<Documents />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Public site (light) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/jobs" element={<JobBoard />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
