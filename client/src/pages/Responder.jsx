
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MapPin, Navigation, CheckCircle, ShieldAlert, Phone, Truck, Radio, Clock, User, Shield, Target, LogOut } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import ChatWindow from '../components/ChatWindow'; 
import Loader from '../components/Loader'; 
import { socket, BACKEND_URL } from '../socket'; // IMPORT SOCKET & URL

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

const Responder = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [myId, setMyId] = useState(localStorage.getItem('userId'));
  const [activeSOSId, setActiveSOSId] = useState(null);
  const [myProfile, setMyProfile] = useState(null); 
  const [myLocation, setMyLocation] = useState(null); 
  const watchId = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/auth/responders`); // USE BACKEND_URL
        const me = res.data.find(u => u._id === myId);
        setMyProfile(me);
      } catch (err) { console.error(err); }
    };
    fetchProfile();

    const fetchAlerts = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/sos`); // USE BACKEND_URL
        setAlerts(res.data.filter(a => a && a.user));
      } catch (err) { console.error(err); }
    };
    fetchAlerts();

    socket.on('new_sos', (data) => { if (data && data.user) setAlerts((prev) => [data, ...prev]); });
    socket.on('sos_status_update', ({ sosId, status, responderId }) => {
      setAlerts(prev => prev.map(a => a._id === sosId ? { ...a, status, assignedTo: responderId } : a));
    });

    return () => { 
        if (watchId.current) navigator.geolocation.clearWatch(watchId.current); 
        clearTimeout(timer);
    };
  }, [myId]);

  const calculateEtaDisplay = (alertLocation) => {
    if (!myLocation || !alertLocation) return "Locating...";
    const distanceKm = getDistanceFromLatLonInKm(myLocation.lat, myLocation.lng, alertLocation.lat, alertLocation.lng);
    if (distanceKm === null) return "N/A";
    const speedKmh = 40; 
    const timeMinutes = (distanceKm / speedKmh) * 60;
    if (timeMinutes < 1) return `${(timeMinutes * 60).toFixed(0)} sec`;
    if (timeMinutes < 60) return `${timeMinutes.toFixed(0)} min`;
    return `${distanceKm.toFixed(1)} km`;
  };

  const startLiveTracking = (sosId) => {
    if (!navigator.geolocation) return alert("GPS not supported");
    setActiveSOSId(sosId);
    watchId.current = navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setMyLocation({ lat: latitude, lng: longitude });
      socket.emit('responder_location_update', { sosId: sosId, location: { lat: latitude, lng: longitude } });
    }, (err) => console.error(err), { enableHighAccuracy: true });
  };

  const updateStatus = (id, newStatus) => {
    setAlerts(alerts.map(a => a._id === id ? { ...a, status: newStatus, assignedTo: myId } : a));
    if (newStatus === 'assigned') {
        socket.emit('accept_sos', { sosId: id, responderId: myId });
        startLiveTracking(id);
    } else if (newStatus === 'resolved') {
        if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
        setActiveSOSId(null);
        setMyLocation(null); 
        socket.emit('resolve_sos', { sosId: id });
        alert("Mission Complete. Case Closed.");
    }
  };

  const handleLogout = () => {
      if(window.confirm("End Shift and Log Out?")) {
          localStorage.removeItem('userId'); localStorage.removeItem('token'); window.location.href = '/';
      }
  };

  const openGoogleMaps = (lat, lng) => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
  };

  const myAlerts = alerts.filter(a => a.status !== 'resolved' && (a.status === 'pending' || a.assignedTo === myId));

  if (isLoading) return <Loader />;

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans relative">
      <div className="w-1/2 flex flex-col border-r border-gray-800">
        <div className="p-6 border-b border-gray-800 bg-gray-800 z-10">
          <div className="flex justify-between items-center mb-4"><h1 className="text-3xl font-extrabold text-red-400 flex items-center gap-3"><ShieldAlert size={30}/> DISPATCH</h1><button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition"><LogOut size={14}/> END SHIFT</button></div>
          <div className="flex justify-between items-center mt-2"><p className="text-gray-400 text-sm flex items-center gap-1"><User size={14}/> Officer: {localStorage.getItem('userName')}</p><span className="flex items-center gap-1 text-xs text-green-500 font-bold"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> LIVE GPS</span></div>
        </div>

        {activeSOSId && myProfile && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-blue-900/50 border-b border-blue-700 p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-3 text-blue-200"><Radio className="animate-pulse" size={20}/><span className="font-bold uppercase tracking-wider text-sm">Broadcasting Live Location</span></div>{myLocation && (<div className="text-right"><p className="text-lg font-extrabold text-white">{calculateEtaDisplay(alerts.find(a => a._id === activeSOSId)?.location)}</p><p className="text-xs text-blue-300">ETA / DISTANCE</p></div>)}</div>
            <div className="flex gap-4 text-xs text-gray-300 mt-2"><span className="flex items-center gap-1"><Phone size={14}/> {myProfile.phone}</span><span className="flex items-center gap-1"><Truck size={14}/> {myProfile.vehicleNumber}</span></div>
          </motion.div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
          <AnimatePresence>
            {myAlerts.length === 0 && <div className="text-center text-gray-500 mt-10">All clear. Standing by for emergencies.</div>}
            {myAlerts.map((alert) => (
              <motion.div key={alert._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} className={`p-5 rounded-xl border-l-4 shadow-xl transition-all ${alert.status === 'assigned' ? 'border-blue-500 bg-gray-800 hover:bg-gray-700/70' : 'border-red-500 bg-gray-800 hover:bg-gray-700/70'}`}>
                {alert.image && (<div className="mb-3 rounded-lg overflow-hidden border border-gray-700 relative group h-40"><img src={alert.image} alt="Evidence" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute bottom-0 left-0 w-full bg-black/60 p-2 text-xs text-white font-bold backdrop-blur-sm">📸 ATTACHED EVIDENCE</div></div>)}
                <div className="flex justify-between items-start mb-3">
                  <div><span className={`text-xs font-bold px-2 py-1 rounded uppercase ${alert.status === 'pending' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>{alert.status}</span><h3 className="text-xl font-bold mt-2 text-white">{alert.description}</h3></div>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12}/> {new Date(alert.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-4"><MapPin size={16}/> {alert.location ? `${alert.location.lat.toFixed(4)}, ${alert.location.lng.toFixed(4)}` : "Unknown Location"}</div>
                <div className="flex items-center justify-between text-sm mb-4 bg-gray-900 p-2 rounded-lg border border-gray-700"><span className="flex items-center gap-2 text-red-300 font-bold"><Target size={16}/> MISSION TARGET:</span><span className="text-yellow-400 font-bold">{calculateEtaDisplay(alert.location)}</span></div>
                <div className="flex gap-2">
                  {alert.status === 'pending' && (<motion.button whileHover={{ scale: 1.02 }} onClick={() => updateStatus(alert._id, 'assigned')} className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"><Navigation size={18}/> ACCEPT & TRACK</motion.button>)}
                  {alert.status === 'assigned' && (
                    <>
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => openGoogleMaps(alert.location.lat, alert.location.lng)} className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 rounded-lg font-bold flex items-center justify-center gap-2" title="Open Maps"><Navigation size={20}/> GO</motion.button>
                      <motion.button initial={{ opacity: 0.8 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 0.8 }} className="flex-1 bg-blue-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Radio size={18}/> LIVE TRACKING ON</motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} onClick={() => updateStatus(alert._id, 'resolved')} className="px-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold"><CheckCircle size={20}/></motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div className="w-1/2 relative">
        <MapContainer center={[28.6139, 77.2090]} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='© OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {myAlerts.map((alert) => (alert.location && <Marker key={alert._id} position={[alert.location.lat, alert.location.lng]}><Popup><b className="text-red-600">{alert.description}</b></Popup></Marker>))}
        </MapContainer>
        <div className="absolute top-4 right-4 bg-gray-800/90 text-white p-3 rounded-lg shadow-xl text-xs border border-gray-700"><p className="font-bold">Total Active Missions:</p><p className="text-2xl text-red-400">{myAlerts.length}</p></div>
        {activeSOSId && (<div className="absolute bottom-8 left-8 z-[2000]"><ChatWindow socket={socket} sosId={activeSOSId} userName="Responder" role="responder" /></div>)}
      </div>
    </div>
  );
};
export default Responder;