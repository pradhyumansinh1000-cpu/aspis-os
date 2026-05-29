"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_SUBJECT_TEACHERS, SubjectTeacherRecord } from "@/data/mockData";
import { 
  Users, 
  Check, 
  Clock, 
  AlertTriangle, 
  Mail, 
  Trash2, 
  Key, 
  Plus, 
  X,
  Search,
  BookOpen
} from "lucide-react";

export default function SubjectTeachers() {
  const router = useRouter();
  const [subjectTeachers, setSubjectTeachers] = useState<SubjectTeacherRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [alertSuccessMessage, setAlertSuccessMessage] = useState<string | null>(null);

  // Add Subject Teacher Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherSubject, setNewTeacherSubject] = useState("Science");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherCredentials, setNewTeacherCredentials] = useState(true);

  const [role, setRole] = useState("teacher");
  const [userClass, setUserClass] = useState("Grade 9A");

  useEffect(() => {
    const savedRole = localStorage.getItem("user_role");
    if (savedRole) setRole(savedRole);
    
    // In our system, Priya Sharma is Class Teacher of Grade 9A
    const savedName = localStorage.getItem("user_name");
    if (savedName === "Priya Sharma") {
      setUserClass("Grade 9A");
    } else if (savedName === "Amit Verma") {
      setUserClass("Grade 9B");
    } else if (savedName === "Sunita Rao") {
      setUserClass("Grade 10A");
    } else if (savedName === "Vikram Sen") {
      setUserClass("Grade 10B");
    } else if (savedName === "Ritu Singhal") {
      setUserClass("Grade 11 Science");
    }

    // Load registry
    const saved = localStorage.getItem("aspis_subject_teachers_registry");
    if (saved) {
      setSubjectTeachers(JSON.parse(saved));
    } else {
      setSubjectTeachers(INITIAL_SUBJECT_TEACHERS);
      localStorage.setItem("aspis_subject_teachers_registry", JSON.stringify(INITIAL_SUBJECT_TEACHERS));
    }
  }, []);

  const handleNameChange = (name: string) => {
    setNewTeacherName(name);
    const username = name.toLowerCase().replace(/\s+/g, ".");
    setNewTeacherEmail(username ? `${username}@school.edu` : "");
  };

  // Filter registry
  const filtered = subjectTeachers.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
    
    // For Class Teachers, show subject teachers assigned to their specific class
    if (role === "teacher") {
      return matchesQuery && t.classSection === userClass;
    }
    // For Principal/Admin, show all
    return matchesQuery;
  });

  // Toggle portal credentials
  const toggleCredentials = (id: string, name: string, currentStatus: boolean) => {
    const updated = subjectTeachers.map(t => {
      if (t.id === id) {
        return { ...t, credentialsActive: !currentStatus };
      }
      return t;
    });
    setSubjectTeachers(updated);
    localStorage.setItem("aspis_subject_teachers_registry", JSON.stringify(updated));
    setAlertSuccessMessage(`Portal credentials for Subject Teacher ${name} have been ${!currentStatus ? "activated" : "deactivated"}.`);
    setTimeout(() => setAlertSuccessMessage(null), 3000);
  };

  // Remove subject teacher profile
  const handleRemoveTeacher = (id: string, name: string) => {
    const updated = subjectTeachers.filter(t => t.id !== id);
    setSubjectTeachers(updated);
    localStorage.setItem("aspis_subject_teachers_registry", JSON.stringify(updated));
    setAlertSuccessMessage(`Subject Teacher ${name} has been removed from your class registry.`);
    setTimeout(() => setAlertSuccessMessage(null), 3000);
  };

  // Add new subject teacher profile
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherSubject || !newTeacherEmail.trim() || !newTeacherPassword.trim()) return;

    const initials = newTeacherName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const username = newTeacherName.toLowerCase().replace(/\s+/g, ".");

    const added: SubjectTeacherRecord = {
      id: `st_custom_${Date.now()}`,
      name: newTeacherName,
      subject: newTeacherSubject,
      email: newTeacherEmail,
      password: newTeacherPassword,
      credentialsActive: newTeacherCredentials,
      initials,
      username,
      classSection: userClass
    };

    const updated = [added, ...subjectTeachers];
    setSubjectTeachers(updated);
    localStorage.setItem("aspis_subject_teachers_registry", JSON.stringify(updated));
    setIsAddModalOpen(false);

    // Reset forms
    setNewTeacherName("");
    setNewTeacherSubject("Science");
    setNewTeacherEmail("");
    setNewTeacherPassword("");
    setNewTeacherCredentials(true);

    setAlertSuccessMessage(`Subject Teacher ${added.name} successfully assigned to ${userClass} for ${added.subject}!`);
    setTimeout(() => setAlertSuccessMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10 relative">
      
      {/* Title Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">
            {role === "principal" ? "Subject Teachers Registry" : `Subject Teachers — ${userClass}`}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            {role === "principal"
              ? "Oversee subject-specific teachers registered to input student marks and performance logs school-wide."
              : `Manage subject teachers delegated to enter grades, marks, and concept feedback for your class students.`}
          </p>
        </div>
        {role === "teacher" && (
          <button
            onClick={() => {
              setNewTeacherPassword(`PASS_${Math.floor(1000 + Math.random() * 9000)}`);
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow transition-transform hover:-translate-y-[1px]"
          >
            <Plus size={15} /> Add Subject Teacher
          </button>
        )}
      </div>

      {/* Success Alert Banner */}
      {alertSuccessMessage && (
        <div className="p-4 mb-6 bg-risk-low/15 border-l-4 border-risk-low text-text-primary text-xs font-semibold rounded-sm flex items-center justify-between animate-pulse">
          <span>{alertSuccessMessage}</span>
          <button onClick={() => setAlertSuccessMessage(null)} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
      )}

      {/* Subject Teachers Table */}
      <div className="bg-background-card border border-white/5 rounded-md shadow-card overflow-hidden">
        
        {/* Search header */}
        <div className="p-5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-2 bg-background-glass border border-white/5 px-3 py-2 rounded-sm w-full md:max-w-[280px]">
            <Search size={13} className="text-text-muted" />
            <input 
              type="text" 
              placeholder="Search by teacher name or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-text-primary w-full"
            />
          </div>
          <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-wider">
            {role === "principal" ? "Global School Subject Matrix" : `${userClass} Subject Registry`}
          </span>
        </div>

        {/* Roster Listing */}
        <div className="p-6">
          <div className="grid grid-cols-[1.4fr_1.1fr_1.5fr_1.2fr_1.8fr] px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-white/5 hidden md:grid mb-4">
            <span>Teacher Name</span>
            <span>Subject Assigned</span>
            <span>Class Section</span>
            <span>Credentials Status</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map((t) => (
              <div 
                key={t.id}
                className="grid grid-cols-1 md:grid-cols-[1.4fr_1.1fr_1.5fr_1.2fr_1.8fr] items-center gap-4 p-4 border border-white/5 hover:border-white/10 bg-white/[0.005] rounded-sm transition-all"
              >
                {/* Demographic Detail */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-aspis-blue to-aspis-academic flex items-center justify-center text-[10px] font-black text-white">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-text-primary">{t.name}</div>
                    <div className="text-[9px] text-text-muted mt-0.5">@{t.username}</div>
                  </div>
                </div>

                {/* Subject */}
                <div className="text-xs font-bold text-text-primary">
                  {t.subject}
                </div>

                {/* Class Section */}
                <div className="text-xs text-text-secondary">
                  {t.classSection}
                </div>

                {/* Credentials */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-sm border text-[8px] font-black uppercase tracking-wider ${
                      t.credentialsActive 
                        ? "text-risk-low border-risk-low/20 bg-risk-low/10" 
                        : "text-text-muted border-white/10 bg-white/5"
                    }`}>
                      {t.credentialsActive ? "Active" : "Disabled"}
                    </span>
                    {role === "teacher" && (
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
                    )}
                  </div>
                  {t.credentialsActive && (
                    <div className="text-[8px] font-mono text-text-muted mt-1 flex flex-col gap-0.5">
                      <span className="lowercase">{t.email}</span>
                      <span className="text-[7.5px] tracking-wider uppercase font-bold text-aspis-blue">Pass: {t.password}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => {
                      localStorage.setItem("active_chat_channel", t.id === "st1" ? "d2" : t.id === "st2" ? "d3" : "d1");
                      router.push("/messaging");
                    }}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-aspis-blue/10 border border-aspis-blue/20 rounded-sm text-aspis-blue hover:bg-aspis-blue/20 hover:border-aspis-blue/30 text-[9px] font-black uppercase tracking-wider transition-colors"
                    title="Send Message"
                  >
                    <Mail size={11} />
                    <span>Chat</span>
                  </button>
                  {role === "teacher" && (
                    <button
                      onClick={() => handleRemoveTeacher(t.id, t.name)}
                      className="p-1.5 bg-risk-critical/10 border border-risk-critical/20 hover:bg-risk-critical/20 text-risk-critical rounded-sm transition-colors"
                      title="Remove Subject Teacher"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center p-12 text-xs text-text-muted bg-background-card border border-white/5 rounded-sm">
                No subject teachers registered.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADD SUBJECT TEACHER MODAL */}
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
              <h2 className="text-lg font-black text-text-primary">Delegate Subject Teacher</h2>
            </div>

            <form onSubmit={handleAddTeacher} className="flex flex-col gap-4 text-xs font-semibold text-text-secondary">
              
              <div className="flex flex-col gap-1.5">
                <label>Subject Teacher Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Amit Verma"
                  value={newTeacherName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label>Subject Scope</label>
                <select
                  value={newTeacherSubject}
                  onChange={(e) => setNewTeacherSubject(e.target.value)}
                  className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none cursor-pointer"
                >
                  {["Science", "English", "Social Science", "Physics", "Chemistry", "Mathematics", "Hindi", "Computer Science"].map((s) => (
                    <option key={s} value={s} className="bg-background-secondary text-text-primary">{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label>Generated Portal Login Email</label>
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
                <label>Generated Portal Login Password</label>
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
                  <div className="text-[9px] text-text-muted mt-0.5">Allow login access for this subject resource</div>
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
                disabled={!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPassword.trim()}
                className="w-full mt-4 py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Delegate and Authorize Portal Access
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
