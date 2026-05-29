"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, TrendingUp, TrendingDown, Minus, AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { STUDENTS, Student } from "@/data/mockData";

const RISK_LEVELS = ["all", "critical", "high", "medium", "low"];

export default function Students() {
  const router = useRouter();
  const [role, setRole] = useState("teacher");
  const [userSubject, setUserSubject] = useState("Mathematics");

  useEffect(() => {
    const savedRole = localStorage.getItem("user_role");
    const savedSubject = localStorage.getItem("user_subject");
    if (savedRole) setRole(savedRole);
    if (savedSubject) setUserSubject(savedSubject);
  }, []);
  
  // Roster state to allow interactive adding and removing
  const [students, setStudents] = useState<Student[]>(STUDENTS);
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("all");
  const [sortBy, setSortBy] = useState("risk");
  
  // Modal toggle & form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    roll: "",
    grade: "9",
    section: "A",
    attendance: 100,
    overall_accuracy: 75.0,
    riskLevel: "low" as Student["riskLevel"],
    weakTopics: "",
  });

  const getRiskColor = (level: Student["riskLevel"]) => {
    switch (level) {
      case "critical":
        return "text-risk-critical border-risk-critical/20 bg-risk-critical/10";
      case "high":
        return "text-risk-high border-risk-high/20 bg-risk-high/10";
      case "medium":
        return "text-risk-medium border-risk-medium/20 bg-risk-medium/10";
      default:
        return "text-risk-low border-risk-low/20 bg-risk-low/10";
    }
  };

  const formatTopic = (topic: string) => {
    if (!topic) return "";
    const math = ["Fractions", "Algebra", "Coordinate Geometry", "Trigonometry", "Linear Equations", "Quadratic Equations", "Statistics", "Probability"];
    const chem = ["Chemical Bonding", "Organic Chemistry"];
    const phys = ["Physics Numericals", "Kinematics"];
    const soc = ["History", "Geography"];
    
    if (math.includes(topic)) return `Mathematics (${topic})`;
    if (chem.includes(topic)) return `Chemistry (${topic})`;
    if (phys.includes(topic)) return `Physics (${topic})`;
    if (soc.includes(topic)) return `Social Studies (${topic})`;
    if (topic.includes("English")) return `English (${topic})`;
    
    return `General (${topic})`;
  };

  const getTopicsForSubject = (topics: string[], subject: string) => {
    if (!topics || topics.length === 0) return [];
    const math = ["Fractions", "Algebra", "Coordinate Geometry", "Trigonometry", "Linear Equations", "Quadratic Equations", "Statistics", "Probability"];
    const chem = ["Chemical Bonding", "Organic Chemistry"];
    const phys = ["Physics Numericals", "Kinematics"];
    const soc = ["History", "Geography"];
    
    return topics.filter(t => {
      if (subject === "Mathematics" && math.includes(t)) return true;
      if (subject === "Chemistry" && chem.includes(t)) return true;
      if (subject === "Physics" && phys.includes(t)) return true;
      if (subject === "Social Studies" && soc.includes(t)) return true;
      if (subject === "English" && t.includes("English")) return true;
      return false;
    });
  };

  const getDemoTopic = (subject: string, seed: number) => {
    const topics: Record<string, string[]> = {
      "Mathematics": ["Fractions", "Algebra", "Trigonometry", "Probability"],
      "Chemistry": ["Chemical Bonding", "Organic Chemistry", "Stoichiometry"],
      "Physics": ["Physics Numericals", "Kinematics", "Thermodynamics", "Optics"],
      "Social Studies": ["History", "Geography", "Civics"],
      "English": ["English Comprehension", "Grammar", "Creative Writing"]
    };
    const list = topics[subject] || ["General Theory", "Practical Application", "Analysis"];
    return list[seed % list.length];
  };

  const generateCrossDomainInsight = (student: Student, subject: string) => {
    // Cross-domain AI logic
    if (subject === "Physics") {
      const mathGaps = student.weakTopics.filter(t => ["Fractions", "Algebra", "Trigonometry", "Linear Equations"].includes(t));
      if (mathGaps.length > 0) {
        return { text: `Physics struggles correlate strongly with foundational Math gaps in ${mathGaps[0]}.`, action: "Coordinate with Math Faculty" };
      }
    }
    if (subject === "Chemistry") {
      if (student.weakTopics.includes("Algebra") || student.weakTopics.includes("Fractions")) {
        return { text: "Chemistry stoichiometry difficulties linked to Math (Algebra/Fractions) gap.", action: "Coordinate with Math Faculty" };
      }
    }
    if (subject === "Mathematics") {
      if (student.weakTopics.includes("English Comprehension") || student.health.vision_flag) {
        return { text: "Math word-problem difficulty linked to Reading/Vision issues.", action: student.health.vision_flag ? "Refer to Medical Staff" : "Coordinate with English Faculty" };
      }
    }
    
    if (student.weakTopics.length > 0) {
      return { text: `AI detects isolated weakness in ${student.weakTopics[0]}.`, action: "Assign localized remediation" };
    }
    return { text: "No significant cross-domain dependencies detected.", action: "Maintain trajectory" };
  };

  // Add student handler
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email) return;

    const names = newStudent.name.split(" ");
    const initials = names.map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const splitTopics = newStudent.weakTopics ? newStudent.weakTopics.split(",").map(t => t.trim()) : [];
    
    // Estimate a mock risk score based on inputs
    let riskScore = 15;
    if (newStudent.riskLevel === "critical") riskScore = 85;
    else if (newStudent.riskLevel === "high") riskScore = 65;
    else if (newStudent.riskLevel === "medium") riskScore = 40;

    const studentItem: Student = {
      id: `s_custom_${Date.now()}`,
      name: newStudent.name,
      grade: newStudent.grade,
      section: newStudent.section,
      roll: newStudent.roll || "0",
      riskLevel: newStudent.riskLevel,
      riskScore,
      overall_accuracy: Number(newStudent.overall_accuracy),
      attendance: Number(newStudent.attendance),
      initials,
      weakTopics: splitTopics,
      strongTopics: ["Self Study"],
      behavioral: { composite: 7.0, participation: 7.0, leadership: 7.0, assignment: 7.0 },
      sports: { sports: ["General"], fitness: 75, is_leader: false },
      health: { absences: 0, exam_absences: 0, vision_flag: false },
      trend: "stable",
      futureRisks: [],
      aiNarrative: {
        strengths: ["Onboarded to platform"],
        concerns: splitTopics.length > 0 ? [`Conceptual weaknesses in ${splitTopics.join(", ")}`] : ["No primary concerns"],
        teacher_recommendation: "Provide initial placement evaluation.",
        student_message: "Welcome to ASPIS! Let's get started.",
        parent_summary: "Student profile initialized.",
      }
    };

    setStudents((prev) => [studentItem, ...prev]);
    setIsModalOpen(false);
    
    // Reset form
    setNewStudent({
      name: "",
      email: "",
      roll: "",
      grade: "9",
      section: "A",
      attendance: 100,
      overall_accuracy: 75.0,
      riskLevel: "low",
      weakTopics: "",
    });
  };

  // Remove student handler
  const handleRemoveStudent = (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation(); // Avoid triggering parent row navigation click
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  // Filter roster
  const filtered = students
    .filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.weakTopics.some((t) => t.toLowerCase().includes(q));
      const matchRisk = filterRisk === "all" || s.riskLevel === filterRisk;
      return matchSearch && matchRisk;
    })
    .sort((a, b) => {
      if (sortBy === "risk") return b.riskScore - a.riskScore;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "accuracy") return b.overall_accuracy - a.overall_accuracy;
      return 0;
    });

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10 relative">
      
      {/* Header section with add student button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Student Roster</h1>
          <p className="text-xs text-text-secondary mt-1">
            Class 9 · {students.length} students enrolled · AI diagnostic monitoring active
          </p>
        </div>
        {role !== "principal" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow transition-transform hover:-translate-y-[1px]"
          >
            <Plus size={15} /> Add Student
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        
        {/* Search Input bar */}
        <div className="flex items-center gap-2 bg-background-card border border-white/5 p-3 rounded-sm w-full md:max-w-[340px]">
          <Search size={14} className="text-text-muted" />
          <input
            type="text"
            className="bg-transparent border-none outline-none text-text-primary text-xs w-full"
            placeholder="Search by student name or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Risk filter pills list */}
        <div className="flex gap-1.5 flex-wrap">
          {RISK_LEVELS.map((r) => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase transition-colors ${
                filterRisk === r
                  ? r === "all"
                    ? "bg-aspis-blue/15 border-aspis-blue text-aspis-blue"
                    : getRiskColor(r as Student["riskLevel"])
                  : "bg-background-glass border-white/5 text-text-secondary hover:border-white/10"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown select */}
        <div className="ml-auto w-full md:w-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full md:w-auto bg-background-card border border-white/5 text-xs text-text-secondary p-3 rounded-sm outline-none cursor-pointer"
          >
            <option value="risk">Sort by Risk Score</option>
            <option value="name">Sort by Name</option>
            <option value="accuracy">Sort by Accuracy</option>
          </select>
        </div>

      </div>

      {/* Grid listing student records */}
      <div className="flex flex-col gap-2.5">
        
        {/* Table header list */}
        {role === "subject_teacher" ? (
          <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_3fr] px-5 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest hidden md:grid">
            <span>Student Info</span>
            <span>{userSubject} Marks</span>
            <span>Topic Strength</span>
            <span>Topic Weakness</span>
            <span>AI Cross-Domain Insight</span>
          </div>
        ) : (
          <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr_2fr_1.5fr_1fr] px-5 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest hidden md:grid">
            <span>Student Info</span>
            <span>Grade</span>
            <span>Attendance</span>
            <span>Accuracy</span>
            <span>Primary Concern</span>
            <span>Risk Status</span>
            <span className="text-right">Actions</span>
          </div>
        )}

        {/* Rows map */}
        {filtered.map((s, idx) => {
          const insight = generateCrossDomainInsight(s, userSubject);
          let subjectStrengths = getTopicsForSubject(s.strongTopics, userSubject);
          let subjectWeaknesses = getTopicsForSubject(s.weakTopics, userSubject);
          
          // Demo fallback to ensure roster is populated
          if (subjectStrengths.length === 0) {
            subjectStrengths = [getDemoTopic(userSubject, idx + 2)];
          }
          if (subjectWeaknesses.length === 0) {
            subjectWeaknesses = [getDemoTopic(userSubject, idx + 1)];
          }
          
          return (
            <div
              key={s.id}
              onClick={() => {
                if (role !== "subject_teacher") router.push(`/students/${s.id}`);
              }}
              className={`grid grid-cols-1 ${role === "subject_teacher" ? "md:grid-cols-[2fr_1.5fr_1.5fr_1.5fr_3fr] cursor-default" : "md:grid-cols-[2.5fr_1fr_1fr_1.5fr_2fr_1.5fr_1fr] cursor-pointer hover:translate-x-[2px]"} items-center gap-4 p-5 bg-background-card border border-white/5 hover:border-white/10 rounded-sm transition-all`}
            >
              {/* Demographic layout */}
              <div className="flex items-center gap-3">
                <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-aspis-blue to-aspis-academic flex items-center justify-center text-xs font-black text-white">
                  {s.initials}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-text-primary">{s.name}</div>
                  <div className="text-[10px] text-text-secondary mt-0.5 capitalize">{s.trend} trend</div>
                </div>
              </div>

              {role === "subject_teacher" ? (
                <>
                  {/* Subject Marks */}
                  <div className="md:block hidden">
                    <span className="text-xs font-black text-text-primary">{s.overall_accuracy}%</span>
                    <div className="text-[9px] text-text-secondary mt-0.5">Score in Previous Exam</div>
                  </div>

                  {/* Topic Strength */}
                  <div className="text-xs font-bold md:block hidden text-risk-low truncate">
                    {subjectStrengths.length > 0 ? `✓ ${subjectStrengths[0]}` : "None"}
                  </div>

                  {/* Topic Weakness */}
                  <div className="text-xs font-bold md:block hidden text-risk-critical truncate">
                    {subjectWeaknesses.length > 0 ? `✗ ${subjectWeaknesses[0]}` : "None"}
                  </div>

                  {/* AI Cross-Domain Insight */}
                  <div className="md:block hidden flex flex-col gap-1">
                    <div className="text-[10px] text-text-secondary leading-tight">{insight.text}</div>
                    <div className="text-[9px] font-black text-aspis-blue uppercase tracking-wider mt-1 flex items-center gap-1">
                      <TrendingUp size={10} /> {insight.action}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Grade section */}
                  <span className="text-xs text-text-secondary font-bold md:block hidden">
                    Grade {s.grade}{s.section}
                  </span>

                  {/* Attendance percentage */}
                  <span className={`text-xs font-black md:block hidden ${s.attendance < 75 ? "text-risk-critical" : "text-risk-low"}`}>
                    {s.attendance}%
                  </span>

                  {/* Average accuracy stats */}
                  <div className="md:block hidden">
                    <span className="text-xs font-black text-text-primary">{s.overall_accuracy}%</span>
                    <div className="w-[80px] h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${s.overall_accuracy}%`,
                          backgroundColor: s.overall_accuracy >= 75 ? "#10b981" : s.overall_accuracy >= 55 ? "#f59e0b" : "#f43f5e" 
                        }}
                      />
                    </div>
                  </div>

                  {/* Weak topic warning labels */}
                  <div className="text-xs font-bold md:block hidden">
                    {s.weakTopics[0] ? (
                      <span className="text-risk-critical flex items-center gap-1 truncate max-w-[180px]" title={formatTopic(s.weakTopics[0])}>
                        <AlertTriangle size={12} className="flex-shrink-0" /> {formatTopic(s.weakTopics[0])}
                      </span>
                    ) : (
                      <span className="text-risk-low">No weak areas</span>
                    )}
                  </div>

                  {/* Risk badge status */}
                  <div className="md:block hidden">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase ${getRiskColor(s.riskLevel)}`}>
                      {s.riskLevel} · {s.riskScore}
                    </span>
                  </div>
                </>
              )}

              {/* Row action */}
              {role !== "subject_teacher" && (
                <div className="flex justify-end gap-2">
                  {role !== "principal" && (
                    <button
                      onClick={(e) => handleRemoveStudent(e, s.id)}
                      className="w-8 h-8 rounded-sm bg-risk-critical/10 border border-risk-critical/20 hover:bg-risk-critical/20 text-risk-critical flex items-center justify-center transition-colors"
                      title="Remove Student"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <span className="w-8 h-8 rounded-sm bg-white/5 border border-white/5 flex items-center justify-center text-text-muted hover:text-text-primary md:flex hidden">
                    <ChevronRight size={14} />
                  </span>
                </div>
              )}

            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center p-12 text-xs text-text-muted bg-background-card border border-white/5 rounded-sm">
            No students found matching the filtering options.
          </div>
        )}

      </div>

      {/* Add Student Form Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-[500px] bg-background-card border border-white/10 p-8 rounded-md shadow-card">
            
            {/* Close modal */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-aspis-blue/15 border border-aspis-blue/20 rounded-sm flex items-center justify-center text-text-primary">
                🎓
              </div>
              <h2 className="text-lg font-black text-text-primary">Onboard Student Profile</h2>
            </div>

            <form onSubmit={handleAddStudent} className="flex flex-col gap-4 text-xs font-semibold text-text-secondary">
              
              {/* Full name input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-text-secondary">Student Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priyanshu Sharma"
                  className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              {/* Email address */}
              <div className="flex flex-col gap-1.5">
                <label className="text-text-secondary">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="student@school.edu"
                  className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent(p => ({ ...p, email: e.target.value }))}
                />
              </div>

              {/* Roll & Grade details in grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label>Roll Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 14"
                    className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                    value={newStudent.roll}
                    onChange={(e) => setNewStudent(p => ({ ...p, roll: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label>Grade Level</label>
                  <input
                    type="text"
                    required
                    placeholder="Grade 9"
                    className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                    value={newStudent.grade}
                    onChange={(e) => setNewStudent(p => ({ ...p, grade: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label>Section</label>
                  <input
                    type="text"
                    required
                    placeholder="A"
                    className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                    value={newStudent.section}
                    onChange={(e) => setNewStudent(p => ({ ...p, section: e.target.value }))}
                  />
                </div>
              </div>

              {/* Performance numbers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label>Attendance (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                    value={newStudent.attendance}
                    onChange={(e) => setNewStudent(p => ({ ...p, attendance: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label>Avg Accuracy (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                    value={newStudent.overall_accuracy}
                    onChange={(e) => setNewStudent(p => ({ ...p, overall_accuracy: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Initial detected risk */}
              <div className="flex flex-col gap-1.5">
                <label>Diagnosed Risk Level</label>
                <select
                  value={newStudent.riskLevel}
                  onChange={(e) => setNewStudent(p => ({ ...p, riskLevel: e.target.value as Student["riskLevel"] }))}
                  className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none cursor-pointer"
                >
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                  <option value="critical">Critical Risk</option>
                </select>
              </div>

              {/* Weak Topics */}
              <div className="flex flex-col gap-1.5">
                <label>Weak Topics (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Fractions, Linear Equations"
                  className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                  value={newStudent.weakTopics}
                  onChange={(e) => setNewStudent(p => ({ ...p, weakTopics: e.target.value }))}
                />
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="w-full mt-4 py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow transition-transform hover:-translate-y-[1px]"
              >
                Onboard Student Profile
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
