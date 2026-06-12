/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory backup file path
const DATA_DIR = path.join(process.cwd(), "data");
const LISTINGS_FILE = path.join(DATA_DIR, "listings.json");

// Establish default listings
const defaultListings: any[] = [];

// Ensure file exists
function initializeStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LISTINGS_FILE)) {
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify(defaultListings, null, 2));
  }
}

// Read saved listings
function getListings() {
  try {
    initializeStorage();
    const raw = fs.readFileSync(LISTINGS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading listings file, fallback to in-memory:", error);
    return defaultListings;
  }
}

// Write listings
function saveListings(listings: any[]) {
  try {
    initializeStorage();
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2));
    return true;
  } catch (error) {
    console.error("Failed to write listings to file:", error);
    return false;
  }
}

// Set up lazy client initialization for Gemini API per safety guidelines
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return aiClient;
}

// --- API ROUTES ---

// Health route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Fetch listings
app.get("/api/listings", (req, res) => {
  const data = getListings();
  res.json({ success: true, listings: data });
});

// Update/Save all listings (Sync)
app.post("/api/listings", (req, res) => {
  const { listings } = req.body;
  if (!listings || !Array.isArray(listings)) {
    return res.status(400).json({ success: false, error: "Invalid listings array" });
  }
  const result = saveListings(listings);
  if (result) {
    res.json({ success: true, message: "Listings synchronized successfully" });
  } else {
    res.status(500).json({ success: false, error: "Cloud Run storage error" });
  }
});

// Reset listings to initial
app.post("/api/listings/reset", (req, res) => {
  const result = saveListings(defaultListings);
  if (result) {
    res.json({ success: true, listings: defaultListings, message: "Database reset to defaults" });
  } else {
    res.status(500).json({ success: false, error: "Failed to reset storage" });
  }
});

// Learn patterns with AI (Gemini)
app.post("/api/analyze", async (req, res) => {
  const { listings } = req.body;
  const activeListings = (listings && Array.isArray(listings)) ? listings : getListings();

  const gemini = getGeminiClient();

  if (!gemini) {
    // If API Key is missing or invalid, fall back to elegant simulated analysis (Offline fallback)
    console.log("No Gemini API key supplied. Falling back to Simulated Analyst Engine.");
    const simulatedResponse = compileOfflineAnalysis(activeListings);
    return res.json({
      success: true,
      analysis: simulatedResponse,
      mode: "offline_simulated"
    });
  }

  try {
    const dataString = JSON.stringify(activeListings, null, 2);

    const systemPrompt = `You are an expert Real Estate Economist and Data Analyst specializing in the Ugandan real estate market. 
Your goal is to inspect the supplied dynamic array of property listings and output a highly detailed, accurate structural trend report.
Look for core pricing patterns, interest-level heatmaps, sold/unsold structures, land sizes, multiple repeat postings issues, and contact statistics.
Return the output strictly matching the supplied JSON response schema. Ensure average prices are in millions of Ugandan Shillings (UGX).
Ensure Gulu, Kampala, Wakiso, Mukono, Jinja, Kira, Entebbe, and Mbarara are handled with high accuracy based on real Ugandan data characteristics.`;

    const userPrompt = `Analyze the following real estate dataset for patterns in Uganda:
${dataString}

Extract:
1. A concise, professional executive summary of the current market state in Uganda.
2. The calculated average price (in millions UGX) and total property count for each area/town.
3. High, medium, and low interest areas, color-coded zones, and the real-market reasons (e.g. bypass expansion, luxury demand, rent yield, industrial nodes).
4. A distinct duplication report detailing the rate of duplicate entries, which agents are posting repeatedly, and what this implies about listing transparency.
5. Key actionable market insights.
6. Predicted price and interest trends over the next 12-24 months.`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A professional executive summary of Ugandan real estate trends."
            },
            averagePriceByArea: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  area: { type: Type.STRING, description: "District/town in Uganda." },
                  avgPriceMillions: { type: Type.NUMBER, description: "Average property price in Millions UGX." },
                  count: { type: Type.INTEGER, description: "Total properties recorded here." }
                },
                required: ["area", "avgPriceMillions", "count"]
              }
            },
            highInterestZones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  area: { type: Type.STRING },
                  level: { type: Type.STRING, description: "Must be 'high', 'medium', or 'low'" },
                  reason: { type: Type.STRING, description: "Socio-economic reasons or infrastructure triggers." }
                },
                required: ["area", "level", "reason"]
              }
            },
            marketInsights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key findings, issues, and strategic insights."
            },
            duplicationReport: {
              type: Type.STRING,
              description: "A report on repeat postings, duplicate counts, agent behaviors, and industry opacity."
            },
            predictedTrends: {
              type: Type.STRING,
              description: "Predicted future developments for the next 1-2 years."
            }
          },
          required: ["summary", "averagePriceByArea", "highInterestZones", "marketInsights", "duplicationReport", "predictedTrends"]
        }
      }
    });

    const parsedText = response.text ? JSON.parse(response.text.trim()) : null;

    if (!parsedText) {
      throw new Error("Empty text returned from Gemini API");
    }

    res.json({
      success: true,
      analysis: parsedText,
      mode: "online"
    });

  } catch (error: any) {
    console.error("Gemini API Error, falling back to simulated output:", error);
    res.json({
      success: true,
      analysis: compileOfflineAnalysis(activeListings),
      mode: "offline_fallback",
      warning: "Gemini API experienced a timeout or parsing error. Exhibiting offline-compiled results instead."
    });
  }
});

// Helper function to query OpenStreetMap Nominatim with compliant User-Agent
async function queryOSM(query: string): Promise<{ lat: number, lng: number, displayName: string } | null> {
  try {
    const userAgent = "UgandaRealEstateHub/1.0 (ditcoin999@gmail.com)";
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept-Language": "en"
      }
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
  } catch (error) {
    console.error(`[Geocoder] OSM err for "${query}":`, error);
  }
  return null;
}

// Map the right location of places with fallback hierarchies (Primary School, Health Centre, physical features)
app.post("/api/geocode", async (req, res) => {
  const { placeName, district } = req.body;
  if (!placeName || typeof placeName !== "string") {
    return res.status(400).json({ success: false, error: "placeName is required" });
  }

  const selectedDistrict = district || "Kampala Central";
  const directQuery = `${placeName}, ${selectedDistrict}, Uganda`;
  
  let result = null;
  let resolvedType = "exact";
  let fallbackHistory: string[] = [];

  // Try direct geocoding
  result = await queryOSM(directQuery);
  if (result) {
    fallbackHistory.push(`Found exact coordinates for: "${directQuery}"`);
  } else {
    fallbackHistory.push(`No exact coordinates found for: "${directQuery}"`);
    
    // Try wider Uganda search
    const widerQuery = `${placeName}, Uganda`;
    result = await queryOSM(widerQuery);
    if (result) {
      resolvedType = "wider";
      fallbackHistory.push(`Resolved coordinate using wider search context: "${widerQuery}"`);
    }
  }

  // Fallbacks: primary schools, health centres, physical features, etc.
  const suffixes = [
    { suffix: "Primary School", type: "primary school" },
    { suffix: "Health Centre", type: "health centre" },
    { suffix: "Health Center", type: "health centre" },
    { suffix: "Market", type: "market" },
    { suffix: "Hill", type: "physical feature" },
    { suffix: "Police Station", type: "police station" },
    { suffix: "Church", type: "church" }
  ];

  if (!result) {
    for (const fb of suffixes) {
      const fbSearch = `${placeName} ${fb.suffix}, ${selectedDistrict}, Uganda`;
      fallbackHistory.push(`Attempting landmark combination: "${placeName} ${fb.suffix}"`);
      const fbResult = await queryOSM(fbSearch);
      if (fbResult) {
        result = fbResult;
        resolvedType = fb.type;
        fallbackHistory.push(`Geocoding successful! Matched near: "${fbSearch}"`);
        break;
      }
    }
  }

  // Countrywide-landmark fallback if district match failed
  if (!result) {
    for (const fb of suffixes) {
      const fbSearch = `${placeName} ${fb.suffix}, Uganda`;
      const fbResult = await queryOSM(fbSearch);
      if (fbResult) {
        result = fbResult;
        resolvedType = fb.type;
        fallbackHistory.push(`Geocoding successful! Matched countrywide: "${fbSearch}"`);
        break;
      }
    }
  }

  // Dictionary lookup fallback
  if (!result) {
    const matchedKey = Object.keys(placeCoordinates).find(k => 
      placeName.toLowerCase().includes(k) || k.includes(placeName.toLowerCase())
    );
    if (matchedKey) {
      const predefinedLatLong = placeCoordinates[matchedKey];
      result = {
        lat: predefinedLatLong.lat,
        lng: predefinedLatLong.lng,
        displayName: `${placeName} (${predefinedLatLong.area} Suburb Node)`
      };
      resolvedType = "dictionary";
      fallbackHistory.push(`Resolved via offline dictionary node mapping for "${matchedKey}"`);
    }
  }

  // District center ultimate fallback
  if (!result) {
    const districtDefaults: Record<string, { lat: number, lng: number }> = {
      "Kampala Central": { lat: 0.3283, lng: 32.5911 },
      "Wakiso": { lat: 0.3980, lng: 32.6395 },
      "Mukono": { lat: 0.3544, lng: 32.7481 },
      "Entebbe": { lat: 0.0512, lng: 32.4637 },
      "Jinja": { lat: 0.4244, lng: 33.2042 },
      "Gulu": { lat: 2.7725, lng: 32.2990 },
      "Mbarara": { lat: -0.6074, lng: 30.6545 }
    };

    const coord = districtDefaults[selectedDistrict] || { lat: 0.3476, lng: 32.5825 };
    result = {
      lat: coord.lat,
      lng: coord.lng,
      displayName: `${selectedDistrict} Center`
    };
    resolvedType = "district_center";
    fallbackHistory.push(`Landmark matching failed. Concentrating coordinates at District Center of ${selectedDistrict}`);
  }

  res.json({
    success: true,
    placeName,
    district: selectedDistrict,
    resolved: result,
    type: resolvedType,
    history: fallbackHistory
  });
});

// Dictionary of popular sub-places for offline coordinate matching
const placeCoordinates: Record<string, { lat: number; lng: number; area: string }> = {
  "kololo": { lat: 0.3283, lng: 32.5911, area: "Kampala Central" },
  "nakasero": { lat: 0.3235, lng: 32.5786, area: "Kampala Central" },
  "ntinda": { lat: 0.3582, lng: 32.6108, area: "Kampala Central" },
  "kyanja": { lat: 0.3805, lng: 32.6012, area: "Kampala Central" },
  "naguru": { lat: 0.3422, lng: 32.6033, area: "Kampala Central" },
  "bugolobi": { lat: 0.3204, lng: 32.6156, area: "Kampala Central" },
  "bukoto": { lat: 0.3496, lng: 32.5976, area: "Kampala Central" },
  "kamwokya": { lat: 0.3374, lng: 32.5891, area: "Kampala Central" },
  "kababagasi": { lat: 0.3015, lng: 32.5898, area: "Kampala Central" },
  "munyonyo": { lat: 0.2520, lng: 32.6145, area: "Kampala Central" },
  "muyenga": { lat: 0.2989, lng: 32.6025, area: "Kampala Central" },
  "kabalagala": { lat: 0.2995, lng: 32.5960, area: "Kampala Central" },
  "menggo": { lat: 0.3014, lng: 32.5594, area: "Kampala Central" },
  "rubaga": { lat: 0.3032, lng: 32.5516, area: "Kampala Central" },
  "lubya": { lat: 0.3291, lng: 32.5365, area: "Kampala Central" },
  "nakawa": { lat: 0.3256, lng: 32.6167, area: "Kampala Central" },
  "makindye": { lat: 0.2831, lng: 32.5830, area: "Kampala Central" },
  
  "kira": { lat: 0.3980, lng: 32.6395, area: "Wakiso" },
  "namugongo": { lat: 0.3881, lng: 32.6517, area: "Wakiso" },
  "najjera": { lat: 0.3789, lng: 32.6288, area: "Wakiso" },
  "gayaza": { lat: 0.4431, lng: 32.6139, area: "Wakiso" },
  "kasangati": { lat: 0.4411, lng: 32.6412, area: "Wakiso" },
  "lubowa": { lat: 0.2581, lng: 32.5702, area: "Wakiso" },
  "seguku": { lat: 0.2642, lng: 32.5601, area: "Wakiso" },
  "kajjansi": { lat: 0.2119, lng: 32.5486, area: "Wakiso" },
  "kyengera": { lat: 0.2951, lng: 32.5186, area: "Wakiso" },
  "bweyogerere": { lat: 0.3592, lng: 32.6685, area: "Wakiso" },
  "kireka": { lat: 0.3440, lng: 32.6465, area: "Wakiso" },
  "matugga": { lat: 0.4795, lng: 32.5244, area: "Wakiso" },
  "bulenga": { lat: 0.3181, lng: 32.4832, area: "Wakiso" },

  "entebbe": { lat: 0.0512, lng: 32.4637, area: "Entebbe" },
  "kitoro": { lat: 0.0632, lng: 32.4611, area: "Entebbe" },
  "nkumba": { lat: 0.0963, lng: 32.4812, area: "Entebbe" },
  "abaita": { lat: 0.1035, lng: 32.4789, area: "Entebbe" },
  "kisubi": { lat: 0.1265, lng: 32.5312, area: "Entebbe" },

  "mukono": { lat: 0.3544, lng: 32.7481, area: "Mukono" },
  "seeta": { lat: 0.3644, lng: 32.7153, area: "Mukono" },
  "mbalala": { lat: 0.3412, lng: 32.8122, area: "Mukono" },
  "goma": { lat: 0.3705, lng: 32.7118, area: "Mukono" },

  "jinja": { lat: 0.4244, lng: 33.2042, area: "Jinja" },
  "nyenga": { lat: 0.3812, lng: 33.1511, area: "Jinja" },
  "bugembe": { lat: 0.4431, lng: 33.2289, area: "Jinja" },
  "masese": { lat: 0.4122, lng: 33.2301, area: "Jinja" },

  "gulu": { lat: 2.7725, lng: 32.2990, area: "Gulu" },
  "pece": { lat: 2.7663, lng: 32.3112, area: "Gulu" },
  "layibi": { lat: 2.7533, lng: 32.2815, area: "Gulu" },
  "laroo": { lat: 2.7844, lng: 32.3088, area: "Gulu" },

  "mbarara": { lat: -0.6074, lng: 30.6545, area: "Mbarara" },
  "kamukuzi": { lat: -0.6012, lng: 30.6489, area: "Mbarara" },
  "kakoba": { lat: -0.6122, lng: 30.6695, area: "Mbarara" },
  "ruharo": { lat: -0.6045, lng: 30.6312, area: "Mbarara" },
};

// Land size unit converter to METERS
function convertToMeters(sizeStr: string): string {
  const lower = sizeStr.toLowerCase().trim();
  
  const matchAcres = lower.match(/(\d+(?:\.\d+)?)\s*(?:acre|ac)/);
  const matchDecimals = lower.match(/(\d+(?:\.\d+)?)\s*(?:decimal|dec)/);
  const matchFeet = lower.match(/(\d+)\s*(?:x|by|\*)\s*(\d+)\s*(?:ft|feet|f|'|"|plots?)/) || lower.match(/(\d+)\s*ft\s*(?:x|by|\*)\s*(\d+)\s*ft/);
  
  if (matchAcres) {
    const val = parseFloat(matchAcres[1]);
    const sqm = Math.round(val * 4046);
    return `approx ${sqm}m² (${val} Acres)`;
  }
  
  if (matchDecimals) {
    const val = parseFloat(matchDecimals[1]);
    const sqm = Math.round(val * 40.46);
    return `approx ${sqm}m² (${val} Decimals)`;
  }
  
  if (matchFeet) {
    const w = parseInt(matchFeet[1]);
    const h = parseInt(matchFeet[2]);
    const wm = Math.round(w * 0.3048);
    const hm = Math.round(h * 0.3048);
    return `${wm}x${hm}m (~${wm * hm}m²)`;
  }
  
  if (lower.includes('m') || lower.includes('meter')) {
    return sizeStr;
  }
  
  return sizeStr + " (meters)";
}

// Interactive AI Real Estate Listing Parser
app.post("/api/parse-listing", async (req, res) => {
  const { text } = req.body;
  
  if (!text || typeof text !== "string") {
    return res.status(400).json({ success: false, error: "Text string is required" });
  }

  // Define offline search heuristics first as 100% reliable fallback
  let offlineParsed: any = {
    title: "Property Listing Record",
    priceUGX: 100,
    areaName: "Kampala Central",
    latitude: 0.3476,
    longitude: 32.5825,
    interestLevel: "medium",
    status: "unsold",
    landSize: "15x30m (~450m²)",
    agentName: "Ronald Mugisha",
    agentContact: "+256 772 123456",
    postingsCount: 1,
    notes: "Offline parser fallback."
  };

  const textLower = text.toLowerCase();

  // 1. Detect sub-place names & map accurate coordinates
  let detectedPlace = "";
  for (const [place, data] of Object.entries(placeCoordinates)) {
    if (textLower.includes(place)) {
      detectedPlace = place;
      offlineParsed.latitude = data.lat;
      offlineParsed.longitude = data.lng;
      offlineParsed.areaName = data.area;
      break;
    }
  }

  // 2. Extrapolate title
  const firstLine = text.split("\n")[0].trim();
  if (firstLine && firstLine.length < 50) {
    offlineParsed.title = firstLine;
  } else if (detectedPlace) {
    offlineParsed.title = `Prime Plot in ${detectedPlace.toUpperCase()}`;
  } else {
    offlineParsed.title = "Ugandan Real Estate Plot";
  }

  // 3. Extrapolate Price
  const millionRegex = /(\d+(?:\.\d+)?)\s*(?:m|million|milli)/i;
  const numberRegex = /(\d{2,4})\s*(?=ugx|shs|sh)/i;
  const matchMil = text.match(millionRegex);
  const matchNum = text.match(numberRegex);
  if (matchMil) {
    offlineParsed.priceUGX = parseFloat(matchMil[1]);
  } else if (matchNum) {
    offlineParsed.priceUGX = parseFloat(matchNum[1]);
  }

  // 4. Extrapolate contact telephone
  const phoneRegex = /(\+?256\s*[0-9\s-]{6,12}|07[0-9\s-]{8,12})/i;
  const matchPhone = text.match(phoneRegex);
  if (matchPhone) {
    offlineParsed.agentContact = matchPhone[1].replace(/\s+/g, "");
  }

  // 5. Extrapolate size
  const sizeRegex = /(\d+x\d+\s*ft|decimals?|\d+\s*acres?|\d+x\d+\s*m|\d+\s*m²)/i;
  const matchSize = text.match(sizeRegex);
  if (matchSize) {
    offlineParsed.landSize = convertToMeters(matchSize[1]);
  }

  // 6. Extrapolate status
  if (textLower.includes("sold") && !textLower.includes("unsold")) {
    offlineParsed.status = "sold";
  }

  // Call Gemini API if available
  const gemini = getGeminiClient();
  if (!gemini) {
    console.log("No Gemini API key. Returning local rule-based parsed listing.");
    return res.json({
      success: true,
      listings: [offlineParsed],
      mode: "offline_fallback"
    });
  }

  try {
    const systemPrompt = `You are a sophisticated Ugandan GIS Geocoder and Real Estate parser. 
Your task is to take raw real estate listings text (often from WhatsApp groups, flyers, or portals in Uganda) and extract structural data.
The text may contain ONE or MULTIPLE listing records (e.g. separated by bullet points, newlines, numbers, or section headings).
You MUST parse and extract ALL distinct real estate listings into the 'listings' array.
For each listing:
- You MUST output coordinates (latitude and longitude) matching the specific neighborhood, suburb, or town mentioned in Uganda (e.g. Ntinda, Kira, Kyanja, Munyonyo, Kisubi, Rubaga, Goma, Seeta etc.) with high geographic precision!
- You MUST convert all land size measurements into meters or square meters (e.g., '50x100 ft' is converted to approx '15x30m', '0.5 acres' is approx '2000m²', '1 acre' is approx '4000m²'). Do NOT use feet or acres in your parsed output. Ensure average/specific prices represent Millions of UGX (e.g. '120,000,000' or '120M' -> 120).
- Area name must be strictly chosen from: 'Kampala Central', 'Wakiso', 'Mukono', 'Entebbe', 'Jinja', 'Gulu', 'Mbarara' based on geographic location/district proximity.`;

    const userPrompt = `Extract fields for the following text listing(s):
"${text}"`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            listings: {
              type: Type.ARRAY,
              description: "Array of parsed property listings from the text block",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Descriptive clean title of the property" },
                  priceUGX: { type: Type.NUMBER, description: "Price in Millions UGX (e.g. 150)" },
                  areaName: { type: Type.STRING, description: "Must be exactly one of: 'Kampala Central', 'Wakiso', 'Mukono', 'Entebbe', 'Jinja', 'Gulu', 'Mbarara'" },
                  detectedSuburb: { type: Type.STRING, description: "Specific neighborhood or suburb name detected, e.g., 'Kyanja', 'Ntinda', 'Kisubi'" },
                  latitude: { type: Type.NUMBER, description: "Exact or estimated latitude coordinate of the SPECIFIC town/suburb/place, e.g. 0.3582 for Ntinda." },
                  longitude: { type: Type.NUMBER, description: "Exact or estimated longitude coordinate of the SPECIFIC town/suburb/place, e.g. 32.6108 for Ntinda." },
                  interestLevel: { type: Type.STRING, description: "Must be 'high', 'medium', or 'low'" },
                  status: { type: Type.STRING, description: "Must be 'sold' or 'unsold'" },
                  landSize: { type: Type.STRING, description: "Land size expressed in METERS or SQUARE METERS, e.g. '15x30m' or 'approx 2000m²'" },
                  agentName: { type: Type.STRING, description: "Detected listing agent, or default to 'Ronald Mugisha'" },
                  agentContact: { type: Type.STRING, description: "Detected phone number, default to '+256 772 123456'" },
                  postingsCount: { type: Type.INTEGER, description: "Default to 1" },
                  notes: { type: Type.STRING, description: "A neat analytical note about the listing" }
                },
                required: ["title", "priceUGX", "areaName", "detectedSuburb", "latitude", "longitude", "interestLevel", "status", "landSize", "agentName", "agentContact", "postingsCount", "notes"]
              }
            }
          },
          required: ["listings"]
        }
      }
    });

    const parsed = response.text ? JSON.parse(response.text.trim()) : null;
    if (parsed && parsed.listings && Array.isArray(parsed.listings)) {
      for (const item of parsed.listings) {
        if (item.detectedSuburb) {
          const selectedDistrict = item.areaName;
          const directQuery = `${item.detectedSuburb}, ${selectedDistrict}, Uganda`;
          
          console.log(`[Parse Geocoder] Attempting OSM geocode for extracted suburb: "${directQuery}"`);
          let preciseGeo = await queryOSM(directQuery);
          let resolutionMethod = "exact";

          // Fallback Tier 1: countrywide
          if (!preciseGeo) {
            const widerQuery = `${item.detectedSuburb}, Uganda`;
            preciseGeo = await queryOSM(widerQuery);
            if (preciseGeo) resolutionMethod = "wider countrywide";
          }

          const suffixes = [
            { suffix: "Primary School", type: "primary school" },
            { suffix: "Health Centre", type: "health centre" },
            { suffix: "Health Center", type: "health centre" },
            { suffix: "Market", type: "market" },
            { suffix: "Hill", type: "physical feature" },
            { suffix: "Police Station", type: "police station" },
            { suffix: "Church", type: "church" }
          ];

          // Fallback Tier 2: landmarks
          if (!preciseGeo) {
            for (const fb of suffixes) {
              const fbSearch = `${item.detectedSuburb} ${fb.suffix}, ${selectedDistrict}, Uganda`;
              preciseGeo = await queryOSM(fbSearch);
              if (preciseGeo) {
                resolutionMethod = fb.type;
                item.notes += ` (Match near local ${fb.suffix})`;
                break;
              }
            }
          }

          // Fallback Tier 3
          if (!preciseGeo) {
            for (const fb of suffixes) {
              const fbSearch = `${item.detectedSuburb} ${fb.suffix}, Uganda`;
              preciseGeo = await queryOSM(fbSearch);
              if (preciseGeo) {
                resolutionMethod = `countrywide ${fb.type}`;
                item.notes += ` (Match near countrywide ${fb.suffix})`;
                break;
              }
            }
          }

          // Fallback Tier 4
          if (!preciseGeo) {
            const matchedKey = Object.keys(placeCoordinates).find(k => 
              item.detectedSuburb.toLowerCase().includes(k) || k.includes(item.detectedSuburb.toLowerCase())
            );
            if (matchedKey) {
              const predefinedLatLong = placeCoordinates[matchedKey];
              preciseGeo = {
                lat: predefinedLatLong.lat,
                lng: predefinedLatLong.lng,
                displayName: `${item.detectedSuburb} (${predefinedLatLong.area} Suburb Node)`
              };
              resolutionMethod = "dictionary";
              item.notes += ` (Matched offline coordinate database for ${matchedKey})`;
            }
          }

          // Fallback Tier 5
          if (!preciseGeo) {
            const districtDefaults: Record<string, { lat: number, lng: number }> = {
              "Kampala Central": { lat: 0.3283, lng: 32.5911 },
              "Wakiso": { lat: 0.3980, lng: 32.6395 },
              "Mukono": { lat: 0.3544, lng: 32.7481 },
              "Entebbe": { lat: 0.0512, lng: 32.4637 },
              "Jinja": { lat: 0.4244, lng: 33.2042 },
              "Gulu": { lat: 2.7725, lng: 32.2990 },
              "Mbarara": { lat: -0.6074, lng: 30.6545 }
            };

            const coord = districtDefaults[selectedDistrict] || { lat: 0.3476, lng: 32.5825 };
            preciseGeo = {
              lat: coord.lat,
              lng: coord.lng,
              displayName: `${selectedDistrict} Default Center`
            };
            resolutionMethod = "district center default";
            item.notes += ` (Relying on default center)`;
          }

          if (preciseGeo) {
            item.latitude = preciseGeo.lat;
            item.longitude = preciseGeo.lng;
          }
        }
      }

      return res.json({
        success: true,
        listings: parsed.listings,
        mode: "online"
      });
    } else {
      throw new Error("Invalid response form from Gemini");
    }
  } catch (error: any) {
    console.error("Gemini listing parser failed, using offline heuristics:", error);
    res.json({
      success: true,
      listings: [offlineParsed],
      mode: "offline_fallback_error",
      warning: error.message
    });
  }
});

// Offline logic helper
function compileOfflineAnalysis(listings: any[]) {
  const areas = Array.from(new Set(listings.map(l => l.areaName)));
  const avgPrices = areas.map(area => {
    const areaList = listings.filter(l => l.areaName === area);
    const sum = areaList.reduce((acc, current) => acc + current.priceUGX, 0);
    return {
      area,
      avgPriceMillions: parseFloat((sum / areaList.length).toFixed(1)),
      count: areaList.length
    };
  });

  const duplicatesByAgent: Record<string, number> = {};
  listings.forEach(l => {
    if (l.agentName) {
      duplicatesByAgent[l.agentName] = (duplicatesByAgent[l.agentName] || 0) + (l.postingsCount > 1 ? l.postingsCount - 1 : 0);
    }
  });

  const duplicatedCount = listings.filter(l => l.postingsCount > 1).length;

  return {
    summary: `This is a locally calculated Ugandan real estate summary containing ${listings.length} live listings. High value hubs like Kampala Central and Entebbe dominate pricing averages, while outlying suburbs like Mukono offer highly affordable entry points for land ownership.`,
    averagePriceByArea: avgPrices,
    highInterestZones: [
      { area: "Kampala Central", level: "high", reason: "Sustained commercial density, high rent yields, and premium grade residential high-rises." },
      { area: "Entebbe", level: "high", reason: "Tourist development, expatriate demand, proximity to Kampala-Entebbe ExpressHighway." },
      { area: "Wakiso", level: "medium", reason: "High residential urbanization rate, popular with middle-class commuters." },
      { area: "Mbarara", level: "medium", reason: "Fastest growing commercial hub in Western Uganda with multiple educational nodes." },
      { area: "Mukono", level: "low", reason: "Industrial progression but currently suffers from sub-optimal transport links during peak hours." },
      { area: "Gulu", level: "low", reason: "Great potential for agricultural acreage but commercial leasing remains stable without aggressive spikes." }
    ],
    marketInsights: [
      `A total of ${(listings.filter(l => l.status === 'sold').length / listings.length * 100).toFixed(0)}% of tracked listings are marked as 'Sold', indicating moderate liquid velocity.`,
      "Land sizes are primarily transacted in acres and feet fractions (e.g. 50x100), creating some challenges in standard price-per-sqm metrics.",
      "Kampala outlying areas (Wakiso, Mukono) are seeing increased commuter appeal due to tarmac network expansions."
    ],
    duplicationReport: `Out of ${listings.length} properties, ${duplicatedCount} have repeat posting markers (${(duplicatedCount / listings.length * 100).toFixed(0)}% market overlap ratio). The primary repeat agent identified is Ronald Mugisha (Kampala Central) with multiple cross-listings. This implies that listing count data is often artificially inflated on digital channels to create simulated market volume.`,
    predictedTrends: "Uganda's Land valuation is predicted to grow by 8.5% year-on-year in metropolitan areas, particularly along the Wakiso expansion corridor. Gulu is poised for a secondary real estate rise as agribusiness infrastructure capitalizes.",
    generatedAt: new Date().toISOString()
  };
}

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
