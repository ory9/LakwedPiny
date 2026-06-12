/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Listing } from "../types";
import { 
  Layers, 
  MapPin, 
  Search, 
  Compass, 
  School, 
  Activity, 
  Navigation, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Plus
} from "lucide-react";
import L from "leaflet";

interface InteractiveMapProps {
  listings: Listing[];
  onSelectListing: (listing: Listing) => void;
  selectedListing: Listing | null;
  offlineMode: boolean;
  placementPin?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  selectedArea?: string | null;
  onSelectArea?: (areaName: string) => void;
}

const DISTRICT_COORDINATES: Record<string, { lat: number, lng: number, zoom: number }> = {
  "Kampala Central": { lat: 0.3283, lng: 32.5911, zoom: 13 },
  "Wakiso": { lat: 0.3980, lng: 32.6395, zoom: 12 },
  "Mukono": { lat: 0.3544, lng: 32.7481, zoom: 12 },
  "Entebbe": { lat: 0.0512, lng: 32.4637, zoom: 13 },
  "Jinja": { lat: 0.4244, lng: 33.2042, zoom: 13 },
  "Gulu": { lat: 2.7725, lng: 32.2990, zoom: 12 },
  "Mbarara": { lat: -0.6074, lng: 30.6545, zoom: 12 }
};

export default function InteractiveMap({ 
  listings, 
  onSelectListing, 
  selectedListing, 
  offlineMode,
  placementPin,
  onMapClick,
  selectedArea = "Kampala Central",
  onSelectArea
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Fallback Landmark Geocoder States
  const [geocodeQuery, setGeocodeQuery] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingResult, setGeocodingResult] = useState<{
    placeName: string;
    district: string;
    type: string;
    resolved: { lat: number; lng: number; displayName: string };
    history: string[];
  } | null>(null);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  // Initialize Map
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    if (!L) {
      setMapError("Leaflet library failed to initialize.");
      return;
    }

    // Leaflet marker default icon fix
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    try {
      // Get initial center based on selectedArea or Kampala Central
      const initialDistrict = selectedArea && DISTRICT_COORDINATES[selectedArea] 
        ? DISTRICT_COORDINATES[selectedArea] 
        : DISTRICT_COORDINATES["Kampala Central"];

      const map = L.map(containerRef.current, {
        center: [initialDistrict.lat, initialDistrict.lng],
        zoom: initialDistrict.zoom,
        zoomControl: true,
        attributionControl: false
      });

      mapRef.current = map;

      const tileUrl = offlineMode 
        ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      markersGroupRef.current = L.layerGroup().addTo(map);

      L.control.scale({ position: "bottomright" }).addTo(map);

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (onMapClick) {
          onMapClick(lat, lng);
        }
      });

    } catch (err: any) {
      console.error("Leaflet initialization error:", err);
      setMapError(`Unable to render map canvas: ${err.message}`);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Offline Mode Tiles
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const tileUrl = offlineMode
      ? "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(mapRef.current);

  }, [offlineMode]);

  // Handle zooming and pan focus on Selected Area (District concentration)
  useEffect(() => {
    if (!mapRef.current || !selectedArea) return;
    const dest = DISTRICT_COORDINATES[selectedArea];
    if (dest) {
      console.log(`[Concentration] Map panning focus to district center: ${selectedArea}`);
      mapRef.current.setView([dest.lat, dest.lng], dest.zoom);
    }
  }, [selectedArea]);

  // Update Markers when listings or selected listing changes
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current || typeof window === "undefined") return;

    // Clear previous markers
    markersGroupRef.current.clearLayers();

    // Render exact placement pin if selected
    if (placementPin) {
      const { lat, lng } = placementPin;
      const placementMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "interactive-map-placement-pin",
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute h-9 w-9 bg-violet-500/40 rounded-full animate-ping pointer-events-none"></div>
              <div class="h-5 w-5 bg-violet-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white">
                <span class="text-[8px] font-bold">★</span>
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })
      });

      placementMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; text-align: center; max-width: 180px;">
          <p style="margin: 0 0 3px 0; font-weight: bold; color: #7c3aed; font-size: 11px; text-transform: uppercase;">VERIFIED PLACE PIN</p>
          <p style="margin: 0 0 4px 0; font-size: 10px; color: #475569; font-family: monospace;">${lat.toFixed(6)}<br/>${lng.toFixed(6)}</p>
          <p style="margin: 0; font-size: 9px; color: #64748b; line-height: 1.3;">Place spot isolated! Click "Append Listing Record" under Input & Records tab to upload.</p>
        </div>
      `);

      placementMarker.addTo(markersGroupRef.current);
      placementMarker.openPopup();
    }

    // Map interest level to color
    const getColor = (level: string, status: string) => {
      if (status === "sold") return "#10b981"; // sold green
      if (level === "high") return "#ef4444"; // red for high
      if (level === "medium") return "#f59e0b"; // amber for medium
      return "#3b82f6"; // blue for low
    };

    listings.forEach(listing => {
      const lat = Number(listing.latitude);
      const lng = Number(listing.longitude);

      if (isNaN(lat) || isNaN(lng)) return;

      const isSelected = selectedListing?.id === listing.id;
      const markerColor = getColor(listing.interestLevel, listing.status);

      const circleMarker = L.circleMarker([lat, lng], {
        radius: isSelected ? 12 : 8,
        fillColor: markerColor,
        color: isSelected ? "#000000" : "#ffffff",
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        fillOpacity: 0.8,
      });

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px; max-width: 180px;">
          <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #1e293b; font-size: 13px;">${listing.title}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">${listing.areaName} ${listing.detectedSuburb ? `• ${listing.detectedSuburb}` : ''}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 12px; font-weight: bold; color: #0f172a;">UGX ${listing.priceUGX}M</span>
            <span style="font-size: 9px; padding: 1px 4px; border-radius: 4px; background: ${listing.status === 'sold' ? '#ecfdf5' : '#fef2f2'}; color: ${listing.status === 'sold' ? '#065f46' : '#991b1b'}; font-weight: bold;">
              ${listing.status.toUpperCase()}
            </span>
          </div>
          <p style="margin: 2px 0 0 0; font-size: 9px; color: #94a3b8;">Broker: ${listing.agentName || "Direct"}</p>
        </div>
      `;

      circleMarker.bindPopup(popupContent);

      circleMarker.on("click", () => {
        onSelectListing(listing);
      });

      circleMarker.addTo(markersGroupRef.current);

      if (isSelected && mapRef.current) {
        mapRef.current.setView([lat, lng], 13);
        circleMarker.openPopup();
      }
    });

  }, [listings, selectedListing, placementPin]);

  // Handle selectedListing frame zoom
  useEffect(() => {
    if (selectedListing && mapRef.current) {
      const lat = Number(selectedListing.latitude);
      const lng = Number(selectedListing.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        mapRef.current.setView([lat, lng], 14);
      }
    }
  }, [selectedListing]);

  // Run the intelligent landmark-combination fallback geocoding pipeline
  const handleIntelligentGeocode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geocodeQuery.trim()) return;

    setIsGeocoding(true);
    setGeocodingError(null);
    setGeocodingResult(null);

    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeName: geocodeQuery,
          district: selectedArea
        })
      });

      const data = await res.json();
      if (data.success && data.resolved) {
        setGeocodingResult(data);
        
        // Pan the Leaflet Map to the newly found falling-back landmark coordinates!
        const { lat, lng } = data.resolved;
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 14);
        }
        
        // Pin place!
        if (onMapClick) {
          onMapClick(lat, lng);
        }
      } else {
        setGeocodingError("Failed to resolve coordinate. Check spelling or try a larger landmark name.");
      }
    } catch (err: any) {
      console.error(err);
      setGeocodingError("Network error with geocoder service.");
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* DISTRICT CONCENTRATION CORES (Selection of Districts) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
        <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3">
          1. Select District of Focus (Active Map Concentration)
        </label>
        
        <div className="flex flex-wrap gap-2">
          {Object.keys(DISTRICT_COORDINATES).map((districtName) => {
            const isActive = selectedArea === districtName;
            return (
              <button
                key={districtName}
                onClick={() => onSelectArea && onSelectArea(districtName)}
                className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isActive 
                    ? "bg-slate-900 border-slate-900 text-white shadow-xs scale-102" 
                    : "bg-slate-50 border-gray-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Navigation className={`h-3 w-3 ${isActive ? "text-blue-400 rotate-45" : "text-slate-400"}`} />
                  {districtName}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* INTELLIGENT FALLBACK LANDMARK GEOCODER CONSOLE */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
        <div>
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-violet-500" />
            2. Landmark-Combination Fallback Geocoder
          </h4>
          <p className="text-[11px] text-gray-500 mt-1">
            Enters a place name. We seek the exact coordinates first, and if not found, we automatically combine with nearby features (<strong>Primary Schools, Health Centres, Markets, Hills</strong>) to locate the closest safe spot!
          </p>
        </div>

        <form onSubmit={handleIntelligentGeocode} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 w-4 top-3" />
            <input
              type="text"
              value={geocodeQuery}
              onChange={(e) => setGeocodeQuery(e.target.value)}
              placeholder="e.g. Bulindo, Bunamwaya, Kyaliwajjala, Seeta..."
              className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <button
            type="submit"
            disabled={isGeocoding}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs font-mono"
          >
            {isGeocoding ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                Resolving...
              </>
            ) : (
              <>
                <Compass className="h-3 w-3" />
                Plot Spot
              </>
            )}
          </button>
        </form>

        {/* ERROR BOX */}
        {geocodingError && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-800 text-xs animate-fade-in">
            <AlertCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Map Search Blocked</p>
              <p className="text-[11px] text-rose-600 mt-0.5">{geocodingError}</p>
            </div>
          </div>
        )}

        {/* RESOLUTION TRACE LOGS */}
        {geocodingResult && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                GIS Spatial Resolution Logs
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                geocodingResult.type === 'exact' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-violet-100 text-violet-800 border border-violet-200'
              }`}>
                {geocodingResult.type === 'exact' ? 'Exact Match' : `Fallback: ${geocodingResult.type}`}
              </span>
            </div>

            {/* Step-by-Step Resolution Pipeline */}
            <div className="space-y-1.5 font-mono text-[10px] text-slate-600">
              {geocodingResult.history.map((step, idx) => {
                const isSuccess = idx === geocodingResult.history.length - 1 && !step.includes("failed") && !step.includes("No exact");
                return (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-400 shrink-0 select-none">[{idx + 1}]</span>
                    <span className={isSuccess ? "text-emerald-700 font-bold" : step.includes("Attempting") ? "text-slate-500" : "text-slate-400"}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="h-px bg-slate-200 my-2" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-lg border border-slate-100">
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-semibold text-slate-400 uppercase">Resolved Landmark Node</span>
                <p className="text-xs font-bold text-slate-800 font-sans leading-snug flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-violet-600 inline" />
                  {geocodingResult.resolved.displayName}
                </p>
                <p className="text-[10px] font-mono text-slate-500">
                  Coordinates: <span className="font-semibold text-slate-700">{geocodingResult.resolved.lat.toFixed(6)}, {geocodingResult.resolved.lng.toFixed(6)}</span>
                </p>
              </div>

              <div className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 border border-emerald-200/50 py-1 px-2 rounded-lg flex items-center gap-1 select-none">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Plotted on Map
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CORE MAP LAYERING CANVAS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col relative" style={{ minHeight: "450px" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-sans font-semibold text-gray-900 text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" />
              OpenStreetMap Uganda Core ({selectedArea})
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {offlineMode ? "RUNNING IN STANDALONE OFFLINE MAP GRAPH MODE" : "STREAMING STABLE WEB TILE RESOURCES"}
            </p>
          </div>
          
          <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>Sold</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>High Int</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>Med Int</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>Low Int</span>
          </div>
        </div>

        {mapError ? (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl flex-1 flex flex-col items-center justify-center text-center">
            <MapPin className="h-10 w-10 text-rose-400 mb-2" />
            <h4 className="font-bold">Map Instantiation Blocked</h4>
            <p className="text-xs mt-1 max-w-sm">{mapError}</p>
          </div>
        ) : (
          <div className="relative flex-1 rounded-xl shadow-inner border border-gray-100 overflow-hidden min-h-[350px]">
            {/* Map Canvas */}
            <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />
            
            {offlineMode && (
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-amber-200 text-amber-800 text-[10px] font-mono py-1 px-2.5 rounded-lg shadow-sm z-[1000] uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                Local tile engine cached
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
