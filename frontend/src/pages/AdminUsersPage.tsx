import React, { useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Shield, Briefcase, User, Loader2, Trash2, Pencil, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Role = 'ADMIN' | 'AGENT' | 'USER';

type AdminUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  enabled: boolean;
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'ADMIN': return <Shield className="w-4 h-4 text-red-600" />;
    case 'AGENT': return <Briefcase className="w-4 h-4 text-blue-600" />;
    case 'USER': return <User className="w-4 h-4 text-green-600" />;
    default: return <User className="w-4 h-4 text-gray-600" />;
  }
};

const AdminUsersPage: React.FC = () => {
  const { token } = useAuth();
  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'USER' as Role,
    enabled: true,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/admin/users`, { headers });
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
      const data = await res.json();
      setUsers(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => setForm({ firstName: '', lastName: '', email: '', password: '', role: 'USER', enabled: true });

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', role: u.role, enabled: u.enabled });
  };

  const createUser = async () => {
    try {
      setBusyId(-1);
      const res = await fetch(`${apiBase}/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form }),
      });
      if (res.status === 201) {
        setShowAdd(false);
        resetForm();
        fetchUsers();
      } else if (res.status === 409) {
        alert('Email already exists');
      } else {
        alert('Create user failed');
      }
    } finally {
      setBusyId(null);
    }
  };

  const updateUser = async () => {
    if (!editing) return;
    try {
      setBusyId(editing.id);
      const res = await fetch(`${apiBase}/admin/users/${editing.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...form }),
      });
      if (res.ok) {
        setEditing(null);
        resetForm();
        fetchUsers();
      } else {
        alert('Update failed');
      }
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (u: AdminUser, enabled: boolean) => {
    try {
      setBusyId(u.id);
      const res = await fetch(`${apiBase}/admin/users/${u.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) fetchUsers();
    } finally {
      setBusyId(null);
    }
  };

  const updateRole = async (u: AdminUser, role: Role) => {
    try {
      setBusyId(u.id);
      const res = await fetch(`${apiBase}/admin/users/${u.id}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role }),
      });
      if (res.ok) fetchUsers();
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (u: AdminUser) => {
    if (!confirm(`Delete user ${u.email}?`)) return;
    try {
      setBusyId(u.id);
      const res = await fetch(`${apiBase}/admin/users/${u.id}`, { method: 'DELETE', headers });
      if (res.status === 204) fetchUsers();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="w-7 h-7 mr-2 text-primary-600" /> User Management
            </h1>
            <p className="text-gray-600 mt-1">Manage platform users and their roles.</p>
          </div>
          <button onClick={() => { resetForm(); setShowAdd(true); }} className="btn-primary flex items-center">
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500"><Loader2 className="w-5 h-5 inline animate-spin mr-2" /> Loading users...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-500">No users found</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRoleIcon(u.role)}
                        <span className="ml-2 text-sm text-gray-900">{u.role === 'USER' ? 'CLIENT' : u.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.enabled ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                      >
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </button>
                      {u.enabled ? (
                        <button onClick={() => toggleStatus(u, false)} disabled={busyId === u.id} className="text-red-600 hover:text-red-900 inline-flex items-center disabled:opacity-50">
                          <XCircle className="w-4 h-4 mr-1" /> Deactivate
                        </button>
                      ) : (
                        <button onClick={() => toggleStatus(u, true)} disabled={busyId === u.id} className="text-green-600 hover:text-green-900 inline-flex items-center disabled:opacity-50">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Activate
                        </button>
                      )}
                      <button onClick={() => deleteUser(u)} disabled={busyId === u.id} className="text-gray-500 hover:text-gray-700 inline-flex items-center disabled:opacity-50">
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Add User</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field" placeholder="First name" />
                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field" placeholder="Last name" />
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field md:col-span-2" placeholder="Email" />
                <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field md:col-span-2" placeholder="Temporary password" type="password" />
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))} className="input-field md:col-span-2">
                  <option value="USER">Client</option>
                  <option value="AGENT">Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button onClick={createUser} disabled={busyId === -1} className="btn-primary disabled:opacity-50">{busyId === -1 ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Edit User</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field" placeholder="First name" />
                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field" placeholder="Last name" />
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field md:col-span-2" placeholder="Email" />
                <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field md:col-span-2" placeholder="New password (optional)" type="password" />
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))} className="input-field md:col-span-2">
                  <option value="USER">Client</option>
                  <option value="AGENT">Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
                    Enabled
                  </label>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button onClick={updateUser} disabled={busyId === editing.id} className="btn-primary disabled:opacity-50">{busyId === editing.id ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
