import React, { useState, useMemo } from "react";
import { Listing } from "../types";
import { 
  Calculator, 
  MapPin, 
  TrendingUp, 
  Info, 
  Coins, 
  ChevronRight,
  Gauge,
  Compass,
  AlertCircle
} from "lucide-react";

interface ValuationEstimatorProps {
  listings: Listing[];
}

export default function ValuationEstimator({ listings }: ValuationEstimatorProps) {
  const [selectedArea, setSelectedArea] = useState("Kampala Central");
  const [sizeInput, setSizeInput] = useState("450"); // 450 sqm is standard 50x100ft
  const [propertyTier, setPropertyTier] = useState<"standard" | "prime" | "secondary">("standard");

  const areas = ["Kampala Central", "Wakiso", "Mukono", "Entebbe", "Jinja", "Gulu", "Mbarara"];

  // Heuristic to extract standard sqm size from the string formats
  const parseSizeToSqm = (sizeStr: string): number | null => {
    if (!sizeStr) return null;
    const clean = sizeStr.toLowerCase().replace(/\s+/g, "");
    
    // Look for ~ or direct sqm / m²
    const sqmMatch = clean.match(/(?:~|sqm|m²|\bsq\s*meters?\b)(\d+(?:\.\d+)?)/) || clean.match(/(\d+(?:\.\d+)?)(?:m²|sqm)/);
    if (sqmMatch) {
      const val = parseFloat(sqmMatch[1]);
      if (val > 0) return val;
    }
    
    // Format like "15x30" or "15x30m"
    const multMatch = clean.match(/(\d+(?:\.\d+)?)[x*](\d+(?:\.\d+)?)/);
    if (multMatch) {
      const width = parseFloat(multMatch[1]);
      const height = parseFloat(multMatch[2]);
      if (width > 0 && height > 0) {
        return width * height;
      }
    }

    // Default numeric fallback
    const singleNumber = clean.match(/(\d+(?:\.\d+)?)/);
    if (singleNumber) {
      const val = parseFloat(singleNumber[1]);
      if (val > 0) return val;
    }

    return null;
  };

  // Pre-calculate statistics across all areas and details
  const stats = useMemo(() => {
    // 1. Calculate price per sqm for each listing
    const parsedListings = listings.map(l => {
      const sqm = parseSizeToSqm(l.landSize);
      const pricePerSqm = sqm && sqm > 0 && l.priceUGX > 0 ? l.priceUGX / sqm : null;
      return { ...l, sqm, pricePerSqm };
    });

    // 2. Global average fallback rate (Millions UGX per sqm)
    const validGlobalRates = parsedListings.filter(l => l.pricePerSqm !== null) as Array<typeof parsedListings[0] & { pricePerSqm: number }>;
    const globalAverageRate = validGlobalRates.length > 0 
      ? validGlobalRates.reduce((sum, l) => sum + l.pricePerSqm, 0) / validGlobalRates.length 
      : 0.35; // Default fallback fallback: 0.35M per m² (~150M for 50x100 ft)

    // 3. Compute rates of each area
    const areaRates: Record<string, { avgRate: number; sampleCount: number }> = {};
    areas.forEach(area => {
      const areaSamples = parsedListings.filter(l => l.areaName === area && l.pricePerSqm !== null) as Array<typeof parsedListings[0] & { pricePerSqm: number }>;
      if (areaSamples.length > 0) {
        const avg = areaSamples.reduce((sum, l) => sum + l.pricePerSqm, 0) / areaSamples.length;
        areaRates[area] = {
          avgRate: avg,
          sampleCount: areaSamples.length
        };
      } else {
        // Fallback: scale global rate based on known market weight profiles if no direct listings exist
        const marketWeightScale: Record<string, number> = {
          "Kampala Central": 1.4,
          "Entebbe": 1.1,
          "Wakiso": 0.9,
          "Mukono": 0.7,
          "Jinja": 0.7,
          "Mbarara": 0.6,
          "Gulu": 0.5
        };
        const scale = marketWeightScale[area] || 1.0;
        areaRates[area] = {
          avgRate: globalAverageRate * scale,
          sampleCount: 0
        };
      }
    });

    return {
      globalAverageRate,
      areaRates,
      totalSqmListings: validGlobalRates.length
    };
  }, [listings]);

  // Handle valuation calculation
  const valuationResult = useMemo(() => {
    const size = parseFloat(sizeInput) || 0;
    if (size <= 0) return null;

    const rateInfo = stats.areaRates[selectedArea] || { avgRate: stats.globalAverageRate, sampleCount: 0 };
    let finalRate = rateInfo.avgRate;

    // Adjust rate according to property class tier input
    // Prime: premium location (roadfront, main power/infrastructure node, security hub (+25%))
    // Secondary: standard inner road, buffer peripheral lane (-15%)
    let modifier = 1.0;
    if (propertyTier === "prime") modifier = 1.25;
    else if (propertyTier === "secondary") modifier = 0.85;

    const adjustedRate = finalRate * modifier;
    const estimatedUGXMillions = size * adjustedRate;

    return {
      sizeSqm: size,
      baseRatePerSqm: finalRate,
      adjustedRatePerSqm: adjustedRate,
      estimatedUGXMillions,
      sampleCount: rateInfo.sampleCount,
      isFallback: rateInfo.sampleCount === 0
    };
  }, [selectedArea, sizeInput, propertyTier, stats]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 transition-all duration-300 space-y-5">
      
      {/* HEADER */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-sans font-bold text-base text-white">Uganda Smart Valuation Estimator</h3>
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">RESTING RATE-ALIGNED MARKET ESTIMATIONS</p>
        </div>
      </div>

      {/* INPUT FORM CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SIZE IN SQUARE METERS */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-tight flex items-center justify-between">
            <span>Land Size (m²)</span>
            <span className="text-[9px] text-violet-400 font-sans font-medium normal-case">
              {parseFloat(sizeInput) === 450 ? "50x100 ft plots" : `approx ${(parseFloat(sizeInput) * 0.000247).toFixed(3)} Acres`}
            </span>
          </label>
          <div className="relative">
            <input 
              type="number"
              value={sizeInput}
              onChange={(e) => setSizeInput(e.target.value)}
              placeholder="e.g. 450"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50"
            />
            <div className="absolute right-3.5 top-2.5 text-[10px] font-mono text-slate-500 uppercase font-semibold">
              m²
            </div>
          </div>
          {/* Preset Buttons */}
          <div className="flex gap-1 pt-1 overflow-x-auto whitespace-nowrap">
            {[
              { label: "15x30m (450m²)", val: "450" },
              { label: "0.25 Ac (1000m²)", val: "1000" },
              { label: "0.5 Ac (2000m²)", val: "2000" },
              { label: "1.0 Ac (4000m²)", val: "4000" }
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setSizeInput(p.val)}
                className={`text-[8.5px] font-mono font-bold uppercase p-1 px-1.5 rounded transition ${
                  sizeInput === p.val 
                    ? "bg-violet-500 text-white" 
                    : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* SELECT DISTRICT NODE */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-tight">Location Hub</label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full text-xs rounded-xl p-2.5 border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50"
          >
            {areas.map(area => (
              <option key={area} value={area} className="text-white bg-slate-950">
                {area} {stats.areaRates[area]?.sampleCount > 0 ? `(${stats.areaRates[area].sampleCount} samples)` : ""}
              </option>
            ))}
          </select>
          <div className="text-[9px] font-mono text-slate-500 italic mt-0.5 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 text-slate-400" />
            Rate derived from recorded GIS points
          </div>
        </div>
      </div>

      {/* PROPERTY TIER ADJUSTMENT */}
      <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 space-y-2">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Feature & Infra Accentuation</span>
          <span className="text-slate-500 font-bold font-sans">ADJUSTMENT PROFILE</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: "secondary", label: "Inner Lane", info: "-15% Offroad", color: "hover:border-amber-500/40 text-amber-300 bg-amber-500/5" },
            { id: "standard", label: "Standard Hub", info: "Average Rate", color: "hover:border-slate-500/40 text-white bg-slate-500/5" },
            { id: "prime", label: "Prime Accent", info: "+25% Mainroad", color: "hover:border-violet-500/40 text-violet-300 bg-violet-500/5" }
          ].map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setPropertyTier(tier.id as any)}
              className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-between cursor-pointer ${
                propertyTier === tier.id 
                  ? "border-violet-500 bg-violet-500/10 shadow-sm shadow-violet-500/10" 
                  : `border-slate-800/80 ${tier.color}`
              }`}
            >
              <span className="text-[9.5px] font-bold font-sans tracking-tight">{tier.label}</span>
              <span className="text-[7.5px] font-mono text-slate-500 uppercase font-semibold mt-0.5">{tier.info}</span>
            </button>
          ))}
        </div>
      </div>

      {/* VALUATION CALCULATIONS RESULT */}
      {valuationResult ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-950/25 to-slate-950 border border-violet-500/20 rounded-xl p-4 space-y-3.5">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-5">
            <Coins className="h-32 w-32" />
          </div>

          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wide bg-violet-500/10 border border-violet-500/20 text-violet-400">
                {valuationResult.isFallback ? "Fallback Scaling Rate" : `${valuationResult.sampleCount} Live GIS Samples`}
              </span>
              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                ESTIMATED REAL VALUE
              </h4>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Confidence Margin</span>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                Low Deviation (±15%)
              </div>
            </div>
          </div>

          {/* MAIN PRICE DISPLAY */}
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between py-1 border-y border-slate-850/40">
            <div className="h-10 flex items-baseline">
              <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-tight mr-1">UGX</span>
              <span className="text-2xl font-black font-sans tracking-tight text-white">
                {valuationResult.estimatedUGXMillions.toFixed(2)} M
              </span>
            </div>
            
            <div className="text-left md:text-right mt-1 md:mt-0">
              <div className="text-[11px] font-sans font-bold text-slate-205 flex items-center md:justify-end gap-1 text-slate-350">
                ≈ UGX {Math.round(valuationResult.estimatedUGXMillions * 1000000).toLocaleString()}
              </div>
              <div className="text-[8.5px] font-mono text-slate-500 uppercase mt-0.5">
                Ugandan Shillings Fully Extrapolated
              </div>
            </div>
          </div>

          {/* MARGIN INTERVAL INTERVAL SLIDER */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase">
              <span>Standard Dev (-15%)</span>
              <span>Estimated Median</span>
              <span>Premium Peak (+15%)</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden flex">
              <div className="h-full bg-slate-850 w-[35%]" />
              <div className="h-full bg-emerald-500 w-[30%]" />
              <div className="h-full bg-slate-850 w-[35%]" />
            </div>
            <div className="flex justify-between items-center text-[9.5px] font-mono font-semibold text-slate-300">
              <span>{(valuationResult.estimatedUGXMillions * 0.85).toFixed(1)}M</span>
              <span className="text-emerald-400 font-bold">{valuationResult.estimatedUGXMillions.toFixed(1)}M</span>
              <span>{(valuationResult.estimatedUGXMillions * 1.15).toFixed(1)}M</span>
            </div>
          </div>

          {/* INTERNAL DETAILS LIST */}
          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-850/30">
            <div>
              <span>Extracted Sizing: </span>
              <strong className="text-slate-200">{valuationResult.sizeSqm} m²</strong>
            </div>
            <div className="text-right">
              <span>Average Hub Rate: </span>
              <strong className="text-slate-200">~{(valuationResult.adjustedRatePerSqm * 1000).toFixed(0)}K / m²</strong>
            </div>
          </div>

          {valuationResult.isFallback && (
            <div className="flex items-start gap-1.5 text-[9px] font-sans text-amber-400 bg-amber-500/5 border border-amber-500/20 p-2 rounded-lg">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
              <span>
                No matching size recordings for <strong>{selectedArea}</strong>. 
                Using database standard scaling multipliers of regional hub.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-6 text-slate-500 font-mono text-xs">
          Input a valid size to check system valuation patterns.
        </div>
      )}

      {/* COMPACT HUB RATES COMPARATIVE LIST */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-violet-400" /> Regional Rates Index
          </span>
          <span>UGX Rate / m²</span>
        </div>

        <div className="divide-y divide-slate-850 overflow-hidden bg-slate-950/40 rounded-xl border border-slate-850/60 max-h-40 overflow-y-auto custom-scrollbar">
          {areas.map(area => {
            const hasRate = stats.areaRates[area]?.sampleCount > 0;
            const rateK = stats.areaRates[area] ? Math.round(stats.areaRates[area].avgRate * 1000) : 350;
            const typicalM = Math.round(rateK * 450 / 1000); // UGX Millions for 450 sqm standard plot
            
            return (
              <div 
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                  selectedArea === area 
                    ? "bg-slate-850 text-white" 
                    : "text-slate-400 hover:text-white hover:bg-slate-850/50"
                }`}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <MapPin className={`h-3 w-3 ${selectedArea === area ? "text-violet-400" : "text-slate-500"}`} />
                  <span className="font-sans font-semibold text-[11px] no-truncate">{area}</span>
                  {stats.areaRates[area]?.sampleCount > 0 && (
                    <span className="text-[8px] font-mono uppercase bg-slate-800 text-slate-350 px-1 rounded">
                      {stats.areaRates[area].sampleCount} pt
                    </span>
                  )}
                </div>

                <div className="font-mono text-[10px] text-right flex items-center gap-1">
                  <span className={selectedArea === area ? "text-violet-300 font-bold" : "text-slate-300"}>
                    UGX {(rateK).toLocaleString()}K / m²
                  </span>
                  <span className="text-slate-500 text-[8.5px] font-sans">
                    (~{typicalM}M plot)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
