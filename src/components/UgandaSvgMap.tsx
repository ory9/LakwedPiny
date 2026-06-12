/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { Listing } from "../types";
import { MapPin, Info, TrendingUp, DollarSign } from "lucide-react";

interface UgandaSvgMapProps {
  listings: Listing[];
  onSelectArea: (areaName: string) => void;
  selectedArea: string | null;
}

export default function UgandaSvgMap({ listings, onSelectArea, selectedArea }: UgandaSvgMapProps) {
  // Compute metrics per region
  const regionMetrics = useMemo(() => {
    const areas = ["Kampala Central", "Wakiso", "Mukono", "Entebbe", "Jinja", "Gulu", "Mbarara"];
    return areas.map(area => {
      const areaListings = listings.filter(l => l.areaName.toLowerCase().includes(area.toLowerCase()));
      const total = areaListings.length;
      const sold = areaListings.filter(l => l.status === "sold").length;
      const avgPrice = total > 0 ? Math.round(areaListings.reduce((sum, l) => sum + l.priceUGX, 0) / total) : 0;
      
      // Determine overall interest
      let interest: "high" | "medium" | "low" = "low";
      const highs = areaListings.filter(l => l.interestLevel === "high").length;
      const mediums = areaListings.filter(l => l.interestLevel === "medium").length;
      if (highs >= total * 0.4 && total > 0) interest = "high";
      else if (mediums + highs >= total * 0.5 && total > 0) interest = "medium";

      return {
        name: area,
        total,
        sold,
        unsold: total - sold,
        avgPrice,
        interest
      };
    });
  }, [listings]);

  // Static geographical alignment nodes to form a stylized bento vector map of Uganda
  const nodes = [
    { name: "Gulu", x: 200, y: 70, labelX: 200, labelY: 45, radius: 26, desc: "Northern Hub" },
    { name: "Wakiso", x: 165, y: 175, labelX: 110, labelY: 170, radius: 24, desc: "Metropolitan Ring" },
    { name: "Kampala Central", x: 200, y: 185, labelX: 200, labelY: 235, radius: 20, desc: "Commercial Core" },
    { name: "Mukono", x: 245, y: 185, labelX: 295, labelY: 185, radius: 22, desc: "Industrial & Education East" },
    { name: "Jinja", x: 285, y: 170, labelX: 335, labelY: 165, radius: 22, desc: "Source of the Nile" },
    { name: "Entebbe", x: 190, y: 235, labelX: 130, labelY: 250, radius: 21, desc: "Air & Lakeside Gateway" },
    { name: "Mbarara", x: 90, y: 260, labelX: 90, labelY: 295, radius: 25, desc: "Western Gateway Hub" }
  ];

  const hoveredMetrics = useMemo(() => {
    if (!selectedArea) return null;
    return regionMetrics.find(m => m.name.toLowerCase().includes(selectedArea.toLowerCase())) || null;
  }, [selectedArea, regionMetrics]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-sans font-semibold text-gray-900 text-lg">Stylized Uganda Grid Map</h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">100% OFFLINE HYBRID SPATIAL CORE</p>
          </div>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1.5 border border-blue-100">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Geo-Heatmaps Ready
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          The stylized spatial layout works completely offline. Select regions on the coordinates chart below to view price averages, interest indicators, and transaction ratios.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center flex-1">
        {/* SVG CARTOGRAPHY */}
        <div className="md:col-span-7 flex justify-center bg-slate-50 rounded-xl p-4 border border-slate-100 relative overflow-hidden" style={{ minHeight: "320px" }}>
          {/* Lakeside indicator representing Lake Victoria */}
          <div className="absolute bottom-4 right-1/4 translate-x-12 w-32 h-20 bg-blue-100/60 rounded-full blur-md border border-blue-200/50 flex items-center justify-center">
            <span className="text-[10px] text-blue-400 font-mono tracking-widest font-semibold uppercase">Lake Victoria</span>
          </div>

          <svg viewBox="0 0 400 350" className="w-full max-w-[340px] h-auto drop-shadow-sm select-none">
            {/* Geographic Connections (Borders/Road links representation) */}
            <line x1="90" y1="260" x2="165" y2="175" stroke="#cbd5e1" strokeDasharray="3,3" strokeWidth="1.5" /> {/* Mbarara -> Wakiso */}
            <line x1="165" y1="175" x2="200" y2="185" stroke="#94a3b8" strokeWidth="2.5" /> {/* Wakiso -> Kampala */}
            <line x1="200" y1="185" x2="190" y2="235" stroke="#cbd5e1" strokeWidth="2" /> {/* Kampala -> Entebbe */}
            <line x1="200" y1="185" x2="245" y2="185" stroke="#94a3b8" strokeWidth="2.5" /> {/* Kampala -> Mukono */}
            <line x1="245" y1="185" x2="285" y2="170" stroke="#cbd5e1" strokeDasharray="4,2" strokeWidth="1.5" /> {/* Mukono -> Jinja */}
            <line x1="200" y1="70" x2="165" y2="175" stroke="#cbd5e1" strokeDasharray="4,4" strokeWidth="1.5" /> {/* Gulu -> Wakiso */}

            {/* Region Nodes */}
            {nodes.map(node => {
              const metrics = regionMetrics.find(m => m.name === node.name);
              const isActive = selectedArea?.toLowerCase().includes(node.name.toLowerCase());
              
              // Color coding by Interest level
              let colorClasses = "fill-slate-100 stroke-slate-400 text-slate-600";
              if (metrics) {
                if (metrics.interest === "high") {
                  colorClasses = isActive 
                    ? "fill-rose-500 stroke-rose-600 text-white" 
                    : "fill-rose-50 stroke-rose-300 text-rose-700 hover:fill-rose-100";
                } else if (metrics.interest === "medium") {
                  colorClasses = isActive
                    ? "fill-amber-500 stroke-amber-600 text-white"
                    : "fill-amber-50 stroke-amber-300 text-amber-700 hover:fill-amber-100";
                } else {
                  colorClasses = isActive
                    ? "fill-sky-500 stroke-sky-600 text-white"
                    : "fill-sky-50/50 stroke-sky-200 text-sky-700 hover:fill-sky-100";
                }
              }

              return (
                <g key={node.name} className="cursor-pointer transition-all duration-200" onClick={() => onSelectArea(node.name)}>
                  {/* Outer Pulsing Indicator for High Interest */}
                  {metrics?.interest === "high" && (
                    <circle cx={node.x} cy={node.y} r={node.radius + 6} className="fill-none stroke-rose-200/50 animate-pulse" strokeWidth="1" />
                  )}
                  {/* Core Node Circle */}
                  <circle 
                    cx={node.x} 
                    cy={node.y} 
                    r={node.radius} 
                    className={`transition-colors duration-250 ${colorClasses}`}
                    strokeWidth={isActive ? "3.5" : "1.5"}
                  />
                  {/* Mini pin inside node */}
                  <circle cx={node.x} cy={node.y - 2} r="3.5" className={isActive ? "fill-white" : "fill-current opacity-60"} />
                  
                  {/* Labels and lines */}
                  <line x1={node.x} y1={node.y} x2={node.labelX} y2={node.labelY} stroke="#94a3b8" strokeWidth="0.5" className="opacity-40" />
                  <text 
                    x={node.labelX} 
                    y={node.labelY} 
                    textAnchor="middle" 
                    className={`font-sans text-[11px] font-semibold ${isActive ? "fill-blue-600 font-bold scale-105" : "fill-slate-700"} transition-all duration-200`}
                  >
                    {node.name}
                  </text>
                  <text 
                    x={node.labelX} 
                    y={node.labelY + 11} 
                    textAnchor="middle" 
                    className="font-mono text-[8px] fill-slate-400 uppercase tracking-tight"
                  >
                    {metrics ? `${metrics.total} post${metrics.total !== 1 ? 's' : ''}` : "0 listings"}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* METRICS SIDE CARDS */}
        <div className="md:col-span-5 h-full flex flex-col justify-center">
          {hoveredMetrics ? (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4 shadow-sm animate-fade-in">
              <div className="border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs text-blue-500 font-mono uppercase tracking-wider font-semibold">
                  <MapPin className="h-3 w-3" />
                  Selected Territory
                </div>
                <h4 className="font-sans font-bold text-slate-800 text-lg mt-0.5">{hoveredMetrics.name}</h4>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Average Price</div>
                  <div className="text-base font-sans font-bold text-slate-800 mt-0.5 flex items-baseline">
                    <span className="text-xs font-medium text-slate-500 mr-0.5">UGX</span>
                    {hoveredMetrics.avgPrice}M
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Interest Rating</div>
                  <div className="mt-1 flex items-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold font-sans uppercase border ${
                      hoveredMetrics.interest === "high" 
                        ? "bg-rose-50 text-rose-700 border-rose-100" 
                        : hoveredMetrics.interest === "medium"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : "bg-sky-50 text-sky-700 border-sky-100"
                    }`}>
                      {hoveredMetrics.interest}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Total Properties</div>
                  <div className="text-base font-sans font-bold text-slate-800 mt-0.5">{hoveredMetrics.total}</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Liquid Sold %</div>
                  <div className="text-base font-sans font-bold text-emerald-600 mt-0.5">
                    {hoveredMetrics.total > 0 
                      ? `${Math.round((hoveredMetrics.sold / hoveredMetrics.total) * 100)}%`
                      : "0%"
                    }
                  </div>
                </div>
              </div>

              <div className="bg-white/70 p-3 rounded-lg border border-slate-100 flex items-start gap-2">
                <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  {hoveredMetrics.interest === "high" 
                    ? "This territory possesses elevated liquidity. Investors are actively transacting multiple repeat-listed slots, reflecting dynamic secondary appreciation."
                    : hoveredMetrics.interest === "medium"
                    ? "Stable residential volume with consistent demand. Slower resale rates compared to urban high-rises, but highly safe asset store."
                    : "Outlying region focusing on affordable long-term land parcels. High-value transactions are scarce, but entry costs are lower."
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4">
              <MapPin className="h-8 w-8 text-slate-400 mx-auto animate-bounce mb-3 opacity-60" />
              <h4 className="font-sans font-medium text-slate-700 text-sm">No District Picked</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                Hover or press any district node on the vector map to retrieve quick offline metrics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
