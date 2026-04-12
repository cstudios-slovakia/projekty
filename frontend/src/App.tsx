import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon, Euro, Briefcase, Loader2 } from 'lucide-react';
import { ProjectsTable } from './components/ProjectsTable';
import { DashboardKPIs } from './components/DashboardKPIs';
import { ExpensesView } from './components/ExpensesView';
import { Settings } from './components/Settings';
import { LeadReorder } from './components/LeadReorder';
import { SetupWizard } from './components/SetupWizard';

function Layout({ systemTitle, version }: { systemTitle: string, version: string }) {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const isProjectRoute = location.pathname === '/' || location.pathname === '/archive' || location.pathname === '/reorder';

  const sidebarLinkClass = (paths: string[]) => 
    `p-3 rounded-2xl transition-all flex items-center justify-center relative group ${
      paths.includes(location.pathname) 
        ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' 
        : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
    }`;

  const subNavClass = (path: string) => 
    `px-4 py-2 rounded-xl text-sm font-bold transition-all ${
      location.pathname === path 
        ? 'bg-gray-100 text-gray-900' 
        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
    }`;

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans selection:bg-[var(--color-primary)]/30 overflow-hidden">
      {/* Sidebar - Fixed Narrow */}
      <aside className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 z-50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] p-0.5 shadow-lg shadow-[var(--color-primary)]/10 mb-10">
          <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
            <span className="font-black text-[#0f172a] text-xs">CS</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <Link to="/" className={sidebarLinkClass(['/', '/archive', '/reorder'])} title="Projects">
            <Briefcase size={24} />
            <span className="absolute left-16 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 font-bold">Projects</span>
          </Link>
          <Link to="/expenses" className={sidebarLinkClass(['/expenses'])} title="Expenses">
            <Euro size={24} />
            <span className="absolute left-16 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 font-bold">Expenses</span>
          </Link>
          <Link to="/settings" className={sidebarLinkClass(['/settings'])} title="Settings">
            <SettingsIcon size={24} />
            <span className="absolute left-16 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 font-bold">Settings</span>
          </Link>
        </div>

        <button 
          onClick={handleLogout} 
          className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group relative"
          title="Logout"
        >
          <LogOut size={24} />
          <span className="absolute left-16 bg-red-600 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 font-bold">Logout</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">
                {isProjectRoute ? 'Projects' : location.pathname.replace('/', '').charAt(0).toUpperCase() + location.pathname.slice(2)}
              </h1>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                v{version}
              </span>
            </div>

            {/* Contextual Sub-Nav for Projects */}
            {isProjectRoute && (
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-2xl border border-gray-100 ml-4">
                <Link to="/" className={subNavClass('/')}>Active</Link>
                <Link to="/archive" className={subNavClass('/archive')}>Archived</Link>
                <Link to="/reorder" className={subNavClass('/reorder')}>Order View</Link>
              </div>
            )}
          </div>

          <div className="text-sm font-black text-gray-300 uppercase tracking-[0.2em]">{systemTitle}</div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/" element={<><DashboardKPIs /><ProjectsTable archivedView={false} /></>} />
              <Route path="/expenses" element={<ExpensesView />} />
              <Route path="/reorder" element={<LeadReorder />} />
              <Route path="/archive" element={<><h2 className="text-2xl text-gray-900 font-bold mb-4">Archived Projects</h2><ProjectsTable archivedView={true} /></>} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [version, setVersion] = useState('1.4.0');
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [systemSettings, setSystemSettings] = useState({ title: 'Lead Tracker', primary: '#e78b01', secondary: '#00b800' });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    // 1. Check if installed
    fetch('/api/status.php')
      .then(r => r.json())
      .then(res => {
        setIsInstalled(res.installed);
        setVersion(res.version || '1.0.0');
        if (res.installed) {
          // 2. If installed, fetch settings
          fetchSettings();
        }
      })
      .catch(() => setIsInstalled(false));
  }, []);

  const fetchSettings = () => {
    fetch('/api/system_settings.php')
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          const s = res.data;
          setSystemSettings({
            title: s.system_title || 'Lead Tracker',
            primary: s.accent_color_primary || '#e78b01',
            secondary: s.accent_color_secondary || '#00b800'
          });
          
          // Apply globally
          document.documentElement.style.setProperty('--color-primary', s.accent_color_primary || '#e78b01');
          document.documentElement.style.setProperty('--color-secondary', s.accent_color_secondary || '#00b800');
          document.title = s.system_title || 'Lead Tracker';
        }
      });
  };

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
        localStorage.setItem('token', data.user.token);
        setToken(data.user.token);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (e) {
      setError('Connection error');
    }
  };

  if (isInstalled === false) {
    return <SetupWizard onComplete={() => { window.location.reload(); }} />;
  }

  if (isInstalled === null) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-[#e78b01]" size={40} />
      </div>
    );
  }

  return (
    <HashRouter>
      {!token ? (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans relative overflow-hidden">
          {/* Soft Glow Effects */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--color-primary)]/5 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--color-secondary)]/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="w-full max-w-md bg-white rounded-[32px] p-8 border border-gray-200 shadow-2xl relative z-10 transition-all scale-in">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-gradient-to-tr from-[var(--color-primary)] to-yellow-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20 mb-6">
                <LogOut size={32} className="text-white rotate-180" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{systemSettings.title}</h2>
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
              <button type="submit" className="w-full bg-gradient-to-r from-[var(--color-primary)] to-yellow-500 hover:from-yellow-500 hover:to-[var(--color-primary)] text-white rounded-xl px-4 py-3.5 font-bold shadow-lg shadow-[var(--color-primary)]/20 transition-all active:scale-[0.98] mt-2">
                Sign In
              </button>
            </form>
          </div>
        </div>
      ) : (
        <Layout systemTitle={systemSettings.title} version={version} />
      )}
    </HashRouter>
  );
}

export default App;
