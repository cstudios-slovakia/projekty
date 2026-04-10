import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LogOut, Home, Archive, Settings as SettingsIcon, Menu, X, ListOrdered, DollarSign } from 'lucide-react';
import { ProjectsTable } from './components/ProjectsTable';
import { DashboardKPIs } from './components/DashboardKPIs';
import { ExpensesView } from './components/ExpensesView';
import { Settings } from './components/Settings';
import { LeadReorder } from './components/LeadReorder';

function Layout() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const navClass = (path: string) => 
    `flex items-center gap-3 px-6 py-3 md:py-2 rounded-xl transition-all text-sm md:text-sm font-medium ${location.pathname === path ? 'bg-white text-gray-900 shadow-sm shadow-gray-200/50 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50 w-full md:w-auto'}`;

  const NavLinks = () => (
    <>
      <Link to="/" onClick={() => setIsMenuOpen(false)} className={navClass('/')}><Home size={18} /> Active Projects</Link>
      <Link to="/expenses" onClick={() => setIsMenuOpen(false)} className={navClass('/expenses')}><DollarSign size={18} /> Expenses</Link>
      <Link to="/reorder" onClick={() => setIsMenuOpen(false)} className={navClass('/reorder')}><ListOrdered size={18} /> Order View</Link>
      <Link to="/archive" onClick={() => setIsMenuOpen(false)} className={navClass('/archive')}><Archive size={18} /> Archive</Link>
      <Link to="/settings" onClick={() => setIsMenuOpen(false)} className={navClass('/settings')}><SettingsIcon size={18} /> Settings</Link>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#e78b01]/30">
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e78b01] to-[#00b800] p-0.5 shadow-lg shadow-[#e78b01]/10">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <span className="font-black text-[#0f172a] text-sm">CS</span>
              </div>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap">
              Lead Tracker
            </h1>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
            <NavLinks />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout} 
              className="hidden md:flex text-gray-400 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-gray-100" 
              title="Logout"
            >
              <LogOut size={20} />
            </button>
            
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 bg-gray-50 rounded-xl border border-gray-100 shadow-sm"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Overlay */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 animate-fade-in p-4 flex flex-col gap-2">
            <div className="font-black text-[10px] text-gray-300 uppercase tracking-widest pl-2 mb-2">Navigation</div>
            <div className="flex flex-col gap-1 px-1">
              <NavLinks />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between px-2">
              <span className="text-xs text-gray-400 font-medium italic">Erik's Studio</span>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 text-sm font-bold text-red-500 bg-red-50 px-4 py-2 rounded-xl"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <Routes>
          <Route path="/" element={<><DashboardKPIs /><ProjectsTable archivedView={false} /></>} />
          <Route path="/expenses" element={<ExpensesView />} />
          <Route path="/reorder" element={<LeadReorder />} />
          <Route path="/archive" element={<><h2 className="text-2xl text-gray-900 font-bold mb-4">Archived Projects</h2><ProjectsTable archivedView={true} /></>} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (data.status === 'success') {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (e) {
      setError('Connection error');
    }
  };

  return (
    <BrowserRouter>
      {!token ? (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans relative overflow-hidden">
          {/* Soft Glow Effects */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#e78b01]/5 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#00b800]/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="w-full max-w-md bg-white rounded-[32px] p-8 border border-gray-200 shadow-2xl relative z-10 transition-all scale-in">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#e78b01] to-yellow-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-[#e78b01]/20 mb-6">
                <LogOut size={32} className="text-white rotate-180" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Lead Tracker</h2>
              <p className="text-gray-500">Sign in to your account</p>
            </div>
            {error && <div className="bg-red-50/20 text-red-600 border border-red-100 p-4 rounded-xl mb-6 text-sm text-center">{error}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Username</label>
                <input type="text" placeholder="e.g. admin" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e78b01]/20 focus:border-[#e78b01] transition-all" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Password</label>
                <input type="password" placeholder="••••••••" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e78b01]/20 focus:border-[#e78b01] transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-[#e78b01] to-yellow-500 hover:from-yellow-500 hover:to-[#e78b01] text-white rounded-xl px-4 py-3.5 font-bold shadow-lg shadow-[#e78b01]/20 transition-all active:scale-[0.98] mt-2">
                Sign In
              </button>
            </form>
          </div>
        </div>
      ) : (
        <Layout />
      )}
    </BrowserRouter>
  );
}

export default App;
