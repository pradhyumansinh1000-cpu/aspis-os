"use client";

import React, { useState } from "react";
import { Search, BrainCircuit, Activity, BookOpen, Trophy, Palette, Sparkles } from "lucide-react";
import { STUDENTS } from "@/data/mockData";

interface SearchResult {
  score: number;
  payload: {
    student_id: string;
    department: string;
    content: string;
    type: string;
  };
}

interface IntelligenceResponse {
  query: string;
  llm_synthesis: string;
  hits: SearchResult[];
}

export default function ClassIntelligence() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<IntelligenceResponse | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/intelligence/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case "Medical": return <Activity className="w-5 h-5 text-risk-critical" />;
      case "Library": return <BookOpen className="w-5 h-5 text-aspis-behavioral" />;
      case "Sports": return <Trophy className="w-5 h-5 text-aspis-blue" />;
      case "Extracurriculars": return <Palette className="w-5 h-5 text-aspis-academic" />;
      default: return <Search className="w-5 h-5" />;
    }
  };

  const getStudentName = (id: string) => STUDENTS.find(s => s.id === id)?.name || id;

  const handleIndexData = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}"}` + "/api/intelligence/index", { method: "POST" });
    alert("System indexed successfully into Qdrant Vector DB.");
  };

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <BrainCircuit className="text-aspis-academic" /> Class Intelligence OS
          </h1>
          <p className="text-text-secondary mt-2 text-sm max-w-2xl">
            Semantic Vector Search Engine powered by Qdrant. Query across Medical, Sports, Library, and Academic records simultaneously using natural language.
          </p>
        </div>
        <button onClick={handleIndexData} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold border border-white/10 transition-colors">
          Run Vector Indexing
        </button>
      </div>

      <div className="bg-background-card rounded-xl border border-white/5 p-4 mb-8 flex gap-3 shadow-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input 
            type="text" 
            className="w-full bg-background-primary border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-aspis-blue/50"
            placeholder="e.g. Find students with high BMI who are also engaged in Drama club..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button 
          onClick={handleSearch}
          disabled={isSearching}
          className="bg-aspis-academic hover:bg-aspis-academic/80 text-white px-8 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
        >
          {isSearching ? "Searching Space..." : "Query Intelligence"}
        </button>
      </div>

      {results && (
        <div className="space-y-6">
          <div className="bg-aspis-academic/10 border border-aspis-academic/30 rounded-xl p-5 shadow-[0_0_15px_rgba(156,126,242,0.1)]">
            <h3 className="text-aspis-academic font-bold flex items-center gap-2 mb-2 uppercase tracking-widest text-xs">
              <Sparkles className="w-4 h-4" /> AI OS Synthesis
            </h3>
            <p className="text-white/90 text-sm leading-relaxed">{results.llm_synthesis}</p>
          </div>

          <h3 className="text-white font-semibold mb-4 border-b border-white/10 pb-2">Vector Search Hits (Cross-Department)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.hits.map((hit, idx) => (
              <div key={idx} className="bg-background-card p-4 rounded-xl border border-white/5 hover:border-white/20 transition-all flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {getDepartmentIcon(hit.payload.department)}
                    <div>
                      <div className="text-white font-bold text-sm">{getStudentName(hit.payload.student_id)}</div>
                      <div className="text-text-muted text-[10px] uppercase tracking-wider">{hit.payload.department} Dept</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono bg-background-primary px-2 py-1 rounded text-text-secondary border border-white/5">
                    Match: {(hit.score * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-sm text-text-secondary mt-1 line-clamp-3">
                  "{hit.payload.content}"
                </div>
              </div>
            ))}
            {results.hits.length === 0 && (
              <div className="col-span-2 text-center py-10 text-text-muted">No semantic matches found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
