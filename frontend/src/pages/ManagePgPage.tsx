import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BedDouble, BedSingle, Plus, Trash2, Loader2, Edit, Building } from 'lucide-react';

type RoomType = 'PRIVATE' | 'SHARED';
type RoomCategory = 'BOYS' | 'GIRLS' | 'FAMILY';

type PgRoom = {
  id: number;
  roomNumber: string;
  description?: string;
  roomType: RoomType;
  roomCategory?: RoomCategory;
  privateRoomPrice?: number;
  bedPrice?: number;
  totalBeds?: number;
  availableBeds?: number;
  roomSizeSqft?: number;
};

type PgBed = {
  id: number;
  bedNumber: string;
};

const ManagePgPage: React.FC = () => {
  const { id } = useParams();
  const propertyId = Number(id);
  const { token } = useAuth();

  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [rooms, setRooms] = useState<PgRoom[]>([]);
  const [beds, setBeds] = useState<Record<number, PgBed[]>>({});
  const [busy, setBusy] = useState<string|null>(null);

  const [roomForm, setRoomForm] = useState<{
    roomNumber: string;
    description: string;
    roomType: RoomType;
    roomCategory: RoomCategory;
    privateRoomPrice?: string;
    bedPrice?: string;
    totalBeds?: string;
    roomSizeSqft?: string;
  }>({ roomNumber: '', description: '', roomType: 'PRIVATE', roomCategory: 'FAMILY' });

  const [bedForm, setBedForm] = useState<Record<number, string>>({});

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/pg/rooms/property/${propertyId}`, { headers });
      if (!res.ok) throw new Error(`Failed to load rooms (${res.status})`);
      const data = await res.json();
      setRooms(data);
      // Preload beds for SHARED rooms
      const shared = data.filter((r: PgRoom) => r.roomType === 'SHARED');
      const bedMap: Record<number, PgBed[]> = {};
      for (const r of shared) {
        const br = await fetch(`${apiBase}/pg/beds/room/${r.id}`, { headers });
        if (br.ok) bedMap[r.id] = await br.json();
      }
      setBeds(bedMap);
    } catch (e: any) {
      setError(e.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (propertyId) loadRooms(); /* eslint-disable-next-line */ }, [propertyId]);

  const createRoom = async () => {
    try {
      setBusy('create-room');
      const body: any = {
        propertyId,
        roomNumber: roomForm.roomNumber,
        description: roomForm.description,
        roomType: roomForm.roomType,
        roomCategory: roomForm.roomCategory,
        roomSizeSqft: roomForm.roomSizeSqft ? Number(roomForm.roomSizeSqft) : undefined,
      };
      if (roomForm.roomType === 'PRIVATE') {
        body.privateRoomPrice = roomForm.privateRoomPrice ? Number(roomForm.privateRoomPrice) : 0;
      } else {
        body.bedPrice = roomForm.bedPrice ? Number(roomForm.bedPrice) : 0;
        body.totalBeds = roomForm.totalBeds ? Number(roomForm.totalBeds) : 0;
      }
      const res = await fetch(`${apiBase}/pg/rooms`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Create failed (${res.status})`);
      }
      setRoomForm({ roomNumber: '', description: '', roomType: 'PRIVATE', roomCategory: 'FAMILY' });
      await loadRooms();
    } catch (e: any) {
      alert(e.message || 'Create failed');
    } finally {
      setBusy(null);
    }
  };

  const deleteRoom = async (roomId: number) => {
    if (!confirm('Delete this room? All its beds will be removed.')) return;
    try {
      setBusy(`del-room-${roomId}`);
      const res = await fetch(`${apiBase}/pg/rooms/${roomId}`, { method: 'DELETE', headers });
      if (res.status !== 204) throw new Error('Delete failed');
      await loadRooms();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    } finally {
      setBusy(null);
    }
  };

  const addBed = async (roomId: number) => {
    const bedNumber = bedForm[roomId];
    if (!bedNumber?.trim()) return;
    try {
      setBusy(`add-bed-${roomId}`);
      const res = await fetch(`${apiBase}/pg/beds`, { method: 'POST', headers, body: JSON.stringify({ roomId, bedNumber }) });
      if (!res.ok) throw new Error('Add bed failed');
      setBedForm(prev => ({ ...prev, [roomId]: '' }));
      await loadRooms();
    } catch (e: any) {
      alert(e.message || 'Add bed failed');
    } finally { setBusy(null); }
  };

  const deleteBed = async (bedId: number) => {
    if (!confirm('Remove this bed?')) return;
    try {
      setBusy(`del-bed-${bedId}`);
      const res = await fetch(`${apiBase}/pg/beds/${bedId}`, { method: 'DELETE', headers });
      if (res.status !== 204) throw new Error('Delete failed');
      await loadRooms();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Building className="w-7 h-7 mr-2 text-primary-600" /> Manage PG Rooms & Beds
          </h1>
          <p className="text-gray-600 mt-1">Property ID: {propertyId}</p>
        </div>

        {/* Add Room */}
        <div className="bg-white rounded-xl shadow-card p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center"><Plus className="w-4 h-4 mr-2"/>Add Room</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="input-field" placeholder="Room number (e.g., 101)" value={roomForm.roomNumber} onChange={e=>setRoomForm(f=>({ ...f, roomNumber: e.target.value }))} />
            <select className="input-field" value={roomForm.roomType} onChange={e=>setRoomForm(f=>({ ...f, roomType: e.target.value as RoomType }))}>
              <option value="PRIVATE">Private</option>
              <option value="SHARED">Shared</option>
            </select>
            <select className="input-field" value={roomForm.roomCategory} onChange={e=>setRoomForm(f=>({ ...f, roomCategory: e.target.value as RoomCategory }))}>
              <option value="FAMILY">Family</option>
              <option value="BOYS">Boys</option>
              <option value="GIRLS">Girls</option>
            </select>
            <input className="input-field md:col-span-3" placeholder="Description (optional)" value={roomForm.description} onChange={e=>setRoomForm(f=>({ ...f, description: e.target.value }))} />
            <input className="input-field" placeholder="Room size sqft (optional)" value={roomForm.roomSizeSqft || ''} onChange={e=>setRoomForm(f=>({ ...f, roomSizeSqft: e.target.value }))} />
            {roomForm.roomType === 'PRIVATE' ? (
              <input className="input-field" placeholder="Private room price" value={roomForm.privateRoomPrice || ''} onChange={e=>setRoomForm(f=>({ ...f, privateRoomPrice: e.target.value }))} />
            ) : (
              <>
                <input className="input-field" placeholder="Bed price" value={roomForm.bedPrice || ''} onChange={e=>setRoomForm(f=>({ ...f, bedPrice: e.target.value }))} />
                <input className="input-field" placeholder="Total beds" value={roomForm.totalBeds || ''} onChange={e=>setRoomForm(f=>({ ...f, totalBeds: e.target.value }))} />
              </>
            )}
          </div>
          <div className="mt-4">
            <button disabled={busy==='create-room' || !roomForm.roomNumber.trim()} onClick={createRoom} className="btn-primary disabled:opacity-50">
              {busy==='create-room' ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </div>

        {/* Rooms List */}
        <div className="bg-white rounded-xl shadow-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">Rooms</h3>
            {loading && <span className="text-gray-500 text-sm flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-1"/>Loading...</span>}
          </div>
          {error && <div className="px-4 py-3 text-red-600 text-sm">{error}</div>}
          <div className="divide-y">
            {!loading && rooms.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">No rooms yet</div>
            )}
            {rooms.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 flex items-center">
                      {r.roomType === 'PRIVATE' ? <BedDouble className="w-4 h-4 mr-2"/> : <BedSingle className="w-4 h-4 mr-2"/>}
                      Room {r.roomNumber} • {r.roomType}
                    </div>
                    <div className="text-sm text-gray-600">
                      {r.roomCategory ? `${r.roomCategory} • ` : ''}
                      {r.roomSizeSqft ? `${r.roomSizeSqft} sqft • ` : ''}
                      {r.roomType === 'PRIVATE' ? `₹${(r.privateRoomPrice||0).toLocaleString()} / month` : `₹${(r.bedPrice||0).toLocaleString()} per bed / month`}
                    </div>
                    {r.description && <div className="text-sm text-gray-500 mt-1 max-w-2xl">{r.description}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* future: edit room */}
                    <button disabled={busy===`del-room-${r.id}`} onClick={()=>deleteRoom(r.id)} className="inline-flex items-center px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50">
                      <Trash2 className="w-4 h-4 mr-1"/> Delete
                    </button>
                  </div>
                </div>

                {/* Beds for SHARED */}
                {r.roomType === 'SHARED' && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Beds ({beds[r.id]?.length || 0}/{r.totalBeds || 0})</div>
                      <div className="flex items-center gap-2">
                        <input className="input-field h-8" placeholder="Bed number (e.g., 102-1)" value={bedForm[r.id] || ''} onChange={e=>setBedForm(prev=>({ ...prev, [r.id]: e.target.value }))} />
                        <button disabled={busy===`add-bed-${r.id}`} onClick={()=>addBed(r.id)} className="inline-flex items-center px-3 py-1.5 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                          <Plus className="w-4 h-4 mr-1"/> Add Bed
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {(beds[r.id] || []).map(b => (
                        <div key={b.id} className="flex items-center justify-between bg-white rounded border px-2 py-1 text-sm">
                          <span>{b.bedNumber}</span>
                          <button disabled={busy===`del-bed-${b.id}`} onClick={()=>deleteBed(b.id)} className="text-red-600 hover:text-red-800 disabled:opacity-50">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagePgPage;
