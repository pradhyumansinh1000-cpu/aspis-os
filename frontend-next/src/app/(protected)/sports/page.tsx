"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { STUDENTS, Student } from '@/data/mockData';
import { 
  Trophy, Activity, Target, AlertTriangle, 
  Search, Check, Dumbbell, Flame, TrendingUp,
  Plus
} from 'lucide-react';

interface FitnessLog {
  date: string;
  testName: string; // e.g. "Beep Test", "Pushups", "100m Sprint"
  score: string;
}

interface SportsRecord {
  studentId: string;
  primarySport: string;
  teamParticipation: string; // e.g., "Varsity Basketball", "None"
  staminaScore: number; // 1-100
  strengthScore: number; // 1-100
  agilityScore: number; // 1-100
  fitnessLogs: FitnessLog[];
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

// For cross-referencing
interface HealthRecord {
  studentId: string;
  bmi: string;
  vision: string;
}

const SPORTS_STORAGE_KEY = "aspis_sports_records";
const HEALTH_STORAGE_KEY = "aspis_health_records_v2";

const DEMO_SPORTS_DATA: SportsRecord[] = [
  {
    studentId: "s1",
    primarySport: "Basketball",
    teamParticipation: "Varsity Basketball",
    staminaScore: 88,
    strengthScore: 75,
    agilityScore: 92,
    fitnessLogs: [{ date: "2026-05-10", testName: "Beep Test", score: "Level 12" }],
    notes: "Excellent agility, needs more strength training.",
    updatedBy: "Vikram Singh",
    updatedAt: new Date().toISOString()
  },
  {
    studentId: "s2",
    primarySport: "Track & Field",
    teamParticipation: "Varsity Sprinting",
    staminaScore: 95,
    strengthScore: 85,
    agilityScore: 90,
    fitnessLogs: [{ date: "2026-05-12", testName: "100m Sprint", score: "11.2s" }],
    notes: "Top performer in track events.",
    updatedBy: "Vikram Singh",
    updatedAt: new Date().toISOString()
  },
  {
    studentId: "s3",
    primarySport: "Swimming",
    teamParticipation: "Junior Varsity",
    staminaScore: 82,
    strengthScore: 70,
    agilityScore: 65,
    fitnessLogs: [{ date: "2026-05-15", testName: "50m Freestyle", score: "28.5s" }],
    notes: "Good stamina, needs to work on turn agility.",
    updatedBy: "Vikram Singh",
    updatedAt: new Date().toISOString()
  },
  {
    studentId: "s4",
    primarySport: "None",
    teamParticipation: "None",
    staminaScore: 35,
    strengthScore: 40,
    agilityScore: 45,
    fitnessLogs: [],
    notes: "Needs encouragement to participate in physical activities.",
    updatedBy: "Vikram Singh",
    updatedAt: new Date().toISOString()
  },
  {
    studentId: "s5",
    primarySport: "Soccer",
    teamParticipation: "Varsity Soccer",
    staminaScore: 90,
    strengthScore: 78,
    agilityScore: 88,
    fitnessLogs: [{ date: "2026-05-18", testName: "Cooper Test", score: "2800m" }],
    notes: "Strong endurance and team player.",
    updatedBy: "Vikram Singh",
    updatedAt: new Date().toISOString()
  },
  {
    studentId: "s6",
    primarySport: "Badminton",
    teamParticipation: "Intramural",
    staminaScore: 60,
    strengthScore: 50,
    agilityScore: 75,
    fitnessLogs: [],
    notes: "Quick reflexes, average stamina.",
    updatedBy: "Vikram Singh",
    updatedAt: new Date().toISOString()
  }
];

export default function SportsPage() {
  const [sportsRecords, setSportsRecords] = useState<Record<string, SportsRecord>>({});
  const [healthRecords, setHealthRecords] = useState<Record<string, HealthRecord>>({});
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [grNumberFilter, setGrNumberFilter] = useState("");

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Load Sports Data
    fetch("http://localhost:8000/api/sports")
      .then(res => res.json())
      .then(data => {
        const parsed = Object.values(data) as SportsRecord[];
        if (parsed.length > 0) {
          const recordsMap: Record<string, SportsRecord> = {};
          parsed.forEach((r: SportsRecord) => recordsMap[r.studentId] = r);
          setSportsRecords(recordsMap);
        } else {
          const recordsMap: Record<string, SportsRecord> = {};
          DEMO_SPORTS_DATA.forEach(r => {
            recordsMap[r.studentId] = r;
            fetch(`http://localhost:8000/api/sports/${r.studentId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(r)
            });
          });
          setSportsRecords(recordsMap);
        }
      })
      .catch(err => console.error("Failed to fetch sports records from API:", err));

    // Load Health Data
    const storedHealth = localStorage.getItem(HEALTH_STORAGE_KEY);
    if (storedHealth) {
      try {
        const parsed = JSON.parse(storedHealth);
        const hMap: Record<string, HealthRecord> = {};
        parsed.forEach((r: HealthRecord) => {
          hMap[r.studentId] = r;
        });
        setHealthRecords(hMap);
      } catch (e) {
        console.error("Failed to parse health records", e);
      }
    }
  }, []);

  const saveSportsRecords = (newRecordsMap: Record<string, SportsRecord>, updatedRecord?: SportsRecord) => {
    setSportsRecords(newRecordsMap);
    if (updatedRecord) {
      fetch(`http://localhost:8000/api/sports/${updatedRecord.studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord)
      }).catch(err => console.error("Failed to save sports record to API:", err));
    }
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const records = Object.values(sportsRecords);
    const activeAthletes = records.filter(r => r.teamParticipation && r.teamParticipation !== "None").length;
    const elitePerformers = records.filter(r => ((r.staminaScore + r.strengthScore + r.agilityScore) / 3) > 85).length;
    const avgStamina = records.length > 0 ? Math.round(records.reduce((acc, r) => acc + r.staminaScore, 0) / records.length) : 0;
    const needsIntervention = records.filter(r => ((r.staminaScore + r.strengthScore + r.agilityScore) / 3) < 40).length;
    
    return { activeAthletes, elitePerformers, avgStamina, needsIntervention };
  }, [sportsRecords]);

  // Filtering
  const filteredStudents = useMemo(() => {
    return STUDENTS.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = classFilter ? student.grade === classFilter : true;
      const matchesSection = sectionFilter ? student.section === sectionFilter : true;
      const matchesGr = grNumberFilter ? student.roll.includes(grNumberFilter) : true;
      
      return matchesSearch && matchesClass && matchesSection && matchesGr;
    });
  }, [searchQuery, classFilter, sectionFilter, grNumberFilter]);

  const selectedStudent = STUDENTS.find(s => s.id === selectedStudentId);
  const selectedRecord = selectedStudentId ? sportsRecords[selectedStudentId] || {
    studentId: selectedStudentId,
    primarySport: "None",
    teamParticipation: "None",
    staminaScore: 50,
    strengthScore: 50,
    agilityScore: 50,
    fitnessLogs: [],
    notes: "",
    updatedBy: "Vikram Singh",
    updatedAt: new Date().toISOString()
  } : null;

  const selectedHealth = selectedStudentId ? healthRecords[selectedStudentId] : null;

  const handleSaveDetail = (updates: Partial<SportsRecord>) => {
    if (!selectedStudentId || !selectedRecord) return;
    const updatedRecord = { ...selectedRecord, ...updates, updatedAt: new Date().toISOString() };
    const newRecords = { ...sportsRecords, [selectedStudentId]: updatedRecord };
    saveSportsRecords(newRecords, updatedRecord);
  };

  const getAvatarColor = (record?: SportsRecord) => {
    if (!record) return "bg-background-glass text-text-secondary border-white/5";
    const avg = (record.staminaScore + record.strengthScore + record.agilityScore) / 3;
    if (avg > 85) return "bg-aspis-academic/20 text-aspis-academic border-aspis-academic/30";
    if (avg >= 50) return "bg-risk-low/20 text-risk-low border-risk-low/30";
    return "bg-risk-medium/20 text-risk-medium border-risk-medium/30";
  };

  const generateAIProfile = (record: SportsRecord, health: HealthRecord | null | undefined) => {
    const avg = (record.staminaScore + record.strengthScore + record.agilityScore) / 3;
    const bmiVal = health ? parseFloat(health.bmi) : null;
    let bmiStr = "";
    
    if (bmiVal) {
      if (bmiVal < 18.5) bmiStr = "a lower BMI";
      else if (bmiVal < 25) bmiStr = "a healthy BMI";
      else bmiStr = "a higher BMI";
    } else {
      bmiStr = "unknown BMI";
    }

    if (avg > 85) {
      return `Outstanding physical conditioning. High strength and agility combined with ${bmiStr} indicates strong potential for advanced varsity competition. Recommended for elite training programs.`;
    } else if (avg > 60) {
      return `Solid athletic foundation. Consistent performance across stamina and strength metrics with ${bmiStr}. Focus on specialized drills to elevate to varsity level.`;
    } else if (avg >= 40) {
      return `Average physical metrics with ${bmiStr}. Potential for improvement in stamina and agility. Recommended regular intramural participation.`;
    } else {
      return `Below average athletic metrics coupled with ${bmiStr}. Needs immediate intervention focusing on foundational stamina and strength building. Monitor closely.`;
    }
  };

  if (!isClient) return null; // Avoid hydration mismatch

  return (
    <div className="min-h-screen bg-background-primary text-text-primary p-6 font-sans">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-3 bg-aspis-blue/20 rounded-lg border border-aspis-blue/30">
          <Trophy className="w-8 h-8 text-aspis-blue" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Athletics & Physical Education</h1>
          <p className="text-text-secondary mt-1">Track physical fitness, manage team rosters, and generate AI athletic profiles.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-background-card border border-white/5 rounded-xl p-5 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-aspis-blue" />
          <span className="text-text-muted text-sm font-medium mb-2 flex items-center"><Activity className="w-4 h-4 mr-2" /> Active Athletes</span>
          <span className="text-3xl font-bold text-white">{kpis.activeAthletes}</span>
        </div>
        
        <div className="bg-background-card border border-white/5 rounded-xl p-5 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-aspis-academic" />
          <span className="text-text-muted text-sm font-medium mb-2 flex items-center"><Trophy className="w-4 h-4 mr-2" /> Elite Performers</span>
          <span className="text-3xl font-bold text-white">{kpis.elitePerformers}</span>
        </div>
        
        <div className="bg-background-card border border-white/5 rounded-xl p-5 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-risk-low" />
          <span className="text-text-muted text-sm font-medium mb-2 flex items-center"><TrendingUp className="w-4 h-4 mr-2" /> Class Stamina Avg</span>
          <span className="text-3xl font-bold text-white">{kpis.avgStamina}</span>
        </div>
        
        <div className="bg-background-card border border-white/5 rounded-xl p-5 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-risk-high" />
          <span className="text-text-muted text-sm font-medium mb-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Needs Intervention</span>
          <span className="text-3xl font-bold text-white">{kpis.needsIntervention}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Student List */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          <div className="bg-background-card border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search students..." 
                className="w-full bg-background-primary border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-aspis-blue transition-colors"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Class" 
                className="w-1/3 bg-background-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-aspis-blue"
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Sec" 
                className="w-1/3 bg-background-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-aspis-blue"
                value={sectionFilter}
                onChange={e => setSectionFilter(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="GR No." 
                className="w-1/3 bg-background-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-aspis-blue"
                value={grNumberFilter}
                onChange={e => setGrNumberFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-background-card border border-white/5 rounded-xl p-2 h-[600px] overflow-y-auto custom-scrollbar">
            {filteredStudents.map(student => {
              const record = sportsRecords[student.id];
              const isSelected = selectedStudentId === student.id;
              const avgScore = record ? Math.round((record.staminaScore + record.strengthScore + record.agilityScore) / 3) : 0;
              
              return (
                <div 
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`p-3 rounded-lg flex items-center gap-4 cursor-pointer transition-colors border ${isSelected ? 'bg-background-primary border-aspis-blue/50' : 'border-transparent hover:bg-background-primary/50'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border ${getAvatarColor(record)}`}>
                    {avgScore > 0 ? avgScore : '--'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{student.name}</h3>
                    <p className="text-xs text-text-secondary">Grade {student.grade}-{student.section} • {student.roll}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {record?.primarySport && record.primarySport !== "None" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-aspis-blue/10 text-aspis-blue border border-aspis-blue/20">
                          {record.primarySport}
                        </span>
                      )}
                      {avgScore > 85 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-aspis-academic/10 text-aspis-academic border border-aspis-academic/20">
                          Elite
                        </span>
                      )}
                      {avgScore > 0 && avgScore < 40 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-risk-medium/10 text-risk-medium border border-risk-medium/20">
                          Support
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-text-muted">
                No students found matching filters.
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Detail/Edit Panel */}
        <div className="w-full lg:w-3/5">
          {selectedStudent && selectedRecord ? (
            <div className="bg-background-card border border-white/5 rounded-xl flex flex-col h-[716px] overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-start bg-background-card/50">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedStudent.name}</h2>
                  <p className="text-text-secondary mt-1">Grade {selectedStudent.grade}-{selectedStudent.section} • GR: {selectedStudent.roll}</p>
                </div>
                <div className="text-right text-sm text-text-muted">
                  <p>Last updated</p>
                  <p className="text-white mt-0.5">{new Date(selectedRecord.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                
                {/* AI Computed Profile */}
                <div className="p-5 bg-aspis-blue/5 border border-aspis-blue/20 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-aspis-blue" />
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-aspis-blue" />
                    <h3 className="font-semibold text-aspis-blue text-sm uppercase tracking-wider">AI Athletic Profile</h3>
                  </div>
                  <p className="text-sm text-text-primary leading-relaxed">
                    {generateAIProfile(selectedRecord, selectedHealth)}
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Physical Metrics */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                      <Target className="w-4 h-4 text-text-muted" /> Team & Sport
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wide">Primary Sport</label>
                        <select 
                          className="w-full bg-background-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-aspis-blue transition-colors"
                          value={selectedRecord.primarySport}
                          onChange={(e) => handleSaveDetail({ primarySport: e.target.value })}
                        >
                          <option value="None">None</option>
                          <option value="Basketball">Basketball</option>
                          <option value="Track & Field">Track & Field</option>
                          <option value="Swimming">Swimming</option>
                          <option value="Soccer">Soccer</option>
                          <option value="Badminton">Badminton</option>
                          <option value="Tennis">Tennis</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wide">Team Participation</label>
                        <select 
                          className="w-full bg-background-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-aspis-blue transition-colors"
                          value={selectedRecord.teamParticipation}
                          onChange={(e) => handleSaveDetail({ teamParticipation: e.target.value })}
                        >
                          <option value="None">None</option>
                          <option value="Intramural">Intramural</option>
                          <option value="Junior Varsity">Junior Varsity</option>
                          <option value="Varsity">Varsity (Generic)</option>
                          <option value="Varsity Basketball">Varsity Basketball</option>
                          <option value="Varsity Sprinting">Varsity Sprinting</option>
                          <option value="Varsity Soccer">Varsity Soccer</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Health Integration */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                      <Activity className="w-4 h-4 text-text-muted" /> Health Integration
                    </h3>
                    
                    <div className="bg-background-primary border border-white/5 rounded-xl p-4 min-h-[140px] flex flex-col justify-center">
                      {selectedHealth ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-background-card p-3 rounded-lg border border-white/5">
                            <span className="text-sm text-text-secondary font-medium">BMI</span>
                            <span className={`text-sm font-bold px-2.5 py-1 rounded-md ${
                              parseFloat(selectedHealth.bmi) > 25 || parseFloat(selectedHealth.bmi) < 18.5 
                              ? 'bg-risk-medium/10 text-risk-medium border border-risk-medium/20' 
                              : 'bg-risk-low/10 text-risk-low border border-risk-low/20'
                            }`}>
                              {selectedHealth.bmi}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-background-card p-3 rounded-lg border border-white/5">
                            <span className="text-sm text-text-secondary font-medium">Vision</span>
                            <span className={`text-sm font-bold px-2.5 py-1 rounded-md ${
                              selectedHealth.vision !== "20/20" 
                              ? 'bg-risk-medium/10 text-risk-medium border border-risk-medium/20' 
                              : 'bg-risk-low/10 text-risk-low border border-risk-low/20'
                            }`}>
                              {selectedHealth.vision}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <div className="inline-block p-2 bg-white/5 rounded-full">
                            <Check className="w-4 h-4 text-text-muted" />
                          </div>
                          <p className="text-sm text-text-muted italic">Health data pending from Medical Portal</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Core Attributes */}
                <div className="space-y-5 pt-2">
                  <h3 className="font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Flame className="w-4 h-4 text-text-muted" /> Core Attributes
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: 'Stamina', key: 'staminaScore', color: 'accent-risk-low' },
                      { label: 'Strength', key: 'strengthScore', color: 'accent-aspis-academic' },
                      { label: 'Agility', key: 'agilityScore', color: 'accent-aspis-blue' }
                    ].map((attr) => (
                      <div key={attr.key} className="space-y-3 bg-background-primary p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-text-secondary font-medium">{attr.label}</span>
                          <span className="text-white font-bold bg-background-card px-2 py-1 rounded text-xs">{selectedRecord[attr.key as keyof SportsRecord] as number}/100</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="100" 
                          value={selectedRecord[attr.key as keyof SportsRecord] as number}
                          onChange={(e) => handleSaveDetail({ [attr.key]: parseInt(e.target.value) })}
                          className={`w-full h-2 bg-background-card rounded-lg cursor-pointer ${attr.color}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fitness Logs */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Dumbbell className="w-4 h-4 text-text-muted" /> Fitness Test Logs
                  </h3>
                  
                  <div className="bg-background-primary border border-white/5 rounded-xl p-5 space-y-5">
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const testName = formData.get('testName') as string;
                        const score = formData.get('score') as string;
                        const date = formData.get('date') as string;
                        if (testName && score && date) {
                          handleSaveDetail({
                            fitnessLogs: [...selectedRecord.fitnessLogs, { testName, score, date }]
                          });
                          e.currentTarget.reset();
                        }
                      }}
                      className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-background-card p-3 rounded-lg border border-white/5"
                    >
                      <div className="flex-1 min-w-[120px]">
                        <label className="block text-[10px] uppercase tracking-wide text-text-muted mb-1.5">Test Name</label>
                        <input name="testName" type="text" required placeholder="e.g. Beep Test" className="w-full bg-background-primary border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-aspis-blue transition-colors" />
                      </div>
                      <div className="w-full md:w-28">
                        <label className="block text-[10px] uppercase tracking-wide text-text-muted mb-1.5">Score</label>
                        <input name="score" type="text" required placeholder="e.g. Lvl 12" className="w-full bg-background-primary border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-aspis-blue transition-colors" />
                      </div>
                      <div className="w-full md:w-36">
                        <label className="block text-[10px] uppercase tracking-wide text-text-muted mb-1.5">Date</label>
                        <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-background-primary border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-aspis-blue transition-colors" />
                      </div>
                      <button type="submit" className="w-full md:w-auto bg-aspis-blue hover:bg-aspis-blue/90 text-white px-4 py-2 rounded-md transition-colors font-medium text-sm flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </form>

                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                      {selectedRecord.fitnessLogs.length === 0 ? (
                        <div className="text-center p-4 border border-dashed border-white/10 rounded-lg">
                          <p className="text-sm text-text-muted italic">No fitness logs recorded yet.</p>
                        </div>
                      ) : (
                        [...selectedRecord.fitnessLogs].reverse().map((log, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm p-3 bg-background-card hover:bg-white/[0.02] transition-colors border border-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                <Dumbbell className="w-4 h-4 text-text-muted" />
                              </div>
                              <div>
                                <span className="font-medium text-white block">{log.testName}</span>
                                <span className="text-xs text-text-muted">{log.date}</span>
                              </div>
                            </div>
                            <span className="bg-aspis-blue/10 text-aspis-blue font-medium px-3 py-1 rounded-md border border-aspis-blue/20">{log.score}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-background-card border border-white/5 rounded-xl h-[716px] flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-background-primary rounded-full flex items-center justify-center mb-6 border border-white/5">
                <Dumbbell className="w-10 h-10 text-text-muted" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No Student Selected</h2>
              <p className="text-text-secondary max-w-sm">Select a student from the list to view their physical metrics, fitness logs, and AI athletic profile.</p>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-risk-medium" /> Active Alerts & Flagged Students
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(sportsRecords).filter(r => r.staminaScore < 40).map(record => {
            const student = STUDENTS.find(s => s.id === record.studentId);
            if (!student) return null;
            return (
              <div key={`stamina-${record.studentId}`} className="bg-risk-medium/5 border border-risk-medium/20 rounded-xl p-4 flex gap-4 items-start hover:bg-risk-medium/10 transition-colors">
                <div className="p-2 bg-risk-medium/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-risk-medium" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">{student.name}</h4>
                  <p className="text-sm text-text-secondary mt-1">Low Stamina Score (<span className="text-risk-medium font-bold">{record.staminaScore}</span>). Recommend evaluation for foundational endurance building.</p>
                </div>
              </div>
            );
          })}
          {Object.entries(healthRecords).filter(([_, h]) => h.vision && h.vision !== "20/20").map(([id, h]) => {
            const student = STUDENTS.find(s => s.id === id);
            if (!student) return null;
            return (
              <div key={`vision-${id}`} className="bg-risk-high/5 border border-risk-high/20 rounded-xl p-4 flex gap-4 items-start hover:bg-risk-high/10 transition-colors">
                <div className="p-2 bg-risk-high/10 rounded-lg">
                  <Target className="w-5 h-5 text-risk-high" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">{student.name}</h4>
                  <p className="text-sm text-text-secondary mt-1">Vision flagged in medical (<span className="text-risk-high font-bold">{h.vision}</span>). May impact performance in precision sports.</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
