/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AIAnalysis, Listing } from "../types";
import { Brain, Download, AlertTriangle, RefreshCw, BarChart2, Activity, Calendar, ShieldCheck, Flame } from "lucide-react";
import { jsPDF } from "jspdf";

interface AnalyticsPanelProps {
  analysis: AIAnalysis | null;
  listings: Listing[];
  onTriggerAnalyze: () => void;
  loading: boolean;
  offlineMode: boolean;
}

export default function AnalyticsPanel({ analysis, listings, onTriggerAnalyze, loading, offlineMode }: AnalyticsPanelProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Style variables for standard light theme
  const textClass = "text-slate-600";
  const boldTextClass = "text-slate-800";
  const countTextClass = "text-slate-400";
  const containerClass = "bg-white border-gray-100 text-slate-800";

  const cardClass = "bg-slate-50 border-slate-200";

  const innerCardClass = "bg-white border-slate-100";

  const titleClass = "text-gray-900";
  const headingBorderClass = "border-slate-150";

  // PDF Generator using premium jsPDF API (Client-side, 100% offline capable)
  const generatePDFReport = () => {
    if (!analysis) return;
    setDownloadingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const primaryColor = [15, 23, 42]; // slate-900
      const accentColor = [16, 185, 129]; // emerald-500
      const lightBg = [248, 250, 252]; // slate-50

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      let currentY = 15;

      // Function to help wrap and write text safely
      const writeWrappedParagraph = (text: string, fontSize = 10, fontStyle = "normal", spacing = 5) => {
        doc.setFont("Helvetica", fontStyle);
        doc.setFontSize(fontSize);
        doc.setTextColor(51, 65, 85); // slate-600
        
        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          if (currentY > 275) {
            doc.addPage();
            currentY = 20;
          }
          doc.text(line, margin, currentY);
          currentY += (fontSize * 0.35) + 1.5;
        });
        currentY += spacing;
      };

      const drawSectionHeader = (title: string) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        // Draw bottom line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY + 4, pageWidth - margin, currentY + 4);

        // Header Title
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(title, margin, currentY);
        
        currentY += 10;
      };

      // PAGE 1: HEADER
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 40, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("UGANDAN REAL ESTATE ANALYTICS REPORT", margin, 18);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(`HYBRID SPATIAL ASSESSMENT • DATASETS TRANSACTED: ${listings.length} LISTINGS`, margin, 26);
      doc.text(`DATE GENERATED: ${new Date().toLocaleDateString()} • PLATFORM SECURE: ${offlineMode ? "OFFLINE CACHED" : "CLOUD SYNCED"}`, margin, 31);

      currentY = 52;

      // EXECUTIVE SUMMARY
      drawSectionHeader("1. Executive Summary & Market Diagnosis");
      writeWrappedParagraph(analysis.summary, 10, "normal", 8);

      // SECTION 2: AREA PRICING STATISTICS TABLE
      drawSectionHeader("2. District Price Structuring & Densities");
      
      // Draw Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, currentY, contentWidth, 8, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Territory / Town", margin + 4, currentY + 5.5);
      doc.text("Average Price (Millions UGX)", margin + 70, currentY + 5.5);
      doc.text("Active Postings", margin + 140, currentY + 5.5);
      
      currentY += 8.5;

      // Draw Table Contents
      analysis.averagePriceByArea.forEach((item) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
        
        // Zebra striping
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, currentY + 6, pageWidth - margin, currentY + 6);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(item.area, margin + 4, currentY + 4);
        doc.text(`UGX ${item.avgPriceMillions} M`, margin + 70, currentY + 4);
        doc.text(`${item.count} properties`, margin + 140, currentY + 4);

        currentY += 6.5;
      });

      currentY += 8;

      // SECTION 3: AREAS OF HIGH INTEREST
      drawSectionHeader("3. High Interest Zones & Socio-Economic Triggers");
      
      analysis.highInterestZones.forEach((zone) => {
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(zone.level === "high" ? 185 : zone.level === "medium" ? 217 : 59, zone.level === "high" ? 28 : zone.level === "medium" ? 119 : 130, zone.level === "high" ? 28 : zone.level === "medium" ? 6 : 246);
        doc.text(`■  ${zone.area} (${zone.level.toUpperCase()} INTEREST)`, margin + 2, currentY);
        
        currentY += 4.5;
        writeWrappedParagraph(zone.reason, 9, "normal", 4);
      });

      currentY += 5;

      // SECTION 4: DUPLICATION & AGENTS AUDIT
      drawSectionHeader("4. Broker Network Audit & Transparency Review");
      writeWrappedParagraph(analysis.duplicationReport, 9.5, "normal", 8);

      // SECTION 5: FUTURE PREDICTIVE PATTERNS
      drawSectionHeader("5. 24-Month Future Trends Prognosis");
      writeWrappedParagraph(analysis.predictedTrends, 9.5, "normal", 10);

      // Footer brand
      if (currentY > 265) {
        doc.addPage();
        currentY = 20;
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 280, pageWidth - margin, 280);
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Assisted by Gemini AI Neural Analyst Platform • Generated in browser client, Uganda Real Estate Map system.", margin, 285);

      // Save PDF
      doc.save(`uganda-realestate-market-report-${Date.now()}.pdf`);

    } catch (err: any) {
      console.error("PDF download execution failed:", err);
      alert("Failed rendering high resolution PDF: " + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className={`rounded-2xl p-6 shadow-sm space-y-6 transition-colors duration-300 ${containerClass}`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between border-b pb-5 gap-4 ${headingBorderClass}`}>
        <div>
          <h3 className={`font-sans font-semibold text-lg flex items-center gap-2 ${titleClass}`}>
            <Brain className="h-5.5 w-5.5 text-blue-500 animate-pulse animate-duration-2000" />
            Uganda Real Estate AI Pattern Analyst
          </h3>
          <p className={`text-xs font-mono mt-0.5 ${textClass}`}>
            {offlineMode ? "COMPILING INSIGHTS SECURELY VIA OFFLINE METRIC SYNTHESIS" : "QUERIED TO GEMINI-3.5-FLASH LIVE INFERENCE ENGINE"}
          </p>
        </div>

        {/* REPLICATING NEW COMPACT ICON CONTROLS */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onTriggerAnalyze}
            disabled={loading}
            title="Trigger Deep Intelligence Query"
            className={`cursor-pointer p-3 rounded-xl transition border flex items-center gap-2 font-mono text-xs font-bold leading-none ${
              loading 
                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-white shadow-sm active:scale-95"
            }`}
          >
            <Brain className={`h-4.5 w-4.5 ${loading ? "animate-spin text-blue-400" : "text-current animate-pulse animate-duration-1500"}`} />
            <span>AI Query</span>
          </button>

          {analysis && (
            <button
              onClick={generatePDFReport}
              disabled={downloadingPdf}
              title="Export Assessment (PDF)"
              className={`cursor-pointer p-3 rounded-xl border transition flex items-center gap-2 font-mono text-xs font-bold leading-none ${
                downloadingPdf
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-250 active:scale-95"
              }`}
            >
              <Download className={`h-4.5 w-4.5 ${downloadingPdf ? "animate-bounce" : "text-current"}`} />
              <span>Export PDF</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 animate-spin border-blue-100 border-t-blue-600"></div>
            <Brain className="h-5 w-5 absolute top-3.5 left-3.5 animate-pulse text-blue-500" />
          </div>
          <div>
            <h4 className={`font-sans font-bold text-sm ${boldTextClass}`}>Processing Market Topologies</h4>
            <p className={`text-xs mt-1 max-w-sm ${textClass}`}>
              Analyzing coordinates, listing duplication rates, agent phone registers, and computing regional variances in Ugandan Shillings...
            </p>
          </div>
        </div>
      ) : analysis ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* STATS & SUMMARY (Col span 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* EXECUTIVE SUMMARY */}
            <div className={`border rounded-xl p-5 space-y-2 ${cardClass}`}>
              <h4 className={`font-sans font-bold text-sm uppercase tracking-wide flex items-center gap-1.5 border-b pb-2 ${boldTextClass} ${headingBorderClass}`}>
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                Market Executive Diagnosis
              </h4>
              <p className={`text-sm leading-relaxed pt-1 ${textClass}`}>
                {analysis.summary}
              </p>
            </div>

            {/* CUSTOM NATIVE SVG BAR CHART REPRESENTATION */}
            <div className={`border rounded-xl p-5 space-y-4 ${cardClass}`}>
              <div className={`flex items-center justify-between border-b pb-2 ${headingBorderClass}`}>
                <h4 className={`font-sans font-bold text-sm uppercase tracking-wide flex items-center gap-1.5 ${boldTextClass}`}>
                  <BarChart2 className="h-4.5 w-4.5 text-blue-500" />
                  Regional Price Structure (Millions UGX)
                </h4>
                <span className={`text-[10px] font-mono ${countTextClass}`}>Values in Millions</span>
              </div>

              <div className="space-y-4 pt-1">
                {analysis.averagePriceByArea.map((item, index) => {
                  // Find max average price to scale properly
                  const maxPrice = Math.max(...analysis.averagePriceByArea.map(a => a.avgPriceMillions), 150);
                  const percentageWidth = Math.min(Math.max((item.avgPriceMillions / maxPrice) * 100, 6), 100);

                  return (
                    <div key={item.area} className="space-y-1">
                      <div className={`flex justify-between text-xs font-semibold ${boldTextClass}`}>
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                          {item.area}
                        </span>
                        <span>UGX {item.avgPriceMillions}M <span className={`font-normal ${countTextClass}`}>({item.count} properties)</span></span>
                      </div>
                      <div className="w-full rounded-full h-3 overflow-hidden bg-slate-200">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out bg-slate-800"
                          style={{ width: `${percentageWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MARKET INSIGHTS */}
            <div className={`border rounded-xl p-5 space-y-3 ${cardClass}`}>
              <h4 className={`font-sans font-bold text-sm uppercase tracking-wide flex items-center gap-1.5 border-b pb-2 ${boldTextClass} ${headingBorderClass}`}>
                <Activity className="h-4.5 w-4.5 text-blue-500" />
                Actionable Strategic Highlights
              </h4>
              <ul className="space-y-2.5 pt-1">
                {analysis.marketInsights.map((insight, idx) => (
                  <li key={idx} className={`text-xs leading-relaxed flex items-start gap-2 ${textClass}`}>
                    <span className="mt-1 flex items-center justify-center h-3.5 w-3.5 rounded-full font-mono text-[8px] shrink-0 font-bold bg-slate-800 text-white">
                      {idx + 1}
                    </span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* SPECIFIC REPORT MODULES (Col span 5) */}
          <div className="lg:col-span-5 space-y-6">

            {/* INTEREST HEATPANEL */}
            <div className={`border rounded-xl p-5 space-y-4 ${cardClass}`}>
              <h4 className={`font-sans font-bold text-sm uppercase tracking-wide flex items-center gap-1.5 border-b pb-2 ${boldTextClass} ${headingBorderClass}`}>
                <Flame className="h-4.5 w-4.5 text-rose-500" />
                Regional Heatmap Breakdown
              </h4>

              <div className="space-y-3.5 pt-1 max-h-[300px] overflow-y-auto pr-1">
                {analysis.highInterestZones.map((zone) => (
                  <div key={zone.area} className={`p-3 rounded-lg border space-y-1 ${innerCardClass}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${boldTextClass}`}>{zone.area}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        zone.level === "high" 
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                          : zone.level === "medium"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      }`}>
                        {zone.level}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${textClass}`}>
                      {zone.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* DUPLICATION BROKERS COMPILER */}
            <div className="bg-rose-50/50 border border-rose-250 text-rose-900 rounded-xl p-5 space-y-3">
              <h4 className="font-sans font-bold text-sm uppercase tracking-wide flex items-center gap-1.5 border-b pb-2 text-rose-900 border-rose-100">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                Postings Overlap & Agent Network
              </h4>
              <p className="text-xs leading-relaxed pt-1 text-rose-800">
                {analysis.duplicationReport}
              </p>
              <div className="border border-rose-100 bg-white text-slate-500 rounded-lg p-2.5 text-[10px] font-mono leading-relaxed flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                Highly repeated listings usually indicate sub-agency channels where multiple brokers publish identical attributes with variable margin tags, inflating actual market inventory levels.
              </div>
            </div>

            {/* PREDICTIVE PROGNOSIS */}
            <div className="rounded-xl p-5 space-y-3 shadow-md bg-slate-800 text-white">
              <h4 className="font-sans font-bold text-gray-200 text-sm uppercase tracking-wide flex items-center gap-1.5 border-b border-white/10 pb-2">
                <Calendar className="h-4.5 w-4.5 text-blue-400" />
                24-Month Future Prognosis
              </h4>
              <p className="text-xs leading-relaxed pt-1 text-slate-205">
                {analysis.predictedTrends}
              </p>
            </div>
          </div>
          
        </div>
      ) : (
        <div className={`text-center py-16 border border-dashed rounded-xl p-4 ${cardClass}`}>
          <Brain className="h-10 w-10 text-gray-400/60 mx-auto animate-pulse mb-3" />
          <h4 className={`font-sans font-bold text-sm ${boldTextClass}`}>Decision Patterns Uncompiled</h4>
          <p className={`text-xs mt-1 max-w-xs mx-auto ${textClass}`}>
            Click "AI Query" above to start the multi-dimensional price trend compilation using Gemini Neural Models.
          </p>
        </div>
      )}
    </div>
  );
}
