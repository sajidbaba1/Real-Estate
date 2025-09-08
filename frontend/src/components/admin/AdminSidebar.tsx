import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Users, Home, BarChart2, Map, CheckSquare, LogOut } from 'lucide-react';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
    isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
  }`;

const AdminSidebar: React.FC = () => {
  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 border-r bg-white/90 backdrop-blur">
      <div className="h-14 flex items-center px-4 border-b">
        <div className="flex items-center gap-2 text-primary-700 font-semibold">
          <Shield className="w-5 h-5" /> Admin Panel
        </div>
      </div>
      <nav className="p-3 space-y-1">
        <NavLink to="/dashboard/admin" className={navItemClass}>
          <Shield className="w-4 h-4" /> Dashboard
        </NavLink>
        <NavLink to="/admin/users" className={navItemClass}>
          <Users className="w-4 h-4" /> Users
        </NavLink>
        <NavLink to="/admin/properties" className={navItemClass}>
          <Home className="w-4 h-4" /> Properties
        </NavLink>
        <NavLink to="/admin/analytics" className={navItemClass}>
          <BarChart2 className="w-4 h-4" /> Analytics
        </NavLink>
        <NavLink to="/admin/locations" className={navItemClass}>
          <Map className="w-4 h-4" /> Locations
        </NavLink>
        <div className="pt-2 mt-2 border-t text-xs text-gray-500 px-3">Moderation</div>
        <NavLink to="/admin/properties" className={navItemClass}>
          <CheckSquare className="w-4 h-4" /> Approvals
        </NavLink>
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
        <a href="/" className="flex items-center gap-2 text-gray-500 text-sm hover:text-gray-700">
          <LogOut className="w-4 h-4" /> Back to site
        </a>
      </div>
    </aside>
  );
};

export default AdminSidebar;
