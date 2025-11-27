import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';


import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 13);
  }, [lat, lng]);
  return null;
}

const LocationPicker = ({ onLocationSelect }) => {
  const [position, setPosition] = useState({ lat: 28.6139, lng: 77.2090 }); // Default Delhi
  const markerRef = useRef(null);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        onLocationSelect(newPos);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const { lat, lng } = marker.getLatLng();
        const newPos = { lat, lng };
        setPosition(newPos);
        onLocationSelect(newPos);
      }
    },
  }), [onLocationSelect]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border">
        <button 
          type="button"
          onClick={handleLocateMe}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-bold"
        >
          📍 Use My Location
        </button>
        <div className="text-xs text-gray-600">
          <p>Lat: {position.lat.toFixed(4)}</p>
          <p>Lng: {position.lng.toFixed(4)}</p>
        </div>
      </div>

      <div className="h-64 w-full rounded-lg overflow-hidden border-2 border-gray-300 relative z-0">
        <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker 
            draggable={true} 
            eventHandlers={eventHandlers} 
            position={position} 
            ref={markerRef}
          >
            <Popup>Drag to adjust location</Popup>
          </Marker>
          <MapRecenter lat={position.lat} lng={position.lng} />
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;