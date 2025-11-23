import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Bell,
  Map,
  Users,
  AlertTriangle,
  Shield,
  Home,
  Plus,
  Trash2,
  Phone,
  BarChart3,
  Edit3,
  X,
  LogOut,
  MessageSquare,
  Flame,
  CheckCircle,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import ChatWindow from '../components/ChatWindow';
import Analytics from '../components/Analytics';
import HeatmapLayer from '../components/HeatmapLayer';
import Loader from '../components/Loader';
import { socket, BACKEND_URL } from '../socket';

// --- Helper Component for Editing Shelters ---
const ShelterEditModal = ({ shelter, onClose, onSave, onDelete }) => {
  const [name, setName] = useState(shelter.name);
  const [capacity, setCapacity] = useState(shelter.capacity);

  const handleSave = () => {
    onSave(shelter.id, { name, capacity: parseInt(capacity) });
    onClose();
  };

  const handleDeleteClick = () => {
    if (window.confirm(`Delete ${shelter.name}?`)) {
      onDelete(shelter.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[500] font-sans">
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="bg-gray-800 p-6 rounded-xl w-96 shadow-2xl border border-gray-700"
      >
        <h3 className="text-xl font-bold text-blue-400 mb-4 flex justify-between items-center">
          Edit Shelter
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-700 p-2 rounded mb-4 text-white"
        />
        <input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-full bg-gray-700 p-2 rounded mb-6 text-white"
        />
        <div className="flex justify-between">
          <button onClick={handleDeleteClick} className="bg-red-600 px-4 py-2 rounded">
            Delete
          </button>
          <button onClick={handleSave} className="bg-green-600 px-4 py-2 rounded">
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
};

function MapClickHandler({ mode, onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      if (mode === 'shelter' || mode === 'warning') onLocationSelect(e.latlng);
    },
  });
  return null;
}

const Admin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [activeTab, setActiveTab] = useState('map');
  const [mapMode, setMapMode] = useState('view');
  const [warningLocation, setWarningLocation] = useState(null);
  const [realResponders, setRealResponders] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [editingShelter, setEditingShelter] = useState(null);
  const [activeChatSosId, setActiveChatSosId] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // 🆕 store last known responder location per SOS
  const [responderLocations, setResponderLocations] = useState({});

  const activeAlerts = alerts.filter((a) => a.status !== 'resolved');
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);

    // ---- Fetch Shelters ----
    const fetchShelters = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/shelters`);
        if (Array.isArray(res.data)) {
          setShelters(
            res.data.map((s) => ({
              id: s._id,
              name: s.name,
              lat: s.location?.lat,
              lng: s.location?.lng,
              capacity: s.capacity,
            }))
          );
        } else {
          console.error('Shelters API did not return an array:', res.data);
          setShelters([]);
        }
      } catch (err) {
        console.error('Error loading shelters:', err);
      }
    };
    fetchShelters();

    // ---- Fetch All SOS (active + resolved) ----
    const fetchAlerts = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/sos`);
        if (Array.isArray(res.data)) {
          setAlerts(res.data);
        } else {
          console.error('Alerts API did not return an array:', res.data);
          setAlerts([]);
        }
      } catch (err) {
        console.log('Error fetching alerts:', err);
        setAlerts([]);
      }
    };
    fetchAlerts();

    // ---- Socket listeners for shelters ----
    socket.on('new_shelter', (data) =>
      setShelters((prev) => [
        ...prev,
        {
          id: data._id,
          name: data.name,
          lat: data.lat,
          lng: data.lng,
          capacity: data.capacity,
        },
      ])
    );

    socket.on('shelter_updated', (data) => {
      const u = data.updatedShelter || data;
      setShelters((prev) =>
        prev.map((s) => (s.id === u._id ? { ...s, name: u.name, capacity: u.capacity } : s))
      );
    });

    socket.on('shelter_deleted', (data) =>
      setShelters((prev) => prev.filter((s) => s.id !== (data.id || data)))
    );

    // ---- SOS / Alerts sockets ----
    socket.on('new_sos', (data) => setAlerts((prev) => [data, ...prev]));

    socket.on('sos_status_update', ({ sosId, status, responderId }) => {
      setAlerts((prev) =>
        prev.map((a) =>
          a._id === sosId ? { ...a, status: status, assignedTo: responderId } : a
        )
      );
      if (status === 'resolved' && activeChatSosId === sosId) setActiveChatSosId(null);
    });

    // 🆕 LIVE responder location from Responder + Citizen
    socket.on('live_responder_location', (data) => {
      if (!data || !data.location) return;
      const key = data.sosId || 'global';
      setResponderLocations((prev) => ({
        ...prev,
        [key]: data.location,
      }));
    });

    // ---- Responders ----
    const fetchResponders = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/auth/responders`);
        if (Array.isArray(res.data)) {
          setRealResponders(res.data);
        } else {
          console.error('Responders API did not return an array:', res.data);
          setRealResponders([]);
        }
      } catch (err) {
        console.log('Error fetching responders:', err);
        setRealResponders([]);
      }
    };
    fetchResponders();

    return () => {
      socket.off('new_shelter');
      socket.off('shelter_updated');
      socket.off('shelter_deleted');
      socket.off('new_sos');
      socket.off('sos_status_update');
      socket.off('live_responder_location');
      clearTimeout(timer);
    };
  }, [activeChatSosId]);

  // ---- Shelter handlers ----
  const handleEditShelter = async (id, data) => {
    await axios.put(`${BACKEND_URL}/api/shelters/${id}`, data);
  };

  const handleDeleteShelter = async (id) => {
    await axios.delete(`${BACKEND_URL}/api/shelters/${id}`);
  };

  // ---- SOS handlers ----
  const handleDeleteSOS = async (id) => {
    if (window.confirm('Force delete?')) {
      try {
        setAlerts((prev) => prev.filter((a) => a._id !== id));
        socket.emit('resolve_sos', { sosId: id });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ---- Map click behaviour ----
  const handleMapClick = (latlng) => {
    if (mapMode === 'shelter') {
      const name = prompt('Shelter Name:');
      if (name) {
        const capacity = prompt('Capacity:');
        socket.emit('add_shelter', {
          name,
          lat: latlng.lat,
          lng: latlng.lng,
          capacity: parseInt(capacity) || 100,
        });
        setMapMode('view');
      }
    } else if (mapMode === 'warning') {
      setWarningLocation(latlng);
      alert('Select area & type message!');
      setMapMode('view');
    }
  };

  // ---- Warning broadcast ----
  const handlePublishWarning = () => {
    if (!broadcastMsg || !warningLocation)
      return alert('Select area & type message!');
    socket.emit('send_alert', {
      id: Date.now(),
      message: broadcastMsg,
      location: warningLocation,
      radius: 1000,
      type: 'danger',
    });
    setIsWarningActive(true);
    alert('Warning Published!');
    setBroadcastMsg('');
  };

  const handleRemoveWarning = () => {
    socket.emit('delete_alert');
    setWarningLocation(null);
    setIsWarningActive(false);
  };

  // ---- Logout ----
  const handleLogout = () => {
    if (window.confirm('Logout?')) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans relative">
      {editingShelter && (
        <ShelterEditModal
          shelter={editingShelter}
          onClose={() => setEditingShelter(null)}
          onSave={handleEditShelter}
          onDelete={handleDeleteShelter}
        />
      )}

      {/* SIDEBAR */}
      <div className="w-72 bg-gray-800 shadow-2xl z-10 flex flex-col border-r border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-extrabold text-red-500 flex items-center gap-2">
            <Shield size={30} /> RESCUE HQ
          </h1>
        </div>

        <nav className="p-4 space-y-2">
          <SidebarItem
            icon={<Map size={20} />}
            label="Live Map"
            active={activeTab === 'map'}
            onClick={() => setActiveTab('map')}
          />
          <SidebarItem
            icon={<Users size={20} />}
            label="Responders"
            active={activeTab === 'responders'}
            onClick={() => setActiveTab('responders')}
          />
          <SidebarItem
            icon={<Home size={20} />}
            label="Safe Shelters"
            active={activeTab === 'shelters'}
            onClick={() => setActiveTab('shelters')}
          />
          <SidebarItem
            icon={<BarChart3 size={20} />}
            label="Analytics"
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
          />
        </nav>

        {/* LIVE FEED (SIDEBAR) */}
        <div className="flex-1 overflow-y-auto p-4 border-t border-gray-700 bg-gray-900/30">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Live Feed
            </h3>
            <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded text-white animate-pulse">
              {activeAlerts.length} Active
            </span>
          </div>

          {activeAlerts.length === 0 && (
            <p className="text-gray-600 text-xs text-center mt-4">System Clear</p>
          )}

          <div className="space-y-3">
            {activeAlerts.map((a) => (
              <div
                key={a._id}
                className="relative bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-gray-500 transition group"
              >
                <div className="flex gap-3 items-start">
                  {a.image ? (
                    <img
                      src={a.image}
                      className="w-10 h-10 rounded object-cover border border-gray-600 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center shrink-0">
                      <AlertTriangle size={16} className="text-gray-500" />
                    </div>
                  )}

                  <div className="overflow-hidden w-full">
                    <p
                      className={`text-xs font-bold ${
                        a.type === 'EMERGENCY' ? 'text-red-500' : 'text-blue-400'
                      }`}
                    >
                      {a.type === 'EMERGENCY' ? 'SOS' : 'INCIDENT'}
                    </p>
                    <p
                      className="text-[10px] text-gray-300 truncate"
                      title={a.description}
                    >
                      {a.description || 'No description'}
                    </p>

                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-gray-500">
                        {new Date(a.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 rounded ${
                          a.status === 'assigned'
                            ? 'bg-blue-900 text-blue-300'
                            : 'bg-red-900 text-red-300'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveChatSosId(a._id);
                    }}
                    className="bg-blue-600 p-1 rounded hover:bg-blue-700"
                    title="Chat"
                  >
                    <MessageSquare size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSOS(a._id);
                    }}
                    className="bg-red-600 p-1 rounded hover:bg-red-700"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600/20 text-red-400 font-bold p-2 rounded-lg hover:bg-red-600/30 transition flex items-center justify-center gap-2"
          >
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
        {/* STATS HEADER */}
        <div className="bg-gray-900 p-6 shadow-md grid grid-cols-4 gap-6 border-b border-gray-800">
          <StatCard
            title="Total Solved"
            value={resolvedCount}
            color="text-green-500"
            icon={<CheckCircle />}
          />
          <StatCard
            title="Active SOS"
            value={activeAlerts.length}
            color="text-red-500"
            icon={<AlertTriangle />}
          />
          <StatCard
            title="Responders"
            value={realResponders.length}
            color="text-blue-500"
            icon={<Users />}
          />
          <StatCard
            title="Shelters"
            value={shelters.length}
            color="text-purple-500"
            icon={<Home />}
          />
        </div>

        <div className="flex-1 p-6 overflow-hidden">
          {/* --- TAB: LIVE MAP --- */}
          {activeTab === 'map' && (
            <div className="flex gap-6 h-full">
              <div className="flex-2 w-2/3 bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden relative">
                <MapContainer
                  center={[28.6139, 77.209]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapClickHandler mode={mapMode} onLocationSelect={handleMapClick} />

                  {showHeatmap ? (
                    <HeatmapLayer
                      points={activeAlerts
                        .filter((a) => a.location)
                        .map((a) => [a.location.lat, a.location.lng, 1.0])}
                    />
                  ) : (
                    <>
                      {warningLocation && (
                        <Circle
                          center={warningLocation}
                          radius={1000}
                          pathOptions={{
                            color: 'red',
                            fillColor: 'red',
                            fillOpacity: 0.4,
                          }}
                        />
                      )}

                      {/* 🏠 Shelters */}
                      {shelters.map((s) =>
                        s.lat && s.lng ? (
                          <Marker key={s.id} position={[s.lat, s.lng]}>
                            <Popup>
                              🏠 {s.name} (Cap: {s.capacity})
                            </Popup>
                          </Marker>
                        ) : null
                      )}

                      {/* 🆘 User / SOS markers */}
                      {activeAlerts.map((a) =>
                        a.location ? (
                          <Marker
                            key={a._id}
                            position={[a.location.lat, a.location.lng]}
                          >
                            <Popup>
                              <div className="text-center min-w-[150px]">
                                <strong
                                  className={
                                    a.type === 'EMERGENCY'
                                      ? 'text-red-600'
                                      : 'text-blue-600'
                                  }
                                >
                                  {a.type === 'EMERGENCY'
                                    ? '🚨 SOS ALERT'
                                    : '📝 INCIDENT REPORT'}
                                </strong>
                                <p className="text-sm my-1">{a.description}</p>
                                <span
                                  className={`text-xs px-2 py-1 rounded text-white ${
                                    a.status === 'assigned'
                                      ? 'bg-blue-500'
                                      : 'bg-red-500'
                                  }`}
                                >
                                  Status: {a.status}
                                </span>
                                {a.image && (
                                  <div className="mt-2 border border-gray-300 rounded overflow-hidden">
                                    <img
                                      src={a.image}
                                      alt="Evidence"
                                      className="w-full h-32 object-cover"
                                    />
                                  </div>
                                )}
                                <button
                                  onClick={() => setActiveChatSosId(a._id)}
                                  className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 mx-auto"
                                >
                                  <MessageSquare size={12} /> Chat
                                </button>
                              </div>
                            </Popup>
                          </Marker>
                        ) : null
                      )}

                      {/* 🚑 Responder markers (live) */}
                      {Object.entries(responderLocations).map(([key, loc]) =>
                        loc && loc.lat && loc.lng ? (
                          <Marker
                            key={`responder-${key}`}
                            position={[loc.lat, loc.lng]}
                          >
                            <Popup>
                              <b>🚑 Responder (SOS: {key})</b>
                            </Popup>
                          </Marker>
                        ) : null
                      )}
                    </>
                  )}
                </MapContainer>

                <div className="absolute top-4 right-4 z-[1000] bg-gray-900/90 p-2 rounded-lg shadow-xl border border-gray-700">
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`flex items-center gap-2 px-3 py-2 rounded font-bold text-xs transition ${
                      showHeatmap ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    <Flame size={16} /> {showHeatmap ? 'Heatmap ON' : 'Heatmap OFF'}
                  </button>
                </div>
                {mapMode === 'warning' && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-2 rounded-full shadow-lg z-[1000] font-bold animate-pulse">
                    📍 Select Danger Zone
                  </div>
                )}
                {mapMode === 'shelter' && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-2 rounded-full shadow-lg z-[1000] font-bold animate-pulse">
                    🏠 Add Safe Shelter
                  </div>
                )}
              </div>

              {/* Right panel: Broadcast + Quick Add */}
              <div className="flex-1 w-1/3 flex flex-col gap-6">
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700"
                >
                  <h3 className="font-bold text-blue-400 mb-4 flex items-center gap-2">
                    <Bell size={20} /> Disaster Broadcast
                  </h3>

                  {isWarningActive ? (
                    <button
                      onClick={handleRemoveWarning}
                      className="w-full p-3 bg-red-600 textwhite font-bold rounded hover:bg-red-700"
                    >
                      REMOVE WARNING
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setMapMode('warning')}
                        className={`w-full mb-3 p-2 rounded border-2 ${
                          mapMode === 'warning'
                            ? 'border-red-500 text-red-400'
                            : 'border-gray-700 text-gray-400'
                        }`}
                      >
                        {warningLocation ? 'Target Selected' : '1. Select Danger Zone'}
                      </button>
                      <textarea
                        className="w-full bg-gray-700 p-2 rounded mb-3 text-white text-sm"
                        placeholder="2. Warning message..."
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                      />
                      <button
                        onClick={handlePublishWarning}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded"
                      >
                        3. PUBLISH WARNING
                      </button>
                    </>
                  )}
                </motion.div>

                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                  <h3 className="font-bold text-blue-400 mb-4 flex items-center gap-2">
                    <Home size={20} /> Shelter Quick Add
                  </h3>
                  <button
                    onClick={() => setMapMode('shelter')}
                    className={`w-full p-3 rounded border-2 font-bold flex items-center justify-center gap-2 ${
                      mapMode === 'shelter'
                        ? 'border-green-500 text-green-400'
                        : 'border-gray-700 text-gray-400'
                    }`}
                  >
                    <Plus size={20} /> Add Shelter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chat Window */}
          {activeChatSosId && (
            <div className="absolute bottom-4 right-4 z-[2000]">
              <ChatWindow
                socket={socket}
                sosId={activeChatSosId}
                userName="Admin HQ"
                role="admin"
              />
            </div>
          )}

          {/* Shelters Tab */}
          {activeTab === 'shelters' && (
            <div className="bg-gray-800 p-6 rounded-xl h-full overflow-y-auto">
              <h2 className="text-xl font-bold text-blue-400 mb-4">Shelters List</h2>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="p-3">Name</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Capacity</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shelters.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                    >
                      <td className="p-3 font-bold">{s.name}</td>
                      <td className="p-3 text-gray-500">
                        {s.lat ? s.lat.toFixed(4) : 0}, {s.lng ? s.lng.toFixed(4) : 0}
                      </td>
                      <td className="p-3 text-yellow-400">{s.capacity}</td>
                      <td className="p-3">
                        <button
                          onClick={() => setEditingShelter(s)}
                          className="text-blue-500 hover:text-blue-400 transition"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteShelter(s.id)}
                          className="text-red-500 hover:text-red-400 ml-3 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Responders Tab */}
          {activeTab === 'responders' && (
            <div className="bg-gray-800 p-6 rounded-xl h-full overflow-y-auto">
              <h2 className="text-xl font-bold text-green-400 mb-4">Responders</h2>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="p-3">Name</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {realResponders.map((r) => (
                    <tr
                      key={r._id}
                      className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                    >
                      <td className="p-3 font-bold text-white">{r.name}</td>
                      <td className="p-3 text-blue-400 flex items-center gap-1">
                        <Phone size={14} /> {r.phone || 'N/A'}
                      </td>
                      <td className="p-3 text-gray-500">
                        {r.vehicleNumber || 'N/A'}
                      </td>
                      <td className="p-3">
                        <span className="bg-green-600/30 text-green-400 px-2 py-1 rounded text-xs font-bold">
                          Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <Analytics alerts={alerts} shelters={shelters} responders={realResponders} />
          )}
        </div>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }) => (
  <motion.div
    whileHover={{ x: 5 }}
    onClick={onClick}
    className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 ${
      active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'
    }`}
  >
    {icon} {label}
  </motion.div>
);

const StatCard = ({ title, value, color, icon }) => (
  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
    <div>
      <h4 className="text-gray-500 text-xs font-bold">{title}</h4>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
    <div className={`${color} opacity-50`}>{icon}</div>
  </div>
);

export default Admin;
