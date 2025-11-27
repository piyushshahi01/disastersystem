import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const HeatmapLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

   
    const heat = L.heatLayer(points, {
      radius: 30, // Size of the glow
      blur: 20,   // Softness of the glow
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red' 
      }
    }).addTo(map);

    
    return () => {
      map.removeLayer(heat);
    };
  }, [points, map]);

  return null;
};

export default HeatmapLayer;