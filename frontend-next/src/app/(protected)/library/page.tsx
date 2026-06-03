"use client";

import React, { useState, useEffect } from "react";
import {
  Book,
  BookOpen,
  Clock,
  AlertTriangle,
  Search,
  Check,
  X,
  Library,
  Brain,
  Sparkles,
  User,
  GraduationCap,
  ChevronDown,
  Save,
} from "lucide-react";
import { STUDENTS, Student } from "@/data/mockData";

interface BorrowedBook {
  title: string;
  daysTaken: number;
  pages: number;
  genre: string;
}

interface LibraryRecord {
  studentId: string;
  currentlyBorrowed: string;
  overdueCount: number;
  readingLevel: "below_age" | "age_appropriate" | "advanced";
  favoriteGenres: string;
  readingSpeed: "slow" | "average" | "fast";
  borrowHistory: BorrowedBook[];
  aiRecommendation: string;
  lastVisitDate: string;
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

const STORAGE_KEY = "aspis_library_records_v2";

const DEMO_DATA: LibraryRecord[] = [
  {
    studentId: "s1",
    currentlyBorrowed: "Percy Jackson & The Lightning Thief",
    overdueCount: 1,
    readingLevel: "below_age",
    favoriteGenres: "Fantasy, Comic Books",
    readingSpeed: "slow",
    borrowHistory: [
      { title: "Diary of a Wimpy Kid", daysTaken: 14, pages: 221, genre: "Comic Books" },
      { title: "Harry Potter 1", daysTaken: 30, pages: 309, genre: "Fantasy" }
    ],
    aiRecommendation: "Suggest graphic novels on scientific concepts (like 'Science Comics: Solar System') to boost engagement in Science while accommodating current reading level.",
    lastVisitDate: "2026-05-15",
    notes: "Struggles with long text blocks. Enjoys visual storytelling.",
    updatedBy: "Meera Desai",
    updatedAt: "2026-05-27T10:00:00Z",
  },
  {
    studentId: "s2",
    currentlyBorrowed: "A Brief History of Time",
    overdueCount: 0,
    readingLevel: "advanced",
    favoriteGenres: "Science, Biographies, Science Fiction",
    readingSpeed: "fast",
    borrowHistory: [
      { title: "The Martian", daysTaken: 5, pages: 369, genre: "Science Fiction" },
      { title: "Steve Jobs", daysTaken: 7, pages: 656, genre: "Biographies" }
    ],
    aiRecommendation: "Provide advanced Trigonometry puzzles or applied mathematics in physics books to challenge her strengths.",
    lastVisitDate: "2026-05-25",
    notes: "Voracious reader. Can handle complex non-fiction.",
    updatedBy: "Meera Desai",
    updatedAt: "2026-05-26T14:30:00Z",
  },
  {
    studentId: "s3",
    currentlyBorrowed: "The Boy Who Harnessed the Wind",
    overdueCount: 2,
    readingLevel: "age_appropriate",
    favoriteGenres: "Sports, Biographies",
    readingSpeed: "average",
    borrowHistory: [
      { title: "Moneyball", daysTaken: 20, pages: 317, genre: "Sports" }
    ],
    aiRecommendation: "Recommend books on sports analytics or applied chemistry in everyday life to connect his sports interest with weak topics.",
    lastVisitDate: "2026-05-10",
    notes: "Needs frequent reminders to return books on time.",
    updatedBy: "Meera Desai",
    updatedAt: "2026-05-24T09:15:00Z",
  },
  {
    studentId: "s4",
    currentlyBorrowed: "The Diary of a Young Girl",
    overdueCount: 0,
    readingLevel: "advanced",
    favoriteGenres: "Historical Fiction, Mystery",
    readingSpeed: "fast",
    borrowHistory: [
      { title: "The Book Thief", daysTaken: 8, pages: 584, genre: "Historical Fiction" },
      { title: "Sherlock Holmes", daysTaken: 10, pages: 400, genre: "Mystery" }
    ],
    aiRecommendation: "Suggest mystery books that involve logical deduction and probability to help build analytical skills for Algebra.",
    lastVisitDate: "2026-05-22",
    notes: "Strong reader. Enjoys historical context.",
    updatedBy: "Meera Desai",
    updatedAt: "2026-05-23T11:45:00Z",
  },
  {
    studentId: "s5",
    currentlyBorrowed: "Astrophysics for People in a Hurry",
    overdueCount: 0,
    readingLevel: "age_appropriate",
    favoriteGenres: "Science, Chess Strategy",
    readingSpeed: "average",
    borrowHistory: [
      { title: "Bobby Fischer Teaches Chess", daysTaken: 15, pages: 334, genre: "Chess Strategy" }
    ],
    aiRecommendation: "Recommend practical application books connecting physics theory with numerical problem solving.",
    lastVisitDate: "2026-05-26",
    notes: "Very interested in physics. Sometimes skips the math parts.",
    updatedBy: "Meera Desai",
    updatedAt: "2026-05-27T08:20:00Z",
  },
  {
    studentId: "s6",
    currentlyBorrowed: "Dune",
    overdueCount: 0,
    readingLevel: "advanced",
    favoriteGenres: "Sci-Fi, Leadership, Sports",
    readingSpeed: "fast",
    borrowHistory: [
      { title: "Ender's Game", daysTaken: 6, pages: 324, genre: "Sci-Fi" },
      { title: "Shoe Dog", daysTaken: 5, pages: 400, genre: "Sports" }
    ],
    aiRecommendation: "Provide complex, multi-disciplinary texts that challenge her advanced comprehension.",
    lastVisitDate: "2026-05-27",
    notes: "Excellent reader. Borrows frequently.",
    updatedBy: "Meera Desai",
    updatedAt: "2026-05-27T12:00:00Z",
  }
];

export default function LibraryDashboard() {
  const [records, setRecords] = useState<LibraryRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<LibraryRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newLog, setNewLog] = useState({ title: "", pages: 200, daysTaken: 7, genre: "" });

  // Compute AI profile dynamically based on borrow history
  const computeAIProfile = (history: BorrowedBook[]) => {
    if (history.length === 0) return { speed: "average", level: "age_appropriate", genres: "None yet" };
    
    const totalPages = history.reduce((sum, b) => sum + b.pages, 0);
    const totalDays = history.reduce((sum, b) => sum + b.daysTaken, 0);
    const pagesPerDay = totalPages / (totalDays || 1);
    
    let speed = "average";
    if (pagesPerDay > 30) speed = "fast";
    if (pagesPerDay < 10) speed = "slow";
    
    let level = "age_appropriate";
    const avgPages = totalPages / history.length;
    if (avgPages > 350 && speed === "fast") level = "advanced";
    if (avgPages < 150 || speed === "slow") level = "below_age";

    const genreCounts: Record<string, number> = {};
    history.forEach(b => {
      genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
    });
    const genres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .join(", ");

    return { speed, level, genres };
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}"}` + "/api/library")
      .then(res => res.json())
      .then(data => {
        const parsed = Object.values(data) as LibraryRecord[];
        if (parsed.length > 0) {
          setRecords(parsed);
        } else {
          DEMO_DATA.forEach(r => {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/library/${r.studentId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(r)
            });
          });
          setRecords(DEMO_DATA);
        }
      })
      .catch(err => console.error("Failed to fetch library records from API:", err));
  }, []);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    const record = records.find(r => r.studentId === student.id);
    if (record) {
      setEditForm({ ...record });
    } else {
      // Create a blank record if missing
      setEditForm({
        studentId: student.id,
        currentlyBorrowed: "",
        overdueCount: 0,
        readingLevel: "age_appropriate",
        favoriteGenres: "",
        readingSpeed: "average",
        borrowHistory: [],
        aiRecommendation: "Analyze weak topics to generate reading recommendation.",
        lastVisitDate: new Date().toISOString().split("T")[0],
        notes: "",
        updatedBy: "Meera Desai",
        updatedAt: new Date().toISOString()
      });
    }
    setNewLog({ title: "", pages: 200, daysTaken: 7, genre: "" });
    setSaveSuccess(false);
  };

  const handleSave = () => {
    if (!editForm) return;

    const updatedRecord = {
      ...editForm,
      updatedAt: new Date().toISOString(),
      updatedBy: "Meera Desai"
    };

    const newRecords = records.map(r => 
      r.studentId === updatedRecord.studentId ? updatedRecord : r
    );

    // If new, push it (though in this demo we seed all 6)
    if (!records.find(r => r.studentId === updatedRecord.studentId)) {
      newRecords.push(updatedRecord);
    }

    setRecords(newRecords);
    
    // Save to API
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/library/${updatedRecord.studentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRecord)
    }).catch(err => console.error("Failed to save to API:", err));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAddLog = () => {
    if (!editForm || !newLog.title || !newLog.genre) return;
    const updatedHistory = [...editForm.borrowHistory, newLog];
    const aiComputed = computeAIProfile(updatedHistory);
    
    setEditForm({
      ...editForm,
      borrowHistory: updatedHistory,
      readingSpeed: aiComputed.speed as any,
      readingLevel: aiComputed.level as any,
      favoriteGenres: aiComputed.genres
    });
    setNewLog({ title: "", pages: 200, daysTaken: 7, genre: "" });
  };

  // Filter students exactly as requested
  const filteredStudents = STUDENTS.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll.includes(searchQuery);
    const matchesClass =
      selectedClass === "All Classes" || `${s.grade}${s.section}` === selectedClass;
    return matchesSearch && matchesClass;
  });

  // KPI Calculations
  const totalIssued = records.filter(r => r.currentlyBorrowed.trim() !== "").length;
  const totalOverdue = records.reduce((sum, r) => sum + (Number(r.overdueCount) || 0), 0);
  const advancedReaders = records.filter(r => r.readingLevel === "advanced").length;
  const recentVisits = records.filter(r => {
    const visitDate = new Date(r.lastVisitDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return visitDate >= thirtyDaysAgo;
  }).length;

  const getReadingLevelColor = (level: string) => {
    if (level === "advanced") return "text-aspis-academic bg-aspis-academic/10 border-aspis-academic/20";
    if (level === "age_appropriate") return "text-risk-low bg-risk-low/10 border-risk-low/20";
    return "text-risk-medium bg-risk-medium/10 border-risk-medium/20";
  };

  const getAvatarColor = (level: string) => {
    if (level === "advanced") return "bg-aspis-academic text-white";
    if (level === "age_appropriate") return "bg-risk-low text-white";
    return "bg-risk-medium text-white";
  };

  const formatLevelName = (level: string) => {
    return level.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const concerns = records.filter(r => r.overdueCount > 0 || r.readingLevel === "below_age").map(r => {
    const s = STUDENTS.find(st => st.id === r.studentId);
    return { record: r, student: s };
  }).filter(c => c.student !== undefined);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-aspis-blue/10 flex items-center justify-center">
          <Library className="w-5 h-5 text-aspis-blue" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Library & Reading Records</h1>
          <p className="text-sm text-text-secondary">
            Track student reading habits, manage borrowed books, and generate AI reading recommendations to support academic growth.
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-aspis-blue"></div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Books Issued</span>
              <BookOpen className="w-4 h-4 text-aspis-blue" />
            </div>
            <div className="text-2xl font-bold text-text-primary">{totalIssued}</div>
            <div className="text-xs text-text-muted mt-1">Currently borrowed by students</div>
          </div>
        </div>
        <div className="bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-risk-high"></div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Overdue Books</span>
              <Clock className="w-4 h-4 text-risk-high" />
            </div>
            <div className="text-2xl font-bold text-text-primary">{totalOverdue}</div>
            <div className="text-xs text-text-muted mt-1">Total books past due date</div>
          </div>
        </div>
        <div className="bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-aspis-academic"></div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Advanced Readers</span>
              <GraduationCap className="w-4 h-4 text-aspis-academic" />
            </div>
            <div className="text-2xl font-bold text-text-primary">{advancedReaders}</div>
            <div className="text-xs text-text-muted mt-1">Reading above grade level</div>
          </div>
        </div>
        <div className="bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-risk-low"></div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Library Visits</span>
              <User className="w-4 h-4 text-risk-low" />
            </div>
            <div className="text-2xl font-bold text-text-primary">{recentVisits}</div>
            <div className="text-xs text-text-muted mt-1">Visits in the last 30 days</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Student List */}
        <div className="lg:col-span-5 bg-background-card border border-white/5 rounded-md shadow-card flex flex-col h-[650px]">
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or GR number..."
                className="w-full bg-background-glass border border-white/10 text-xs text-text-primary pl-9 pr-3 py-2.5 rounded-sm outline-none focus:border-aspis-blue"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="w-full bg-background-glass border border-white/10 text-xs text-text-primary px-3 py-2.5 rounded-sm outline-none focus:border-aspis-blue appearance-none"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="All Classes">All Classes</option>
                <option value="9A">Class 9A</option>
                <option value="9B">Class 9B</option>
                <option value="10A">Class 10A</option>
                <option value="10B">Class 10B</option>
              </select>
              <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {filteredStudents.map((student) => {
              const record = records.find(r => r.studentId === student.id);
              const readingLevel = record?.readingLevel || "age_appropriate";
              const isSelected = selectedStudent?.id === student.id;

              return (
                <div
                  key={student.id}
                  onClick={() => handleStudentSelect(student)}
                  className={`p-3 rounded-md cursor-pointer transition-colors mb-1 flex items-center gap-3 border ${
                    isSelected
                      ? "bg-white/5 border-aspis-blue/50"
                      : "bg-transparent border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(readingLevel)}`}>
                    {student.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{student.name}</div>
                    <div className="text-xs text-text-muted">
                      {student.grade}{student.section} • Roll: {student.roll}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getReadingLevelColor(readingLevel)}`}>
                      {formatLevelName(readingLevel)}
                    </span>
                    {(record?.overdueCount || 0) > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border text-risk-high bg-risk-high/10 border-risk-high/20 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {record?.overdueCount} overdue
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column - Detail/Edit Panel */}
        <div className="lg:col-span-7 bg-background-card border border-white/5 rounded-md shadow-card flex flex-col h-[650px]">
          {selectedStudent && editForm ? (
            <>
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${getAvatarColor(editForm.readingLevel)}`}>
                    {selectedStudent.initials}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">{selectedStudent.name}</h2>
                    <p className="text-xs text-text-muted">Class {selectedStudent.grade}{selectedStudent.section} • Roll {selectedStudent.roll}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* Borrowing Status */}
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <Book className="w-4 h-4 text-aspis-blue" />
                    Borrowing Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-text-secondary mb-1">Currently Borrowed</label>
                      <input
                        type="text"
                        className="w-full bg-background-glass border border-white/10 text-sm text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue"
                        value={editForm.currentlyBorrowed}
                        onChange={(e) => setEditForm({...editForm, currentlyBorrowed: e.target.value})}
                        placeholder="e.g. Percy Jackson"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Overdue Count</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-background-glass border border-white/10 text-sm text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue"
                        value={editForm.overdueCount}
                        onChange={(e) => setEditForm({...editForm, overdueCount: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Last Visit Date</label>
                      <input
                        type="date"
                        className="w-full bg-background-glass border border-white/10 text-sm text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue"
                        value={editForm.lastVisitDate}
                        onChange={(e) => setEditForm({...editForm, lastVisitDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Reading Profile */}
                <div className="bg-gradient-to-br from-aspis-blue/10 to-transparent border border-aspis-blue/20 rounded-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-aspis-blue flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      AI Computed Reading Profile
                    </h3>
                    <span className="text-[10px] text-text-muted bg-black/20 px-2 py-0.5 rounded border border-white/5">Auto-calculated from logs</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-black/20 p-3 rounded border border-white/5">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Reading Level</div>
                      <div className={`text-xs font-bold ${getReadingLevelColor(editForm.readingLevel)} bg-transparent border-0 p-0`}>
                        {formatLevelName(editForm.readingLevel)}
                      </div>
                    </div>
                    <div className="bg-black/20 p-3 rounded border border-white/5">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Avg Speed</div>
                      <div className="text-xs font-bold text-text-primary capitalize">{editForm.readingSpeed}</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded border border-white/5">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Top Genres</div>
                      <div className="text-xs font-bold text-text-primary truncate">{editForm.favoriteGenres || "None"}</div>
                    </div>
                  </div>
                  
                  {/* Reading Log Addition */}
                  <div className="border-t border-aspis-blue/10 pt-3 mt-2">
                    <div className="text-xs font-medium text-text-secondary mb-2">Log returned book to update AI profile:</div>
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="Book Title" className="flex-1 bg-background-glass border border-white/10 text-xs text-text-primary p-2 rounded-sm outline-none focus:border-aspis-blue" value={newLog.title} onChange={e => setNewLog({...newLog, title: e.target.value})} />
                      <input type="text" placeholder="Genre" className="w-24 bg-background-glass border border-white/10 text-xs text-text-primary p-2 rounded-sm outline-none focus:border-aspis-blue" value={newLog.genre} onChange={e => setNewLog({...newLog, genre: e.target.value})} />
                      <input type="number" placeholder="Pages" className="w-20 bg-background-glass border border-white/10 text-xs text-text-primary p-2 rounded-sm outline-none focus:border-aspis-blue" value={newLog.pages} onChange={e => setNewLog({...newLog, pages: parseInt(e.target.value) || 0})} />
                      <input type="number" placeholder="Days" className="w-16 bg-background-glass border border-white/10 text-xs text-text-primary p-2 rounded-sm outline-none focus:border-aspis-blue" value={newLog.daysTaken} onChange={e => setNewLog({...newLog, daysTaken: parseInt(e.target.value) || 0})} />
                      <button onClick={handleAddLog} className="bg-aspis-blue/20 hover:bg-aspis-blue/40 text-aspis-blue border border-aspis-blue/30 px-3 py-2 rounded-sm text-xs transition-colors">Log</button>
                    </div>
                  </div>
                </div>

                {/* AI Intelligence */}
                <div className="bg-gradient-to-r from-aspis-blue/5 to-aspis-academic/5 border border-white/10 rounded-md p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-aspis-blue" />
                    AI Reading Recommendation
                  </h3>
                  <div className="text-xs text-text-secondary mb-2">
                    Based on academic weak topics: {selectedStudent.weakTopics.length > 0 ? selectedStudent.weakTopics.join(", ") : "None identified"}
                  </div>
                  <div className="p-3 bg-black/20 rounded text-sm text-text-primary italic border-l-2 border-aspis-blue">
                    "{editForm.aiRecommendation}"
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3">Librarian Observations</h3>
                  <textarea
                    className="w-full bg-background-glass border border-white/10 text-sm text-text-primary p-3 rounded-sm outline-none focus:border-aspis-blue h-24 resize-none"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    placeholder="Add notes about student's reading habits..."
                  />
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="text-xs text-text-muted">
                  Last updated by {editForm.updatedBy} on {new Date(editForm.updatedAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-3">
                  {saveSuccess && (
                    <span className="text-xs text-risk-low flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saved successfully
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-gradient-to-r from-aspis-blue to-aspis-blue/80 hover:from-aspis-blue/90 hover:to-aspis-blue/70 text-white px-4 py-2 rounded-sm text-xs font-medium transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Record
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-8 text-center">
              <Library className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Select a student from the list to view or edit their library records.</p>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      {concerns.length > 0 && (
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-4 mt-6">
          <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-risk-medium" />
            Library Alerts & Interventions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {concerns.map((concern, idx) => {
              const isOverdue = concern.record.overdueCount > 0;
              return (
                <div key={idx} className={`p-3 rounded-md border flex gap-3 ${isOverdue ? 'bg-risk-high/5 border-risk-high/20' : 'bg-risk-medium/5 border-risk-medium/20'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getAvatarColor(concern.record.readingLevel)}`}>
                    <span className="text-xs font-bold text-white">{concern.student?.initials}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{concern.student?.name}</div>
                    <div className="text-xs mt-1">
                      {isOverdue ? (
                        <span className="text-risk-high flex items-center gap-1"><Clock className="w-3 h-3"/> {concern.record.overdueCount} Overdue Books</span>
                      ) : (
                        <span className="text-risk-medium flex items-center gap-1"><BookOpen className="w-3 h-3"/> Reading Below Age Level</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  );
}
