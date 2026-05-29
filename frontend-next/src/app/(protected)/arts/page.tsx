"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Palette, Mic, Camera, Music, Search, Check, Sparkles, BookOpen, Plus, Save, ChevronRight, Activity, Award, Users, Book } from 'lucide-react';
import { STUDENTS, Student } from '@/data/mockData';

// Data Interfaces
interface PortfolioLog {
  date: string;
  title: string;
  type: string;
}

interface ArtsRecord {
  studentId: string;
  primaryDiscipline: string;
  clubParticipation: string;
  creativityScore: number;
  techniqueScore: number;
  expressionScore: number;
  portfolioLogs: PortfolioLog[];
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

interface LibraryRecord {
  studentId: string;
  favoriteGenres: string;
}

const COMPETENCY_MAP: Record<string, [string, string, string]> = {
  "Visual Arts (Drawing, Painting)": ["Creativity", "Technique", "Expression"],
  "Music (Vocal, Instrumental)": ["Pitch/Rhythm", "Technique", "Musicality"],
  "Drama / Theater": ["Stage Presence", "Voice", "Emotion"],
  "Dance": ["Rhythm", "Flexibility", "Choreography"],
  "Digital Media": ["Technical Skill", "Creativity", "Storytelling"],
  "Creative Writing": ["Vocabulary", "Structure", "Originality"],
  "Public Speaking / Speech": ["Articulation", "Confidence", "Persuasion"],
  "NCC (National Cadet Corps)": ["Discipline", "Leadership", "Endurance"],
  "Scouts & Guides": ["Survival Skills", "Teamwork", "Initiative"],
};

const DEMO_DATA: ArtsRecord[] = [
  {
    studentId: "s1",
    primaryDiscipline: "Visual Arts",
    clubParticipation: "Art Club",
    creativityScore: 92,
    techniqueScore: 88,
    expressionScore: 95,
    portfolioLogs: [
      { date: "2026-03-15", title: "Spring Art Exhibition", type: "Artwork" }
    ],
    notes: "Exceptional use of color.",
    updatedBy: "K. Rao",
    updatedAt: new Date().toISOString(),
  },
  {
    studentId: "s2",
    primaryDiscipline: "Music",
    clubParticipation: "Choir",
    creativityScore: 85,
    techniqueScore: 90,
    expressionScore: 82,
    portfolioLogs: [
      { date: "2026-04-10", title: "Solo Vocal Performance", type: "Performance" }
    ],
    notes: "Strong vocal control.",
    updatedBy: "K. Rao",
    updatedAt: new Date().toISOString(),
  },
  {
    studentId: "s3",
    primaryDiscipline: "Drama",
    clubParticipation: "Drama Club",
    creativityScore: 98,
    techniqueScore: 85,
    expressionScore: 100,
    portfolioLogs: [
      { date: "2026-05-01", title: "School Play Lead", type: "Performance" }
    ],
    notes: "Outstanding stage presence.",
    updatedBy: "K. Rao",
    updatedAt: new Date().toISOString(),
  },
  {
    studentId: "s4",
    primaryDiscipline: "Digital Media",
    clubParticipation: "None",
    creativityScore: 75,
    techniqueScore: 80,
    expressionScore: 70,
    portfolioLogs: [],
    notes: "Developing skills in video editing.",
    updatedBy: "K. Rao",
    updatedAt: new Date().toISOString(),
  },
  {
    studentId: "s5",
    primaryDiscipline: "Dance",
    clubParticipation: "Dance Troupe",
    creativityScore: 88,
    techniqueScore: 92,
    expressionScore: 85,
    portfolioLogs: [
      { date: "2026-02-20", title: "Inter-school Dance Comp", type: "Performance" }
    ],
    notes: "Great rhythm and coordination.",
    updatedBy: "K. Rao",
    updatedAt: new Date().toISOString(),
  },
  {
    studentId: "s6",
    primaryDiscipline: "Creative Writing",
    clubParticipation: "Literary Society",
    creativityScore: 95,
    techniqueScore: 85,
    expressionScore: 90,
    portfolioLogs: [
      { date: "2026-05-15", title: "Poetry Slam Winner", type: "Literature" }
    ],
    notes: "Profound poetic expression.",
    updatedBy: "K. Rao",
    updatedAt: new Date().toISOString(),
  }
];

export default function ArtsDashboard() {
  const [artsRecords, setArtsRecords] = useState<Record<string, ArtsRecord>>({});
  const [libraryRecords, setLibraryRecords] = useState<Record<string, LibraryRecord>>({});
  
  const [searchClass, setSearchClass] = useState("");
  const [searchGR, setSearchGR] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Form State for selected student
  const [editRecord, setEditRecord] = useState<ArtsRecord | null>(null);
  
  // New Portfolio Log state
  const [newLogTitle, setNewLogTitle] = useState("");
  const [newLogType, setNewLogType] = useState("Performance");
  const [newLogDate, setNewLogDate] = useState("");

  useEffect(() => {
    // Load Arts Records from API
    fetch("http://localhost:8000/api/arts")
      .then(res => res.json())
      .then(data => {
        if (Object.keys(data).length > 0) {
          setArtsRecords(data);
        } else {
          const initialMap: Record<string, ArtsRecord> = {};
          DEMO_DATA.forEach(r => {
            initialMap[r.studentId] = r;
            // Seed the backend
            fetch(`http://localhost:8000/api/arts/${r.studentId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(r)
            });
          });
          setArtsRecords(initialMap);
        }
      })
      .catch(err => console.error("Failed to fetch arts records from API:", err));

    // Load Library Records (Still local storage for now until we migrate it next)
    const savedLibrary = localStorage.getItem("aspis_library_records_v2");
    if (savedLibrary) {
      try {
        const parsed = JSON.parse(savedLibrary);
        if (Array.isArray(parsed)) {
          const libMap: Record<string, LibraryRecord> = {};
          parsed.forEach(r => libMap[r.studentId] = r);
          setLibraryRecords(libMap);
        } else {
          setLibraryRecords(parsed);
        }
      } catch (e) {
        console.error("Failed to parse library records", e);
      }
    }
  }, []);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (artsRecords[studentId]) {
      setEditRecord({ ...artsRecords[studentId] });
    } else {
      setEditRecord({
        studentId,
        primaryDiscipline: "Visual Arts",
        clubParticipation: "None",
        creativityScore: 50,
        techniqueScore: 50,
        expressionScore: 50,
        portfolioLogs: [],
        notes: "",
        updatedBy: "K. Rao",
        updatedAt: new Date().toISOString()
      });
    }
    setNewLogTitle("");
    setNewLogType("Performance");
    setNewLogDate(new Date().toISOString().split('T')[0]);
  };

  const handleSave = () => {
    if (!editRecord || !selectedStudentId) return;
    
    const newRecord = { ...editRecord, updatedAt: new Date().toISOString() };
    const newRecords = { ...artsRecords, [selectedStudentId]: newRecord };
    
    setArtsRecords(newRecords);
    
    // Save to API
    fetch(`http://localhost:8000/api/arts/${selectedStudentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord)
    }).catch(err => console.error("Failed to save to API:", err));
  };

  const handleAddLog = () => {
    if (!editRecord || !newLogTitle || !newLogDate) return;
    setEditRecord({
      ...editRecord,
      portfolioLogs: [
        ...editRecord.portfolioLogs,
        { title: newLogTitle, type: newLogType, date: newLogDate }
      ]
    });
    setNewLogTitle("");
  };

  // KPIs
  const kpis = useMemo(() => {
    let activeCreatives = 0;
    let eliteArtists = 0;
    let totalCreativity = 0;
    let totalLogs = 0;
    
    const records = Object.values(artsRecords);
    if (records.length === 0) return { activeCreatives: 0, eliteArtists: 0, avgCreativity: 0, upcomingLogs: 0 };

    records.forEach(r => {
      if (r.clubParticipation !== "None") activeCreatives++;
      const avgScore = (r.creativityScore + r.techniqueScore + r.expressionScore) / 3;
      if (avgScore > 85) eliteArtists++;
      totalCreativity += r.creativityScore;
      totalLogs += r.portfolioLogs.length;
    });

    return {
      activeCreatives,
      eliteArtists,
      avgCompetency: records.length ? Math.round(totalCreativity / records.length) : 0,
      totalLogs
    };
  }, [artsRecords]);

  // Filtering
  const filteredStudents = useMemo(() => {
    return STUDENTS.filter(s => {
      const matchClass = s.grade.toLowerCase().includes(searchClass.toLowerCase()) || 
                         s.section.toLowerCase().includes(searchClass.toLowerCase());
      const matchGR = s.roll.toLowerCase().includes(searchGR.toLowerCase());
      return matchClass && matchGR;
    });
  }, [searchClass, searchGR]);

  // Helper for generating AI Insight
  const generateAIInsight = (arts: ArtsRecord, library?: LibraryRecord) => {
    const avg = (arts.creativityScore + arts.techniqueScore + arts.expressionScore) / 3;
    let base = "Shows standard creative engagement.";
    if (avg > 85) base = `Exceptional talent in ${arts.primaryDiscipline} with high expressive capabilities.`;
    else if (avg > 70) base = `Strong developing skills in ${arts.primaryDiscipline}.`;
    
    if (library?.favoriteGenres) {
      const genres = library.favoriteGenres;
      return `${base} Their avid interest in ${genres} reading themes provides a rich foundation for conceptual depth in their art.`;
    }
    return `${base} Integrating more diverse reading habits could further inspire their creative output.`;
  };

  const getAvatarColor = (studentId: string) => {
    const r = artsRecords[studentId];
    if (!r) return "bg-background-card border-white/10 text-text-secondary";
    const avg = (r.creativityScore + r.techniqueScore + r.expressionScore) / 3;
    if (avg > 85) return "bg-[var(--aspis-academic)]/20 border-[var(--aspis-academic)] text-[var(--aspis-academic)]";
    if (avg > 50) return "bg-[var(--aspis-blue)]/20 border-[var(--aspis-blue)] text-[var(--aspis-blue)]";
    return "bg-[var(--risk-medium)]/20 border-[var(--risk-medium)] text-[var(--risk-medium)]";
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary p-6 font-sans">
      {/* Header */}
      <header className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-background-glass rounded-xl border border-white/5 shadow-sm">
          <Palette className="w-8 h-8 text-[var(--aspis-academic)]" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
            Extracurricular Portfolio <Sparkles className="w-5 h-5 text-[var(--aspis-blue)]" />
          </h1>
          <p className="text-text-secondary mt-1">Track extracurricular development, manage clubs, and generate AI creative profiles.</p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-background-card rounded-xl border border-white/5 p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--aspis-blue)] opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary font-medium">Active Creatives</span>
            <Users className="w-4 h-4 text-[var(--aspis-blue)]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{kpis.activeCreatives}</span>
            <span className="text-xs text-text-muted">in clubs</span>
          </div>
        </div>
        <div className="bg-background-card rounded-xl border border-white/5 p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--aspis-academic)] opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary font-medium">Elite Artists</span>
            <Award className="w-4 h-4 text-[var(--aspis-academic)]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{kpis.eliteArtists}</span>
            <span className="text-xs text-text-muted">&gt;85 avg score</span>
          </div>
        </div>
        <div className="bg-background-card rounded-xl border border-white/5 p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--aspis-behavioral)] opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary font-medium">Avg Competency</span>
            <Activity className="w-4 h-4 text-[var(--aspis-behavioral)]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{kpis.avgCompetency}</span>
            <span className="text-xs text-text-muted">/ 100</span>
          </div>
        </div>
        <div className="bg-background-card rounded-xl border border-white/5 p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--risk-low)] opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary font-medium">Portfolio Logs</span>
            <Book className="w-4 h-4 text-[var(--risk-low)]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{kpis.totalLogs}</span>
            <span className="text-xs text-text-muted">entries</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-280px)] min-h-[600px]">
        {/* Left Column - Student List */}
        <div className="w-full lg:w-[40%] flex flex-col gap-4 bg-background-glass border border-white/5 rounded-2xl p-4 overflow-hidden">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search Class/Section (e.g. 10 A)..."
                className="w-full bg-background-primary border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-[var(--aspis-blue)] transition-colors"
                value={searchClass}
                onChange={(e) => setSearchClass(e.target.value)}
              />
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search GR Number..."
                className="w-full bg-background-primary border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-[var(--aspis-blue)] transition-colors"
                value={searchGR}
                onChange={(e) => setSearchGR(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {filteredStudents.map(student => {
              const isSelected = selectedStudentId === student.id;
              const record = artsRecords[student.id];
              return (
                <div 
                  key={student.id}
                  onClick={() => handleSelectStudent(student.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-4 hover:bg-white/5
                    ${isSelected ? 'bg-white/5 border-white/20 shadow-md' : 'border-white/5 bg-background-card'}`}
                >
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm ${getAvatarColor(student.id)}`}>
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{student.name}</h3>
                    <p className="text-xs text-text-secondary">Class {student.grade} {student.section} • GR: {student.roll}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {record ? (
                        <>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--aspis-academic)]/10 text-[var(--aspis-academic)] border border-[var(--aspis-academic)]/20 truncate max-w-[100px]">
                            {record.primaryDiscipline}
                          </span>
                          {record.clubParticipation !== "None" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--aspis-blue)]/10 text-[var(--aspis-blue)] border border-[var(--aspis-blue)]/20 truncate max-w-[100px]">
                              {record.clubParticipation}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-text-muted border border-white/10">No Arts Data</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-text-muted'}`} />
                </div>
              );
            })}
            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-text-muted text-sm">
                No students found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Detail/Edit Panel */}
        <div className="w-full lg:w-[60%] bg-background-card border border-white/5 rounded-2xl flex flex-col overflow-hidden relative">
          {selectedStudentId && editRecord ? (
            <>
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    Creative Profile
                    <Sparkles className="w-4 h-4 text-[var(--aspis-academic)]" />
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">Update metrics, log portfolio items, and view insights.</p>
                </div>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--aspis-blue)] hover:bg-[var(--aspis-blue)]/90 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-[var(--aspis-blue)]/20"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                
                {/* AI Insight & Library Cross-Reference */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-[var(--aspis-academic)]/10 to-transparent border border-[var(--aspis-academic)]/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[var(--aspis-academic)]/20 rounded-lg flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-[var(--aspis-academic)]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-[var(--aspis-academic)] mb-1">AI Creative Insight</h3>
                        <p className="text-sm text-text-primary leading-relaxed">
                          {generateAIInsight(editRecord, libraryRecords[selectedStudentId])}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                    <div className="flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-text-secondary">Library Profile (Cross-Reference)</h4>
                      {libraryRecords[selectedStudentId]?.favoriteGenres ? (
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          {libraryRecords[selectedStudentId].favoriteGenres.split(',').map((g, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--aspis-behavioral)]/10 text-[var(--aspis-behavioral)] border border-[var(--aspis-behavioral)]/20">
                              {g.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted mt-1 italic">Reading profile pending from Library Portal.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2 border-b border-white/5 pb-2">
                      <Palette className="w-4 h-4 text-text-secondary" /> Discipline & Engagement
                    </h3>
                    
                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5">Primary Discipline</label>
                      <select 
                        className="w-full bg-background-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--aspis-blue)]"
                        value={editRecord.primaryDiscipline}
                        onChange={e => setEditRecord({...editRecord, primaryDiscipline: e.target.value})}
                      >
                        <option>Visual Arts (Drawing, Painting)</option>
                        <option>Music (Vocal, Instrumental)</option>
                        <option>Drama / Theater</option>
                        <option>Dance</option>
                        <option>Digital Media</option>
                        <option>Creative Writing</option>
                        <option>Public Speaking / Speech</option>
                        <option>NCC (National Cadet Corps)</option>
                        <option>Scouts & Guides</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5">Club Participation</label>
                      <select 
                        className="w-full bg-background-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--aspis-blue)]"
                        value={editRecord.clubParticipation}
                        onChange={e => setEditRecord({...editRecord, clubParticipation: e.target.value})}
                      >
                        <option>None</option>
                        <option>Art Club</option>
                        <option>Choir</option>
                        <option>Drama Club</option>
                        <option>Dance Troupe</option>
                        <option>Literary Society</option>
                        <option>Photography Club</option>
                        <option>Debate Club</option>
                        <option>Model UN</option>
                        <option>NCC Cadets</option>
                        <option>Scouts / Guides Platoon</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2 border-b border-white/5 pb-2">
                      <Activity className="w-4 h-4 text-text-secondary" /> Core Competencies
                    </h3>
                    
                    {(() => {
                      const labels = COMPETENCY_MAP[editRecord.primaryDiscipline] || ["Core Skill 1", "Core Skill 2", "Core Skill 3"];
                      return [
                        { label: labels[0], key: "creativityScore" as const, val: editRecord.creativityScore, color: "var(--aspis-academic)" },
                        { label: labels[1], key: "techniqueScore" as const, val: editRecord.techniqueScore, color: "var(--aspis-blue)" },
                        { label: labels[2], key: "expressionScore" as const, val: editRecord.expressionScore, color: "var(--aspis-behavioral)" }
                      ].map(metric => (
                        <div key={metric.key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-text-secondary">{metric.label}</span>
                            <span className="text-white font-medium">{metric.val}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="1" max="100" 
                            value={metric.val}
                            onChange={(e) => setEditRecord({...editRecord, [metric.key]: parseInt(e.target.value)})}
                            className="w-full h-1.5 bg-background-primary rounded-lg appearance-none cursor-pointer accent-[var(--aspis-blue)]"
                            style={{ accentColor: metric.color }}
                          />
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Portfolio Logs */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Camera className="w-4 h-4 text-text-secondary" /> Portfolio Entries
                  </h3>
                  
                  <div className="bg-background-primary border border-white/5 rounded-xl p-3 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[10px] text-text-muted mb-1 uppercase tracking-wider">Entry Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Spring Art Show"
                        className="w-full bg-background-card border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--aspis-blue)]"
                        value={newLogTitle}
                        onChange={e => setNewLogTitle(e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] text-text-muted mb-1 uppercase tracking-wider">Type</label>
                      <select 
                        className="w-full bg-background-card border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--aspis-blue)]"
                        value={newLogType}
                        onChange={e => setNewLogType(e.target.value)}
                      >
                        <option>Artwork</option>
                        <option>Performance</option>
                        <option>Literature</option>
                        <option>Media</option>
                        <option>Leadership</option>
                        <option>Competition</option>
                        <option>Community Service</option>
                      </select>
                    </div>
                    <div className="w-36">
                      <label className="block text-[10px] text-text-muted mb-1 uppercase tracking-wider">Date</label>
                      <input 
                        type="date" 
                        className="w-full bg-background-card border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--aspis-blue)] [color-scheme:dark]"
                        value={newLogDate}
                        onChange={e => setNewLogDate(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handleAddLog}
                      disabled={!newLogTitle || !newLogDate}
                      className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 h-[34px]"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>

                  <div className="space-y-2 mt-4">
                    {editRecord.portfolioLogs.length === 0 ? (
                      <p className="text-sm text-text-muted italic text-center py-4 bg-white/[0.02] rounded-xl border border-white/5">No portfolio entries logged yet.</p>
                    ) : (
                      editRecord.portfolioLogs.slice().reverse().map((log, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-md text-text-secondary flex-shrink-0">
                              {log.type === "Artwork" ? <Palette className="w-4 h-4" /> : 
                               log.type === "Performance" ? <Mic className="w-4 h-4" /> : 
                               log.type === "Literature" ? <Book className="w-4 h-4" /> : 
                               <Camera className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{log.title}</p>
                              <p className="text-xs text-text-muted">{log.type}</p>
                            </div>
                          </div>
                          <span className="text-xs text-text-secondary font-mono bg-background-primary px-2 py-1 rounded">{log.date}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white border-b border-white/5 pb-2">Instructor Notes</label>
                  <textarea 
                    rows={3}
                    className="w-full bg-background-primary border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--aspis-blue)] resize-none"
                    placeholder="Add specific notes or observations about the student's creative progress..."
                    value={editRecord.notes}
                    onChange={e => setEditRecord({...editRecord, notes: e.target.value})}
                  />
                  <div className="flex justify-end text-xs text-text-muted">
                    Last updated by: {editRecord.updatedBy} • {new Date(editRecord.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-6">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Palette className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-lg text-white font-medium mb-1">No Student Selected</p>
              <p className="text-sm text-center max-w-sm">Select a student from the list on the left to view and edit their creative profile and portfolio entries.</p>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
