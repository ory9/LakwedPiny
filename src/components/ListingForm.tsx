/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Listing } from "../types";
import { Plus, HelpCircle, Check, MapPin, Database, Sparkles, AlertCircle } from "lucide-react";

interface ListingFormProps {
  onAddListing: (listing: Listing) => void;
  onResetDatabase: () => void;
  offlineMode: boolean;
  placementPin?: { lat: number; lng: number } | null;
  onSetPlacementPin?: (pin: { lat: number; lng: number } | null) => void;
}

const areaCoordinates: Record<string, { lat: number; lng: number }> = {
  "Kampala Central": { lat: 0.3476, lng: 32.5825 },
  "Wakiso": { lat: 0.3958, lng: 32.4831 },
  "Mukono": { lat: 0.3544, lng: 32.7481 },
  "Entebbe": { lat: 0.0512, lng: 32.4637 },
  "Jinja": { lat: 0.4244, lng: 33.2042 },
  "Gulu": { lat: 2.7725, lng: 32.2995 },
  "Mbarara": { lat: -0.6074, lng: 30.6545 },
};

export default function ListingForm({ onAddListing, onResetDatabase, offlineMode, placementPin, onSetPlacementPin }: ListingFormProps) {
  const [title, setTitle] = useState("");
  const [priceUGX, setPriceUGX] = useState("");
  const [areaName, setAreaName] = useState("Kampala Central");
  const [latitude, setLatitude] = useState("0.3476");
  const [longitude, setLongitude] = useState("32.5825");
  const [interestLevel, setInterestLevel] = useState<"high" | "medium" | "low">("medium");
  const [status, setStatus] = useState<"sold" | "unsold">("unsold");
  const [landSize, setLandSize] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentContact, setAgentContact] = useState("");
  const [postingsCount, setPostingsCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [parsedListings, setParsedListings] = useState<any[]>([]);

  const containerClass = "bg-white border-gray-100 text-slate-800";
  const titleClass = "text-gray-900";
  const textClass = "text-gray-500";
  const labelClass = "text-gray-600";
  const inputClass = "bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500";

  // Synchronize with map placement pin coordinate events
  useEffect(() => {
    if (placementPin) {
      setLatitude(placementPin.lat.toFixed(6));
      setLongitude(placementPin.lng.toFixed(6));
    }
  }, [placementPin]);

  // Raw whatsapp paste model
  const [rawText, setRawText] = useState("");
  const [parsingMsg, setParsingMsg] = useState("");
  const [parseError, setParseError] = useState("");

  const handleAreaChange = (area: string) => {
    setAreaName(area);
    const coords = areaCoordinates[area];
    if (coords) {
      setLatitude(coords.lat.toString());
      setLongitude(coords.lng.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !priceUGX || !landSize || !agentName) {
      alert("Please fill in all core fields: Title, Price, Land Size, and Listing Agent.");
      return;
    }

    const priceNum = parseFloat(priceUGX);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Price must be a valid positive number representing Millions UGX.");
      return;
    }

    const newListing: Listing = {
      id: Date.now().toString(),
      title,
      priceUGX: priceNum,
      areaName,
      latitude: parseFloat(latitude) || 0.3476,
      longitude: parseFloat(longitude) || 32.5825,
      interestLevel,
      status,
      landSize,
      agentName,
      agentContact: agentContact || "+256 700 000000",
      postingsCount: Number(postingsCount) || 1,
      notes: notes || undefined,
      createdAt: new Date().toISOString()
    };

    onAddListing(newListing);

    // Reset Form
    setTitle("");
    setPriceUGX("");
    setLandSize("");
    setAgentName("");
    setAgentContact("");
    setPostingsCount(1);
    setNotes("");
  };

  // Smart Fill - server-side geocoding AI parser with offline reliability
  const handleSmartParse = async () => {
    if (!rawText.trim()) {
      setParseError("Please paste some listing text first.");
      return;
    }

    setParsingMsg("Analyzing with AI Geocoder...");
    setParseError("");
    setParsedListings([]);

    try {
      const res = await fetch("/api/parse-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText })
      });
      const data = await res.json();
      
      if (data.success && data.listings && Array.isArray(data.listings)) {
        setParsedListings(data.listings);
        setParsingMsg(`AI parsed ${data.listings.length} distinct listing(s)!`);
        
        // Auto-pinpoint the first listing on the map!
        const first = data.listings[0];
        if (first) {
          setTitle(first.title);
          setPriceUGX(first.priceUGX.toString());
          setAreaName(first.areaName);
          setLatitude(first.latitude.toString());
          setLongitude(first.longitude.toString());
          setInterestLevel(first.interestLevel);
          setStatus(first.status);
          setLandSize(first.landSize);
          setAgentName(first.agentName || "Unknown Broker");
          setAgentContact(first.agentContact || "+256 700 000000");
          setPostingsCount(first.postingsCount || 1);
          setNotes(first.notes || "");

          if (onSetPlacementPin && first.latitude && first.longitude) {
            onSetPlacementPin({ lat: Number(first.latitude), lng: Number(first.longitude) });
          }
        }
      } else {
        throw new Error(data.error || "Failed to parse listing");
      }
    } catch (err: any) {
      console.warn("API parsing failed, falling back to basic parsing Client Side:", err);
      // Client-side quick regex parsing as immediate safety fallback
      const textLower = rawText.toLowerCase();
      let detectedArea = "Kampala Central";
      for (const area of Object.keys(areaCoordinates)) {
        if (textLower.includes(area.toLowerCase())) {
          detectedArea = area;
          break;
        }
      }
      
      let detectedPrice = "120";
      const millionRegex = /(\d+)\s*(m|million|milli)/i;
      const matchMil = rawText.match(millionRegex);
      if (matchMil) detectedPrice = matchMil[1];

      let detectedContact = "+256 772 123456";
      const phoneRegex = /(\+?256\s*[0-9\s-]{6,12}|07[0-9\s-]{8,12})/i;
      const matchPhone = rawText.match(phoneRegex);
      if (matchPhone) detectedContact = matchPhone[1].replace(/\s+/g, "");

      let detectedSize = "15x30m (~450m²)";
      const sizeRegex = /(\d+x\d+\s*ft|decimals?|\d+\s*acres?|\d+x\d+\s*m|\d+\s*m²)/i;
      const matchSize = rawText.match(sizeRegex);
      if (matchSize) {
        // attempt rough offline conversion
        const s = matchSize[1].toLowerCase();
        if (s.includes("acre")) {
          const val = parseFloat(s) || 0.5;
          detectedSize = `approx ${Math.round(val * 4046)}m²`;
        } else if (s.includes("ft") || s.includes("feet")) {
          detectedSize = "15x30m (~450m²)";
        } else {
          detectedSize = s;
        }
      }

      const fallbackItem = {
        title: `Plot in ${detectedArea}`,
        priceUGX: parseFloat(detectedPrice) || 120,
        areaName: detectedArea,
        latitude: areaCoordinates[detectedArea].lat,
        longitude: areaCoordinates[detectedArea].lng,
        interestLevel: "medium" as const,
        status: "unsold" as const,
        landSize: detectedSize,
        agentName: "Ronald Mugisha",
        agentContact: detectedContact,
        postingsCount: 1,
        notes: "Parsed with offline client assistant."
      };

      setParsedListings([fallbackItem]);
      
      setTitle(fallbackItem.title);
      setPriceUGX(fallbackItem.priceUGX.toString());
      setAreaName(fallbackItem.areaName);
      setLatitude(fallbackItem.latitude.toString());
      setLongitude(fallbackItem.longitude.toString());
      setInterestLevel(fallbackItem.interestLevel);
      setStatus(fallbackItem.status);
      setLandSize(fallbackItem.landSize);
      setAgentContact(fallbackItem.agentContact);
      setAgentName(fallbackItem.agentName);
      setParsingMsg("Parsed with offline rules!");

      if (onSetPlacementPin) {
        onSetPlacementPin({ lat: fallbackItem.latitude, lng: fallbackItem.longitude });
      }
    }
  };

  return (
    <div className={`rounded-2xl p-6 shadow-sm space-y-6 transition-colors duration-300 ${containerClass}`}>
      <div>
        <h3 className={`font-sans font-semibold text-lg ${titleClass}`}>Input Ugandan Listing Records</h3>
        <p className={`text-xs font-mono mt-0.5 ${textClass}`}>MANUALLY ENCODE OR SMART-PARSE LISTING OBJECTS</p>
      </div>

      {/* WHATSAPP RAW GROUP PASTE */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 transition-all duration-200">
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between text-blue-800">
          <span className="flex items-center gap-1.5 font-sans">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Fast-Track: AI Smart Listing Paste
          </span>
          <span className="text-[10px] lowercase font-normal font-mono text-blue-500">Any WhatsApp post layout</span>
        </label>
        
        <p className="text-xs mb-2 leading-relaxed text-blue-600">
          Paste clipboard listing text from Ugandan property forums, then hit Parse to autofill the structural fields instantly.
        </p>

        <textarea 
          value={rawText} 
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Example: FOR SALE: prime plot in Mukono town. 15x30m (~450m²). Fully registered. Price: 75 Millions UGX. Contact Agent Sarah +256701987654. High interest zone."
          className={`w-full h-20 text-xs rounded-lg p-2.5 focus:ring-1 focus:outline-none font-mono resize-none ${inputClass}`}
        />

        <div className="flex items-center justify-between mt-2">
          {parsingMsg && <span className="text-xs text-emerald-600 font-medium font-sans flex items-center gap-1">✓ {parsingMsg}</span>}
          {parseError && <span className="text-xs text-rose-600 font-medium font-sans flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {parseError}</span>}
          {!parsingMsg && !parseError && <span />}
          
          <button 
            type="button" 
            onClick={handleSmartParse}
            className="text-xs text-white font-medium px-4 py-1.5 rounded-lg border border-blue-700 bg-blue-600 hover:bg-blue-700 transition cursor-pointer"
          >
            Parser Autocomplete
          </button>
        </div>

        {/* PARSED MULTIPLE PROPERTY SUGGESTIONS */}
        {parsedListings.length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-mono uppercase tracking-wide text-blue-950 font-bold">
                Detected Listing Profiles ({parsedListings.length})
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Import all ${parsedListings.length} properties to the record database directly?`)) {
                    parsedListings.forEach((item, index) => {
                      const newListing: Listing = {
                        id: (Date.now() + index).toString(),
                        title: item.title,
                        priceUGX: Number(item.priceUGX) || 100,
                        areaName: item.areaName,
                        latitude: Number(item.latitude) || 0.3476,
                        longitude: Number(item.longitude) || 32.5825,
                        interestLevel: item.interestLevel || "medium",
                        status: item.status || "unsold",
                        landSize: item.landSize,
                        agentName: item.agentName || "Ronald Mugisha",
                        agentContact: item.agentContact || "+256 772 123456",
                        postingsCount: Number(item.postingsCount) || 1,
                        notes: item.notes || undefined,
                        createdAt: new Date().toISOString()
                      };
                      onAddListing(newListing);
                    });
                    setParsedListings([]);
                    setRawText("");
                    setParsingMsg("All listings processed successfully!");
                  }
                }}
                className="text-[9px] font-mono font-bold uppercase text-emerald-800 hover:text-emerald-950 transition cursor-pointer bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-300"
              >
                <Plus className="h-2.5 w-2.5 inline" /> Add All ({parsedListings.length})
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {parsedListings.map((item, index) => (
                <div key={index} className="bg-white/90 border border-blue-100 rounded-lg p-2.5 shadow-xs text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-gray-900 leading-tight">{item.title}</div>
                      <div className="text-[10.5px] text-gray-600 font-mono mt-0.5">
                        Area: {item.areaName} • Suburb: {item.detectedSuburb || "N/A"}
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700 text-xs text-nowrap">UGX {item.priceUGX}M</span>
                  </div>

                  <div className="flex gap-4 text-[10px] text-gray-500 font-mono">
                    <span>Size: <strong className="text-gray-700">{item.landSize}</strong></span>
                    <span>Broker: <strong className="text-gray-700">{item.agentName || "Ronald Mugisha"}</strong></span>
                  </div>

                  {item.notes && (
                    <div className="text-[10px] font-mono text-slate-500 bg-slate-50/80 p-1.5 rounded border border-slate-100 line-clamp-1">
                      {item.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-mono font-bold uppercase gap-2">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTitle(item.title);
                          setPriceUGX(item.priceUGX.toString());
                          setAreaName(item.areaName);
                          setLatitude(item.latitude.toString());
                          setLongitude(item.longitude.toString());
                          setInterestLevel(item.interestLevel);
                          setStatus(item.status);
                          setLandSize(item.landSize);
                          setAgentName(item.agentName || "Unknown Broker");
                          setAgentContact(item.agentContact || "+256 700 000000");
                          setPostingsCount(item.postingsCount || 1);
                          setNotes(item.notes || "");
                          setParsingMsg(`Loaded "${item.title}" into manual form fields!`);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition text-[9px]"
                      >
                        Load
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSetPlacementPin && item.latitude && item.longitude) {
                            onSetPlacementPin({ lat: Number(item.latitude), lng: Number(item.longitude) });
                            setParsingMsg(`Pinpoint set to: ${Number(item.latitude).toFixed(6)}, ${Number(item.longitude).toFixed(6)}`);
                          } else {
                            alert("No coordinates available for pinpoint.");
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition text-[9px] flex items-center gap-0.5"
                      >
                        <MapPin className="h-2.5 w-2.5 inline" /> Pinpoint
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setParsedListings(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="text-rose-600 hover:text-rose-800 hover:underline cursor-pointer text-[9px]"
                    >
                      Wipe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Property Title *</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mukono Town Commercial Plot" 
              className={`w-full text-sm rounded-lg px-3 py-2 focus:ring-1 focus:outline-none ${inputClass}`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Price (Millions UGX) *</label>
            <input 
              type="number" 
              value={priceUGX} 
              onChange={(e) => setPriceUGX(e.target.value)}
              placeholder="e.g., 180 (for 180,000,000 UGX)" 
              className={`w-full text-sm rounded-lg px-3 py-2 focus:ring-1 focus:outline-none ${inputClass}`}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Area/District *</label>
            <select 
              value={areaName} 
              onChange={(e) => handleAreaChange(e.target.value)}
              className={`w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 ${inputClass}`}
            >
              {Object.keys(areaCoordinates).map(area => (
                <option key={area} value={area} className="bg-white text-gray-850">{area}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Latitude (Custom Target)</label>
            <input 
              type="text" 
              value={latitude} 
              onChange={(e) => setLatitude(e.target.value)}
              className={`w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 font-mono shadow-sm ${inputClass}`}
              placeholder="0.3476"
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Longitude (Custom Target)</label>
            <input 
              type="text" 
              value={longitude} 
              onChange={(e) => setLongitude(e.target.value)}
              className={`w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 font-mono shadow-sm ${inputClass}`}
              placeholder="32.5825"
            />
          </div>
        </div>

        <p className="text-[11px] font-medium flex items-center gap-1 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50 text-indigo-600">
          <MapPin className="h-3.5 w-3.5" />
          <span><strong>Quick Tip:</strong> Go to the <strong>Regional Maps Dual-View</strong> tab and click anywhere on the Leaflet map to capture and auto-fill the exact coordinate location!</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Interest heat level</label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as const).map(level => (
                <button
                  type="button"
                  key={level}
                  onClick={() => setInterestLevel(level)}
                  className={`flex-1 text-xs py-2 rounded-lg font-bold uppercase tracking-wider border transition-all ${
                    interestLevel === level
                      ? level === "high"
                        ? "bg-rose-600 border-rose-600 text-white"
                        : level === "medium"
                        ? "bg-amber-500 border-amber-550 text-white"
                        : "bg-sky-500 border-sky-550 text-white"
                      : "bg-slate-50 border-gray-200 text-gray-500 hover:bg-slate-100"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Transaction Status</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("unsold")}
                className={`text-xs py-2 rounded-lg font-bold border transition ${
                  status === "unsold"
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-slate-50 border-gray-200 text-gray-500 hover:bg-slate-100"
                }`}
              >
                UNSOLD / FOR SALE
              </button>
              <button
                type="button"
                onClick={() => setStatus("sold")}
                className={`text-xs py-2 rounded-lg font-bold border transition ${
                  status === "sold"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-slate-50 border-gray-200 text-gray-500 hover:bg-slate-100"
                }`}
              >
                SOLD OUT
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Land Size (Meters) *</label>
            <input 
              type="text" 
              value={landSize} 
              onChange={(e) => setLandSize(e.target.value)}
              placeholder="e.g., 15x30m or 400m²" 
              className={`w-full text-sm rounded-lg px-3 py-2 focus:ring-1 focus:outline-none ${inputClass}`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Broker / Agent Name *</label>
            <input 
              type="text" 
              value={agentName} 
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g., Mugisha Ronald" 
              className={`w-full text-sm rounded-lg px-3 py-2 focus:ring-1 focus:outline-none ${inputClass}`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Agent Telephone *</label>
            <input 
              type="text" 
              value={agentContact} 
              onChange={(e) => setAgentContact(e.target.value)}
              placeholder="e.g., +256 772 123456" 
              className={`w-full text-sm rounded-lg px-3 py-2 focus:ring-1 focus:outline-none ${inputClass}`}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Times Posted</label>
            <input 
              type="number" 
              min={1}
              value={postingsCount} 
              onChange={(e) => setPostingsCount(Number(e.target.value) || 1)}
              className={`w-full text-sm rounded-lg px-3 py-2 focus:ring-1 focus:outline-none ${inputClass}`}
            />
          </div>

          <div className="md:col-span-3">
            <label className={`block text-xs font-medium mb-1 ${labelClass}`}>Extra Field Details / Notes</label>
            <input 
              type="text" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Close to express bypass road, fast-developing housing grid." 
              className={`w-full text-sm rounded-lg px-3 py-2 focus:ring-1 focus:outline-none ${inputClass}`}
            />
          </div>
        </div>

        <div className="flex gap-3.5 pt-2">
          <button
            type="submit"
            className="cursor-pointer flex-1 rounded-xl py-3 font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-white"
          >
            <Plus className="h-4 w-4" />
            Append Listing Record
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (confirm("Are you sure you want to reset listings coordinates back to Uganda baseline system defaults?")) {
                onResetDatabase();
              }
            }}
            className="cursor-pointer rounded-xl px-4 text-xs font-mono font-medium transition border bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-gray-200"
          >
            Reset Seed Data
          </button>
        </div>
      </form>
    </div>
  );
}
