import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import axios from 'axios';
// Add this import (adjust path as needed)
import Layout from '../components/Layout';
// Import Leaflet CSS / Fixes
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
// --- Leaflet Icon Workaround ---
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});
// --- End Leaflet Icon Workaround ---

// Interfaces
interface NominatimAddress {
    county?: string;
    state_district?: string;
    city?: string;
    state?: string;
    country?: string;
}
interface NominatimReverseResponse {
    address: NominatimAddress;
    display_name: string;
}

// Configuration - Ensure this matches the address/port of your RUNNING Flask backend
const API_BASE_URL = 'http://localhost:5000'; // Default Flask port is 5000

const RoutePlannerPage: React.FC = () => {
    // State and Refs
    const [sourceDistrict, setSourceDistrict] = useState('');
    const [destinationDistrict, setDestinationDistrict] = useState('');
    const [districts, setDistricts] = useState<string[]>([]);
    const [routes, setRoutes] = useState<L.Routing.IRoute[]>([]);
    const [scores, setScores] = useState<(number | null)[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const mapRefs = useRef<(L.Map | null)[]>([]);
    const mapContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const mapLayersRef = useRef<L.LayerGroup[]>([]);

    // --- Fetch available districts ---
    useEffect(() => {
        console.log("Fetching districts from backend...");
        // *** UPDATED to use /api prefix ***
        axios.get<string[]>(`${API_BASE_URL}/api/districts`)
            .then(response => {
                if (Array.isArray(response.data)) {
                    console.log(`Received ${response.data.length} districts.`);
                    setDistricts(response.data.sort()); // Sort alphabetically
                } else {
                    console.error('Invalid districts format received:', response.data);
                    setError('Failed to load districts (invalid format).');
                    setDistricts([]);
                }
            })
            .catch(err => {
                console.error('Error loading districts:', err);
                let errorMsg = 'Failed to load districts list from backend.';
                if (err.response) {
                    errorMsg += ` Status: ${err.response.status} - ${err.response.data?.error || err.response.statusText}`;
                } else if (err.request) {
                    errorMsg += ' No response received. Is the backend running and accessible?';
                } else {
                    errorMsg += ` Error: ${err.message}`;
                }
                setError(errorMsg);
                setDistricts([]);
            });
    }, []); // Runs once on component mount

    // --- Initialize the FIRST Map Eagerly on Mount ---
    useEffect(() => {
        const mapIndex = 0;
        let mapInstance: L.Map | null = null;
        const timeoutId = setTimeout(() => {
            const container = mapContainerRefs.current[mapIndex];
            if (container && !mapRefs.current[mapIndex]) {
                try {
                    console.log(`Initializing map ${mapIndex}...`);
                    mapInstance = L.map(container, { center: [20.5937, 78.9629], zoom: 5 }); // Center on India
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(mapInstance);
                    mapRefs.current[mapIndex] = mapInstance;
                    mapLayersRef.current[mapIndex] = L.layerGroup().addTo(mapInstance);
                    console.log(`Map ${mapIndex} initialized.`);
                } catch (mapInitError) { console.error(`Error initializing map ${mapIndex}:`, mapInitError); setError("Failed to initialize base map."); }
            } else if (!container) { console.warn(`Map container ${mapIndex} not found.`); }
            else if (mapRefs.current[mapIndex]) { console.log(`Map ${mapIndex} already initialized.`); }
        }, 150);
        return () => { // Cleanup
            clearTimeout(timeoutId); console.log(`Cleaning up map ${mapIndex}.`);
            const mapToRemove = mapRefs.current[mapIndex];
            if (mapToRemove) { mapToRemove.remove(); }
            mapRefs.current[mapIndex] = null; mapLayersRef.current[mapIndex] = undefined!;
        };
    }, []); // Run only on mount

    // --- Geocoding Function (Nationwide) ---
    const geocode = async (district: string): Promise<L.LatLng | null> => {
        // (Keep the implementation from the previous response - it's correct for nationwide)
        console.log(`--- Geocode Start: "${district}" ---`);
        if (!district || typeof district !== 'string' || !district.trim()) return null;
        const queryToSend = district.trim();
        console.log(`Geocode: Querying Nominatim with: "${queryToSend}, India"`);
        try {
            const params = { q: `${queryToSend}, India`, format: 'json', limit: 1, addressdetails: 1, 'accept-language': 'en' };
            const response = await axios.get('https://nominatim.openstreetmap.org/search', { params });
            if (!response.data || response.data.length === 0) { console.error(`>>> Geocode: NO RESULTS for query: "${queryToSend}, India"`); return null; }
            const { lat, lon } = response.data[0];
            if (lat === undefined || lon === undefined) { console.error(`Geocode: Invalid lat/lon for query: "${queryToSend}, India"`); return null; }
            const resultCoords = L.latLng(parseFloat(lat), parseFloat(lon));
            console.log(`Geocode: Success for query "${queryToSend}, India" -> ${resultCoords.lat}, ${resultCoords.lng}.`);
            return resultCoords;
        } catch (error) { console.error(`Geocode Error for query: "${queryToSend}, India"`, error); return null; }
        finally { console.log(`--- Geocode End: "${district}" ---`); }
    };

    // --- Reverse Geocoding Function (Nationwide + Rate Limit) ---
      const reverseGeocode = async (latlng: L.LatLng): Promise<string | null> => {
          // (Keep the implementation from the previous response - includes 1.1s delay)
          try {
              console.log(`Reverse Geocode: Waiting 1.1s before request for ${latlng.lat},${latlng.lng}`);
              await new Promise(resolve => setTimeout(resolve, 1100));
              console.log(`Reverse Geocode: Requesting details for ${latlng.lat},${latlng.lng}`);
              const response = await axios.get<NominatimReverseResponse>('https://nominatim.openstreetmap.org/reverse', { params: { lat: latlng.lat, lon: latlng.lng, format: 'json', addressdetails: 1, 'accept-language': 'en', zoom: 10 } });
              const address = response.data?.address;
              const districtName = address?.state_district || address?.county || address?.city; // Prioritize district fields
              if (districtName) {
                  const upperDistrict = districtName.toUpperCase().trim();
                  console.log(`Reverse Geocode: Success -> ${upperDistrict}`);
                  return upperDistrict;
              } else { console.warn(`Reverse Geocode: Could not find district/county/city name for ${latlng.lat},${latlng.lng}.`); return null; }
          } catch (error) { console.error(`Reverse geocode API error for ${latlng.lat},${latlng.lng}:`, error); if (axios.isAxiosError(error) && error.response?.status === 429) { console.warn("NOMINATIM RATE LIMIT HIT!"); setError("Rate limit hit getting location details."); } return null; }
      };

    // --- Function to Draw Routes ---
    const drawRoutesOnMaps = useCallback((routesToDraw: L.Routing.IRoute[]) => {
        // (Keep the implementation from the previous response - handles drawing/markers/bounds)
        console.log(`Drawing ${routesToDraw.length} route(s).`);
        mapLayersRef.current.forEach(layerGroup => layerGroup?.clearLayers());
        routesToDraw.forEach((route, idx) => {
            const map = mapRefs.current[idx];
            if (map && !mapLayersRef.current[idx]) { mapLayersRef.current[idx] = L.layerGroup().addTo(map); console.warn(`Layer group ${idx} created during draw.`); }
            const layerGroup = mapLayersRef.current[idx];
            if (map && layerGroup) {
                console.log(`Drawing route ${idx} on map ${idx}.`);
                if (route.coordinates && route.coordinates.length > 0) {
                    const polyline = L.polyline(route.coordinates, { color: idx === 0 ? '#0d6efd' : '#6c757d', weight: 6, opacity: 0.75 }).addTo(layerGroup);
                    if (route.waypoints?.length >= 2) { const startWp = route.waypoints[0]; const endWp = route.waypoints[route.waypoints.length - 1]; if (startWp.latLng) L.marker(startWp.latLng, { title: `Start: ${startWp.name || ''}` }).addTo(layerGroup); if (endWp.latLng) L.marker(endWp.latLng, { title: `End: ${endWp.name || ''}` }).addTo(layerGroup); }
                    try { setTimeout(() => { if (map?.getContainer() && polyline) map.fitBounds(polyline.getBounds().pad(0.15)); }, 100); }
                    catch (fitBoundsError) { console.error(`Error fitBounds map ${idx}:`, fitBoundsError); if (route.waypoints?.[0]?.latLng) map.setView(route.waypoints[0].latLng, 10); }
                    setTimeout(() => { if(map?.getContainer()) map.invalidateSize(); }, 150);
                } else { console.warn(`Route ${idx} has no coordinates.`); }
            } else { console.warn(`Map/layer group not ready for draw index ${idx}.`); }
        });
    }, []); // Empty dependency array is correct here

    // --- Effect to Manage Maps based on `routes` ---
    useEffect(() => {
        // (Keep the implementation from the previous response - handles map creation/deletion)
        const requiredMapCount = Math.max(1, routes.length);
        console.log(`Routes changed. Required maps: ${requiredMapCount}`);
        for (let i = mapRefs.current.length - 1; i >= requiredMapCount; i--) { if (mapRefs.current[i]) { console.log(`Removing excess map ${i}`); mapRefs.current[i]?.remove(); mapRefs.current[i] = null; mapLayersRef.current[i] = undefined!; } }
        mapRefs.current.length = requiredMapCount; mapLayersRef.current.length = requiredMapCount; mapContainerRefs.current.length = requiredMapCount;
        routes.forEach((_, idx) => {
             if (idx === 0) { setTimeout(() => mapRefs.current[0]?.invalidateSize(), 100); return; }
             const container = mapContainerRefs.current[idx];
             if (container && !mapRefs.current[idx]) {
                 console.log(`Initializing map ${idx}...`); try { const map = L.map(container, { center: [20.5937, 78.9629], zoom: 5, scrollWheelZoom: false }); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map); mapRefs.current[idx] = map; mapLayersRef.current[idx] = L.layerGroup().addTo(map); } catch (e) { console.error(`Error init map ${idx}:`, e); }
             } else if (mapRefs.current[idx]) { setTimeout(() => mapRefs.current[idx]?.invalidateSize(), 100); }
             else if (!container) { console.warn(`Container ${idx} not ready.`); }
        });
        if (routes.length > 0) { setTimeout(() => { drawRoutesOnMaps(routes); }, 250); }
        else if (mapLayersRef.current[0]) { mapLayersRef.current[0].clearLayers(); }
    }, [routes, drawRoutesOnMaps]); // Keep drawRoutesOnMaps dependency

    // --- Calculate Safety Scores (Frontend Workaround - Calls Backend per District) ---
    const getSafetyScoresForRoutes = async (routesToScore: L.Routing.IRoute[]): Promise<(number | null)[]> => {
        // (Keep the implementation from the previous response - includes reduced geocoding and looping API calls)
        console.log(`Calculating scores for ${routesToScore.length} route(s)...`);
        const scorePromises = routesToScore.map(async (route, routeIndex) => {
            const routeDistricts = new Set<string>();
            if (sourceDistrict) routeDistricts.add(sourceDistrict.toUpperCase().trim());
            if (destinationDistrict) routeDistricts.add(destinationDistrict.toUpperCase().trim());
            const coordsToGeocode: L.LatLng[] = [];
            if (route.coordinates && route.coordinates.length >= 3) { coordsToGeocode.push(route.coordinates[Math.floor(route.coordinates.length / 2)]); }
            console.log(`Route ${routeIndex}: Reverse geocoding ${coordsToGeocode.length} point(s)...`);
            for (const coord of coordsToGeocode) { const districtName = await reverseGeocode(coord); if (districtName) routeDistricts.add(districtName); }
            const districtList = Array.from(routeDistricts);
            console.log(`Route ${routeIndex}: Districts identified: [${districtList.join(', ')}]`);
            if (districtList.length > 0) {
                let validScores: number[] = []; let apiErrors = 0;
                console.log(`Route ${routeIndex}: Calling backend /api/safety_score for ${districtList.length} district(s)...`);
                for (const district of districtList) {
                    try {
                         // *** UPDATED to use /api prefix ***
                        const response = await axios.post<{ safety_score?: number; error?: string; message?: string }>(
                            `${API_BASE_URL}/api/safety_score`, // <-- Added /api
                            { district: district } // Send single district name
                        );
                        // Check specific error message for district not found vs other errors
                        if (response.data.error) { console.warn(`Backend score error for "${district}" (Route ${routeIndex}): ${response.data.error}`); }
                        else if (response.data.message?.includes("Data not available")) { console.warn(`Score data unavailable for "${district}" (Route ${routeIndex}).`);}
                        else if (typeof response.data.safety_score === 'number') { console.log(` -> Score received for "${district}": ${response.data.safety_score}`); validScores.push(response.data.safety_score); }
                        else { console.warn(`Invalid score format for "${district}" (Route ${routeIndex}):`, response.data); }
                    } catch (err: any) {
                         apiErrors++; console.error(`API error getting score for "${district}" (Route ${routeIndex}):`, err);
                         // Log specific error from backend if available
                        if (err.response) { console.error("Backend Error Details:", { status: err.response.status, data: err.response.data }); }
                     }
                 }
                console.log(`Route ${routeIndex}: Backend calls complete. Valid scores: ${validScores.length}. API Errors: ${apiErrors}.`);
                if (validScores.length > 0) { const averageScore = validScores.reduce((a, b) => a + b, 0) / validScores.length; console.log(`Route ${routeIndex}: Average score = ${averageScore.toFixed(2)}`); return averageScore; }
                else { console.warn(`Route ${routeIndex}: No valid scores found.`); return null; }
            } else { console.warn(`No districts for route ${routeIndex}.`); return null; }
        });
        const resolvedScores = await Promise.all(scorePromises);
        console.log("Final calculated scores for routes:", resolvedScores);
        return resolvedScores;
    };

    // --- Handle Route Calculation Trigger ---
    const handleRoute = async () => {
        // (Keep the implementation from the previous response - includes loading state fix)
        console.log("--- handleRoute: Process Started ---");
        if (!sourceDistrict || !destinationDistrict) { setError('Please select source and destination districts.'); return; }
        if (sourceDistrict === destinationDistrict) { setError('Source and Destination cannot be the same.'); return; }
        setError(null); setIsLoading(true); setRoutes([]); setScores([]);
        if (mapLayersRef.current[0]) { mapLayersRef.current[0].clearLayers(); console.log("Cleared map 0 layers."); }

        try {
            console.log("handleRoute: Geocoding...");
            const [sourceCoords, destinationCoords] = await Promise.all([geocode(sourceDistrict), geocode(destinationDistrict)]);
            if (!sourceCoords) { setError(`Could not find coordinates for source: "${sourceDistrict}".`); setIsLoading(false); return; }
            if (!destinationCoords) { setError(`Could not find coordinates for destination: "${destinationDistrict}".`); setIsLoading(false); return; }
            console.log("handleRoute: Geocoding successful. Initializing routing...");

            const control = L.Routing.control({ waypoints: [sourceCoords, destinationCoords], routeWhileDragging: false, addWaypoints: false, show: false, showAlternatives: true, createMarker: () => null });
            let routesFoundProcessed = false;

            control.on('routesfound', async (e: L.Routing.RoutingResultEvent) => {
                if (routesFoundProcessed) { console.warn("routesfound ignoring subsequent call."); return; }
                routesFoundProcessed = true; console.log(`Event: routesfound - ${e.routes.length} route(s) found.`);
                const foundRoutes = e.routes.slice(0, 3);
                setRoutes(foundRoutes); // Trigger map drawing effect
                try {
                     console.log("routesfound: Triggering score calculation...");
                     const routeScores = await getSafetyScoresForRoutes(foundRoutes);
                     console.log("routesfound: Score calculation finished.");
                     setScores(routeScores);
                } catch (scoreError) { console.error("Error calculating scores:", scoreError); setError("Failed to calculate scores."); setScores(Array(foundRoutes.length).fill(null)); }
                finally {
                    // *** Correct Loading State Fix ***
                    setIsLoading(false);
                    console.log("routesfound: Process complete. Set isLoading to false.");
                }
            });

            control.on('routingerror', (e: L.Routing.RoutingErrorEvent) => {
                console.error("Event: routingerror", e.error);
                let msg = `Routing Error: ${e.error?.message || 'Unknown'}.`;
                if (e.error?.message?.toLowerCase().includes("could not find route")) msg = "Could not find a route between locations.";
                setError(msg); setRoutes([]); setScores([]); setIsLoading(false); console.log("routingerror: Process complete. Set isLoading to false.");
            });

            const firstMap = mapRefs.current[0];
            if (firstMap instanceof L.Map && firstMap.getContainer()) {
                console.log("handleRoute: Adding control to map 0..."); control.addTo(firstMap);
                setTimeout(() => { console.log("handleRoute: Removing control from map 0."); if (control && firstMap?.hasLayer(control as L.Layer)) firstMap.removeLayer(control as L.Layer); }, 100);
            } else { console.error("handleRoute: Map 0 not valid!"); setError("Map init error."); setIsLoading(false); }
        } catch (err) { console.error("Critical error in handleRoute:", err); setError('Unexpected error during setup.'); setIsLoading(false); setRoutes([]); setScores([]); console.log("handleRoute catch: Process complete. Set isLoading to false."); }
        console.log("--- handleRoute: Setup Complete (waiting for async events) ---");
    };

    // --- Render Component ---
    return (
      <Layout showNavbar={true}>
       
        <div style={{ padding: '1rem', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
            <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '1rem' }}>🛣️ Route Planner with Safety Score</h2>
            <p style={{fontSize: '0.9em', color: '#555', textAlign: 'center', marginBottom: '1.5rem'}}>
                Select districts below. Routing works nationwide.
                <br/>
               
            </p>

            {/* Input Selection Area */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                 <select value={sourceDistrict} onChange={e => setSourceDistrict(e.target.value)} style={{ padding: '10px', minWidth: '220px', borderRadius: '4px', border: '1px solid #ced4da' }} disabled={isLoading} aria-label="Select Source District" >
                     <option value="">-- Select Source District --</option>
                     {districts.map((district, idx) => <option key={`src-${district}-${idx}`} value={district}>{district}</option>)}
                 </select>
                 <select value={destinationDistrict} onChange={e => setDestinationDistrict(e.target.value)} style={{ padding: '10px', minWidth: '220px', borderRadius: '4px', border: '1px solid #ced4da' }} disabled={isLoading} aria-label="Select Destination District" >
                      <option value="">-- Select Destination District --</option>
                     {districts.map((district, idx) => <option key={`dest-${district}-${idx}`} value={district}>{district}</option>)}
                  </select>
                <button onClick={handleRoute} disabled={isLoading || !sourceDistrict || !destinationDistrict} style={{ padding: '10px 20px', cursor: (isLoading || !sourceDistrict || !destinationDistrict) ? 'not-allowed' : 'pointer', backgroundColor: (isLoading || !sourceDistrict || !destinationDistrict) ? '#6c757d' : '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', opacity: (isLoading || !sourceDistrict || !destinationDistrict) ? 0.65 : 1, transition: 'background-color 0.2s ease', }} >
                    {isLoading ? 'Calculating...' : 'Show Route Options'}
                </button>
            </div>

            {/* Status Messages Area */}
             <div style={{ marginBottom: '1.5rem', minHeight: '2.5em', textAlign: 'center' }}>
                 {error && ( <p style={{ color: '#dc3545', fontWeight: 'bold', border: '1px solid #f5c6cb', padding: '10px', borderRadius: '4px', backgroundColor: '#f8d7da' }}> ⚠️ Error: {error} </p> )}
                 {isLoading && ( <p style={{ color: '#0d6efd', fontWeight: 'bold' }}> <span aria-hidden="true" style={{ display: 'inline-block', width: '1em', height: '1em', border: '3px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spinner-border .75s linear infinite' }}></span> <style>{`@keyframes spinner-border { to { transform: rotate(360deg); } }`}</style> <span style={{ marginLeft: '0.5em' }}>Loading routes and calculating scores...</span> <small style={{ display: 'block', color: '#6c757d' }}>(May take time due to external services)</small> </p> )}
            </div>

            {/* Map Containers & Details Area */}
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 {!isLoading && !error && routes.length === 0 && sourceDistrict && destinationDistrict && ( <p style={{ textAlign: 'center', color: '#6c757d' }}>Click "Show Route Options" to begin.</p> )}
                {Array.from({ length: Math.max(1, routes.length) }).map((_, idx) => {
                     const route = routes[idx]; const routeNumber = idx + 1; const score = scores[idx];
                     return (
                         <div key={idx} style={{ border: '1px solid #dee2e6', padding: '1rem', borderRadius: '8px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                             <div ref={el => { mapContainerRefs.current[idx] = el; }} id={`map-${idx}`} style={{ height: '400px', width: '100%', marginBottom: '1rem', backgroundColor: '#e9ecef', borderRadius: '4px' }} aria-label={`Map for route ${routeNumber}`} />
                             {route ? (
                                 <div>
                                     <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#212529' }}> Route {routeNumber} {idx === 0 ? <span style={{ color: '#0d6efd', fontSize: '0.9em' }}>(Primary)</span> : <span style={{ color: '#6c757d', fontSize: '0.9em' }}>(Alternative)</span>} </h4>
                                     <p style={{ margin: '0.25rem 0', color: '#495057' }}> <strong>Distance:</strong> {(route.summary.totalDistance / 1000).toFixed(1)} km <span style={{ margin: '0 0.5rem' }}>|</span> <strong>Est. Time:</strong> {Math.round(route.summary.totalTime / 60)} min </p>
                                     <div style={{ marginTop: '0.75rem' }}>
                                         {isLoading && scores.length === 0 ? ( <p style={{fontWeight: 'bold', color: '#0d6efd', margin: 0 }}>Calculating Safety Score...</p> )
                                          : (score !== null && score !== undefined) ? ( <p style={{ fontWeight: 'bold', color: score < 50 ? '#dc3545' : (score < 75 ? '#ffc107' : '#198754'), margin: 0 }}> Safety Score: {score.toFixed(2)} / 100 </p> )
                                          : ( <p style={{fontWeight: 'bold', color: '#6c757d', margin: 0 }}> Safety Score: Not Available </p> )}
                                      </div> <hr style={{border: 0, borderTop: '1px dashed #ced4da', margin: '1rem 0 0.5rem 0'}}/>
                                 </div>
                             ) : ( idx === 0 && !isLoading && !error && routes.length === 0 && ( <p style={{textAlign: 'center', color: '#6c757d', fontStyle: 'italic'}}>(Map will display the route here)</p> ) )}
                         </div> ); })}
            </div>
        </div>
        </Layout>
    );
};

export default RoutePlannerPage;