"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, RefreshCw } from "lucide-react";
import { NOTIFICATIONS } from "@/data/mockData";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview Dashboard",
  "/students": "Student Roster",
  "/teachers": "Teacher Compliance Tracker",
  "/attendance": "Attendance Tracking",
  "/assessments": "Assessments & Grading",
  "/messaging": "Teams & Messaging Portal",
  "/medical": "Medical Health Records",
  "/library": "Library & Reading Records",
  "/sports": "Athletics & Physical Education",
  "/arts": "Extracurricular Portfolio",
  "/academic": "Academic OCR & Assessment",
  "/ontology": "Knowledge Graph & Curriculum Map",
  "/class-intel": "Class Intelligence",
  "/knowledge-graph": "Student Knowledge Graph",
  "/reports": "AI Reports",
};

export default function Header() {
  const pathname = usePathname();
  const [userName, setUserName] = useState("Priya Sharma");

  useEffect(() => {
    const savedName = localStorage.getItem("user_name");
    if (savedName) setUserName(savedName);
  }, []);
  
  // Resolve title (including subdirectories like /students/[id])
  let title = "Student Intelligence Platform";
  if (PAGE_TITLES[pathname]) {
    title = PAGE_TITLES[pathname];
  } else if (pathname.startsWith("/students/")) {
    title = "Individual Student Report";
  }

  const unread = NOTIFICATIONS.filter(
    (n) => n.type === "critical" || n.type === "warning"
  ).length;

  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="h-[72px] bg-background-primary/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-10 sticky top-0 z-20">
      
      {/* Route context title */}
      <div className="text-sm font-extrabold text-text-primary tracking-tight">
        {title}
      </div>

      {/* Global search */}
      <div className="flex items-center gap-2 bg-background-glass border border-white/5 px-4 py-2 rounded-sm w-[300px] focus-within:border-aspis-blue transition-colors">
        <Search size={14} className="text-text-muted" />
        <input 
          placeholder="Search students, topics..." 
          className="bg-transparent border-none outline-none text-xs text-text-primary w-full"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        
        {/* Notifications list trigger */}
        <button className="w-9 h-9 rounded-sm bg-background-glass border border-white/5 hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors relative">
          <Bell size={15} />
          {unread > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-risk-critical border border-background-secondary" />
          )}
        </button>

        {/* Sync/Refresh action */}
        <button className="w-9 h-9 rounded-sm bg-background-glass border border-white/5 hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
          <RefreshCw size={14} />
        </button>

        {/* User initials circle */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-aspis-blue to-aspis-behavioral flex items-center justify-center text-xs font-black text-white cursor-pointer shadow-glow">
          {initials}
        </div>

      </div>

    </header>
  );
}
