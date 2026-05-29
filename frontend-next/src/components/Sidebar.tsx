"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Brain, AlertTriangle, FileText, Activity, BookOpen, LogOut, Award, MessageSquare, Heart, Stethoscope, ClipboardList, Book, Trophy, Palette, Network } from "lucide-react";

interface NavItem {
  label: string;
  to: string;
  icon: any;
  badge?: number;
}

const TEACHER_NAV: NavItem[] = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "Students", to: "/students", icon: Users },
  { label: "Subject Teachers", to: "/subject-teachers", icon: Users },
  { label: "Attendance", to: "/attendance", icon: Activity },
  { label: "Assessments", to: "/assessments", icon: Award },
  { label: "Class Intel", to: "/class-intel", icon: Brain },
  { label: "Teams & Messaging", to: "/messaging", icon: MessageSquare, badge: 3 },
  { label: "Reports", to: "/reports", icon: FileText },
];

const PRINCIPAL_NAV: NavItem[] = [
  { label: "School Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "Teacher Compliance", to: "/teachers", icon: Users },
  { label: "Attendance Logs", to: "/attendance", icon: Activity },
  { label: "Teams & Messaging", to: "/messaging", icon: MessageSquare, badge: 3 },
  { label: "Curriculum Map", to: "/ontology", icon: BookOpen },
  { label: "Class Intel", to: "/class-intel", icon: Brain },
  { label: "AI Reports", to: "/reports", icon: FileText },
];

const SUBJECT_TEACHER_NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Subject Roster", to: "/students", icon: Users },
  { label: "Assessments", to: "/assessments", icon: Award },
  { label: "Student Knowledge", to: "/knowledge-graph", icon: Network },
  { label: "Curriculum Map", to: "/ontology", icon: BookOpen },
  { label: "Teams & Messaging", to: "/messaging", icon: MessageSquare, badge: 3 },
];

const MEDICAL_STAFF_NAV: NavItem[] = [
  { label: "Health Dashboard", to: "/medical", icon: Stethoscope },
  { label: "Student Records", to: "/students", icon: Users },
  { label: "Teams & Messaging", to: "/messaging", icon: MessageSquare, badge: 3 },
  { label: "Reports", to: "/reports", icon: FileText },
];

const LIBRARIAN_NAV: NavItem[] = [
  { label: "Library Dashboard", to: "/library", icon: Book },
  { label: "Student Records", to: "/students", icon: Users },
  { label: "Teams & Messaging", to: "/messaging", icon: MessageSquare, badge: 3 },
  { label: "AI Reading Reports", to: "/reports", icon: FileText },
];

const SPORTS_COACH_NAV: NavItem[] = [
  { label: "Sports Dashboard", to: "/sports", icon: Trophy },
  { label: "Student Records", to: "/students", icon: Users },
  { label: "Teams & Messaging", to: "/messaging", icon: MessageSquare, badge: 3 },
  { label: "AI Scouting Reports", to: "/reports", icon: FileText },
];

const ARTS_DIRECTOR_NAV: NavItem[] = [
  { label: "Extracurriculars", to: "/arts", icon: Palette },
  { label: "Creative Roster", to: "/students", icon: Users },
  { label: "Teams & Messaging", to: "/messaging", icon: MessageSquare, badge: 3 },
  { label: "Portfolios", to: "/reports", icon: FileText },
];

const ACADEMIC_NAV: NavItem[] = [
  { label: "OCR Assessments", to: "/academic", icon: FileText },
  { label: "Academic Roster", to: "/students", icon: Users },
  { label: "Class Intelligence", to: "/class-intel", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [role, setRole] = useState("teacher");
  const [userName, setUserName] = useState("Priya Sharma");

  useEffect(() => {
    const savedRole = localStorage.getItem("user_role");
    const savedName = localStorage.getItem("user_name");
    if (savedRole) setRole(savedRole);
    if (savedName) setUserName(savedName);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    router.push("/login");
  };

  const navList = role === "principal" 
    ? PRINCIPAL_NAV 
    : role === "subject_teacher" 
    ? SUBJECT_TEACHER_NAV 
    : role === "medical_staff"
    ? MEDICAL_STAFF_NAV
    : role === "librarian"
    ? LIBRARIAN_NAV
    : role === "sports_coach"
    ? SPORTS_COACH_NAV
    : role === "arts_director"
    ? ARTS_DIRECTOR_NAV
    : role === "academic_coordinator"
    ? ACADEMIC_NAV
    : TEACHER_NAV;
  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside className="w-[270px] bg-background-secondary border-r border-white/5 flex flex-col sticky top-0 h-screen overflow-hidden">
      
      {/* Brand logo */}
      <div className="flex items-center gap-3.5 px-6 border-b border-white/5 h-[72px] flex-shrink-0">
        <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-aspis-blue to-aspis-academic flex items-center justify-center text-xl shadow-glow">
          🛡️
        </div>
        <div>
          <div className="font-extrabold text-sm text-text-primary tracking-tight">ASPIS</div>
          <div className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Intelligence Platform</div>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="p-4 flex-1 overflow-y-auto flex flex-col gap-1 select-none">
        <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-3 py-4">
          {role === "principal" ? "Principal Panel" : role === "medical_staff" ? "Medical Panel" : role === "librarian" ? "Library Panel" : role === "sports_coach" ? "Sports Panel" : role === "arts_director" ? "Extracurriculars Panel" : role === "academic_coordinator" ? "Academic Panel" : "Teacher Panel"}
        </div>
        {navList.map((item) => {
          const isActive = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-semibold transition-all ${
                isActive
                  ? "bg-aspis-blue/10 text-aspis-blue font-bold"
                  : "text-text-secondary hover:bg-background-glass hover:text-text-primary"
              }`}
            >
              <item.icon size={16} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 bg-risk-critical text-white text-[8px] font-black rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}


      </nav>

      {/* User profile logout action */}
      <div className="p-4 border-t border-white/5 flex-shrink-0">
        <div 
          onClick={handleLogout} 
          className="flex items-center gap-3 p-3 rounded-sm hover:bg-white/[0.04] cursor-pointer transition-colors"
          title="Logout"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aspis-blue to-aspis-academic flex items-center justify-center text-xs font-black text-white shadow-glow">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-text-primary truncate">{userName}</div>
            <div className="text-[9px] text-text-muted truncate mt-0.5 uppercase tracking-wider font-extrabold text-[8px]">
              {role} · DPS Delhi
            </div>
          </div>
          <LogOut size={14} className="text-text-muted hover:text-text-secondary" />
        </div>
      </div>

    </aside>
  );
}
