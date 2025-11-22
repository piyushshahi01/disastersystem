import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { AlertTriangle, Map as MapIcon, Phone, ShieldCheck, X, Navigation, Camera, Check, Home, Stethoscope, Siren, LogOut, FileText, Hand, UserPlus, Users, MessageCircle, Search, Plus, BedDouble } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ChatWindow from '../components/ChatWindow';
import Loader from '../components/Loader'; // IMPORT LOADER

import { socket } from '../socket';

const responderIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/2555/2555013.png', iconSize: [45, 45], iconAnchor: [22, 22], popupAnchor: [0, -20] });
const userIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', iconSize: [35, 35], iconAnchor: [17, 17], popupAnchor: [0, -15] });
const shelterIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/619/619153.png', iconSize: [35, 35], iconAnchor: [17, 17], popupAnchor: [0, -15] });
const medicalIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/4006/4006511.png', iconSize: [35, 35], iconAnchor: [17, 17], popupAnchor: [0, -15] });

const Citizen = () => {
  const [isLoading, setIsLoading] = useState(true); // LOADING STATE
  const [viewMode, setViewMode] = useState('map');
  const [sosData, setSosData] = useState({ description: '', location: null, image: null });
  const [status, setStatus] = useState('idle'); 
  const [responderStatus, setResponderStatus] = useState(null); 
  const [responderInfo, setResponderInfo] = useState(null); 
  const [showSOSPanel, setShowSOSPanel] = useState(false);
  const [showContacts, setShowContacts] = useState(false); 
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [filter, setFilter] = useState('all');
  const [amISafe, setAmISafe] = useState(false);
  const [dangerZones, setDangerZones] = useState([]); 
  const [responderLocation, setResponderLocation] = useState(null); 
  const [inDangerZone, setInDangerZone] = useState(false);
  const [resources, setResources] = useState([]);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [activeSosId, setActiveSosId] = useState(null); 
  
  // Missing Persons
  const [missingPeople, setMissingPeople] = useState([]);
  const [showReportMissing, setShowReportMissing] = useState(false);
  const [missingForm, setMissingForm] = useState({ name: '', age: '', lastSeen: '', description: '', image: null });
  const [commentText, setCommentText] = useState("");
  const [activeCommentId, setActiveCommentId] = useState(null);

  // Booking
  const [bookingShelter, setBookingShelter] = useState(null);
  const [bedsToBook, setBedsToBook] = useState(1);

  useEffect(() => {
    // SIMULATE LOADING
    const timer = setTimeout(() => setIsLoading(false), 2000);

    const userId = localStorage.getItem('userId');
    const saved = JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
    setContacts(saved);

    axios.get('http://localhost:5000/api/shelters').then(res => {
         const formatted = res.data.map(s => ({ id: s._id, name: s.name, lat: s.location.lat, lng: s.location.lng, type: s.type || 'shelter', capacity: s.capacity }));
         if (!formatted.find(r => r.type === 'medical')) formatted.push({ id: 'demo-hospital', name: 'City General Hospital', lat: 28.58, lng: 77.32, type: 'medical' });
         setResources(formatted);
      }).catch(err => console.log("Shelter fetch error", err));

    socket.emit('get_missing_people');

    socket.on('new_shelter', (data) => { setResources(prev => [...prev, { ...data, type: 'shelter' }]); });
    socket.on('shelter_updated', (updatedShelter) => {
        setResources(prev => prev.map(r => r.id === updatedShelter._id ? { ...r, capacity: updatedShelter.capacity } : r));
    });
    socket.on('load_missing_people', (data) => setMissingPeople(data));
    socket.on('new_missing_person', (data) => setMissingPeople(prev => [data, ...prev]));
    socket.on('update_missing_person', (updated) => { setMissingPeople(prev => prev.map(p => p._id === updated._id ? updated : p)); });
    
    socket.on('booking_success', ({ name, booked }) => { alert(`✅ Booked ${booked} bed(s) at ${name}`); setBookingShelter(null); setBedsToBook(1); });
    socket.on('booking_error', ({ message }) => { alert(`❌ Booking Failed: ${message}`); });

    const checkActiveSOS = async () => {
      if(!userId) return;
      try {
        const res = await axios.get('http://localhost:5000/api/sos');
        const myAlert = res.data.find(a => a?.user?._id === userId && a.status !== 'resolved');
        if (myAlert) {
          setStatus('sent');
          setActiveSosId(myAlert._id); 
          setSosData(prev => ({ ...prev, location: myAlert.location }));
          setResponderStatus(myAlert.status);
        }
      } catch (err) { console.error("Error checking status:", err); }
    };
    checkActiveSOS();

    socket.on('sos_status_update', ({ sosId, status, responderDetails }) => {
      if (status === 'resolved') {
          setResponderStatus(null); setResponderInfo(null); setResponderLocation(null); setActiveSosId(null); setStatus('idle'); alert("✅ You have been marked safe. Mission Closed.");
      } else {
          setResponderStatus(status);
          setActiveSosId(sosId);
          if(status === 'assigned' && responderDetails) { setResponderInfo(responderDetails); alert(`🚨 ${responderDetails.name} is on the way!`); }
      }
    });

    socket.on('live_responder_location', (data) => setResponderLocation(data.location));
    socket.on('receive_alert', (data) => { setDangerZones(prev => [...prev, data]); if (sosData.location) checkDanger(sosData.location, [data]); });
    socket.on('clear_alerts', () => { setDangerZones([]); setInDangerZone(false); });

    return () => {
        socket.off('new_shelter'); socket.off('shelter_updated'); socket.off('booking_success'); socket.off('booking_error');
        socket.off('sos_status_update'); socket.off('live_responder_location'); socket.off('receive_alert'); socket.off('clear_alerts');
        socket.off('load_missing_people'); socket.off('new_missing_person'); socket.off('update_missing_person');
        clearTimeout(timer);
    };
  }, [sosData.location]);

  const checkDanger = (userLoc, zones) => {
    if (!userLoc) return;
    let danger = false;
    zones.forEach(zone => {
      const distance = getDistanceFromLatLonInKm(userLoc.lat, userLoc.lng, zone.location.lat, zone.location.lng);
      if (distance * 1000 <= zone.radius) danger = true;
    });
    setInDangerZone(danger);
  };
  function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) { var R = 6371; var dLat = (lat2-lat1) * (Math.PI/180); var dLon = (lon2-lon1) * (Math.PI/180); var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*(Math.PI/180)) * Math.cos(lat2*(Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return R * c; }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => { setSosData({ ...sosData, image: reader.result }); };
    if (file) reader.readAsDataURL(file);
  };

  // --- MISSING PERSON HANDLERS ---
  const handleMissingImage = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => { setMissingForm({ ...missingForm, image: reader.result }); };
      if(file) reader.readAsDataURL(file);
  };

  const submitMissingReport = () => {
      if(!missingForm.name || !missingForm.description) return alert("Please fill basic details");
      const userId = localStorage.getItem('userId');
      socket.emit('report_missing', { ...missingForm, reportedBy: userId });
      setShowReportMissing(false);
      setMissingForm({ name: '', age: '', lastSeen: '', description: '', image: null });
      alert("Report Submitted.");
  };

  const submitComment = (personId) => {
      if(!commentText) return;
      socket.emit('add_missing_comment', { personId, user: "Community Member", text: commentText });
      setCommentText("");
      setActiveCommentId(null);
  };

  const handleReportIncident = () => {
    const userId = localStorage.getItem('userId');
    if(!sosData.location) return alert("Please click 'Detect' location first!");
    if (!userId) return alert("Please Login first!");
    setStatus('sending');
    socket.emit('send_sos', { userId: userId, ...sosData, type: 'INCIDENT' });
    setStatus('sent');
    setShowSOSPanel(false);
    alert("Incident Reported Successfully!");
  };

  const handlePanicSOS = () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return alert("Please Login first!");
      if (!sosData.location) {
          if(window.confirm("Location not detected yet. Attempt to locate and send Panic Signal?")) { getCurrentLocation(true); }
          return;
      }
      if(window.confirm("⚠️ ARE YOU SURE? This will send an immediate Panic Signal!")) {
         setStatus('sending');
         socket.emit('send_sos', { userId: userId, location: sosData.location, type: 'EMERGENCY', description: 'Panic Button Pressed' });
         setStatus('sent');
         alert("🚨 SOS SIGNAL SENT!");
      }
  };

  const handleMarkSafe = () => { setAmISafe(true); socket.emit('mark_safe', { userId: localStorage.getItem('userId') }); alert("✅ Marked Safe."); };

  const getCurrentLocation = (autoSend = false) => {
    setLoadingLoc(true);
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSosData(prev => ({ ...prev, location: loc }));
        checkDanger(loc, dangerZones);
        setLoadingLoc(false);
        if(autoSend) {
             const userId = localStorage.getItem('userId');
             socket.emit('send_sos', { userId: userId, location: loc, type: 'EMERGENCY', description: 'Panic Button Pressed' });
             setStatus('sent');
             alert("🚨 SOS SIGNAL SENT!");
        }
      },
      (err) => { console.error(err); alert("Location access denied."); setLoadingLoc(false); },
      { enableHighAccuracy: true } 
    );
  };

  const addContact = async () => {
      if(!newContact.name || !newContact.phone) return;
      const userId = localStorage.getItem('userId');
      const updated = [...contacts, newContact];
      setContacts(updated);
      setNewContact({ name: '', phone: '' });
      localStorage.setItem('emergencyContacts', JSON.stringify(updated));
      try { await axios.put(`http://localhost:5000/api/auth/update-contacts/${userId}`, { contacts: updated }); alert("Contact Added & Synced!"); } 
      catch(err) { console.error(err); alert("Saved locally only."); }
  };

  const handleConfirmBooking = () => {
      if (!bookingShelter) return;
      if (bedsToBook <= 0) return alert("Please enter a valid number.");
      socket.emit('book_beds', { shelterId: bookingShelter.id, count: parseInt(bedsToBook) });
  };

  const toggleVolunteer = () => {
      const newState = !isVolunteer;
      setIsVolunteer(newState);
      const userId = localStorage.getItem('userId');
      socket.emit('volunteer_status_change', { userId, isVolunteer: newState });
      alert(newState ? "You are now marked as a VOLUNTEER 🟢" : "Volunteer mode OFF 🔴");
  };

  const handleLogout = () => { if(window.confirm("Logout?")) { localStorage.removeItem('userId'); window.location.href = '/'; } };
  const openDirections = (lat, lng) => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  const callNumber = (number) => window.open(`tel:${number}`, '_self');
  const visibleResources = resources.filter(res => filter === 'all' || filter === res.type);

  if (isLoading) return <Loader />; // RENDER LOADER

  return (
    <div className="h-screen w-full relative overflow-hidden bg-gray-900 font-sans">
      
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-gray-800 p-1 rounded-full shadow-xl flex gap-2 border border-gray-600">
          <button onClick={() => setViewMode('map')} className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}><MapIcon size={16}/> Map</button>
          <button onClick={() => setViewMode('missing')} className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${viewMode === 'missing' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}><Users size={16}/> Missing Persons</button>
      </div>

      {viewMode === 'map' && (
          <>
            <div className="absolute inset-0 z-0">
                <MapContainer center={[28.6139, 77.2090]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {sosData.location && <Marker position={[sosData.location.lat, sosData.location.lng]} icon={userIcon}><Popup>You</Popup></Marker>}
                {responderLocation && <Marker position={[responderLocation.lat, responderLocation.lng]} icon={responderIcon}><Popup>🚑 Rescue Team</Popup></Marker>}
                {visibleResources.map(res => ( 
                    <Marker key={res.id} position={[res.lat, res.lng]} icon={res.type === 'medical' ? medicalIcon : shelterIcon}>
                        <Popup><b className="capitalize">{res.name}</b><br/><span className="text-xs text-gray-500">{res.type}</span><br/><span className="text-green-600 font-bold text-xs">Available Beds: {res.capacity}</span><br/><div className="flex gap-2 mt-2"><button onClick={() => openDirections(res.lat, res.lng)} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Directions</button><button onClick={() => setBookingShelter(res)} className="text-xs bg-green-600 text-white px-2 py-1 rounded font-bold hover:bg-green-700">Book Bed</button></div></Popup>
                    </Marker> 
                ))}
                {dangerZones.map((zone, index) => <Circle key={index} center={zone.location} radius={zone.radius} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.4 }} />)}
                </MapContainer>
            </div>

            <div className="absolute top-24 right-4 z-[1000] flex flex-col gap-3"><button onClick={() => setFilter('all')} className="p-3 rounded-full bg-white shadow-lg"><MapIcon/></button><button onClick={() => setFilter('shelter')} className="p-3 rounded-full bg-white shadow-lg"><Home/></button><button onClick={() => setFilter('medical')} className="p-3 rounded-full bg-white shadow-lg"><Stethoscope/></button></div>
            <div className="absolute top-36 left-4 z-[1000]"><button onClick={toggleVolunteer} className={`p-3 rounded-full shadow-lg font-bold flex items-center gap-2 transition-all border-2 ${isVolunteer ? 'bg-green-600 border-white text-white' : 'bg-white border-gray-200 text-gray-500'}`}><Hand size={20} /> {isVolunteer ? "HELPER ON" : "VOLUNTEER"} </button></div>
            <div className="absolute bottom-32 left-4 z-[1000]"><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handlePanicSOS} className="h-16 w-16 rounded-full bg-red-600 border-4 border-white shadow-2xl flex items-center justify-center text-white animate-pulse"><Siren size={32} /></motion.button><p className="text-xs font-bold text-red-600 bg-white px-2 rounded mt-1 text-center">PANIC</p></div>
            <button onClick={() => getCurrentLocation()} className="absolute bottom-32 right-4 z-[1000] bg-white p-3 rounded-full shadow-xl text-blue-600"><Navigation size={24} /></button>
            <div className="absolute bottom-0 left-0 w-full z-[1000]">
                <AnimatePresence>
                {!showSOSPanel ? (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="p-4 pb-8 bg-gradient-to-t from-black/50 to-transparent">
                    <button onClick={() => setShowSOSPanel(true)} className="w-full bg-blue-600 text-white py-4 rounded-2xl shadow-2xl font-bold text-xl flex items-center justify-center gap-2 shadow-blue-500/50 hover:bg-blue-700 transition"><FileText size={24} /> REPORT INCIDENT</button>
                    </motion.div>
                ) : (
                    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white rounded-t-3xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><AlertTriangle className="text-red-600"/> Report Incident</h2><button onClick={() => setShowSOSPanel(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-xl flex justify-between items-center text-blue-700"><span className="text-sm font-bold flex gap-2 items-center"><Navigation size={16}/> {loadingLoc ? "Acquiring GPS..." : (sosData.location ? "Location Locked" : "Locating...")}</span><button onClick={() => getCurrentLocation()} className="text-xs bg-blue-200 px-3 py-1 rounded hover:bg-blue-300 transition">{sosData.location ? "Update" : "Detect"}</button></div>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group hover:border-blue-400 transition"><input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /><div className="flex flex-col items-center text-gray-500"><Camera size={24} className="mb-2 text-gray-400 group-hover:text-blue-500"/> <span className="text-sm font-medium">{sosData.image ? "Photo Attached ✅" : "Tap to attach photo evidence"}</span></div></div>
                        <textarea className="w-full bg-gray-50 p-4 rounded-xl border" rows="2" placeholder="Describe situation..." onChange={e => setSosData({...sosData, description: e.target.value})}></textarea>
                        <button onClick={handleReportIncident} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition">{status === 'sent' ? 'REPORT SENT!' : 'SUBMIT REPORT'}</button>
                    </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
          </>
      )}

      {viewMode === 'missing' && (
          <div className="absolute inset-0 bg-gray-900 z-0 pt-20 px-4 pb-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto">
                  <div><h2 className="text-2xl font-bold text-white flex items-center gap-2"><Search className="text-blue-500"/> Missing Persons</h2><p className="text-gray-400 text-sm">Help reunite families. Report sightings below.</p></div>
                  <button onClick={() => setShowReportMissing(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg"><Plus size={20}/> Report Missing</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto pb-20">
                  {missingPeople.map((person) => (
                      <div key={person._id} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col">
                          <div className="h-48 bg-gray-700 relative">
                              {person.image ? (<img src={person.image} className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center text-gray-500"><Users size={40}/></div>)}
                              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-3"><h3 className="text-lg font-bold text-white">{person.name}, {person.age}</h3><p className="text-xs text-gray-300">Last seen: {person.lastSeen}</p></div>
                          </div>
                          <div className="p-4 flex-1 flex flex-col">
                              <p className="text-sm text-gray-300 mb-3 flex-1">{person.description}</p>
                              <div className="bg-gray-900 rounded p-2 mb-3 max-h-32 overflow-y-auto">
                                  {person.comments.length === 0 && <p className="text-xs text-gray-500 italic">No sightings yet.</p>}
                                  {person.comments.map((c, idx) => (<div key={idx} className="mb-1 text-xs border-b border-gray-700 pb-1"><span className="text-blue-400 font-bold">{c.user}: </span><span className="text-gray-300">{c.text}</span></div>))}
                              </div>
                              <div className="flex gap-2">
                                  <input type="text" placeholder="I saw them at..." className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500" value={activeCommentId === person._id ? commentText : ""} onChange={(e) => { setActiveCommentId(person._id); setCommentText(e.target.value); }} />
                                  <button onClick={() => submitComment(person._id)} className="bg-green-600 text-white p-1 rounded hover:bg-green-700"><MessageCircle size={18}/></button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <AnimatePresence>
          {showReportMissing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4">
                  <div className="bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-700">
                      <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white">Report Missing Person</h3><button onClick={() => setShowReportMissing(false)} className="text-gray-400 hover:text-white"><X size={24}/></button></div>
                      <div className="space-y-3">
                          <input type="text" placeholder="Full Name" className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600" value={missingForm.name} onChange={e => setMissingForm({...missingForm, name: e.target.value})} />
                          <div className="flex gap-3"><input type="text" placeholder="Age" className="w-1/3 bg-gray-700 text-white p-3 rounded-lg border border-gray-600" value={missingForm.age} onChange={e => setMissingForm({...missingForm, age: e.target.value})} /><input type="text" placeholder="Last Seen Location" className="w-2/3 bg-gray-700 text-white p-3 rounded-lg border border-gray-600" value={missingForm.lastSeen} onChange={e => setMissingForm({...missingForm, lastSeen: e.target.value})} /></div>
                          <textarea placeholder="Description..." rows="3" className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600" value={missingForm.description} onChange={e => setMissingForm({...missingForm, description: e.target.value})}></textarea>
                          <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer relative hover:border-blue-500">
                              <input type="file" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={handleMissingImage}/>
                              <div className="text-gray-400 flex flex-col items-center"><Camera size={24}/> <span className="text-sm">{missingForm.image ? "Photo Added ✅" : "Upload Photo"}</span></div>
                          </div>
                          <button onClick={submitMissingReport} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg mt-2">SUBMIT REPORT</button>
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence>
          {bookingShelter && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[2000] bg-white p-6 rounded-xl shadow-2xl w-80 border-2 border-green-500">
                  <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 flex items-center gap-2"><BedDouble size={20} className="text-green-600"/> Book Shelter</h3><button onClick={() => setBookingShelter(null)}><X size={20}/></button></div>
                  <div className="mb-4"><p className="text-sm font-bold">{bookingShelter.name}</p><p className="text-xs text-gray-500">Available: {bookingShelter.capacity}</p></div>
                  <div className="flex items-center gap-3 mb-4"><span className="text-sm">Beds Needed:</span><input type="number" min="1" max={bookingShelter.capacity} value={bedsToBook} onChange={(e) => setBedsToBook(e.target.value)} className="w-20 border-2 p-1 rounded text-center font-bold"/></div>
                  <button onClick={handleConfirmBooking} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 transition shadow-lg">CONFIRM BOOKING</button>
              </motion.div>
          )}
      </AnimatePresence>

      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2"><button onClick={handleLogout} className="bg-white p-3 rounded-full shadow-xl text-red-600 hover:bg-gray-100 transition"><LogOut size={20} /></button><button onClick={() => setShowContacts(!showContacts)} className="bg-white p-3 rounded-full shadow-xl text-blue-600 hover:bg-gray-100 transition"><UserPlus size={20} /></button></div>
      <div className="absolute top-4 left-4 z-[1000]"><motion.button whileTap={{ scale: 0.95 }} onClick={handleMarkSafe} className={`p-3 rounded-full shadow-xl font-bold flex items-center gap-2 transition-all ${amISafe ? 'bg-green-500 text-white' : 'bg-white text-gray-800'}`}>{amISafe ? <Check size={20}/> : <ShieldCheck size={20}/>} {amISafe ? "MARKED SAFE" : "I'M SAFE"}</motion.button></div>

      <AnimatePresence>{showContacts && (<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute top-20 right-20 z-[2000] bg-white p-4 rounded-xl shadow-2xl w-72 border-2 border-blue-100"><div className="flex justify-between items-center mb-3"><h3 className="font-bold text-gray-700 flex items-center gap-2"><Phone size={16}/> Emergency Contacts</h3><button onClick={() => setShowContacts(false)}><X size={16}/></button></div><div className="space-y-2 mb-4 max-h-40 overflow-y-auto">{contacts.map((c, i) => <div key={i} className="bg-gray-50 p-2 rounded flex justify-between text-sm"><span>{c.name}</span><span className="text-gray-500">{c.phone}</span></div>)}</div><div className="flex gap-2"><input type="text" placeholder="Name" className="w-1/3 border p-1 rounded text-sm" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} /><input type="text" placeholder="Phone" className="w-1/3 border p-1 rounded text-sm" value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} /><button onClick={addContact} className="bg-blue-600 text-white px-2 rounded text-sm">+</button></div></motion.div>)}</AnimatePresence>

      {responderStatus === 'assigned' && activeSosId && (<div className="absolute bottom-24 right-4 z-[2000]"><ChatWindow socket={socket} sosId={activeSosId} userName="Citizen" role="citizen" /></div>)}
      <AnimatePresence>{inDangerZone && (<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-20 left-4 right-4 bg-red-600 text-white p-4 rounded-2xl shadow-2xl z-[2000] flex items-center gap-4 border-2 border-white animate-pulse"><Siren size={40} className="text-yellow-300"/><div><h2 className="text-lg font-bold uppercase">You are in a Danger Zone!</h2><p className="text-xs">Evacuate immediately.</p></div></motion.div>)}</AnimatePresence>
      <AnimatePresence>{responderStatus === 'assigned' && responderInfo && (<motion.div initial={{ y: -150 }} animate={{ y: 0 }} className="absolute top-20 left-4 right-4 z-[2000] bg-white p-4 rounded-2xl shadow-xl border-l-8 border-blue-600"><div className="flex justify-between items-start"><div><p className="text-xs text-gray-500 font-bold uppercase">Help is Arriving</p><h3 className="text-lg font-bold text-gray-800">{responderInfo.name}</h3><p className="text-sm text-gray-500">Vehicle: <b>{responderInfo.vehicle}</b></p></div><div className="text-right"><p className="text-2xl font-bold text-blue-600">LIVE</p></div></div><div className="mt-3"><button onClick={() => callNumber(responderInfo.phone)} className="w-full bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Phone size={20}/> Call {responderInfo.phone}</button></div></motion.div>)}</AnimatePresence>
    </div>
  );
};
export default Citizen;