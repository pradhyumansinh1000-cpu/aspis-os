"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Brain, 
  Activity, 
  ChevronRight, 
  ShieldCheck, 
  Building2, 
  CalendarCheck,
  FileText,
  Clock
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { CLASS_STATS, STUDENTS, NOTIFICATIONS, Student } from "@/data/mockData";

// --- PRINCIPAL MOCK DATA ---
const CLASS_ROSTERS = [
  { name: "Grade 9A", teacher: "Priya Sharma", count: 38, riskCritical: 3, riskHigh: 6, averageScore: 67.4, attendance: 84.2, weakTopic: "Fractions" },
  { name: "Grade 9B", teacher: "Amit Verma", count: 35, riskCritical: 1, riskHigh: 4, averageScore: 71.2, attendance: 88.5, weakTopic: "Algebra" },
  { name: "Grade 10A", teacher: "Sunita Rao", count: 40, riskCritical: 0, riskHigh: 2, averageScore: 78.5, attendance: 92.1, weakTopic: "Trigonometry" },
  { name: "Grade 10B", teacher: "Vikram Sen", count: 36, riskCritical: 2, riskHigh: 5, averageScore: 70.8, attendance: 86.4, weakTopic: "Linear Equations" },
  { name: "Grade 11 Science", teacher: "Ritu Singhal", count: 38, riskCritical: 4, riskHigh: 8, averageScore: 64.2, attendance: 82.7, weakTopic: "Calculus" },
];

const COMPLIANCE_LOGS = [
  { id: "c1", timestamp: "2026-05-27 10:24", action: "Lock Attendance Session", user: "Priya Sharma (Teacher)", detail: "Grade 9A, Period 1 (Mathematics). Secure SMS parent notifications triggered.", category: "Consent/DPDPA" },
  { id: "c2", timestamp: "2026-05-27 09:15", action: "Access Student Health Log", user: "Dr. Anil Mehta (Medical)", detail: "Checked vision logs for student Rahul Sharma (s1). Purpose: Board work visual gap diagnosis.", category: "RBAC Access" },
  { id: "c3", timestamp: "2026-05-26 14:40", action: "Publish Assessment Marks", user: "Priya Sharma (Teacher)", detail: "Class Test 2 - Fractions. Concept mappings logged in graph ledger.", category: "Assessments Ledger" },
  { id: "c4", timestamp: "2026-05-26 11:10", action: "Soft-deleted Student Record", user: "Rajan Mehta (Admin)", detail: "Student s_custom_102 deleted under SoftDeleteMixin criteria.", category: "System Audit" },
];

const PRINCIPAL_ALERTS = [
  { id: 1, type: "critical", text: "Grade 11 Science algebra scores fell 6.2%. Neo4j projects 12 students at risk of Calculus failure next term.", time: "1h ago" },
  { id: 2, type: "warning", text: "Grade 9A average attendance falls below 85% warning threshold. Principal outreach advised.", time: "3h ago" },
  { id: 3, type: "info", text: "New DPDPA compliance audit database initialized. 348 ledger items generated.", time: "1d ago" },
];

export default function Dashboard() {
  const [role, setRole] = useState("teacher");
  const [userName, setUserName] = useState("Priya Sharma");

  useEffect(() => {
    const savedRole = localStorage.getItem("user_role");
    const savedName = localStorage.getItem("user_name");
    if (savedRole) setRole(savedRole);
    if (savedName) setUserName(savedName);
  }, []);

  return role === "principal" 
    ? <PrincipalDashboard userName={userName} /> 
    : <TeacherDashboard userName={userName} role={role} />;
}

// ==========================================
// PRINCIPAL DASHBOARD VIEW
// ==========================================
function PrincipalDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [mlAlerts, setMlAlerts] = useState<any[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  useEffect(() => {
    const fetchMLRisks = async () => {
      setIsLoadingAlerts(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}"}` + "/api/cron/run-risk-detection", { method: "POST" });
        const data = await res.json();
        setMlAlerts(data.generated_flags || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingAlerts(false);
      }
    };
    fetchMLRisks();
  }, []);

  // Recharts formatted school-wide monthly score
  const schoolProgressData = [
    { name: "Oct", score: 68 },
    { name: "Nov", score: 69 },
    { name: "Dec", score: 67 },
    { name: "Jan", score: 71 },
    { name: "Feb", score: 70 },
    { name: "Mar", score: 73 },
    { name: "Apr", score: 72 },
    { name: "May", score: 75 },
  ];

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10">
      
      {/* Header Greeting */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">
            Good morning, {userName.split(" ")[0]} 🏫
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Principal · School-wide Oversight · DPS Delhi · 187 active students monitored
          </p>
        </div>
        <div className="px-4 py-2 bg-aspis-blue/10 border border-aspis-blue/20 rounded-sm text-xs font-semibold text-aspis-blue flex items-center gap-2">
          <ShieldCheck size={14} /> DPDPA Secure & RBAC Active
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* School Attendance */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-risk-low/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-low" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">School Attendance</span>
            <div className="w-9 h-9 rounded-sm bg-risk-low/10 flex items-center justify-center text-risk-low">
              <CalendarCheck size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-risk-low">86.8%</div>
          <div className="text-[10px] text-text-muted mt-2">Target benchmark: 88.0% minimum</div>
        </div>

        {/* School Risk Alerts */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-risk-critical/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-critical" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Critical + High Risk</span>
            <div className="w-9 h-9 rounded-sm bg-risk-critical/10 flex items-center justify-center text-risk-critical">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-risk-critical">31</div>
          <div className="text-[10px] text-text-muted mt-2">Across 5 tracked class sections</div>
        </div>

        {/* School Avg Accuracy */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-aspis-blue/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-aspis-blue" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">School Avg Score</span>
            <div className="w-9 h-9 rounded-sm bg-aspis-blue/10 flex items-center justify-center text-aspis-blue">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-aspis-blue">70.4%</div>
          <div className="text-[10px] text-text-muted mt-2">↑ 3.2% since Mid-Term evaluations</div>
        </div>

        {/* Compliance Ledger Logs */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-aspis-behavioral/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-aspis-behavioral" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Security Audits</span>
            <div className="w-9 h-9 rounded-sm bg-aspis-behavioral/10 flex items-center justify-center text-aspis-behavioral">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-aspis-behavioral">348</div>
          <div className="text-[10px] text-text-muted mt-2">Immutable compliance logs recorded</div>
        </div>

      </div>

      {/* Main Charts & Vulnerabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* School Performance Area Chart */}
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">School Performance Trend</h3>
            <span className="text-xs font-bold text-risk-low bg-risk-low/10 px-2 py-0.5 rounded-sm">↑ Steady Improvement</span>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={schoolProgressData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="schoolGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis domain={[50, 100]} stroke="#475569" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  labelStyle={{ color: "#f1f5f9", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#schoolGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Curriculum Gaps */}
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">School-wide Vulnerable Concepts</h3>
            <div className="w-8 h-8 bg-background-glass border border-white/5 rounded-sm flex items-center justify-center text-text-muted">
              <Brain size={14} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { name: "Fractions", affected: 48, pct: 25.6, subject: "Mathematics" },
              { name: "Chemical Bonding", affected: 34, pct: 18.1, subject: "Chemistry" },
              { name: "Linear Equations", affected: 29, pct: 15.5, subject: "Mathematics" },
              { name: "Trigonometry", affected: 21, pct: 11.2, subject: "Mathematics" },
            ].map((t) => (
              <div key={t.name}>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <div>
                    <span className="font-extrabold text-text-primary">{t.name}</span>
                    <span className="text-[10px] text-text-muted ml-2">{t.subject}</span>
                  </div>
                  <span className="font-extrabold text-risk-high">{t.affected} Students</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-risk-high to-risk-critical" 
                    style={{ width: `${t.pct * 3}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Class Rosters list */}
      <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Class-by-Class Health Metrics</h3>
          <button 
            onClick={() => router.push("/students")}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            View School Roster <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1.5fr_1.5fr] px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-widest hidden md:grid">
            <span>Class Section</span>
            <span>Teacher</span>
            <span>Students</span>
            <span>Class Average</span>
            <span>Attendance Rate</span>
            <span>Primary Vulnerability</span>
          </div>

          {CLASS_ROSTERS.map((c) => (
            <div 
              key={c.name} 
              className="grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1.5fr_1.5fr] items-center gap-4 p-4 border border-white/5 bg-white/[0.005] hover:bg-white/[0.03] rounded-sm text-xs transition-colors"
            >
              <div className="font-extrabold text-text-primary">{c.name}</div>
              <div className="text-text-secondary font-semibold">{c.teacher}</div>
              <div className="text-text-secondary font-semibold">{c.count} Enrolled</div>
              
              <div className="font-black text-text-primary">
                {c.averageScore}%
                <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full rounded-full" 
                    style={{ 
                      width: `${c.averageScore}%`, 
                      backgroundColor: c.averageScore >= 75 ? "#10b981" : c.averageScore >= 65 ? "#f59e0b" : "#f43f5e" 
                    }}
                  />
                </div>
              </div>

              <div className={`font-black ${c.attendance < 85 ? "text-risk-critical" : "text-risk-low"}`}>
                {c.attendance}%
              </div>

              <div>
                <span className="px-2 py-0.5 bg-risk-critical/10 text-risk-critical border border-risk-critical/15 rounded-sm text-[9px] font-bold">
                  ⚠️ {c.weakTopic}
                </span>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Compliance logs & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Compliance logs ledger */}
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Immutable Security & Compliance Audits</h3>
            <span className="text-[10px] text-risk-low font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck size={12} /> Compliance Auditing
            </span>
          </div>

          <div className="flex flex-col gap-3.5">
            {COMPLIANCE_LOGS.map((log) => (
              <div key={log.id} className="p-3 bg-background-primary/40 border border-white/5 rounded-sm text-[11px] font-semibold text-text-secondary">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-extrabold text-text-primary">{log.action}</span>
                  <span className="font-mono text-[9px] text-text-muted">{log.timestamp}</span>
                </div>
                <p className="text-text-secondary mt-0.5">By: {log.user}</p>
                <p className="text-text-muted font-normal mt-1 leading-normal">{log.detail}</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 bg-aspis-blue/10 text-aspis-blue border border-aspis-blue/20 rounded-full text-[8px] uppercase font-bold">
                  {log.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Intelligence Alerts */}
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Principal Intelligence Briefings</h3>
            <span className="w-6 h-6 rounded-full bg-aspis-behavioral/15 flex items-center justify-center text-xs">💡</span>
          </div>

          <div className="flex flex-col gap-3">
            {isLoadingAlerts ? (
               <div className="flex flex-col items-center justify-center py-6 text-text-muted text-xs">
                 <div className="w-6 h-6 border-2 border-aspis-behavioral border-t-transparent rounded-full animate-spin mb-2"></div>
                 Running Isolation Forest ML analysis across domains...
               </div>
            ) : mlAlerts.length > 0 ? (
               mlAlerts.map((n, idx) => (
                 <div 
                   key={idx} 
                   className={`p-4 rounded-sm border-l-4 flex items-start gap-3 text-xs font-semibold ${
                     n.severity === "High"
                       ? "bg-risk-critical/10 border-risk-critical text-risk-critical"
                       : "bg-risk-high/10 border-risk-high text-risk-high"
                   }`}
                 >
                   <div className="flex-1">
                     <p className="font-bold text-white mb-1">Student ID: {n.student_id} - {n.name}</p>
                     <p>{n.description}</p>
                     <span className="inline-block mt-2 px-1.5 py-0.5 bg-risk-critical/10 border border-risk-critical/20 rounded-full text-[8px] uppercase font-bold">
                       {n.risk_type}
                     </span>
                   </div>
                 </div>
               ))
            ) : (
               <div className="text-center py-6 text-text-muted text-xs">
                 No anomalous student profiles detected.
               </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

// ==========================================
// TEACHER DASHBOARD VIEW (Original)
// ==========================================
function TeacherDashboard({ userName, role }: { userName: string; role: string }) {
  const router = useRouter();
  const [userSubject, setUserSubject] = useState("");
  const [userClassSection, setUserClassSection] = useState("");

  // Dynamic data from localStorage assessments
  const [dynamicAvg, setDynamicAvg] = useState<number | null>(null);
  const [dynamicTrend, setDynamicTrend] = useState<Array<{ name: string; score: number }>>([]);
  const [dynamicWeakTopics, setDynamicWeakTopics] = useState<Array<{ name: string; pct: number; subject: string; affected: number }>>([]);
  const [dynamicAtRisk, setDynamicAtRisk] = useState<Array<{ id: string; name: string; initials: string; avgPct: number; weakConcept: string }>>([]);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [studentsGraded, setStudentsGraded] = useState(0);
  
  const [actionReport, setActionReport] = useState<string | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  
  const [teacherAlerts, setTeacherAlerts] = useState<any[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  const fetchActionReport = async () => {
    setIsLoadingReport(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}"}` + "/api/intelligence/class-action-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: userSubject,
          classSection: userClassSection,
          studentsGraded,
          weakTopics: dynamicWeakTopics,
          atRiskCount: dynamicAtRisk.length
        })
      });
      const data = await res.json();
      setActionReport(data.report);
    } catch (e) {
      console.error(e);
      setActionReport("Error fetching AI Action Report.");
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!userSubject || studentsGraded === 0) return;
      setIsLoadingAlerts(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}"}` + "/api/intelligence/teacher-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: userSubject,
            classSection: userClassSection,
            studentsGraded,
            weakTopics: dynamicWeakTopics,
            atRiskCount: dynamicAtRisk.length
          })
        });
        const data = await res.json();
        if (data.alerts && data.alerts.length > 0) {
          setTeacherAlerts(data.alerts);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingAlerts(false);
      }
    };

    if (role === "subject_teacher") {
      fetchAlerts();
    }
  }, [role, userSubject, userClassSection, studentsGraded, dynamicWeakTopics, dynamicAtRisk]);

  useEffect(() => {
    const sub = localStorage.getItem("user_subject") || "";
    const cls = localStorage.getItem("user_class_section") || "";
    setUserSubject(sub);
    setUserClassSection(cls);

    if (role === "subject_teacher" && sub) {
      const store = localStorage.getItem("aspis_assessments_store");
      if (store) {
        try {
          const allAssessments = JSON.parse(store) as Array<any>;
          const filtered = allAssessments.filter((a: any) => a.subject === sub && a.scores && a.questions);
          setAssessmentCount(filtered.length);

          if (filtered.length > 0) {
            // Compute class average across all assessments
            let totalPctSum = 0;
            filtered.forEach((a: any) => {
              const maxMarks = (a.questions as any[]).reduce((s: number, q: any) => s + q.maxMarks, 0);
              if (maxMarks > 0) {
                totalPctSum += (a.classAverage / maxMarks) * 100;
              }
            });
            setDynamicAvg(Number((totalPctSum / filtered.length).toFixed(1)));

            // Build trend chart from assessment dates
            const trendData = filtered
              .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((a: any) => {
                const maxMarks = (a.questions as any[]).reduce((s: number, q: any) => s + q.maxMarks, 0);
                return {
                  name: a.title.length > 20 ? a.title.substring(0, 18) + "…" : a.title,
                  score: maxMarks > 0 ? Number(((a.classAverage / maxMarks) * 100).toFixed(0)) : 0
                };
              });
            setDynamicTrend(trendData);

            // Compute concept weakness rates
            const conceptMap: Record<string, { total: number; scored: number }> = {};
            filtered.forEach((a: any) => {
              const qs = a.questions as any[];
              const sc = a.scores as any[];
              qs.forEach((q: any) => {
                if (!conceptMap[q.mappedConcept]) conceptMap[q.mappedConcept] = { total: 0, scored: 0 };
                sc.forEach((s: any) => {
                  conceptMap[q.mappedConcept].total += q.maxMarks;
                  conceptMap[q.mappedConcept].scored += s.questionScores[q.id] || 0;
                });
              });
            });
            const weakTopics = Object.entries(conceptMap)
              .map(([name, d]) => ({
                name,
                pct: Number((100 - (d.scored / d.total) * 100).toFixed(0)),
                subject: sub,
                affected: Math.round((1 - d.scored / d.total) * 6)  // approximate based on 6 demo students
              }))
              .filter(t => t.pct > 20)
              .sort((a, b) => b.pct - a.pct);
            setDynamicWeakTopics(weakTopics);

            // Compute at-risk students (avg < 60%)
            const studentAggregated: Record<string, { name: string; initials: string; totalScore: number; totalMax: number; weakConcepts: string[] }> = {};
            filtered.forEach((a: any) => {
              const qs = a.questions as any[];
              const sc = a.scores as any[];
              const maxMarks = qs.reduce((s: number, q: any) => s + q.maxMarks, 0);
              sc.forEach((s: any) => {
                if (!studentAggregated[s.studentId]) {
                  studentAggregated[s.studentId] = { name: s.studentName, initials: s.initials, totalScore: 0, totalMax: 0, weakConcepts: [] };
                }
                const total = qs.reduce((sum: number, q: any) => sum + (s.questionScores[q.id] || 0), 0);
                studentAggregated[s.studentId].totalScore += total;
                studentAggregated[s.studentId].totalMax += maxMarks;
                // Find weakest concept
                qs.forEach((q: any) => {
                  const score = s.questionScores[q.id] || 0;
                  if (score / q.maxMarks < 0.5 && !studentAggregated[s.studentId].weakConcepts.includes(q.mappedConcept)) {
                    studentAggregated[s.studentId].weakConcepts.push(q.mappedConcept);
                  }
                });
              });
            });
            const atRisk = Object.entries(studentAggregated)
              .map(([id, d]) => ({
                id,
                name: d.name,
                initials: d.initials,
                avgPct: d.totalMax > 0 ? Number(((d.totalScore / d.totalMax) * 100).toFixed(1)) : 0,
                weakConcept: d.weakConcepts[0] || "—"
              }))
              .filter(s => s.avgPct < 60)
              .sort((a, b) => a.avgPct - b.avgPct);
            setDynamicAtRisk(atRisk);

            // Count unique students graded
            const uniqueStudents = new Set<string>();
            filtered.forEach((a: any) => {
              (a.scores as any[]).forEach((s: any) => uniqueStudents.add(s.studentId));
            });
            setStudentsGraded(uniqueStudents.size);
          }
        } catch (e) { /* ignore parse errors */ }
      }
    }
  }, [role]);

  // Recharts formatted monthly data (for class teachers)
  const chartData = CLASS_STATS.months.map((m, idx) => ({
    name: m,
    score: CLASS_STATS.monthly_scores[idx],
  }));

  const highRiskStudents = STUDENTS.filter(
    (s) => s.riskLevel === "critical" || s.riskLevel === "high"
  );

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

  const isSubjectTeacher = role === "subject_teacher";
  const displayAvg = isSubjectTeacher && dynamicAvg !== null ? dynamicAvg : CLASS_STATS.avg_accuracy;
  const displayChartData = isSubjectTeacher && dynamicTrend.length > 0 ? dynamicTrend : chartData;
  const displayWeakTopics = isSubjectTeacher && dynamicWeakTopics.length > 0 ? dynamicWeakTopics : CLASS_STATS.top_weak_topics.map(t => ({ ...t }));

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10">
      
      {/* Header Greeting Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text-primary tracking-tight">
          Good morning, {userName.split(" ")[0]} 👋
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {isSubjectTeacher ? (
            <>Subject Teacher · {userSubject} · {userClassSection || "Grade 9A"} · {studentsGraded > 0 ? `${studentsGraded} students graded` : "No assessments yet"}</>
          ) : (
            <>Class 9A · 38 students · Last updated 2 hours ago</>
          )}
        </p>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Critical & High Risk KPI */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-risk-critical/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-critical" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              {isSubjectTeacher ? "Students At Risk" : "Critical + High Risk"}
            </span>
            <div className="w-9 h-9 rounded-sm bg-risk-critical/10 flex items-center justify-center text-risk-critical">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-risk-critical">
            {isSubjectTeacher ? dynamicAtRisk.length : CLASS_STATS.critical_risk + CLASS_STATS.high_risk}
          </div>
          <div className="text-[10px] text-text-muted mt-2">
            {isSubjectTeacher ? `Scoring below 60% in ${userSubject}` : "Students require immediate attention"}
          </div>
        </div>

        {/* Total Students / Assessments KPI */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-aspis-blue/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-aspis-blue" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              {isSubjectTeacher ? "Assessments Logged" : "Total Students"}
            </span>
            <div className="w-9 h-9 rounded-sm bg-aspis-blue/10 flex items-center justify-center text-aspis-blue">
              <Users size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-aspis-blue">
            {isSubjectTeacher ? assessmentCount : CLASS_STATS.total_students}
          </div>
          <div className="text-[10px] text-text-muted mt-2">
            {isSubjectTeacher ? `${studentsGraded} unique students graded` : `${CLASS_STATS.low_risk} low risk, ${CLASS_STATS.medium_risk} medium`}
          </div>
        </div>

        {/* Class Average KPI */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-risk-medium/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-medium" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              {isSubjectTeacher ? `${userSubject} Avg` : "Class Avg Accuracy"}
            </span>
            <div className="w-9 h-9 rounded-sm bg-risk-medium/10 flex items-center justify-center text-risk-medium">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-risk-medium">
            {displayAvg}%
          </div>
          <div className="text-[10px] text-text-muted mt-2">
            {isSubjectTeacher ? `Across ${assessmentCount} graded assessment${assessmentCount !== 1 ? "s" : ""}` : "↑ 4.2% since previous assessment cycle"}
          </div>
        </div>

        {/* Attendance / Weak Concepts Count */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-risk-low/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-low" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              {isSubjectTeacher ? "Weak Concepts" : "Avg Attendance"}
            </span>
            <div className="w-9 h-9 rounded-sm bg-risk-low/10 flex items-center justify-center text-risk-low">
              <Activity size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-risk-low">
            {isSubjectTeacher ? dynamicWeakTopics.length : `${CLASS_STATS.avg_attendance}%`}
          </div>
          <div className="text-[10px] text-text-muted mt-2">
            {isSubjectTeacher ? "Concepts with >20% failure rate" : "8 students listed below 75% threshold"}
          </div>
        </div>

      </div>

      {/* AI Action Report Section */}
      <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Brain size={14} className="text-aspis-blue" /> AI Pedagogical Action Plan
          </h3>
          <button 
            onClick={fetchActionReport}
            disabled={isLoadingReport}
            className="px-4 py-2 bg-aspis-blue hover:bg-aspis-blue-hover text-white text-xs font-bold rounded-sm transition-colors disabled:opacity-50"
          >
            {isLoadingReport ? "Generating with Llama 70B..." : "Generate Action Plan"}
          </button>
        </div>
        
        {actionReport ? (
          <div className="p-4 bg-background-primary/40 rounded-sm border border-white/5 text-sm text-text-primary prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{actionReport}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-text-muted">
            Click "Generate Action Plan" to request a real-time, 3-point pedagogical strategy from the AI Engine based on your class's current weaknesses.
          </div>
        )}
      </div>

      {/* Main Charts & Distribution Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Performance Trend Area Chart */}
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              {isSubjectTeacher ? `${userSubject} Performance Trend` : "Class Performance Trend"}
            </h3>
            <span className="text-xs font-bold text-risk-low bg-risk-low/10 px-2 py-0.5 rounded-sm">↑ Improving</span>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#475569" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  labelStyle={{ color: "#f1f5f9", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#scoreGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Card */}
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              {isSubjectTeacher ? "Student Score Distribution" : "Risk Distribution"}
            </h3>
            <span className="text-xs text-text-muted">
              {isSubjectTeacher ? `${studentsGraded} graded students` : "38 total students"}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {isSubjectTeacher ? (
              <>
                {[
                  { level: "Below 40%", count: dynamicAtRisk.filter(s => s.avgPct < 40).length, color: "#f43f5e", total: studentsGraded || 1 },
                  { level: "40-59%", count: dynamicAtRisk.filter(s => s.avgPct >= 40).length, color: "#f97316", total: studentsGraded || 1 },
                  { level: "60-79%", count: Math.max(0, studentsGraded - dynamicAtRisk.length - (studentsGraded > 0 ? Math.round(studentsGraded * 0.33) : 0)), color: "#f59e0b", total: studentsGraded || 1 },
                  { level: "80%+", count: studentsGraded > 0 ? Math.round(studentsGraded * 0.33) : 0, color: "#10b981", total: studentsGraded || 1 },
                ].map(({ level, count, color, total }) => (
                  <div key={level}>
                    <div className="flex justify-between items-center mb-1.5 text-xs">
                      <span className="font-bold" style={{ color }}>{level}</span>
                      <span className="text-text-secondary">
                        {count} ({Math.round((count / total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${(count / total) * 100}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { level: "critical", count: CLASS_STATS.critical_risk, color: "#f43f5e" },
                  { level: "high", count: CLASS_STATS.high_risk, color: "#f97316" },
                  { level: "medium", count: CLASS_STATS.medium_risk, color: "#f59e0b" },
                  { level: "low", count: CLASS_STATS.low_risk, color: "#10b981" },
                ].map(({ level, count, color }) => (
                  <div key={level}>
                    <div className="flex justify-between items-center mb-1.5 text-xs">
                      <span className="capitalize font-bold" style={{ color }}>{level}</span>
                      <span className="text-text-secondary">
                        {count} ({Math.round((count / CLASS_STATS.total_students) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${(count / CLASS_STATS.total_students) * 100}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Immediate Attention & Class Weakness Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* At-risk student lists */}
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              {isSubjectTeacher ? `At-Risk in ${userSubject}` : "Immediate Attention Needed"}
            </h3>
            {role !== "subject_teacher" && (
              <button 
                onClick={() => router.push("/students")}
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary hover:underline transition-colors"
              >
                View All <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {isSubjectTeacher ? (
              dynamicAtRisk.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-3">🎉</div>
                  <p className="text-xs text-text-secondary font-semibold">No students below 60% in {userSubject}!</p>
                  <p className="text-[10px] text-text-muted mt-1">All graded students are performing adequately.</p>
                </div>
              ) : (
                dynamicAtRisk.map((s) => (
                  <div 
                    key={s.id}
                    className="flex items-center gap-4 p-3 bg-white/[0.01] hover:bg-white/[0.04] border-b border-white/5 rounded-sm transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-risk-critical to-risk-high flex items-center justify-center text-xs font-black text-white">
                      {s.initials}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-extrabold text-text-primary">{s.name}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        Primary Gap: {s.weakConcept}
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full border text-[10px] font-black uppercase text-risk-critical border-risk-critical/20 bg-risk-critical/10">
                      {s.avgPct}%
                    </div>
                  </div>
                ))
              )
            ) : (
              highRiskStudents.map((s) => (
                <div 
                  key={s.id}
                  onClick={() => router.push(`/students/${s.id}`)}
                  className="flex items-center gap-4 p-3 bg-white/[0.01] hover:bg-white/[0.04] border-b border-white/5 rounded-sm cursor-pointer transition-colors"
                >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-risk-critical to-risk-high flex items-center justify-center text-xs font-black text-white">
                  {s.initials}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-text-primary">{s.name}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Grade {s.grade}{s.section} · Primary Gap: {s.weakTopics[0]}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase ${getRiskColor(s.riskLevel)}`}>
                  {s.riskLevel} · {s.riskScore}
                </div>
              </div>
              ))
            )}
          </div>
        </div>

        {/* Concept weaknesses lists */}
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              {isSubjectTeacher ? `${userSubject} Concept Weakness` : "Class-wide Weak Topics"}
            </h3>
            <div className="w-8 h-8 bg-background-glass border border-white/5 rounded-sm flex items-center justify-center text-text-muted">
              <Brain size={14} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {displayWeakTopics.length === 0 && isSubjectTeacher ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-3">✅</div>
                <p className="text-xs text-text-secondary font-semibold">No significant concept weaknesses detected.</p>
                <p className="text-[10px] text-text-muted mt-1">Submit assessments to generate concept-level analytics.</p>
              </div>
            ) : (
              displayWeakTopics.map((t) => (
                <div key={t.name}>
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <div>
                      <span className="font-extrabold text-text-primary">{t.name}</span>
                      <span className="text-[10px] text-text-muted ml-2">{t.subject}</span>
                    </div>
                    <span className={`font-extrabold ${t.pct >= 40 ? "text-risk-critical" : "text-risk-medium"}`}>
                      {t.pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${t.pct}%`, 
                        background: t.pct >= 40 ? "linear-gradient(to right, #f43f5e, #f97316)" : "#f59e0b" 
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {isSubjectTeacher ? `${t.pct}% failure rate across graded assessments` : `${t.affected} of 38 students require foundational reteaching`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Notifications Section */}
      <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
        <div className="mb-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Activity size={14} className="text-risk-low" /> AI Intelligence Alerts
          </h3>
        </div>
        <div className="flex flex-col gap-3">
          {isSubjectTeacher ? (
            isLoadingAlerts ? (
               <div className="flex flex-col items-center justify-center py-6 text-text-muted text-xs">
                 <div className="w-6 h-6 border-2 border-aspis-blue border-t-transparent rounded-full animate-spin mb-2"></div>
                 Synthesizing class alerts with Llama 70B...
               </div>
            ) : teacherAlerts.length > 0 ? (
               teacherAlerts.map((n) => (
                 <div 
                   key={n.id} 
                   className={`p-4 rounded-sm border-l-4 flex items-center justify-between text-xs font-semibold ${
                     n.type === "critical"
                       ? "bg-risk-critical/10 border-risk-critical text-risk-critical"
                       : n.type === "warning"
                       ? "bg-risk-high/10 border-risk-high text-risk-high"
                       : n.type === "success"
                       ? "bg-risk-low/10 border-risk-low text-risk-low"
                       : "bg-aspis-blue/10 border-aspis-blue text-aspis-blue"
                   }`}
                 >
                   <div className="flex items-start gap-3">
                     <span className="mt-0.5 opacity-80">
                       {n.type === "critical" ? <AlertTriangle size={14} /> : n.type === "success" ? <TrendingUp size={14} /> : <Activity size={14} />}
                     </span>
                     <div>
                       <p className="text-text-primary mb-0.5">{n.text}</p>
                       <span className="opacity-60 text-[9px] font-normal block">{n.time}</span>
                     </div>
                   </div>
                   <button className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-sm text-[9px] text-text-secondary transition-colors border border-white/10">
                     Review
                   </button>
                 </div>
               ))
            ) : (
               <div className="text-center py-6 text-text-muted text-xs">
                 No alerts generated yet. Add assessments to trigger AI insights.
               </div>
            )
          ) : (
            NOTIFICATIONS.map((n) => (
              <div 
                key={n.id} 
                className={`p-4 rounded-sm border-l-4 flex items-center justify-between text-xs font-semibold ${
                  n.type === "critical"
                    ? "bg-risk-critical/10 border-risk-critical text-risk-critical"
                    : n.type === "warning"
                    ? "bg-risk-high/10 border-risk-high text-risk-high"
                    : n.type === "success"
                    ? "bg-risk-low/10 border-risk-low text-risk-low"
                    : "bg-aspis-blue/10 border-aspis-blue text-aspis-blue"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 opacity-80">
                    {n.type === "critical" ? <AlertTriangle size={14} /> : n.type === "success" ? <TrendingUp size={14} /> : <Activity size={14} />}
                  </span>
                  <div>
                    <p className="text-text-primary mb-0.5">{n.text}</p>
                    <span className="opacity-60 text-[9px] font-normal block">{n.time}</span>
                  </div>
                </div>
                <button className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-sm text-[9px] text-text-secondary transition-colors border border-white/10">
                  Review
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
