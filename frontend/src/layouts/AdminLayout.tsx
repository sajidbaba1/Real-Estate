import React from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';

interface AdminLayoutProps {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ title, actions, children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 min-h-screen">
          <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">{title || 'Admin'}</h1>
              <div className="flex items-center gap-2">{actions}</div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
