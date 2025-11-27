import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// --- LEAFLET ICON FIX (START) ---
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import the images directly so Vite bundles them correctly
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix the internal Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});
// --- LEAFLET ICON FIX (END) ---

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
     <App />
    </React.StrictMode>,
)