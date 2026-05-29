"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brain, Lock, Mail, Eye, EyeOff, Globe, ShieldAlert } from "lucide-react";
import { INITIAL_TEACHERS, TeacherComplianceRecord, INITIAL_SUBJECT_TEACHERS, SubjectTeacherRecord } from "@/data/mockData";

interface DemoRole {
  role: string;
  label: string;
  desc: string;
  descHi: string;
}

const DEMO_ROLES: DemoRole[] = [
  { role: "principal", label: "🏫 Principal", desc: "Dr. Ramesh Iyer", descHi: "डॉ. रमेश अय्यर" },
  { role: "teacher", label: "👩‍🏫 Teacher", desc: "Priya Sharma", descHi: "प्रिया शर्मा" },
  { role: "subject_teacher", label: "🧬 Subject Teacher", desc: "Amit Verma (Science)", descHi: "अमित वर्मा (विज्ञान)" },
  { role: "medical_staff", label: "🏥 Medical Staff", desc: "Dr. Anil Mehta", descHi: "डॉ. अनिल मेहता" },
  { role: "librarian", label: "📚 Librarian", desc: "Meera Desai", descHi: "मीरा देसाई" },
  { role: "sports_coach", label: "⚽ Sports Coach", desc: "Vikram Singh", descHi: "विक्रम सिंह" },
  { role: "arts_director", label: "🌟 Extracurriculars", desc: "Kavita Rao", descHi: "कविता राव" },
  { role: "academic_coordinator", label: "📝 Academic Coordinator", desc: "Rajiv Sharma", descHi: "राजीव शर्मा" },
  { role: "student", label: "🎓 Student", desc: "Arjun Verma", descHi: "अर्जुन वर्मा" },
  { role: "parent", label: "👨‍👩‍👧 Parent", desc: "Sunita Verma", descHi: "सुनीता वर्मा" },
];

export default function Login() {
  const router = useRouter();
  const [isHindi, setIsHindi] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState<string | null>(null);

  // Seed registries in localStorage if not present
  useEffect(() => {
    const saved = localStorage.getItem("aspis_teachers_registry");
    if (!saved) {
      localStorage.setItem("aspis_teachers_registry", JSON.stringify(INITIAL_TEACHERS));
    }
    const savedSub = localStorage.getItem("aspis_subject_teachers_registry");
    if (!savedSub) {
      localStorage.setItem("aspis_subject_teachers_registry", JSON.stringify(INITIAL_SUBJECT_TEACHERS));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    // Emulate authentication handshake
    await new Promise((r) => setTimeout(r, 800));
    
    // Check if logging in as principal
    const isPrincipal = credentials.email.toLowerCase().includes("principal");
    
    if (isPrincipal) {
      localStorage.setItem("user_role", "principal");
      localStorage.setItem("user_name", "Dr. Ramesh Iyer");
      setLoading(false);
      router.push("/dashboard");
      return;
    }
    
    // Check Class Teachers registry
    const registryStr = localStorage.getItem("aspis_teachers_registry");
    const registry: TeacherComplianceRecord[] = registryStr ? JSON.parse(registryStr) : INITIAL_TEACHERS;
    
    const inputEmail = credentials.email.toLowerCase().trim();
    const inputPassword = credentials.password;
    
    const matchedTeacher = registry.find(t => 
      t.email.toLowerCase().trim() === inputEmail || 
      t.username.toLowerCase().trim() === inputEmail ||
      t.username.toLowerCase().trim() === inputEmail.split('@')[0]
    );
    
    if (matchedTeacher) {
      if (matchedTeacher.password !== inputPassword) {
        setLoading(false);
        setAuthError(isHindi ? "प्रवेश अस्वीकृत: गलत पासवर्ड।" : "Access Denied: Incorrect password.");
        return;
      }
      
      if (!matchedTeacher.credentialsActive) {
        setLoading(false);
        setAuthError(isHindi 
          ? `प्रवेश अस्वीकृत: ${matchedTeacher.name} के पोर्टल क्रेडेंशियल एडमिनिस्ट्रेटर द्वारा अक्षम कर दिए गए हैं।` 
          : `Access Denied: ${matchedTeacher.name}'s portal credentials have been disabled by the administrator.`
        );
        return;
      }
      
      localStorage.setItem("user_role", "teacher");
      localStorage.setItem("user_name", matchedTeacher.name);
      localStorage.setItem("user_class_section", matchedTeacher.classSection);
      setLoading(false);
      router.push("/dashboard");
      return;
    }
    
    // Check Subject Teachers registry
    const subRegistryStr = localStorage.getItem("aspis_subject_teachers_registry");
    const subRegistry: SubjectTeacherRecord[] = subRegistryStr ? JSON.parse(subRegistryStr) : INITIAL_SUBJECT_TEACHERS;
    
    const matchedSubTeacher = subRegistry.find(t => 
      t.email.toLowerCase().trim() === inputEmail || 
      t.username.toLowerCase().trim() === inputEmail ||
      t.username.toLowerCase().trim() === inputEmail.split('@')[0]
    );
    
    if (matchedSubTeacher) {
      if (matchedSubTeacher.password !== inputPassword) {
        setLoading(false);
        setAuthError(isHindi ? "प्रवेश अस्वीकृत: गलत पासवर्ड।" : "Access Denied: Incorrect password.");
        return;
      }
      
      if (!matchedSubTeacher.credentialsActive) {
        setLoading(false);
        setAuthError(isHindi 
          ? `प्रवेश अस्वीकृत: ${matchedSubTeacher.name} (विषय शिक्षक) के पोर्टल क्रेडेंशियल अक्षम कर दिए गए हैं।` 
          : `Access Denied: ${matchedSubTeacher.name}'s (Subject Teacher) portal credentials have been disabled.`
        );
        return;
      }
      
      localStorage.setItem("user_role", "subject_teacher");
      localStorage.setItem("user_name", matchedSubTeacher.name);
      localStorage.setItem("user_subject", matchedSubTeacher.subject);
      localStorage.setItem("user_class_section", matchedSubTeacher.classSection);
      setLoading(false);
      router.push("/dashboard");
      return;
    }
    
    // Neither found
    setLoading(false);
    setAuthError(isHindi 
      ? "प्रवेश अस्वीकृत: यह शिक्षक प्रोफाइल सिस्टम रजिस्ट्री में नहीं मिला।" 
      : "Access Denied: This teacher profile was not found in the registry."
    );
  };

  const handleDemo = async (role: string) => {
    setAuthError(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    
    const registryStr = localStorage.getItem("aspis_teachers_registry");
    const registry: TeacherComplianceRecord[] = registryStr ? JSON.parse(registryStr) : INITIAL_TEACHERS;

    if (role === "teacher") {
      const priya = registry.find(t => t.name === "Priya Sharma");
      if (priya && !priya.credentialsActive) {
        setLoading(false);
        setAuthError(isHindi 
          ? "प्रवेश अस्वीकृत: प्रिया शर्मा के पोर्टल क्रेडेंशियल एडमिनिस्ट्रेटर द्वारा अक्षम कर दिए गए हैं।" 
          : "Access Denied: Priya Sharma's portal credentials have been disabled by the administrator."
        );
        return;
      }
    }
    
    if (role === "subject_teacher") {
      const subRegistryStr = localStorage.getItem("aspis_subject_teachers_registry");
      const subRegistry: SubjectTeacherRecord[] = subRegistryStr ? JSON.parse(subRegistryStr) : INITIAL_SUBJECT_TEACHERS;
      const amit = subRegistry.find(t => t.name === "Amit Verma");
      if (amit && !amit.credentialsActive) {
        setLoading(false);
        setAuthError(isHindi 
          ? "प्रवेश अस्वीकृत: अमित वर्मा (विषय शिक्षक) के पोर्टल क्रेडेंशियल अक्षम कर दिए गए हैं।" 
          : "Access Denied: Amit Verma's (Subject Teacher) portal credentials have been disabled."
        );
        return;
      }
      
      localStorage.setItem("user_role", "subject_teacher");
      localStorage.setItem("user_name", "Amit Verma");
      localStorage.setItem("user_subject", "Science");
      localStorage.setItem("user_class_section", "Grade 9A");
      setLoading(false);
      router.push("/dashboard");
      return;
    }
    
    const demoUser = DEMO_ROLES.find(d => d.role === role);
    localStorage.setItem("user_role", role);
    localStorage.setItem("user_name", demoUser ? demoUser.desc : "Guest");
    if (role === "teacher") {
      localStorage.setItem("user_class_section", "Grade 9A");
    }
    setLoading(false);
    router.push(role === "medical_staff" ? "/medical" : role === "librarian" ? "/library" : role === "sports_coach" ? "/sports" : role === "arts_director" ? "/arts" : "/dashboard");
  };

  // UI Translation strings
  const t = {
    title: isHindi ? "एस्पिस (ASPIS)" : "ASPIS",
    subtitle: isHindi ? "एआई-संचालित छात्र प्रदर्शन खुफिया प्रणाली" : "AI-Powered Student Performance Intelligence System",
    tagline: isHindi 
      ? "शैक्षणिक, व्यवहारिक, शारीरिक और विकासात्मक विकास को ट्रैक करने वाली दीर्घकालिक एआई प्रणाली।" 
      : "Longitudinal AI engine tracking academic, behavioral, physical, and developmental growth.",
    emailLabel: isHindi ? "ईमेल पता" : "Email Address",
    passwordLabel: isHindi ? "पासवर्ड" : "Password",
    signIn: isHindi ? "साइन इन करें" : "Sign In",
    signingIn: isHindi ? "साइन इन हो रहा है..." : "Signing in...",
    orDemo: isHindi ? "— या डेमो के रूप में लॉगिन करें —" : "— or login as demo —",
    footer: isHindi ? "सीबीएसई · कक्षा 9 · दिल्ली पब्लिक स्कूल" : "CBSE · Class 9 · Delhi Public School"
  };

  return (
    <div className="relative min-h-screen bg-background-primary flex items-center justify-center overflow-hidden px-4">
      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] bg-aspis-blue rounded-full filter blur-[120px] opacity-[0.15] -top-[150px] -left-[150px] animate-pulse duration-10000" />
        <div className="absolute w-[500px] h-[500px] bg-aspis-academic rounded-full filter blur-[120px] opacity-[0.12] -bottom-[100px] -right-[100px]" />
        <div className="absolute w-[350px] h-[350px] bg-aspis-behavioral rounded-full filter blur-[100px] opacity-[0.1] top-1/2 left-1/3" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Language Switcher Button */}
      <button 
        onClick={() => setIsHindi(!isHindi)}
        className="absolute top-6 right-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-sm bg-background-glass border border-white/10 hover:border-white/20 text-xs font-semibold text-text-secondary transition-colors"
      >
        <Globe size={14} />
        {isHindi ? "English" : "हिन्दी"}
      </button>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[480px] p-10 bg-background-card border border-white/10 rounded-md shadow-card backdrop-blur-2xl">
        
        {/* Branding header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-aspis-blue to-aspis-academic flex items-center justify-center text-2xl shadow-glow">
            🛡️
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary">{t.title}</h1>
            <p className="text-[10px] text-aspis-blue font-bold tracking-widest uppercase">{t.subtitle}</p>
          </div>
        </div>

        {/* Tag line description */}
        <p className="text-xs text-text-secondary leading-relaxed mb-6">
          {t.tagline}
        </p>

        {/* Security Alert Banner */}
        {authError && (
          <div className="mb-6 p-4 bg-risk-critical/10 border border-risk-critical/20 text-risk-critical rounded-sm text-xs font-semibold flex items-start gap-2.5 animate-pulse">
            <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-extrabold">{isHindi ? "सुरक्षा चेतावनी" : "Security Alert"}</div>
              <div className="text-[11px] text-text-secondary mt-1 font-medium leading-normal">{authError}</div>
            </div>
            <button 
              type="button" 
              onClick={() => setAuthError(null)} 
              className="text-text-muted hover:text-text-primary text-[10px] ml-1.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Credentials Form */}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          
          {/* Email field */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary">{t.emailLabel}</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                required
                className="w-full bg-background-glass border border-white/10 focus:border-aspis-blue text-text-primary text-sm rounded-sm py-3 pl-10 pr-4 outline-none transition-colors"
                placeholder="teacher@school.edu"
                value={credentials.email}
                onChange={(e) => setCredentials((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary">{t.passwordLabel}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPass ? "text" : "password"}
                required
                className="w-full bg-background-glass border border-white/10 focus:border-aspis-blue text-text-primary text-sm rounded-sm py-3 pl-10 pr-10 outline-none transition-colors"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) => setCredentials((p) => ({ ...p, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold rounded-sm text-sm shadow-md hover:shadow-lg transition-transform hover:-translate-y-[1px] disabled:opacity-50"
          >
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>

        {/* Demo Selector Grid */}
        <div className="mt-8">
          <div className="text-center text-[10px] uppercase tracking-wider text-text-muted mb-4">
            {t.orDemo}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((d) => (
              <button
                key={d.role}
                disabled={loading}
                onClick={() => handleDemo(d.role)}
                className="p-3 text-left bg-background-glass border border-white/10 rounded-sm hover:bg-white/10 hover:border-white/20 transition-all hover:-translate-y-[1px] disabled:opacity-50"
              >
                <div className="text-xs font-bold text-text-primary">{d.label}</div>
                <div className="text-[10px] text-text-secondary truncate mt-0.5">
                  {isHindi ? d.descHi : d.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info footer */}
        <p className="text-[10px] text-text-muted text-center mt-8">
          {t.footer}
        </p>
      </div>
    </div>
  );
}
