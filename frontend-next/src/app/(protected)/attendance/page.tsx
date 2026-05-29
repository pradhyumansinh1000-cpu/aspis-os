"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STUDENTS, Student } from "@/data/mockData";
import { 
  CalendarCheck, 
  Users, 
  Check, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Lock, 
  Trash2, 
  Plus, 
  ChevronRight, 
  Search,
  BookOpen
} from "lucide-react";

interface AttendanceRecord {
  studentId: string;
  name: string;
  roll: string;
  status: "present" | "late" | "absent";
  minutesLate?: number;
  absenceReason?: string;
  currentAttendance: number;
  initials: string;
  riskLevel: Student["riskLevel"];
}

interface HistoricalSession {
  id: string;
  date: string;
  grade: string;
  section: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  status: "locked";
}

const HISTORICAL_SESSIONS: HistoricalSession[] = [
  {
    id: "h1",
    date: "2026-05-25",
    grade: "9",
    section: "A",
    presentCount: 36,
    absentCount: 1,
    lateCount: 1,
    status: "locked",
  },
  {
    id: "h2",
    date: "2026-05-24",
    grade: "9",
    section: "A",
    presentCount: 37,
    absentCount: 1,
    lateCount: 0,
    status: "locked",
  },
  {
    id: "h3",
    date: "2026-05-23",
    grade: "9",
    section: "A",
    presentCount: 35,
    absentCount: 2,
    lateCount: 1,
    status: "locked",
  }
];

export default function Attendance() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedGrade, setSelectedGrade] = useState("9");
  const [selectedSection, setSelectedSection] = useState("A");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [role, setRole] = useState("teacher");

  useEffect(() => {
    const savedRole = localStorage.getItem("user_role");
    if (savedRole) setRole(savedRole);
  }, []);
  
  // State for active roster to take attendance
  const [roster, setRoster] = useState<AttendanceRecord[]>(() => {
    return STUDENTS.map(s => ({
      studentId: s.id,
      name: s.name,
      roll: s.roll,
      status: "present",
      currentAttendance: s.attendance,
      initials: s.initials,
      riskLevel: s.riskLevel
    }));
  });

  // State for history session logs
  const [history, setHistory] = useState<HistoricalSession[]>(HISTORICAL_SESSIONS);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [lastSubmittedStats, setLastSubmittedStats] = useState<any>(null);

  // Filter roster based on grade, section, and search query
  const filteredRoster = roster.filter(item => {
    const studentObj = STUDENTS.find(s => s.id === item.studentId);
    if (!studentObj) return false;
    
    // Check grade & section matches
    const matchClass = studentObj.grade === selectedGrade && studentObj.section === selectedSection;
    // Check search query
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.roll.includes(searchQuery);
                        
    return matchClass && matchSearch;
  });

  // Update status for a specific student
  const handleStatusChange = (studentId: string, status: "present" | "late" | "absent") => {
    setRoster(prev => prev.map(item => {
      if (item.studentId === studentId) {
        return {
          ...item,
          status,
          minutesLate: status === "late" ? 10 : undefined,
          absenceReason: status === "absent" ? "Unexcused" : undefined
        };
      }
      return item;
    }));
  };

  // Update minutes late
  const handleMinutesLateChange = (studentId: string, minutes: number) => {
    setRoster(prev => prev.map(item => {
      if (item.studentId === studentId && item.status === "late") {
        return { ...item, minutesLate: minutes };
      }
      return item;
    }));
  };

  // Update absence reason
  const handleAbsenceReasonChange = (studentId: string, reason: string) => {
    setRoster(prev => prev.map(item => {
      if (item.studentId === studentId && item.status === "absent") {
        return { ...item, absenceReason: reason };
      }
      return item;
    }));
  };

  // Bulk actions
  const markAllPresent = () => {
    setRoster(prev => prev.map(item => ({
      ...item,
      status: "present",
      minutesLate: undefined,
      absenceReason: undefined
    })));
  };

  const markAllAbsent = () => {
    setRoster(prev => prev.map(item => ({
      ...item,
      status: "absent",
      minutesLate: undefined,
      absenceReason: "Unexcused"
    })));
  };

  // Live session statistics
  const totalStudents = filteredRoster.length;
  const presentCount = filteredRoster.filter(r => r.status === "present").length;
  const lateCount = filteredRoster.filter(r => r.status === "late").length;
  const absentCount = filteredRoster.filter(r => r.status === "absent").length;
  const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

  // Handle submit and session lock
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalStudents === 0) return;

    const auditId = `audit_dpa_${Math.floor(100000 + Math.random() * 900000)}`;
    const sessionStats = {
      auditId,
      date: selectedDate,
      grade: selectedGrade,
      section: selectedSection,
      total: totalStudents,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      rate: attendanceRate,
    };

    setLastSubmittedStats(sessionStats);
    setIsSubmitModalOpen(true);

    // Save to historical logs
    const newSession: HistoricalSession = {
      id: `h_${Date.now()}`,
      date: selectedDate,
      grade: selectedGrade,
      section: selectedSection,
      presentCount: presentCount,
      absentCount: absentCount,
      lateCount: lateCount,
      status: "locked"
    };

    setHistory(prev => [newSession, ...prev]);
  };

  const getRiskColor = (level: Student["riskLevel"]) => {
    switch (level) {
      case "critical":
        return "border-risk-critical text-risk-critical bg-risk-critical/10";
      case "high":
        return "border-risk-high text-risk-high bg-risk-high/10";
      case "medium":
        return "border-risk-medium text-risk-medium bg-risk-medium/10";
      default:
        return "border-risk-low text-risk-low bg-risk-low/10";
    }
  };

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10 relative">
      
      {/* Title Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text-primary tracking-tight">
          {role === "principal" ? "School Attendance Logs" : "Daily Attendance"}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {role === "principal" 
            ? "Oversight and audit logs for teacher-submitted student attendance sessions across DPS Delhi."
            : "Secure, DPDPA-compliant daily student attendance logging with automatic parent notifications and predictive intelligence sync."}
        </p>
      </div>

      {/* Principal Class-wise Attendance Analysis Grid */}
      {role === "principal" && (
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Class-by-Class Attendance Analysis</h3>
              <p className="text-[10px] text-text-muted mt-0.5">Real-time summaries of cumulative attendance levels across DPS Delhi sections.</p>
            </div>
            <span className="text-[9px] font-bold text-risk-high bg-risk-high/10 border border-risk-high/15 px-2.5 py-1 rounded-sm uppercase tracking-wider self-start sm:self-center">
              ⚠️ 2 Sections below 85% benchmark
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: "Grade 9A", teacher: "Priya Sharma", rate: 84.2, count: 38, status: "warning", teacherId: "d1" },
              { name: "Grade 9B", teacher: "Amit Verma", rate: 88.5, count: 35, status: "good", teacherId: "d2" },
              { name: "Grade 10A", teacher: "Sunita Rao", rate: 92.1, count: 40, status: "good", teacherId: "d3" },
              { name: "Grade 10B", teacher: "Vikram Sen", rate: 86.4, count: 36, status: "good", teacherId: "d4" },
              { name: "Grade 11 Science", teacher: "Ritu Singhal", rate: 82.7, count: 38, status: "critical", teacherId: "d5" },
            ].map((cls) => (
              <div 
                key={cls.name} 
                className="p-4 bg-white/[0.005] border border-white/5 hover:border-white/10 rounded-sm flex flex-col justify-between h-[155px] transition-all"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-xs text-text-primary">{cls.name}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      cls.status === "critical" 
                        ? "text-risk-critical border-risk-critical/20 bg-risk-critical/10" 
                        : cls.status === "warning" 
                        ? "text-risk-high border-risk-high/20 bg-risk-high/10"
                        : "text-risk-low border-risk-low/20 bg-risk-low/10"
                    }`}>
                      {cls.status === "critical" ? "Critical" : cls.status === "warning" ? "Warning" : "Good"}
                    </span>
                  </div>
                  <div className="text-[9px] text-text-secondary mt-1">Teacher: {cls.teacher}</div>
                  <div className="text-[9px] text-text-muted mt-0.5">{cls.count} students</div>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between text-[10px] mb-1 font-bold">
                    <span className="text-text-secondary">Avg Attendance:</span>
                    <span className={cls.rate < 85 ? "text-risk-critical font-black" : "text-risk-low font-black"}>
                      {cls.rate}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2.5">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${cls.rate}%`, 
                        backgroundColor: cls.rate >= 88 ? "#10b981" : cls.rate >= 85 ? "#f59e0b" : "#f43f5e" 
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.setItem("active_chat_channel", cls.teacherId);
                      router.push("/messaging");
                    }}
                    className="w-full py-1.5 text-[8.5px] font-black uppercase tracking-wider bg-white/5 border border-white/5 hover:bg-aspis-blue/15 hover:border-aspis-blue/20 hover:text-aspis-blue rounded-sm transition-all text-center text-text-secondary flex items-center justify-center gap-1 shadow-sm"
                  >
                    💬 Contact Teacher
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {role !== "principal" && (
        <>
          {/* Top Controls Grid */}
          <div className="bg-background-card border border-white/5 p-6 rounded-md shadow-card mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Date Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Date</label>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-background-glass border border-white/10 text-xs text-text-primary p-3 rounded-sm outline-none focus:border-aspis-blue transition-colors"
                />
              </div>

              {/* Grade Level */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Grade</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="bg-background-glass border border-white/10 text-xs text-text-primary p-3 rounded-sm outline-none cursor-pointer focus:border-aspis-blue transition-colors"
                >
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>

              {/* Section */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="bg-background-glass border border-white/10 text-xs text-text-primary p-3 rounded-sm outline-none cursor-pointer focus:border-aspis-blue transition-colors"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>

            </div>
          </div>

          {/* Stats Counter Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
            
            {/* Total Roster */}
            <div className="p-5 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-aspis-blue" />
              <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Total Students</div>
              <div className="text-3xl font-black text-aspis-blue mt-1">{totalStudents}</div>
            </div>

            {/* Present count */}
            <div className="p-5 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-low" />
              <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Present</div>
              <div className="text-3xl font-black text-risk-low mt-1">{presentCount}</div>
            </div>

            {/* Late count */}
            <div className="p-5 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-medium" />
              <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Late</div>
              <div className="text-3xl font-black text-risk-medium mt-1">{lateCount}</div>
            </div>

            {/* Absent count */}
            <div className="p-5 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-critical" />
              <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Absent</div>
              <div className="text-3xl font-black text-risk-critical mt-1">{absentCount}</div>
            </div>

            {/* Attendance percentage rate */}
            <div className="p-5 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden col-span-2 md:col-span-1">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-aspis-academic" />
              <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Session Attendance</div>
              <div className="text-3xl font-black text-aspis-academic mt-1">{attendanceRate}%</div>
            </div>

          </div>

          {/* Roster & Search Bar */}
          <div className="bg-background-card border border-white/5 rounded-md shadow-card overflow-hidden mb-8">
            
            {/* Search & Bulk Action Header */}
            <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.01]">
              
              <div className="flex items-center gap-2 bg-background-glass border border-white/5 px-3 py-2 rounded-sm w-full md:max-w-[280px]">
                <Search size={13} className="text-text-muted" />
                <input 
                  type="text" 
                  placeholder="Search by student name or roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-text-primary w-full"
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Bulk Actions:</span>
                <button 
                  type="button"
                  onClick={markAllPresent}
                  className="px-3 py-1.5 border border-risk-low/20 bg-risk-low/5 hover:bg-risk-low/10 text-risk-low text-[10px] font-black rounded-sm uppercase transition-colors"
                >
                  Mark All Present
                </button>
                <button 
                  type="button"
                  onClick={markAllAbsent}
                  className="px-3 py-1.5 border border-risk-critical/20 bg-risk-critical/5 hover:bg-risk-critical/10 text-risk-critical text-[10px] font-black rounded-sm uppercase transition-colors"
                >
                  Mark All Absent
                </button>
              </div>

            </div>

            {/* Student Roster Table */}
            <div className="p-6">
              
              <div className="grid grid-cols-[1fr_2.5fr_2fr_3fr_1.5fr] px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-white/5 hidden md:grid mb-4">
                <span>Roll</span>
                <span>Student Name</span>
                <span>Academic Attendance</span>
                <span className="text-center">Today's Status</span>
                <span className="text-right">Details</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {filteredRoster.map((item) => (
                  <div 
                    key={item.studentId}
                    className="grid grid-cols-1 md:grid-cols-[1fr_2.5fr_2fr_3fr_1.5fr] items-center gap-4 p-4 border border-white/5 hover:border-white/10 bg-white/[0.005] rounded-sm transition-all"
                  >
                    
                    {/* Roll Info */}
                    <div className="text-xs font-bold text-text-secondary">
                      <span className="md:hidden text-[9px] text-text-muted uppercase mr-1">Roll:</span>
                      #{item.roll}
                    </div>

                    {/* Student Avatar + Name */}
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-black uppercase ${getRiskColor(item.riskLevel)}`}>
                        {item.initials}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-text-primary">{item.name}</div>
                        <div className="text-[9px] text-text-muted capitalize">Risk Profile: {item.riskLevel}</div>
                      </div>
                    </div>

                    {/* Academic Attendance progress bar */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-text-secondary">Yearly Avg:</span>
                        <span className={`font-black ${item.currentAttendance < 75 ? "text-risk-critical" : "text-risk-low"}`}>
                          {item.currentAttendance}%
                        </span>
                      </div>
                      <div className="w-[120px] h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: `${item.currentAttendance}%`, 
                            backgroundColor: item.currentAttendance >= 75 ? "#10b981" : "#f43f5e" 
                          }}
                        />
                      </div>
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="flex flex-col gap-2 items-center justify-center">
                      <div className="flex gap-1 bg-background-primary border border-white/5 p-1 rounded-sm">
                        <button
                          type="button"
                          disabled={role === "principal"}
                          onClick={() => handleStatusChange(item.studentId, "present")}
                          className={`px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                            item.status === "present"
                              ? "bg-risk-low/20 text-risk-low border border-risk-low/25 shadow-sm"
                              : "text-text-muted hover:text-text-secondary disabled:hover:text-text-muted"
                          } disabled:cursor-default`}
                        >
                          {item.status === "present" && <Check size={10} />} Present
                        </button>

                        <button
                          type="button"
                          disabled={role === "principal"}
                          onClick={() => handleStatusChange(item.studentId, "late")}
                          className={`px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                            item.status === "late"
                              ? "bg-risk-medium/20 text-risk-medium border border-risk-medium/25 shadow-sm"
                              : "text-text-muted hover:text-text-secondary disabled:hover:text-text-muted"
                          } disabled:cursor-default`}
                        >
                          {item.status === "late" && <Clock size={10} />} Late
                        </button>

                        <button
                          type="button"
                          disabled={role === "principal"}
                          onClick={() => handleStatusChange(item.studentId, "absent")}
                          className={`px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                            item.status === "absent"
                              ? "bg-risk-critical/20 text-risk-critical border border-risk-critical/25 shadow-sm"
                              : "text-text-muted hover:text-text-secondary disabled:hover:text-text-muted"
                          } disabled:cursor-default`}
                        >
                          {item.status === "absent" && <ShieldAlert size={10} />} Absent
                        </button>
                      </div>

                      {item.status === "late" && (
                        <div className="flex items-center gap-1.5 mt-2 animate-fade-in">
                          <span className="text-[9px] text-text-secondary font-bold">Minutes Late:</span>
                          <input 
                            type="number"
                            min="1"
                            max="60"
                            disabled={role === "principal"}
                            value={item.minutesLate || 10}
                            onChange={(e) => handleMinutesLateChange(item.studentId, Number(e.target.value))}
                            className="w-12 bg-background-primary border border-white/10 text-[10px] font-bold text-center text-text-primary p-1 rounded-sm outline-none focus:border-risk-medium disabled:opacity-75 disabled:cursor-default"
                          />
                        </div>
                      )}

                      {item.status === "absent" && (
                        <div className="flex items-center gap-1.5 mt-2 animate-fade-in">
                          <span className="text-[9px] text-text-secondary font-bold">Absence Reason:</span>
                          <select 
                            value={item.absenceReason || "Unexcused"}
                            disabled={role === "principal"}
                            onChange={(e) => handleAbsenceReasonChange(item.studentId, e.target.value)}
                            className="bg-background-primary border border-white/10 text-[10px] font-bold text-text-primary p-1 rounded-sm outline-none cursor-pointer focus:border-risk-critical disabled:opacity-75 disabled:cursor-default"
                          >
                            <option value="Unexcused">Unexcused Absence</option>
                            <option value="Sick Leave">Medical / Sick Leave</option>
                            <option value="Family Event">Family Engagement</option>
                            <option value="Sports Duty">Inter-School Sports</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Details / Warnings */}
                    <div className="text-right flex items-center justify-end gap-2">
                      {item.status === "absent" && item.riskLevel === "critical" && (
                        <div className="flex items-center gap-1 text-risk-critical bg-risk-critical/10 px-2 py-0.5 border border-risk-critical/20 rounded-sm text-[8px] font-bold uppercase tracking-wider animate-pulse">
                          Critical Absence Alert
                        </div>
                      )}
                      {item.currentAttendance < 75 && (
                        <div className="w-5 h-5 rounded-full bg-risk-critical/10 flex items-center justify-center text-risk-critical cursor-pointer" title="Attendance below 75% threshold">
                          ⚠️
                        </div>
                      )}
                      <span className="text-[10px] text-text-muted font-bold">Details</span>
                    </div>

                  </div>
                ))}

                {filteredRoster.length === 0 && (
                  <div className="text-center p-12 text-xs text-text-muted bg-background-card border border-white/5 rounded-sm">
                    No students enrolled in Grade {selectedGrade}{selectedSection} or matching the search query.
                  </div>
                )}
              </div>

            </div>

            {/* Lock & Submit Period Attendance Panel */}
            {totalStudents > 0 && (
              <div className="p-6 bg-white/[0.01] border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                <div className="flex items-start gap-3 text-xs text-text-secondary max-w-[500px]">
                  <Lock className="text-aspis-blue mt-0.5 flex-shrink-0" size={16} />
                  <div>
                    <p className="font-extrabold text-text-primary">DPDPA 2023 Consent & Log Security Action</p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      Submitting will lock this session. Absent student logs will trigger secure notifications to registered parent contacts under DPA guidelines. An immutable compliance ledger audit log will be appended.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow hover:-translate-y-[1px] transition-transform"
                >
                  <CalendarCheck size={15} /> Lock & Submit Attendance
                </button>

              </div>
            )}

          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {isSubmitModalOpen && lastSubmittedStats && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-[480px] bg-background-card border border-white/10 p-8 rounded-md shadow-card text-center">
            
            <div className="w-14 h-14 rounded-full bg-risk-low/10 border border-risk-low/20 text-risk-low flex items-center justify-center mx-auto mb-6">
              <Check size={28} />
            </div>

            <h2 className="text-lg font-black text-text-primary mb-2">Attendance Session Locked</h2>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              The attendance records have been compiled, cryptographically signed, and committed to the security ledger database.
            </p>

            {/* Session statistics details */}
            <div className="p-4 bg-background-primary border border-white/5 rounded-sm text-left text-xs font-semibold text-text-secondary flex flex-col gap-2 mb-6">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Class:</span>
                <span className="text-text-primary">Grade {lastSubmittedStats.grade}{lastSubmittedStats.section}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Date:</span>
                <span className="text-text-primary">{lastSubmittedStats.date}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Attendance Ratio:</span>
                <span className="text-risk-low">{lastSubmittedStats.present} Present / {lastSubmittedStats.absent} Absent / {lastSubmittedStats.late} Late ({lastSubmittedStats.rate}%)</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>DPDPA Compliance Audit:</span>
                <span className="font-mono text-aspis-blue text-[10px]">{lastSubmittedStats.auditId}</span>
              </div>
            </div>

            <div className="p-3.5 bg-risk-low/5 border border-risk-low/10 rounded-sm text-left text-[10px] text-text-secondary flex items-start gap-2.5 mb-8">
              <span>📲</span>
              <p>
                <strong>Parent notifications sent:</strong> Automated SMS notifications detailing student absences and reasons have been triggered for the absent students.
              </p>
            </div>

            <button
              onClick={() => setIsSubmitModalOpen(false)}
              className="w-full py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow hover:-translate-y-[1px] transition-transform"
            >
              Continue Monitoring
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
