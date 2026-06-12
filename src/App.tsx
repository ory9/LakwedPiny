/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Listing, AIAnalysis } from "./types";
import { 
  Map, 
  Database, 
  Brain, 
  Wifi, 
  WifiOff, 
  Activity, 
  User, 
  Phone, 
  Trash2, 
  CheckCircle2, 
  MapPin, 
  Search, 
  FileText, 
  Sparkles,
  Info
} from "lucide-react";
import InteractiveMap from "./components/InteractiveMap";
import UgandaSvgMap from "./components/UgandaSvgMap";
import ListingForm from "./components/ListingForm";
import AnalyticsPanel from "./components/AnalyticsPanel";
import ValuationEstimator from "./components/ValuationEstimator";

export default function App() {
  const [activeTab, setActiveTab] = useState<"map" | "records" | "analytics">("map");
  const [mapViewMode, setMapViewMode] = useState<"leaflet" | "vector">("leaflet");
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>("Kampala Central");
  const [offlineMode, setOfflineMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Synced"); // "Synced" | "Local Only" | "Syncing"
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sold" | "unsold">("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [placementPin, setPlacementPin] = useState<{ lat: number; lng: number } | null>(null);

  // Load listings on mount
  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setSyncStatus("Syncing");
      const res = await fetch("/api/listings");
      const data = await res.json();
      if (data.success && data.listings) {
        setListings(data.listings);
        localStorage.setItem("uganda_listings", JSON.stringify(data.listings));
        setSyncStatus("Synced");
      } else {
        throw new Error("Failed to load server listings");
      }
    } catch (err) {
      console.log("Could not communicate with server, loading from localStorage...");
      const local = localStorage.getItem("uganda_listings");
      if (local) {
        setListings(JSON.parse(local));
      }
      setSyncStatus("Local Only");
      setOfflineMode(true);
    }
  };

  const handleAddListing = async (newListing: Listing) => {
    const updatedListings = [newListing, ...listings];
    setListings(updatedListings);
    localStorage.setItem("uganda_listings", JSON.stringify(updatedListings));
    setPlacementPin(null);

    if (offlineMode) {
      setSyncStatus("Local Only");
      return;
    }

    try {
      setSyncStatus("Syncing");
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings: updatedListings }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus("Synced");
      } else {
        setSyncStatus("Local Only");
      }
    } catch (err) {
      setSyncStatus("Local Only");
    }
  };

  const handleDeleteListing = async (id: string) => {
    const updatedListings = listings.filter(l => l.id !== id);
    setListings(updatedListings);
    localStorage.setItem("uganda_listings", JSON.stringify(updatedListings));

    if (selectedListing?.id === id) {
      setSelectedListing(null);
    }

    if (offlineMode) {
      setSyncStatus("Local Only");
      return;
    }

    try {
      setSyncStatus("Syncing");
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings: updatedListings }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus("Synced");
      } else {
        setSyncStatus("Local Only");
      }
    } catch {
      setSyncStatus("Local Only");
    }
  };

  const handleResetDatabase = async () => {
    if (offlineMode) {
      // Local revert
      localStorage.removeItem("uganda_listings");
      window.location.reload();
      return;
    }

    try {
      setSyncStatus("Syncing");
      const res = await fetch("/api/listings/reset", { method: "POST" });
      const data = await res.json();
      if (data.success && data.listings) {
        setListings(data.listings);
        localStorage.setItem("uganda_listings", JSON.stringify(data.listings));
        setSyncStatus("Synced");
      }
    } catch {
      setSyncStatus("Local Only");
    }
  };

  // Trigger Gemini AI Pattern Analyser
  const triggerAIAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings })
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
      }
    } catch (err) {
      console.error("Analysis API failed:", err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Trigger default analysis if data is ready
  useEffect(() => {
    if (listings.length > 0 && !analysis && !loadingAnalysis) {
      triggerAIAnalysis();
    }
  }, [listings]);

  // Handle toggling of connectivity simulation
  const toggleOfflineMode = () => {
    const newMode = !offlineMode;
    setOfflineMode(newMode);
    if (!newMode) {
      // Try to re-sync back to server
      syncLocalToServer();
    } else {
      setSyncStatus("Local Only");
    }
  };

  const syncLocalToServer = async () => {
    setSyncStatus("Syncing");
    try {
      const local = localStorage.getItem("uganda_listings");
      if (local) {
        const parsed = JSON.parse(local);
        const res = await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listings: parsed }),
        });
        const data = await res.json();
        if (data.success) {
          setSyncStatus("Synced");
          setListings(parsed);
          return;
        }
      }
      setSyncStatus("Synced");
    } catch {
      setSyncStatus("Local Only");
    }
  };

  // Filter listings based on search, status, and area filters
  const filteredListings = listings.filter(l => {
    const matchesSearch = 
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.areaName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" ? true : l.status === statusFilter;
    const matchesArea = areaFilter === "all" ? true : l.areaName === areaFilter;

    return matchesSearch && matchesStatus && matchesArea;
  });

  const uniqueAreas = Array.from(new Set(listings.map(l => l.areaName)));

  const appBg = "bg-slate-50 text-slate-800";

  const headerClass = "bg-white border-b border-gray-100";

  const tabBg = "bg-white border border-gray-100";

  const tabActiveBtn = "bg-slate-900 text-white shadow-sm";

  const badgeBg = "bg-slate-100 text-slate-600";

  return (
    <div className={`min-h-screen antialiased font-sans flex flex-col transition-colors duration-300 ${appBg}`}>
      
      {/* COMPACT APPLICATION NAVBAR */}
      <header className={`sticky top-0 z-[1000] px-4 py-2 shadow-xs transition-colors duration-300 ${headerClass}`}>
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-mono font-bold text-sm shadow-sm select-none bg-slate-900 animate-duration-1000">
              UG
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none text-gray-900">Uganda Real Estate Hub</h1>
              <p className="text-[9px] font-mono tracking-wider mt-0.5 uppercase hidden sm:block text-gray-400">SPATIAL DATABASES • AI AUDITS</p>
            </div>
          </div>

          <div className="flex items-center gap-4">

            {/* NETWORKING STATUS COMPILER BAND */}
            <div className="flex items-center gap-3 shadow-2xs p-1 px-3 rounded-lg text-xs border bg-slate-50 border-gray-200 text-slate-700">
              <div className="flex items-center gap-1.5">
                {offlineMode ? (
                  <WifiOff className="h-3 w-3 text-amber-500 animate-pulse" />
                ) : (
                  <Wifi className="h-3 w-3 text-emerald-500" />
                )}
                <button 
                  onClick={toggleOfflineMode}
                  className="text-[11px] font-semibold outline-none text-left flex items-center gap-1 cursor-pointer text-slate-700 hover:text-blue-600"
                  title="Toggle simulator connectivity"
                >
                  {offlineMode ? "Offline" : "Live Stream"}
                  <span className="text-[9px] font-normal opacity-60 underline font-mono select-none">(Toggle)</span>
                </button>
              </div>

              <div className="h-3.5 w-px bg-slate-200" />

              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono opacity-50 uppercase select-none">SYNC:</span>
                <span className={`text-[11px] font-bold ${
                  syncStatus === "Synced" ? "text-emerald-500" : syncStatus === "Syncing" ? "text-blue-500 animate-pulse" : "text-amber-500"
                }`}>
                  {syncStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTAINER GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex-1 w-full space-y-6">
        
        {/* CORE NAVIGATION TAB RAIL */}
        <div className="flex items-center gap-3">
          {/* ICON NAVIGATION TABS */}
          <div className={`flex p-1 rounded-xl shadow-xs gap-1.5 w-fit ${tabBg}`}>
            <button
              onClick={() => setActiveTab("map")}
              title="Regional Maps Dual-View"
              aria-label="Map View"
              className={`flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer ${
                activeTab === "map"
                  ? tabActiveBtn
                  : "text-slate-400 hover:text-slate-805 hover:bg-slate-50"
              }`}
            >
              <Map className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setActiveTab("records")}
              title="Input & Records Log"
              aria-label="Records View"
              className={`flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer ${
                activeTab === "records"
                  ? tabActiveBtn
                  : "text-slate-400 hover:text-slate-805 hover:bg-slate-50"
              }`}
            >
              <Database className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setActiveTab("analytics")}
              title="AI Analytics Hub"
              aria-label="AI Analytics"
              className={`flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer ${
                activeTab === "analytics"
                  ? tabActiveBtn
                  : "text-slate-400 hover:text-slate-805 hover:bg-slate-50"
              }`}
            >
              <Brain className="h-5 w-5" />
            </button>
          </div>

          <span className={`text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg select-none ${badgeBg}`}>
            {activeTab === "map" ? "Maps Dual-View" : activeTab === "records" ? "Input & Records Log" : "AI Trend Labs"}
          </span>
        </div>

        {/* --- MAP TAB --- */}
        {activeTab === "map" && (
          <div className="space-y-6 animate-fade-in">
            {/* MOBILE ONLY SWITCHER */}
            <div className="flex lg:hidden bg-white border border-gray-150/80 p-1 rounded-xl shadow-xs gap-1.5 w-full">
              <button
                type="button"
                onClick={() => setMapViewMode("leaflet")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mapViewMode === "leaflet"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                Interactive Street Map
              </button>
              <button
                type="button"
                onClick={() => setMapViewMode("vector")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mapViewMode === "vector"
                    ? "bg-slate-905 text-white shadow-sm bg-slate-900"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                Stylized Regional Map
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* OPENSTREETMAP DOCK */}
              <div className={`lg:col-span-6 h-full ${mapViewMode === "leaflet" ? "block" : "hidden lg:block"}`}>
                <InteractiveMap 
                  listings={listings} 
                  onSelectListing={(l) => {
                    setSelectedListing(l);
                    setSelectedArea(l.areaName);
                  }}
                  selectedListing={selectedListing}
                  offlineMode={offlineMode}
                  placementPin={placementPin}
                  onMapClick={(lat, lng) => setPlacementPin({ lat, lng })}
                  selectedArea={selectedArea}
                  onSelectArea={setSelectedArea}
                />
              </div>

              {/* OFFLINE VECTOR MAP DOCK */}
              <div className={`lg:col-span-6 h-full ${mapViewMode === "vector" ? "block" : "hidden lg:block"}`}>
                <UgandaSvgMap 
                  listings={listings} 
                  selectedArea={selectedArea}
                  onSelectArea={(area) => {
                    setSelectedArea(area);
                    // Autofocus a valid listing in that area if any exists
                    const match = listings.find(l => l.areaName.toLowerCase().includes(area.toLowerCase()));
                    if (match) setSelectedListing(match);
                  }}
                />
              </div>
            </div>

            {/* QUICK HIGHLIGHT SLIDER */}
            {selectedListing && (
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-sm border border-slate-800 animate-slide-up flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-1.5 z-10">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase font-bold">
                      {selectedListing.areaName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      selectedListing.status === "sold" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                    }`}>
                      {selectedListing.status}
                    </span>
                  </div>
                  <h3 className="font-sans font-bold text-lg leading-tight">{selectedListing.title}</h3>
                  <div className="flex gap-4 text-xs font-mono text-slate-400 pt-0.5">
                    <span>Size: <strong className="text-slate-200">{selectedListing.landSize}</strong></span>
                    <span>Broker: <strong className="text-slate-200">{selectedListing.agentName}</strong></span>
                    <span>Contact: <strong className="text-slate-200">{selectedListing.agentContact}</strong></span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-start md:items-end justify-between w-full md:w-auto border-t border-slate-800 md:border-none pt-4 md:pt-0 gap-2 z-10">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Acquisition Metric</div>
                    <div className="text-2xl font-bold font-sans text-white mt-0.5">
                      <span className="text-xs font-medium text-slate-400 mr-0.5">UGX</span>
                      {selectedListing.priceUGX}M
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full justify-between md:justify-end mt-1">
                    <button
                      onClick={() => {
                        if (confirm(`Wipe listing "${selectedListing.title}" forever?`)) {
                          handleDeleteListing(selectedListing.id);
                        }
                      }}
                      className="p-1 px-2 rounded bg-rose-600/10 text-rose-400 border border-rose-500/20 hover:bg-rose-600 hover:text-white transition inline-flex items-center gap-1 uppercase font-mono text-[9px] font-bold cursor-pointer"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      Wipe
                    </button>
                    <button 
                      onClick={() => setSelectedListing(null)}
                      className="text-[10px] font-mono text-slate-400 hover:text-white transition uppercase underline cursor-pointer"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- RECORDS TAB --- */}
        {activeTab === "records" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            
            {/* INPUT FORM & VALUATION ESTIMATOR */}
            <div className="lg:col-span-5 space-y-6">
              <ListingForm 
                onAddListing={handleAddListing}
                onResetDatabase={handleResetDatabase}
                offlineMode={offlineMode}
                placementPin={placementPin}
                onSetPlacementPin={setPlacementPin}
              />

              <ValuationEstimator listings={listings} />
            </div>

            {/* RECORDS TABLE */}
            <div className="lg:col-span-7 rounded-2xl p-6 shadow-sm space-y-6 transition-colors duration-300 border bg-white border-gray-100 text-slate-800">
              <div>
                <h3 className="font-sans font-semibold text-lg text-gray-900">Stored Properties Log</h3>
                <p className="text-xs font-mono mt-0.5 text-gray-500">FILTER AND SEARCH RECORDED ATTRIBUTES</p>
              </div>

              {/* FILTERING CONTROLS */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pb-2">
                <div className="sm:col-span-6 relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search titles, brokers, area nodes..."
                    className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-1 bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full text-xs rounded-xl p-2.5 bg-white focus:outline-none border bg-white border-gray-200 text-slate-800"
                  >
                    <option value="all" className="text-gray-800">All Status</option>
                    <option value="unsold" className="text-gray-800">Unsold / Active</option>
                    <option value="sold" className="text-gray-800">Sold Out</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <select 
                    value={areaFilter} 
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="w-full text-xs rounded-xl p-2.5 bg-white focus:outline-none border border-gray-200 text-slate-800"
                  >
                    <option value="all" className="text-slate-800 bg-white">All Areas</option>
                    {uniqueAreas.map(area => (
                      <option key={area} value={area} className="text-slate-800 bg-white">{area}</option>
                    ))}
                  </select>
                </div>
              </div>              {/* TABLE CONTAINER */}
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b font-mono text-[10px] uppercase font-bold bg-slate-50 border-gray-200 text-gray-600">
                      <th className="px-4 py-3">Property Attributes</th>
                      <th className="px-4 py-3">Area Info</th>
                      <th className="px-4 py-3">Acquisition Cost</th>
                      <th className="px-4 py-3 text-right">Activity Tools</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs divide-gray-100">
                    {filteredListings.length > 0 ? (
                      filteredListings.map(l => (
                        <tr 
                          key={l.id} 
                          onClick={() => {
                            setSelectedListing(l);
                            setSelectedArea(l.areaName);
                            setActiveTab("map");
                          }}
                          className="transition-colors cursor-pointer hover:bg-slate-50"
                        >
                          <td className="px-4 py-3.5 space-y-1">
                            <div className="font-bold font-sans text-gray-800">{l.title}</div>
                            <div className="flex gap-2 text-[10px] font-mono text-slate-400 items-center">
                              <span>Size: <strong className="text-slate-600">{l.landSize}</strong></span>
                              <span>•</span>
                              <span>P. Ratio: <strong className={l.postingsCount > 1 ? "text-rose-500 font-bold" : "text-slate-600"}>{l.postingsCount}x</strong></span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 space-y-1">
                            <div>
                              <span className="font-semibold text-slate-800">{l.areaName}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tight flex items-center gap-1">
                              <User className="h-2.5 w-2.5 inline" /> {l.agentName}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 space-y-1.5">
                            <div className="font-bold font-sans text-slate-900">UGX {l.priceUGX} M</div>
                            <div>
                              <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                                l.status === "sold" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {l.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                if (confirm("Remove this real estate listing?")) {
                                  handleDeleteListing(l.id);
                                }
                              }}
                              className="p-1 px-2.5 rounded-lg border transition inline-flex items-center gap-1.5 uppercase font-mono text-[9px] font-bold text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-100"
                            >
                              <Trash2 className="h-3 w-3" />
                              Wipe
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-10 font-mono text-slate-400">
                          Zero property profiles match selection filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE COMPACT CARDS VIEW */}
              <div className="block sm:hidden space-y-3.5">
                {filteredListings.length > 0 ? (
                  filteredListings.map(l => (
                    <div 
                      key={l.id} 
                      onClick={() => {
                        setSelectedListing(l);
                        setSelectedArea(l.areaName);
                        setActiveTab("map");
                      }}
                      className="bg-white border border-gray-150 rounded-xl p-4 shadow-2xs space-y-2.5 transition active:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-1">
                          <h4 className="font-bold text-gray-900 leading-tight text-xs">
                            {l.title}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-slate-100 font-bold px-1.5 py-0.5 rounded text-[8.5px] font-mono text-slate-550 uppercase tracking-tight">
                              {l.areaName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Size: <strong className="text-slate-600 font-sans">{l.landSize}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="font-extrabold font-sans text-xs text-slate-900 text-nowrap">
                            UGX {l.priceUGX}M
                          </div>
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                            l.status === 'sold' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {l.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 inline text-slate-400" />
                          <span className="truncate max-w-[120px]">{l.agentName}</span>
                          <span className="text-indigo-600 font-bold">({l.postingsCount}x)</span>
                        </div>

                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedListing(l);
                              setSelectedArea(l.areaName);
                              setActiveTab("map");
                            }}
                            className="text-blue-600 font-bold hover:underline py-1 text-[9.5px] uppercase font-sans cursor-pointer"
                          >
                            Explore →
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove custom listing "${l.title}"?`)) {
                                handleDeleteListing(l.id);
                              }
                            }}
                            className="text-rose-600 font-bold hover:underline py-1 text-[9.5px] uppercase cursor-pointer"
                          >
                            Wipe
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-250/60 p-4 font-mono text-xs text-slate-400">
                    Zero property profiles match selection filters.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* --- ANALYTICS TAB --- */}
        {activeTab === "analytics" && (
          <div className="animate-fade-in">
            <AnalyticsPanel 
              analysis={analysis} 
              listings={listings}
              onTriggerAnalyze={triggerAIAnalysis}
              loading={loadingAnalysis}
              offlineMode={offlineMode}
            />
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="mt-auto px-6 py-5 border-t bg-white border-slate-100 text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono">
          <span>Uganda Real Estate Pattern Hub • Client LocalStorage Synced</span>
          <span>© 14-Core GIS Engine Grid Version 2026.06</span>
        </div>
      </footer>

    </div>
  );
}
