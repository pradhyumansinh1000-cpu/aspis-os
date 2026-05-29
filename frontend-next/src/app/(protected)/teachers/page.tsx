"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_MESSAGES, INITIAL_TEACHERS, TeacherComplianceRecord } from "@/data/mockData";
import { 
  Users, 
  Check, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Mail, 
  Bell, 
  ChevronRight, 
  Search,
  BookOpen,
  Trash2,
  Key,
  Plus,
  X
} from "lucide-react";


export default function TeacherCompliance() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherComplianceRecord[]>([]);
  // Filter roster
  const [searchQuery, setSearchQuery] = useState("");
  const [alertSuccessMessage, setAlertSuccessMessage] = useState<string | null>(null);

  // Add Teacher Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherGrade, setNewTeacherGrade] = useState("");
  const [newTeacherDivision, setNewTeacherDivision] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherCredentials, setNewTeacherCredentials] = useState(true);

  const handleNameChange = (name: string) => {
    setNewTeacherName(name);
    const username = name.toLowerCase().replace(/\s+/g, ".");
    setNewTeacherEmail(username ? `${username}@school.edu` : "");
  };

  // Load registry from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("aspis_teachers_registry");
    if (saved) {
      setTeachers(JSON.parse(saved));
    } else {
      setTeachers(INITIAL_TEACHERS);
      localStorage.setItem("aspis_teachers_registry", JSON.stringify(INITIAL_TEACHERS));
    }
  }, []);

  // Filter roster
  const filtered = teachers.filter(t => {
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.classSection.toLowerCase().includes(q);
  });

  // Toggle portal credentials
  const toggleCredentials = (id: string, name: string, currentStatus: boolean) => {
    const updated = teachers.map(t => {
      if (t.id === id) {
        return { ...t, credentialsActive: !currentStatus };
      }
      return t;
    });
    setTeachers(updated);
    localStorage.setItem("aspis_teachers_registry", JSON.stringify(updated));
    setAlertSuccessMessage(`System credentials for ${name} have been ${!currentStatus ? "activated" : "deactivated"}.`);
    setTimeout(() => {
      setAlertSuccessMessage(null);
    }, 3000);
  };

  // Remove teacher profile
  const handleRemoveTeacher = (id: string, name: string) => {
    const updated = teachers.filter(t => t.id !== id);
    setTeachers(updated);
    localStorage.setItem("aspis_teachers_registry", JSON.stringify(updated));
    setAlertSuccessMessage(`Teacher profile for ${name} has been removed from the registry.`);
    setTimeout(() => {
      setAlertSuccessMessage(null);
    }, 3000);
  };

  // Add new teacher profile
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherGrade || !newTeacherDivision) return;

    const initials = newTeacherName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const username = newTeacherName.toLowerCase().replace(/\s+/g, ".");
    
    const added: TeacherComplianceRecord = {
      id: `t_custom_${Date.now()}`,
      name: newTeacherName,
      classSection: `Grade ${newTeacherGrade}${newTeacherDivision}`,
      attendanceStatus: "up_to_date",
      attendanceDetail: "No records pending",
      marksStatus: "up_to_date",
      marksDetail: "No grading cycles pending",
      alertsStatus: "up_to_date",
      alertsDetail: "No unresolved alerts",
      complianceLevel: "compliant",
      initials,
      credentialsActive: newTeacherCredentials,
      username,
      email: newTeacherEmail || `${username}@school.edu`,
      password: newTeacherPassword || "password123"
    };

    const updated = [added, ...teachers];
    setTeachers(updated);
    localStorage.setItem("aspis_teachers_registry", JSON.stringify(updated));
    setIsAddModalOpen(false);

    // Reset forms
    setNewTeacherName("");
    setNewTeacherGrade("");
    setNewTeacherDivision("");
    setNewTeacherEmail("");
    setNewTeacherPassword("");
    setNewTeacherCredentials(true);

    setAlertSuccessMessage(`Teacher profile for ${added.name} successfully registered with credentials!`);
    setTimeout(() => {
      setAlertSuccessMessage(null);
    }, 3500);
  };

  // Handle Dispatch Compliance Alert
  const dispatchAlert = (record: TeacherComplianceRecord) => {
    // Channel ID mapping for each teacher
    const channelIdMap: Record<string, string> = {
      "t1": "d1",
      "t2": "d2",
      "t3": "d3",
      "t4": "d4",
      "t5": "d5"
    };
    const channelId = channelIdMap[record.id] || "d1";

    // Create the compliance alert message content
    let alertContent = "";
    if (record.attendanceStatus === "overdue") {
      alertContent = `COMPLIANCE ALERT: Attendance logging is overdue. ${record.attendanceDetail}. Please log this immediately.`;
    } else if (record.marksStatus === "overdue") {
      alertContent = `COMPLIANCE ALERT: Student marks entry is overdue. ${record.marksDetail}. Please update the grading sheets immediately.`;
    } else if (record.alertsStatus === "ignored") {
      alertContent = `COMPLIANCE ALERT: AI Student risk alerts are unresolved. ${record.alertsDetail}. Please address these indicators immediately.`;
    } else {
      alertContent = `COMPLIANCE ALERT: Please review pending admin logs and system compliance guidelines.`;
    }

    const newMsg = {
      id: `m_alert_${Date.now()}`,
      senderName: "Dr. Ramesh Iyer",
      senderRole: "Principal",
      content: alertContent,
      timestamp: "Just now",
      isSelf: true
    };

    // Save message to localStorage
    try {
      const saved = localStorage.getItem("aspis_chat_messages");
      const currentMessages = saved ? JSON.parse(saved) : { ...INITIAL_MESSAGES };
      
      // Ensure key list exists
      if (!currentMessages[channelId]) {
        currentMessages[channelId] = [];
      }
      currentMessages[channelId].push(newMsg);
      localStorage.setItem("aspis_chat_messages", JSON.stringify(currentMessages));
    } catch (e) {
      console.error("Failed to append compliance alert to localStorage", e);
    }

    // Set active channel redirect state
    localStorage.setItem("active_chat_channel", channelId);

    // Set success banner notice and schedule redirect
    setAlertSuccessMessage(`Compliance alert successfully generated and posted to ${record.name}'s secure chat thread! Redirecting...`);
    
    setTimeout(() => {
      setAlertSuccessMessage(null);
      router.push("/messaging");
    }, 1500);
  };

  const getComplianceColor = (level: TeacherComplianceRecord["complianceLevel"]) => {
    switch (level) {
      case "critical":
        return "text-risk-critical border-risk-critical/20 bg-risk-critical/10";
      case "warning":
        return "text-risk-high border-risk-high/20 bg-risk-high/10";
      default:
        return "text-risk-low border-risk-low/20 bg-risk-low/10";
    }
  };

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10 relative">
      
      {/* Title Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Teacher Compliance Tracker</h1>
          <p className="text-xs text-text-secondary mt-1">
            Monitor system maintainability including daily attendance logs, grading marks entry, and AI predictive alert resolution.
          </p>
        </div>
        <button
          onClick={() => {
            setNewTeacherPassword(`ASPIS_${Math.floor(1000 + Math.random() * 9000)}`);
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow transition-transform hover:-translate-y-[1px]"
        >
          <Plus size={15} /> Add Teacher
        </button>
      </div>

      {/* Success alert notice */}
      {alertSuccessMessage && (
        <div className="p-4 mb-6 bg-risk-low/15 border-l-4 border-risk-low text-text-primary text-xs font-semibold rounded-sm flex items-center justify-between animate-pulse">
          <span>{alertSuccessMessage}</span>
          <button onClick={() => setAlertSuccessMessage(null)} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
      )}

      {/* Compliance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-5 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-aspis-blue" />
          <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Total Staff</div>
          <div className="text-3xl font-black text-aspis-blue mt-1">{teachers.length}</div>
        </div>

        <div className="p-5 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-low" />
          <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Compliant</div>
          <div className="text-3xl font-black text-risk-low mt-1">
            {teachers.filter(t => t.complianceLevel === "compliant").length}
          </div>
        </div>

        <div className="p-5 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-high" />
          <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Attention Needed</div>
          <div className="text-3xl font-black text-risk-high mt-1">
            {teachers.filter(t => t.complianceLevel === "warning").length}
          </div>
        </div>

        <div className="p-5 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-critical" />
          <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Critical Gaps</div>
          <div className="text-3xl font-black text-risk-critical mt-1">
            {teachers.filter(t => t.complianceLevel === "critical").length}
          </div>
        </div>
      </div>

      {/* Main compliance tracking block */}
      <div className="bg-background-card border border-white/5 rounded-md shadow-card overflow-hidden">
        
        {/* Search bar */}
        <div className="p-5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-2 bg-background-glass border border-white/5 px-3 py-2 rounded-sm w-full md:max-w-[280px]">
            <Search size={13} className="text-text-muted" />
            <input 
              type="text" 
              placeholder="Search by teacher name or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-text-primary w-full"
            />
          </div>
          <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-wider">DPS System Compliance Logs</span>
        </div>

        {/* Roster list */}
        <div className="p-6">
          <div className="grid grid-cols-[1.4fr_1.1fr_1.5fr_1.5fr_1.2fr_1.1fr_1.8fr] px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-white/5 hidden md:grid mb-4">
            <span>Teacher / Class</span>
            <span>Attendance</span>
            <span>Grades Status</span>
            <span>AI Alerts</span>
            <span>Compliance</span>
            <span>Credentials</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map((t) => (
              <div 
                key={t.id}
                className="grid grid-cols-1 md:grid-cols-[1.4fr_1.1fr_1.5fr_1.5fr_1.2fr_1.1fr_1.8fr] items-center gap-4 p-4 border border-white/5 hover:border-white/10 bg-white/[0.005] rounded-sm transition-all"
              >
                
                {/* Demographic details */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-aspis-blue to-aspis-academic flex items-center justify-center text-[10px] font-black text-white">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-text-primary">{t.name}</div>
                    <div className="text-[9px] text-text-secondary mt-0.5">Class Teacher of {t.classSection}</div>
                  </div>
                </div>

                {/* Attendance compliance */}
                <div className="text-xs">
                  {t.attendanceStatus === "up_to_date" ? (
                    <span className="text-risk-low flex items-center gap-1">
                      <Check size={12} /> Logged
                    </span>
                  ) : (
                    <span className="text-risk-critical flex items-center gap-1 font-bold animate-pulse">
                      <ShieldAlert size={12} /> Overdue
                    </span>
                  )}
                  <p className="text-[9px] text-text-muted mt-1 leading-normal">{t.attendanceDetail}</p>
                </div>

                {/* Marks compliance */}
                <div className="text-xs">
                  {t.marksStatus === "up_to_date" ? (
                    <span className="text-risk-low flex items-center gap-1">
                      <Check size={12} /> Graded
                    </span>
                  ) : (
                    <span className="text-risk-high flex items-center gap-1 font-bold">
                      <Clock size={12} /> Pending
                    </span>
                  )}
                  <p className="text-[9px] text-text-muted mt-1 leading-normal">{t.marksDetail}</p>
                </div>

                {/* AI Alerts compliance */}
                <div className="text-xs">
                  {t.alertsStatus === "up_to_date" ? (
                    <span className="text-risk-low flex items-center gap-1">
                      <Check size={12} /> Addressed
                    </span>
                  ) : (
                    <span className="text-risk-critical flex items-center gap-1 font-bold">
                      <AlertTriangle size={12} /> Unresolved
                    </span>
                  )}
                  <p className="text-[9px] text-text-muted mt-1 leading-normal">{t.alertsDetail}</p>
                </div>

                {/* Overall status badge */}
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getComplianceColor(t.complianceLevel)}`}>
                    {t.complianceLevel === "compliant" ? "Compliant" : t.complianceLevel === "warning" ? "Warning" : "Critical"}
                  </span>
                </div>

                {/* Credentials status */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-sm border text-[8px] font-black uppercase tracking-wider ${
                      t.credentialsActive 
                        ? "text-risk-low border-risk-low/20 bg-risk-low/10" 
                        : "text-text-muted border-white/10 bg-white/5"
                    }`}>
                      {t.credentialsActive ? "Active" : "Disabled"}
                    </span>
                    <button
                      onClick={() => toggleCredentials(t.id, t.name, t.credentialsActive)}
                      className={`p-1 rounded-sm border transition-colors ${
                        t.credentialsActive 
                          ? "bg-risk-medium/10 border-risk-medium/20 text-risk-medium hover:bg-risk-medium/20" 
                          : "bg-risk-low/10 border-risk-low/20 text-risk-low hover:bg-risk-low/20"
                      }`}
                      title={t.credentialsActive ? "Disable Credentials" : "Enable Credentials"}
                    >
                      <Key size={10} />
                    </button>
                  </div>
                  {t.credentialsActive && (
                    <div className="text-[8px] font-mono text-text-muted mt-1 flex flex-col gap-0.5">
                      <span className="lowercase">{t.email}</span>
                      <span className="text-[7.5px] tracking-wider uppercase font-bold text-aspis-blue">Pass: {t.password}</span>
                    </div>
                  )}
                </div>

                {/* Compliance Actions */}
                <div className="flex items-center justify-end gap-1.5">
                  {t.complianceLevel !== "compliant" ? (
                    <button
                      onClick={() => dispatchAlert(t)}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-risk-high/15 border border-risk-high/20 rounded-sm text-risk-high hover:bg-risk-high/25 hover:border-risk-high/30 text-[9px] font-black uppercase tracking-wider transition-colors w-full md:w-auto"
                      title="Alert Teacher"
                    >
                      <Bell size={11} />
                      <span>Alert</span>
                    </button>
                  ) : (
                    <span className="text-[9px] font-bold text-text-muted italic px-2">OK</span>
                  )}
                  <button
                    onClick={() => router.push("/messaging")}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-aspis-blue/10 border border-aspis-blue/20 rounded-sm text-aspis-blue hover:bg-aspis-blue/20 hover:border-aspis-blue/30 text-[9px] font-black uppercase tracking-wider transition-colors"
                    title="Send Message"
                  >
                    <Mail size={11} />
                    <span>Chat</span>
                  </button>
                  <button
                    onClick={() => handleRemoveTeacher(t.id, t.name)}
                    className="p-1.5 bg-risk-critical/10 border border-risk-critical/20 hover:bg-risk-critical/20 text-risk-critical rounded-sm transition-colors"
                    title="Remove Teacher"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center p-12 text-xs text-text-muted bg-background-card border border-white/5 rounded-sm">
                No teachers found matching the search query.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ADD TEACHER DIALOG MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-[460px] bg-background-card border border-white/10 p-8 rounded-md shadow-card">
            
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <Users className="text-aspis-blue" size={20} />
              <h2 className="text-lg font-black text-text-primary">Register Teacher Profile</h2>
            </div>

            <form onSubmit={handleAddTeacher} className="flex flex-col gap-4 text-xs font-semibold text-text-secondary">
              
              <div className="flex flex-col gap-1.5">
                <label>Teacher Full Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Anil Kumar"
                  value={newTeacherName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label>Assigned Grade</label>
                  <select
                    value={newTeacherGrade}
                    onChange={(e) => setNewTeacherGrade(e.target.value)}
                    className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none cursor-pointer"
                  >
                    <option value="" className="bg-background-secondary text-text-muted">Select Grade</option>
                    {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g.toString()} className="bg-background-secondary text-text-primary">Grade {g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label>Assigned Division / Section</label>
                  <select
                    value={newTeacherDivision}
                    onChange={(e) => setNewTeacherDivision(e.target.value)}
                    className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none cursor-pointer"
                  >
                    <option value="" className="bg-background-secondary text-text-muted">Select Division</option>
                    {["A", "B", "C", "D"].map((d) => (
                      <option key={d} value={d} className="bg-background-secondary text-text-primary">Division {d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label>Portal Login Email</label>
                <input 
                  type="email"
                  required
                  placeholder="email@school.edu"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label>Portal Login Password</label>
                <input 
                  type="text"
                  required
                  placeholder="Password"
                  value={newTeacherPassword}
                  onChange={(e) => setNewTeacherPassword(e.target.value)}
                  className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-white/5 rounded-sm bg-white/[0.005] mt-2">
                <div>
                  <div className="text-text-primary font-bold">Portal Access Credentials</div>
                  <div className="text-[9px] text-text-muted mt-0.5">Toggle system access permission for this resource</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewTeacherCredentials(!newTeacherCredentials)}
                  className={`px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider transition-all ${
                    newTeacherCredentials
                      ? "bg-risk-low/20 text-risk-low border border-risk-low/25"
                      : "bg-white/5 border border-white/10 text-text-muted"
                  }`}
                >
                  {newTeacherCredentials ? "Active" : "Disabled"}
                </button>
              </div>

              <button
                type="submit"
                disabled={!newTeacherName.trim() || !newTeacherGrade || !newTeacherDivision || !newTeacherEmail.trim() || !newTeacherPassword.trim()}
                className="w-full mt-4 py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Register and Activate Profile
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
