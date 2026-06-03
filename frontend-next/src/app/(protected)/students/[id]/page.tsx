"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, Activity, Heart, Trophy, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw, Download, Share2, Target, BookOpen, Network } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip, LineChart, Line, CartesianGrid, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import ReactMarkdown from "react-markdown";
import { STUDENTS, Student } from "@/data/mockData";

const TABS = ["Overview", "Academic", "Future Risks", "AI Report"];

export default function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use() in Next.js 15
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const [llmReport, setLlmReport] = useState<any | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  
  const fetchLlmReport = async () => {
    if (llmReport || isLoadingReport) return;
    setIsLoadingReport(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/intelligence/student/${id}`);
      const data = await res.json();
      setLlmReport(data.llm_report);
    } catch (err) {
      console.error(err);
      setLlmReport("Failed to connect to AI Engine.");
    } finally {
      setIsLoadingReport(false);
    }
  };

  const [forecasts, setForecasts] = useState<any[]>([]);
  const [isLoadingForecasts, setIsLoadingForecasts] = useState(false);
  const [academicMarks, setAcademicMarks] = useState<any[]>([]);
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);

  useEffect(() => {
    const fetchForecasts = async () => {
      setIsLoadingForecasts(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/intelligence/forecast/${id}`);
        const data = await res.json();
        setForecasts(data.forecasts || []);
      } catch (err) {
        console.error("Failed to fetch forecasts:", err);
      } finally {
        setIsLoadingForecasts(false);
      }
    };
    
    const fetchMarks = async () => {
      setIsLoadingMarks(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/student/${id}/marks`);
        const data = await res.json();
        setAcademicMarks(data.marks || []);
      } catch (err) {
        console.error("Failed to fetch marks:", err);
      } finally {
        setIsLoadingMarks(false);
      }
    };

    fetchForecasts();
    fetchMarks();
  }, [id]);

  useEffect(() => {
    if (activeTab === "AI Report") {
      fetchLlmReport();
    }
  }, [activeTab, id]);
  
  const student = STUDENTS.find((s) => s.id === id) || STUDENTS[0];

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

  const getRiskBorderColor = (level: Student["riskLevel"]) => {
    switch (level) {
      case "critical":
        return "border-l-4 border-risk-critical";
      case "high":
        return "border-l-4 border-risk-high";
      case "medium":
        return "border-l-4 border-risk-medium";
      default:
        return "border-l-4 border-risk-low";
    }
  };

  // Recharts formatted domain values
  const domainData = [
    { name: "Academics", value: student.overall_accuracy, color: "#6366f1" },
    { name: "Behavioral", value: student.behavioral.composite * 10, color: "#8b5cf6" },
    { name: "Sports", value: student.sports.fitness, color: "#10b981" },
    { name: "Health", value: Math.max(0, 100 - student.health.absences * 4), color: "#f43f5e" },
  ];

  const handleDownloadPDF = async () => {
    const element = document.getElementById("ai-report-content");
    if (!element) return;
    
    try {
      // Dynamically import html2pdf to avoid Next.js SSR issues
      const html2pdf = (await import("html2pdf.js")).default;
      
      const opt = {
        margin:       10,
        filename:     `${student.name.replace(/\s+/g, '_')}_AI_Report.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  const handleShare = async () => {
    if (!llmReport) return;
    
    // Format the JSON data nicely for sharing if it's an object
    const reportText = typeof llmReport === 'object' 
      ? `Holistic Score: ${llmReport.overallScore}/100\n\nStrengths:\n${(llmReport.strengths || []).map((s: string) => `- ${s}`).join('\n')}\n\nGaps:\n${(llmReport.gaps || []).map((s: string) => `- ${s}`).join('\n')}\n\nSummary: ${llmReport.summaryText}`
      : llmReport;
      
    const text = `Check out the AI Performance Report for ${student.name} generated by ASPIS OS.\n\n` + reportText;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${student.name} AI Intelligence Report`,
          text: text,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert("Report copied to clipboard! You can now paste and share it.");
    }
  };

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10">
      
      {/* Back button */}
      <button 
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 px-4 py-2 mb-6 rounded-sm bg-background-glass border border-white/5 hover:border-white/10 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      {/* Hero Profile Banner Card */}
      <div className="p-8 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden mb-8">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-aspis-blue via-aspis-academic to-aspis-behavioral" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-aspis-blue to-aspis-behavioral flex items-center justify-center text-2xl font-black text-white border-2 border-white/10 shadow-glow">
              {student.initials}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-black text-text-primary">{student.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${getRiskColor(student.riskLevel)}`}>
                  {student.riskLevel} Risk
                </span>
              </div>
              <div className="flex gap-4 text-xs text-text-secondary flex-wrap">
                <span>📚 Grade {student.grade}{student.section}</span>
                <span>🪪 Roll #{student.roll}</span>
                <span>📅 Attendance: <strong className={student.attendance < 75 ? "text-risk-critical" : "text-risk-low"}>{student.attendance}%</strong></span>
                <span>
                  {student.trend === "improving" ? (
                    <span className="flex items-center gap-1"><TrendingUp size={12} className="text-risk-low" /> Improving</span>
                  ) : student.trend === "declining" ? (
                    <span className="flex items-center gap-1"><TrendingDown size={12} className="text-risk-critical" /> Declining</span>
                  ) : (
                    <span className="flex items-center gap-1"><Minus size={12} className="text-text-muted" /> Stable</span>
                  )}
                </span>
              </div>

              {/* Badges list */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {student.weakTopics.map((t) => (
                  <span key={t} className="px-2.5 py-0.5 bg-risk-critical/10 text-risk-critical border border-risk-critical/20 rounded-full text-[10px] font-bold">
                    ⚠️ {t}
                  </span>
                ))}
                {student.strongTopics.slice(0, 2).map((t) => (
                  <span key={t} className="px-2.5 py-0.5 bg-risk-low/10 text-risk-low border border-risk-low/20 rounded-full text-[10px] font-bold">
                    ✓ {t}
                  </span>
                ))}
              </div>

            </div>
          </div>

          {/* Risk gauge info */}
          <div className="flex items-center gap-4 bg-background-glass border border-white/5 p-4 rounded-md w-full md:w-auto">
            <div className="text-center">
              <div className="text-2xl font-black text-text-primary">{student.riskScore}</div>
              <div className="text-[9px] uppercase tracking-wider text-text-muted font-bold mt-1">Risk Score (0-100)</div>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-white/5 hover:bg-white/10 text-[10px] font-bold text-text-secondary transition-colors">
              <RefreshCw size={11} /> Recompute
            </button>
          </div>
        </div>
      </div>

      {/* Domain stats summary grids */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-aspis-blue" />
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Academic Accuracy</div>
          <div className="text-3xl font-black text-aspis-blue">{student.overall_accuracy}%</div>
          <div className="text-[9px] text-text-secondary mt-1">{student.weakTopics.length} detected conceptual gaps</div>
        </div>

        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-aspis-academic" />
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Behavioral Composite</div>
          <div className="text-3xl font-black text-aspis-academic">{student.behavioral.composite} <span className="text-xs text-text-muted">/ 10</span></div>
          <div className="text-[9px] text-text-secondary mt-1">Engagement & consistency ratings</div>
        </div>

        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-low" />
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Fitness Rating</div>
          <div className="text-3xl font-black text-risk-low">{student.sports.fitness}</div>
          <div className="text-[9px] text-text-secondary truncate mt-1">{student.sports.sports.join(", ")}</div>
        </div>

        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-critical" />
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Absences Count</div>
          <div className="text-3xl font-black text-risk-critical">{student.health.absences}</div>
          <div className="text-[9px] text-text-secondary mt-1">{student.health.exam_absences} absences during assessments</div>
        </div>
      </div>

      {/* Tabs Selector list */}
      <div className="flex border-b border-white/10 mb-6 gap-2">
        {TABS.map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 rounded-t-sm ${
              activeTab === tab 
                ? "text-aspis-blue border-aspis-blue bg-white/[0.02]" 
                : "text-text-muted border-transparent hover:text-text-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content renderer */}
      <div className="fade-up">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "Overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart */}
            <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-6">Domain Performance Overview</h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domainData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#475569" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                      labelStyle={{ color: "#f1f5f9", fontWeight: "bold" }}
                    />
                    <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                      {domainData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Behavioral Breakdown */}
            <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-6">Behavioral Breakdown</h3>
              <div className="flex flex-col gap-4">
                {[
                  { label: "Class Participation", value: student.behavioral.participation, color: "#6366f1" },
                  { label: "Leadership Potential", value: student.behavioral.leadership, color: "#8b5cf6" },
                  { label: "Assignment Consistency", value: student.behavioral.assignment, color: "#f59e0b" },
                  { label: "Engagement Index", value: student.behavioral.composite, color: "#3b82f6" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-text-secondary">{item.label}</span>
                      <span className="font-extrabold" style={{ color: item.color }}>{item.value} / 10</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ width: `${item.value * 10}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: ACADEMIC */}
        {activeTab === "Academic" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Weak Topic mappings */}
            <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-6">Gaps & Weak Topics</h3>
              <div className="flex flex-col gap-3">
                {student.weakTopics.map((topic, idx) => (
                  <div key={topic} className="flex items-center gap-4 p-3 bg-risk-critical-bg border border-risk-critical/10 rounded-sm">
                    <span className="text-risk-critical font-black text-sm">✗</span>
                    <div>
                      <div className="text-sm font-bold text-text-primary">{topic}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {idx === 0 ? "Conceptual gap (requires core tutorial)" : idx === 1 ? "Incomplete practice attempts" : "Careless mathematical calculations"}
                      </div>
                    </div>
                    <div className="ml-auto text-xs font-black text-risk-critical">
                      {32 + idx * 8}% Accuracy
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strong topics list */}
            <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-6">Subject Masteries & Strengths</h3>
              <div className="flex flex-col gap-3">
                {student.strongTopics.map((topic, idx) => (
                  <div key={topic} className="flex items-center gap-4 p-3 bg-risk-low-bg border border-risk-low/10 rounded-sm">
                    <span className="text-risk-low font-black text-sm">✓</span>
                    <div className="text-sm font-bold text-text-primary">{topic}</div>
                    <div className="ml-auto text-xs font-black text-risk-low">
                      {82 + idx * 6}% Accuracy
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Academic Marks (Gradebook) */}
            <div className="col-span-1 lg:col-span-2 bg-background-card border border-white/5 rounded-md shadow-card p-6 mt-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={14} className="text-aspis-blue" /> Official Academic Transcript & Marks
                </h3>
                <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-aspis-blue hover:text-white transition-colors bg-aspis-blue/10 px-3 py-1.5 rounded-sm">
                  <Download size={12} /> Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-text-muted">
                      <th className="pb-3 font-semibold">Assessment Title</th>
                      <th className="pb-3 font-semibold">Subject</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Score / Max</th>
                      <th className="pb-3 font-semibold">Class Avg</th>
                      <th className="pb-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {isLoadingMarks ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-text-muted">Loading live assessment database...</td>
                      </tr>
                    ) : academicMarks.length > 0 ? (
                      academicMarks.map((mark, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 font-bold text-text-primary">{mark.title}</td>
                          <td className="py-4 text-text-secondary">{mark.subject}</td>
                          <td className="py-4 text-text-muted">{mark.date}</td>
                          <td className="py-4 font-black">
                            <span className={mark.score < mark.max * 0.4 ? "text-risk-critical" : mark.score < mark.max * 0.7 ? "text-risk-medium" : "text-risk-low"}>
                              {mark.score}
                            </span>
                            <span className="text-text-muted text-[10px]"> / {mark.max}</span>
                          </td>
                          <td className="py-4 text-text-secondary">{mark.avg}</td>
                          <td className="py-4 text-right">
                            <span className="px-2 py-1 bg-risk-low/10 text-risk-low text-[9px] uppercase tracking-widest font-black rounded-sm">Verified</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-text-muted border border-dashed border-white/10 rounded-sm">
                          No assessments logged yet. Upload assessment papers in the platform to populate marks.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: FUTURE RISKS */}
        {activeTab === "Future Risks" && (
          <div>
            <div className="p-4 bg-risk-critical/10 border-l-4 border-risk-critical rounded-sm flex items-start gap-4 mb-6">
              <AlertTriangle className="text-risk-critical flex-shrink-0" size={16} />
              <div>
                <div className="text-xs font-extrabold text-risk-critical">Future Academic Impact Warning</div>
                <div className="text-[10px] text-text-secondary mt-1">
                  Active weaknesses propagate downstream across upcoming school years. Prerequisite concept chains are at risk of collapsing.
                </div>
              </div>
            </div>

            {/* Longitudinal Risk Chart */}
            <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6 mb-8">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
                <Activity size={14} className="text-aspis-blue" /> Longitudinal Risk Forecast
              </h3>
              
              {isLoadingForecasts ? (
                <div className="flex flex-col items-center justify-center py-8 text-text-muted text-xs">
                  <div className="w-6 h-6 border-2 border-aspis-blue border-t-transparent rounded-full animate-spin mb-2"></div>
                  Computing linear risk trajectories...
                </div>
              ) : forecasts.length > 0 ? (
                <div className="flex flex-col gap-8">
                  {forecasts.map((f, idx) => {
                    const data = f.history.map((h: number, i: number) => ({
                      name: `T${i + 1}`,
                      score: h
                    }));
                    data.push({ name: "Predicted", score: f.predicted });

                    return (
                      <div key={idx} className="flex flex-col lg:flex-row gap-6 items-center">
                        <div className="w-full lg:w-1/3">
                          <h4 className="font-bold text-text-primary text-sm mb-1">{f.topic}</h4>
                          <div className={`text-xs font-black uppercase mb-2 ${
                            f.risk === "critical" ? "text-risk-critical" : 
                            f.risk === "high" ? "text-risk-high" : "text-risk-low"
                          }`}>
                            {f.risk} Trajectory
                          </div>
                          <p className="text-[10px] text-text-muted">
                            Based on {f.history.length} recent assessments, the forecast predicts a score of {f.predicted}% in the next cycle.
                          </p>
                        </div>
                        <div className="h-[150px] w-full lg:w-2/3">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                              <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                              <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} tickLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                                labelStyle={{ color: "#f1f5f9", fontWeight: "bold" }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="score" 
                                stroke={f.risk === "critical" ? "#f43f5e" : f.risk === "high" ? "#f59e0b" : "#10b981"} 
                                strokeWidth={3} 
                                activeDot={{ r: 6 }} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-text-muted text-xs">
                  No graded assessments logged yet. Upload papers in the Academic Portal to generate forecasts.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {student.futureRisks.map((risk, idx) => (
                <div key={idx} className={`p-4 bg-background-glass border border-white/5 rounded-sm ${getRiskBorderColor(risk.impact >= 0.75 ? "critical" : "medium")}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-risk-critical-bg text-risk-critical border border-risk-critical/20 rounded-full text-[10px] font-black">{risk.from}</span>
                      <span className="text-text-muted font-black text-xs">→</span>
                      <span className="px-2.5 py-0.5 bg-risk-medium-bg text-risk-medium border border-risk-medium/20 rounded-full text-[10px] font-black">
                        {risk.to} <span className="opacity-60 font-medium ml-1">Grade {risk.grade}</span>
                      </span>
                      {risk.cross && (
                        <span className="px-2 py-0.5 bg-background-glass border border-white/10 text-text-muted text-[8px] font-bold tracking-widest rounded-full uppercase">Cross-Subject</span>
                      )}
                    </div>
                    <div className="flex gap-4 text-[10px] font-bold text-text-secondary">
                      <span>Impact Severity: <strong className={risk.impact >= 0.75 ? "text-risk-critical" : "text-risk-medium"}>{Math.round(risk.impact * 100)}%</strong></span>
                      <span>Timeline: <strong>{risk.gap === 0 ? "Immediate concern" : `In ${risk.gap} Year(s)`}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AI REPORT */}
        {activeTab === "AI Report" && (
          <div className="flex flex-col gap-6">
            <div id="ai-report-content" className="bg-background-card border border-aspis-academic/20 rounded-md shadow-card p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                {llmReport && !isLoadingReport && (
                  <div className="flex gap-2 ml-auto" data-html2canvas-ignore>
                    <button 
                      onClick={handleShare}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider border border-white/5"
                    >
                      <Share2 size={12} /> Share
                    </button>
                    <button 
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-aspis-academic/20 hover:bg-aspis-academic/30 text-aspis-academic transition-colors text-[10px] font-bold uppercase tracking-wider border border-aspis-academic/20"
                    >
                      <Download size={12} /> Save PDF
                    </button>
                  </div>
                )}
              </div>
              
              {isLoadingReport ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                  <div className="w-8 h-8 border-2 border-aspis-academic border-t-transparent rounded-full animate-spin mb-4"></div>
                  Generating multi-domain AI correlations...
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {typeof llmReport === "object" && llmReport !== null ? (
                    <>
                      {/* Top Metric & Radar */}
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-8 bg-background-glass border border-white/5 rounded-md shadow-inner">
                           <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">Overall AI Score</div>
                           <div className="text-6xl font-black text-aspis-academic drop-shadow-glow">{llmReport.overallScore || 0}</div>
                           <div className="w-full bg-white/5 rounded-full h-1.5 mt-6 relative overflow-hidden">
                             <div className="bg-gradient-to-r from-aspis-blue to-aspis-academic h-1.5 rounded-full" style={{ width: `${llmReport.overallScore || 0}%` }}></div>
                           </div>
                        </div>
                        
                        <div className="w-full md:w-2/3 h-[280px]">
                           <ResponsiveContainer width="100%" height="100%">
                             <RadarChart cx="50%" cy="50%" outerRadius="75%" data={llmReport.domains || []}>
                                <PolarGrid stroke="#ffffff15" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Performance" dataKey="score" stroke="#6366f1" fill="url(#colorRadar)" fillOpacity={0.6} />
                                <defs>
                                  <linearGradient id="colorRadar" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                  </linearGradient>
                                </defs>
                                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                             </RadarChart>
                           </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Strengths and Gaps */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 border border-risk-low/20 bg-risk-low/5 rounded-md relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-low" />
                          <h4 className="text-risk-low font-bold text-xs uppercase tracking-wider mb-5 flex items-center gap-2"><TrendingUp size={14} /> Key Strengths</h4>
                          <ul className="flex flex-col gap-4">
                            {(llmReport.strengths || []).map((s: string, i: number) => (
                               <li key={i} className="text-sm text-text-primary flex items-start gap-3">
                                 <div className="w-1.5 h-1.5 rounded-full bg-risk-low mt-1.5 shrink-0" />
                                 {s}
                               </li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-6 border border-risk-critical/20 bg-risk-critical/5 rounded-md relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-critical" />
                          <h4 className="text-risk-critical font-bold text-xs uppercase tracking-wider mb-5 flex items-center gap-2"><AlertTriangle size={14} /> Critical Gaps</h4>
                          <ul className="flex flex-col gap-4">
                            {(llmReport.gaps || []).map((s: string, i: number) => (
                               <li key={i} className="text-sm text-text-primary flex items-start gap-3">
                                 <div className="w-1.5 h-1.5 rounded-full bg-risk-critical mt-1.5 shrink-0" />
                                 {s}
                               </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="p-6 border border-aspis-blue/20 bg-aspis-blue/5 rounded-md relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-[3px] bg-aspis-blue" />
                         <h4 className="text-aspis-blue font-bold text-xs uppercase tracking-wider mb-5 flex items-center gap-2"><Brain size={14} /> AI Actionable Recommendations</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(llmReport.recommendations || []).map((r: string, i: number) => (
                               <div key={i} className="p-4 bg-background-card border border-white/5 rounded-md text-sm text-text-primary shadow-sm hover:border-white/10 transition-colors">
                                 {r}
                               </div>
                            ))}
                         </div>
                      </div>

                      {/* Summary Text */}
                      <div className="p-6 bg-background-glass border border-white/10 rounded-md text-sm text-text-secondary leading-relaxed italic border-l-4 border-l-aspis-academic mb-8">
                        "{llmReport.summaryText}"
                      </div>
                      
                      {/* PAGE 2: Teacher's Action Plan */}
                      {llmReport.teacherReport && (
                        <div className="break-before-page pt-10 mt-10 border-t border-white/10">
                          <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                              <Target className="text-aspis-academic" size={24} /> Pedagogical Action Plan
                            </h3>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted border border-white/10 px-3 py-1 rounded-full">For Teacher Only</div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-[#0f172a] border border-aspis-academic/20 rounded-md shadow-inner">
                               <h4 className="text-aspis-academic font-bold text-xs uppercase tracking-wider mb-5 flex items-center gap-2">Instructional Focus Areas</h4>
                               <ul className="flex flex-col gap-4">
                                 {(llmReport.teacherReport.focusAreas || []).map((f: string, i: number) => (
                                    <li key={i} className="text-sm text-text-primary flex items-start gap-3">
                                      <div className="w-1.5 h-1.5 rounded-full bg-aspis-academic mt-1.5 shrink-0" />
                                      {f}
                                    </li>
                                 ))}
                               </ul>
                            </div>
                            
                            <div className="p-6 bg-[#2e1022] border border-risk-critical/20 rounded-md shadow-inner">
                               <h4 className="text-risk-critical font-bold text-xs uppercase tracking-wider mb-5 flex items-center gap-2"><AlertTriangle size={14} /> Predictive Risks</h4>
                               <ul className="flex flex-col gap-4">
                                 {(llmReport.teacherReport.futureRisks || []).map((r: string, i: number) => (
                                    <li key={i} className="text-sm text-text-primary flex items-start gap-3">
                                      <div className="w-1.5 h-1.5 rounded-full bg-risk-critical mt-1.5 shrink-0" />
                                      {r}
                                    </li>
                                 ))}
                               </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PAGE 3: Parent's Overview */}
                      {llmReport.parentReport && (
                        <div className="break-before-page pt-10 mt-10 border-t border-white/10">
                          <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                              <BookOpen className="text-aspis-blue" size={24} /> At-Home Overview
                            </h3>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-aspis-blue border border-aspis-blue/30 px-3 py-1 rounded-full bg-aspis-blue/10">Parent Copy</div>
                          </div>
                          
                          <div className="p-8 bg-gradient-to-br from-aspis-blue/10 to-transparent border border-aspis-blue/20 rounded-md mb-6">
                            <h4 className="text-white font-bold text-lg mb-4">Message to Parents</h4>
                            <p className="text-sm text-text-secondary leading-relaxed">
                              {llmReport.parentReport.summary}
                            </p>
                          </div>
                          
                          <div className="p-6 bg-background-glass border border-white/10 rounded-md">
                            <h4 className="text-text-primary font-bold text-xs uppercase tracking-wider mb-5">How You Can Help At Home</h4>
                            <div className="grid grid-cols-1 gap-4">
                               {(llmReport.parentReport.encouragement || []).map((e: string, i: number) => (
                                  <div key={i} className="p-4 bg-background-card border border-white/5 rounded-md text-sm text-text-secondary flex gap-4">
                                    <span className="text-aspis-blue font-black text-lg">0{i + 1}</span>
                                    <span className="mt-1">{e}</span>
                                  </div>
                               ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* PAGE 4: Co-Domain Analysis */}
                      {llmReport.coDomainAnalysis && (
                        <div className="break-before-page pt-10 mt-10 border-t border-white/10">
                          <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                              <Network className="text-aspis-behavioral" size={24} /> Multi-Disciplinary Analysis
                            </h3>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-aspis-behavioral border border-aspis-behavioral/30 px-3 py-1 rounded-full bg-aspis-behavioral/10">Holistic Core</div>
                          </div>
                          
                          <div className="p-8 bg-background-glass border border-white/10 rounded-md mb-6 italic text-text-secondary leading-relaxed shadow-inner">
                            "{llmReport.coDomainAnalysis.intro}"
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(llmReport.coDomainAnalysis.correlations || []).map((corr: any, idx: number) => (
                               <div key={idx} className="p-6 bg-background-card border border-white/5 rounded-md relative overflow-hidden group hover:border-white/10 transition-all">
                                 <div className={`absolute top-0 left-0 w-full h-[3px] ${corr.impact === 'Positive' ? 'bg-risk-low' : corr.impact === 'Negative' ? 'bg-risk-critical' : 'bg-aspis-blue'}`} />
                                 <div className="flex items-center justify-between mb-4">
                                   <span className="text-xs font-bold uppercase tracking-widest text-text-muted">{corr.domain} Correlation</span>
                                   <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-sm ${corr.impact === 'Positive' ? 'bg-risk-low/10 text-risk-low' : corr.impact === 'Negative' ? 'bg-risk-critical/10 text-risk-critical' : 'bg-aspis-blue/10 text-aspis-blue'}`}>
                                     {corr.impact} Impact
                                   </span>
                                 </div>
                                 <p className="text-sm text-text-primary leading-relaxed">
                                   {corr.description}
                                 </p>
                               </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-text-muted text-sm text-center py-10">
                      Generating structured profile... If this persists, the AI response may have failed to format. {typeof llmReport === 'string' ? llmReport : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
