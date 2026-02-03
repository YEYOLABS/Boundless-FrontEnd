
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  AlertCircle,
  Receipt,
  LogOut,
  Truck,
  Settings,
  Users,
  Car
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  role: UserRole;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, onLogout }) => {
  const isOwner = role === 'owner';
  const isOps = role === 'ops' || role === 'owner';
  const isTourAgent = role === 'tour_manager' || role === 'owner';

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  ];

  if (isTourAgent) {
    menuItems.push({ name: 'Tours', icon: Map, path: '/tours' });
  }

  if (isOps) {
    menuItems.push(
      { name: 'Vehicles', icon: Truck, path: '/vehicles' },
      { name: 'Issues', icon: AlertCircle, path: '/issues' }
    );
  }

  if (isTourAgent || isOps) {
    menuItems.push({ name: 'Expenses', icon: Receipt, path: '/expenses' });
  }

  if (isOwner || role === 'ops') {
    menuItems.push({ name: 'Admin Control', icon: Users, path: '/admin' });
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform -translate-x-full lg:translate-x-0">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/30">
            <Truck size={24} />
          </div>
          Fleet<span className="text-indigo-400">Ops</span>
        </h1>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 ml-1">Terminal v1.2</p>
      </div>

      <nav className="flex-1 mt-4 px-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-5 py-4 rounded-2xl transition-all
              ${isActive 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                : 'hover:bg-slate-800 hover:text-white'}
            `}
          >
            <item.icon size={20} />
            <span className="font-bold text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800">
        <div className="bg-slate-800/50 p-4 rounded-2xl mb-4">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Authenticated as</p>
           <p className="text-xs font-bold text-indigo-400 uppercase tracking-tight">{role.replace('_', ' ')}</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-5 py-4 rounded-2xl hover:bg-rose-500/10 hover:text-rose-400 transition-all text-slate-400"
        >
          <LogOut size={20} />
          <span className="font-bold text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
