import React, { useState } from 'react';
import { Database, ShieldCheck, Loader2, CheckCircle2, AlertCircle, ChevronRight, Server, Key, User } from 'lucide-react';


export const SetupWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    driver: 'mysql',
    host: 'localhost',
    port: '3306',
    db_name: '',
    username: '',
    password: '',
    prefix: '',
    admin_password: '',
    default_language: 'en'
  });

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.host || !formData.db_name || !formData.username) {
        setError('Please fill all database fields');
        return;
      }
      setStep(2);
      setError('');
    } else if (step === 2) {
      if (!formData.admin_password) {
        setError('Please set an admin password');
        return;
      }
      runInstallation();
    }
  };

  const runInstallation = async () => {
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/install.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStatus('success');
        setTimeout(() => onComplete(), 2000);
      } else {
        setStatus('error');
        setError(data.message || 'Installation failed');
      }
    } catch (e) {
      setStatus('error');
      setError('Connection error occurred');
    }
  };

  const inputClass = "w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e78b01]/20 focus:border-[#e78b01] transition-all";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5 ml-1";

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-gray-100 relative z-10 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-[#0f172a] p-8 text-white flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#e78b01] to-yellow-500 flex items-center justify-center">
              <span className="font-black text-xs">CS</span>
            </div>
            <span className="font-bold tracking-tight">Setup Wizard</span>
          </div>

          <div className="space-y-6">
            <div className={`flex items-center gap-3 transition-opacity ${step === 1 ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step >= 1 ? 'border-[#e78b01] bg-[#e78b01] text-white' : 'border-gray-600'}`}>1</div>
              <span className="font-medium">Database</span>
            </div>
            <div className={`flex items-center gap-3 transition-opacity ${step === 2 ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step >= 2 ? 'border-[#e78b01] bg-[#e78b01] text-white' : 'border-gray-600'}`}>2</div>
              <span className="font-medium">System Settings</span>
            </div>
            <div className={`flex items-center gap-3 transition-opacity ${step === 3 || status === 'success' ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${status === 'success' ? 'border-green-500 bg-green-500 text-white' : 'border-gray-600'}`}>3</div>
              <span className="font-medium">Finish</span>
            </div>
          </div>

          <div className="mt-auto pt-10">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">CStudios Software</p>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-8 md:p-12">
          {status === 'success' ? (
            <div className="h-full flex flex-col items-center justify-center text-center animate-scale-in">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} className="text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Installation Complete!</h2>
              <p className="text-gray-500 mb-8">Redirecting you to the login screen...</p>
              <Loader2 className="animate-spin text-[#e78b01]" size={32} />
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {step === 1 ? 'Connect your database' : 'System Configuration'}
                </h2>
                <p className="text-gray-500 text-sm">
                  {step === 1 ? 'Enter your server credentials to initialize the software.' : 'Create the first admin account to manage your projects.'}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-6 flex items-start gap-3 text-red-600 animate-slide-up">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {step === 1 ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className={labelClass}>Driver</label>
                      <select 
                        className={inputClass}
                        value={formData.driver}
                        onChange={e => {
                          const driver = e.target.value;
                          setFormData({...formData, driver, port: driver === 'pgsql' ? '5432' : '3306'});
                        }}
                      >
                        <option value="mysql">MySQL / MariaDB</option>
                        <option value="pgsql">PostgreSQL</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>Server</label>
                      <div className="relative">
                        <Server size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" className={`${inputClass} pl-11`} placeholder="localhost" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>Port</label>
                      <input type="text" className={inputClass} placeholder={formData.driver === 'pgsql' ? '5432' : '3306'} value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Database Name</label>
                      <div className="relative">
                        <Database size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" className={`${inputClass} pl-11`} placeholder="lead_tracker_db" value={formData.db_name} onChange={e => setFormData({...formData, db_name: e.target.value})} />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>Username</label>
                      <div className="relative">
                        <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" className={`${inputClass} pl-11`} placeholder="db_user" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>Password</label>
                      <div className="relative">
                        <Key size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="password" className={`${inputClass} pl-11`} placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className={labelClass}>System Admin Username</label>
                      <input type="text" className={inputClass} value="admin" disabled />
                      <p className="text-[10px] text-gray-400 mt-1 ml-1">Default administrator username is 'admin'</p>
                    </div>
                    <div>
                      <label className={labelClass}>Admin Password</label>
                      <div className="relative">
                        <ShieldCheck size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="password" className={`${inputClass} pl-11`} placeholder="Set a strong password" value={formData.admin_password} onChange={e => setFormData({...formData, admin_password: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Default System Language</label>
                      <select 
                        className={inputClass}
                        value={formData.default_language}
                        onChange={e => setFormData({...formData, default_language: e.target.value})}
                      >
                        <option value="en">🇺🇸 English</option>
                        <option value="sk">🇸🇰 Slovenský</option>
                        <option value="hu">🇭🇺 Magyar</option>
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1 ml-1">The interface will default to this language for new users.</p>
                    </div>
                  </div>
                )}

                <div className="pt-6 flex gap-3">
                  {step === 2 && (
                    <button 
                      onClick={() => setStep(1)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-6 py-4 font-bold transition-all"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    onClick={handleNext}
                    disabled={status === 'loading'}
                    className="flex-[2] bg-gradient-to-r from-[#e78b01] to-yellow-500 hover:opacity-90 text-white rounded-xl px-6 py-4 font-bold shadow-lg shadow-[#e78b01]/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    {status === 'loading' ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        {step === 1 ? 'Save & Continue' : 'Install Software'}
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
