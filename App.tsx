
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState, AppDispatch } from './store/store.ts';
import { setCredentials, logout, toggleMockMode } from './store/authSlice.ts';
import Dashboard from './pages/Dashboard.tsx';
import Tours from './pages/Tours.tsx';
import TourDetail from './pages/TourDetail.tsx';
import Issues from './pages/Issues.tsx';
import Expenses from './pages/Expenses.tsx';
import Vehicles from './pages/Vehicles.tsx';
import VehicleDetail from './pages/VehicleDetail.tsx';
import Admin from './pages/Admin.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import { LogIn, Truck, IdCard, Database, Zap, Layers, UserCircle, AlertTriangle, Key, Sparkles, Map, Car, Receipt, Users, AlertCircle, LogOut } from 'lucide-react';
import { useFetch } from './hooks/useFetch.ts';
import { mockUsers } from './data/mockData.ts';
import { User, Tour, Vehicle, Issue, Expense, UserRole } from './types.ts';
import { NotificationProvider } from './contexts/NotificationContext';

const LoginScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isMockMode } = useSelector((state: RootState) => state.auth);
  const { loading, error, request } = useFetch<User>();
  const [loginForm, setLoginForm] = useState({ username: '', pin: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = await request('/authenticate', {
        method: 'POST',
        data: loginForm
      });
      if (userData) {
        dispatch(setCredentials({ user: userData, token: userData.token }));
      }
    } catch (err) {
      // Handled by error state in useFetch
    }
  };

  const handleQuickLogin = (username: string, pin: string) => {
    setLoginForm({ username, pin });
  };

  return (
    <div className="min-h-screen bg-animated-gradient flex items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Truck size={120} className="absolute top-10 left-10 text-white/10 animate-float" />
        <IdCard size={80} className="absolute bottom-20 right-20 text-white/10 animate-float" style={{ animationDelay: '2s' }} />
        <Zap size={60} className="absolute top-1/2 left-20 text-white/5 animate-pulse" />
        <Layers size={100} className="absolute top-20 right-1/4 text-white/10 animate-float" style={{ animationDelay: '4s' }} />
        <Truck size={150} className="absolute bottom-10 left-1/4 text-white/5 animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-zoomIn border border-white/20 relative z-10">
        <div className="bg-indigo-600/90 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Fleet<span className="text-indigo-200">Ops</span></h1>
          <p className="text-indigo-100/80 text-sm font-medium uppercase tracking-widest">Unified Terminal</p>
        </div>

        <div className="p-10 space-y-8">
          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 animate-fadeIn">
              <AlertTriangle size={18} />
              <p className="text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Username</label>
              <div className="relative">
                <UserCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-800 placeholder:text-slate-300 font-medium"
                  placeholder="e.g. ops1"
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Security PIN</label>
              <div className="relative">
                <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  maxLength={4}
                  className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-800 placeholder:text-slate-300 font-medium tracking-[0.5em]"
                  placeholder="••••"
                  value={loginForm.pin}
                  onChange={e => setLoginForm({ ...loginForm, pin: e.target.value })}
                />
              </div>
            </div>

            {/* <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isMockMode ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  <Database size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Database Engine</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{isMockMode ? 'Mock Simulation' : 'Production API'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dispatch(toggleMockMode())}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isMockMode ? 'bg-amber-400' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 transform ${isMockMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div> */}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                  Establish Connection
                </>
              )}
            </button>
          </form>

          {isMockMode && (
            <div className="pt-6 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Development Roles</p>
              <div className="grid grid-cols-2 gap-2">
                {mockUsers.map((u) => (
                  <button
                    key={u.uid}
                    onClick={() => handleQuickLogin(u.username, u.pin)}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-indigo-600 transition-colors shadow-sm">
                      <UserCircle size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-700">{u.username}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">{u.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isAIEnabled, setIsAIEnabled] = useState(false);

  const toursFetch = useFetch<Tour[]>();
  const vehiclesFetch = useFetch<Vehicle[]>();
  const issuesFetch = useFetch<Issue[]>();
  const expensesFetch = useFetch<Expense[]>();

  useEffect(() => {
    if (user) {
      // Reverted to /tours consistent with production backend
      toursFetch.request('/tours');
      vehiclesFetch.request('/get-vehicles');
      issuesFetch.request('/issues');
      // Only fetch expenses if user has permission (ops cannot view expenses)
      if (user.role !== 'ops') {
        expensesFetch.request('/expenses');
      }
    }
  }, [user]);

  if (!user) return <LoginScreen />;

  const contextData = {
    tours: toursFetch.data,
    vehicles: vehiclesFetch.data,
    issues: issuesFetch.data,
    expenses: expensesFetch.data
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  // Generate menu items based on role (same as Sidebar)
  const isOwner = user.role === 'owner';
  const isOps = user.role === 'ops' || user.role === 'owner';
  const isTourAgent = user.role === 'tour_manager' || user.role === 'owner';

  const menuItems = [];

  // Prioritize WHITEBOARD (Vehicles) for Ops/Owner
  if (isOps) {
    menuItems.push(
      { name: 'WHITEBOARD', icon: Truck, path: '/vehicles' },
      { name: 'Issues', icon: AlertCircle, path: '/issues' }
    );
  }

  if (isTourAgent) {
    menuItems.push({ name: 'ASSIGN', icon: Map, path: '/tours' });
  }

  if (isTourAgent || (isOps && user.role !== 'ops')) {
    menuItems.push({ name: 'Expenses', icon: Receipt, path: '/expenses' });
  }

  if (isOwner || user.role === 'ops') {
    menuItems.push({ name: 'Admin Control', icon: Users, path: '/admin' });
  }

  const firstTabPath = menuItems[0]?.path;

  const HorizontalTabs = () => {
    const location = useLocation();
    return (
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="px-8 flex justify-between items-center">
          <div className="flex overflow-x-auto no-scrollbar">
            {menuItems.map((item) => {
              const isActiveOrDashboard = location.pathname === '/' && item.path === firstTabPath;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    px-8 py-5 flex items-center gap-2 border-b-4 font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap
                    ${isActive || isActiveOrDashboard
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'}
                  `}
                >
                  <item.icon size={16} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors text-xs font-bold uppercase tracking-widest whitespace-nowrap ml-4"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    );
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 font-sans">
        <header className="flex lg:hidden justify-between items-center p-6 border-b border-slate-100 bg-white">
          <h1 className="text-xl font-bold text-slate-800">FleetOps</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <LogOut size={16} />
              Sign Out
            </button>
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Horizontal Tabs Navigation - styled like VehicleDetail */}
        <HorizontalTabs />

        <main className="p-6 md:p-10">
          <Routes>
            <Route path="/" element={<Navigate to={firstTabPath} />} />
            <Route path="/tours" element={<Tours />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/vehicles/:id" element={<VehicleDetail />} />
            <Route path="/tours/:id" element={<TourDetail />} />
            <Route path="/issues" element={<Issues />} />
            <Route path="/expenses" element={<Expenses role={user.role} />} />
            <Route path="/maintenance" element={<Issues />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>

          {/* AI Trigger FAB */}
          <button
            onClick={() => setIsAIEnabled(true)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Sparkles className="relative z-10" size={24} />
            <div className="absolute -top-12 group-hover:-top-16 transition-all bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap shadow-xl">
              Ops Intelligence
            </div>
          </button>

          <AIAssistant
            isOpen={isAIEnabled}
            onClose={() => setIsAIEnabled(false)}
            contextData={contextData}
          />
        </main>
      </div>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <NotificationProvider>
        <MainApp />
      </NotificationProvider>
    </Provider>
  );
};

export default App;
