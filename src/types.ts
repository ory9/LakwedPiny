/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Listing {
  id: string;
  title: string;
  priceUGX: number; // in millions UGX (e.g., 250 means 250,000,000 UGX)
  areaName: string; // e.g., Kampala Central, Wakiso, Mukono, Entebbe, Jinja, etc.
  detectedSuburb?: string;
  latitude: number;
  longitude: number;
  interestLevel: 'high' | 'medium' | 'low';
  status: 'sold' | 'unsold';
  landSize: string; // e.g., "15x30m", "400m²", "2000m²" (strictly in meters)
  agentName: string;
  agentContact: string;
  postingsCount: number; // to track duplicate or multiple postings
  notes?: string;
  createdAt: string;
}

export interface AreaInterest {
  area: string;
  level: 'high' | 'medium' | 'low';
  reason: string;
}

export interface AveragePrice {
  area: string;
  avgPriceMillions: number;
  count: number;
}

export interface AIAnalysis {
  summary: string;
  averagePriceByArea: AveragePrice[];
  highInterestZones: AreaInterest[];
  marketInsights: string[];
  duplicationReport: string;
  predictedTrends: string;
  generatedAt: string;
}
