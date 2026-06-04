import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary, useAdvancedMarkerRef, InfoWindow } from '@vis.gl/react-google-maps';
import { ItineraryActivity, Hotel } from '../types';
import { Compass } from 'lucide-react';
import { API_KEY, hasValidKey } from '../lib/maps';

interface MapVisualizationProps {
  destination: string;
  activities: ItineraryActivity[];
  hotel: Hotel | null;
}

const ClickableMarker: React.FC<{
  position: google.maps.LatLngLiteral;
  title: string;
  nodeContent: React.ReactNode;
  infoContent: React.ReactNode;
  zIndex?: number;
}> = ({ position, title, nodeContent, infoContent, zIndex = 50 }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdvancedMarker 
        ref={markerRef} 
        position={position} 
        title={title} 
        zIndex={zIndex}
        onClick={() => setOpen(true)}
      >
        {nodeContent}
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="text-slate-900 font-sans p-1 max-w-[200px]">
            {infoContent}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function RoutesAndMarkers({ destination, activities, hotel }: MapVisualizationProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  
  const [locations, setLocations] = useState<Array<{ id: string; title: string; index: number; position: google.maps.LatLngLiteral }>>([]);
  const [hotelLocation, setHotelLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!placesLib || !map) return;
    
    // Convert activities to real coordinates
    const resolveLocations = async () => {
      let resolvedLocations: Array<{ id: string; title: string; index: number; position: google.maps.LatLngLiteral }> = [];
      
      for (let i = 0; i < activities.length; i++) {
        const act = activities[i];
        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery: `${act.title} in ${destination}`,
            fields: ['location'],
            maxResultCount: 1,
          });
          if (places && places[0] && places[0].location) {
            resolvedLocations.push({
              id: act.id,
              title: act.title,
              index: i + 1,
              position: { lat: places[0].location.lat(), lng: places[0].location.lng() }
            });
          }
        } catch (e) {
          console.error("Failed to geocode", act.title, e);
        }
      }
      setLocations(resolvedLocations);
      
      // Also geocode the hotel
      if (hotel) {
        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery: `${hotel.name} in ${destination}`,
            fields: ['location'],
            maxResultCount: 1,
          });
          if (places && places[0] && places[0].location) {
            setHotelLocation({ lat: places[0].location.lat(), lng: places[0].location.lng() });
          }
        } catch (e) {
          console.error("Failed to geocode hotel", hotel.name, e);
        }
      } else {
        setHotelLocation(null);
      }
      
      // If we got locations, fit bounds
      if (resolvedLocations.length > 0 || hotelLocation) {
        const bounds = new google.maps.LatLngBounds();
        resolvedLocations.forEach(loc => bounds.extend(loc.position));
        if (hotelLocation) bounds.extend(hotelLocation);
        map.fitBounds(bounds);
      }
    };
    
    resolveLocations();
  }, [placesLib, map, activities, destination, hotel?.name]);

  // Compute routes
  useEffect(() => {
    if (!routesLib || !map || locations.length < 2) return;
    
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];
    
    const computePaths = async () => {
      // Create a sequence of locations starting with hotel (if present), then activities
      const waypoints = [...locations];
      
      for (let i = 0; i < waypoints.length - 1; i++) {
        const origin = waypoints[i].position;
        const dest = waypoints[i+1].position;
        
        try {
          const { routes } = await routesLib.Route.computeRoutes({
            origin,
            destination: dest,
            travelMode: 'DRIVING',
            fields: ['path'],
          });
          if (routes?.[0]) {
            const newPolylines = routes[0].createPolylines();
            newPolylines.forEach(p => {
              p.setOptions({
                strokeColor: '#a855f7',
                strokeWeight: 2,
                strokeOpacity: 0.7,
              });
              p.setMap(map);
            });
            polylinesRef.current.push(...newPolylines);
          }
        } catch (e) {
          console.error("Route calculation failed", e);
        }
      }
    };
    
    computePaths();
    
    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
    };
  }, [routesLib, map, locations]);

  return (
    <>
      {hotelLocation && hotel && (
        <ClickableMarker 
          position={hotelLocation} 
          title={`Hotel: ${hotel.name}`} 
          zIndex={100}
          nodeContent={
            <div className="relative -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition hover:scale-110">
              <div className="h-6 w-6 rounded-lg bg-pink-600 text-white flex items-center justify-center font-bold ring-2 ring-slate-950 border border-pink-400 shadow-lg">
                H
              </div>
            </div>
          }
          infoContent={
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-pink-600 mb-1">Accommodation</div>
              <div className="font-bold text-sm leading-tight mb-1">{hotel.name}</div>
              <div className="text-xs text-slate-600">{hotel.description || hotel.address}</div>
            </div>
          }
        />
      )}
      
      {locations.map((loc) => {
        const act = activities.find(a => a.id === loc.id);
        return (
          <ClickableMarker 
            key={loc.id} 
            position={loc.position} 
            title={loc.title} 
            zIndex={50}
            nodeContent={
              <div className="relative -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition hover:scale-110">
                <div className="h-5 w-5 rounded-full bg-purple-600 text-[10px] text-white flex items-center justify-center font-bold ring-4 ring-slate-950 border border-purple-400 shadow-md">
                  {loc.index}
                </div>
              </div>
            }
            infoContent={
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-1">Activity {loc.index}</div>
                <div className="font-bold text-sm leading-tight mb-1">{loc.title}</div>
                <div className="text-xs text-slate-600 mb-1 truncate">{act?.location}</div>
                <div className="text-xs font-semibold text-slate-500">{act?.time} ({act?.duration})</div>
              </div>
            }
          />
        );
      })}
    </>
  );
}

export default function MapVisualization({ destination, activities, hotel }: MapVisualizationProps) {
  if (!hasValidKey) {
    return (
      <div className="relative bg-slate-950 overflow-hidden border border-white/10 rounded-xl flex-1 flex items-center justify-center min-h-[250px] shadow-inner p-4 text-center">
        <div className="max-w-md">
          <h2 className="text-sm font-bold text-slate-200 mb-2">Maps API Key Required</h2>
          <div className="text-[11px] text-slate-400 space-y-2 text-left bg-white/5 p-3 rounded-lg border border-white/10">
            <p><strong>Step 1:</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener" className="text-purple-400 hover:underline">Get an API Key</a></p>
            <p><strong>Step 2:</strong> Add key as secret:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Open <strong>Settings</strong> (⚙️)</li>
              <li>Select <strong>Secrets</strong></li>
              <li>Name: <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
            </ul>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Map will reload automatically.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-slate-950 overflow-hidden border border-white/10 rounded-xl flex-1 flex min-h-[250px] shadow-inner">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={{lat: 35.6762, lng: 139.6503}} // Default to Tokyo if bounds not fit
          defaultZoom={11}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          disableDefaultUI={true}
        >
          <RoutesAndMarkers destination={destination} activities={activities} hotel={hotel} />
        </Map>
      </APIProvider>
    </div>
  );
}
