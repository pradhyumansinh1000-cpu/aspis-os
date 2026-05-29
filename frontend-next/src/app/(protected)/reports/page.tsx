"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Search, Brain, ChevronRight, ShieldCheck, Download } from "lucide-react";
import { STUDENTS } from "@/data/mockData";

export default function ReportsHub() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = STUDENTS.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight flex items-center gap-3">
            <FileText className="text-aspis-blue" size={32} />
            AI Intelligence Reports
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Access secure, 4-page cross-domain intelligence dossiers for all students.
          </p>
        </div>
        <div className="px-4 py-2 bg-aspis-blue/10 border border-aspis-blue/20 rounded-sm text-xs font-semibold text-aspis-blue flex items-center gap-2">
          <ShieldCheck size={14} /> DPDPA Secure & RBAC Active
        </div>
      </div>

      <div className="bg-background-card rounded-md border border-white/5 p-4 mb-8 flex gap-3 shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input 
            type="text" 
            className="w-full bg-background-primary border border-white/10 rounded-sm pl-12 pr-4 py-3 text-white focus:outline-none focus:border-aspis-blue/50 text-sm"
            placeholder="Search students by name or ID to view their intelligence dossier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map(student => (
          <Link href={`/students/${student.id}`} key={student.id}>
            <div className="group bg-background-card border border-white/5 hover:border-aspis-blue/50 rounded-md p-6 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-white/5 group-hover:bg-aspis-blue transition-colors" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-background-primary border border-white/10 flex items-center justify-center font-bold text-text-primary">
                    {student.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{student.name}</h3>
                    <p className="text-text-muted text-[10px] uppercase tracking-widest">{student.grade} - {student.id}</p>
                  </div>
                </div>
                <div className="bg-white/5 p-2 rounded-sm text-text-muted group-hover:text-aspis-blue group-hover:bg-aspis-blue/10 transition-colors">
                  <ChevronRight size={16} />
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary flex items-center gap-2"><Brain size={14} className="text-aspis-academic"/> Core Dossier</span>
                  <span className="text-risk-low font-bold">Generated</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary flex items-center gap-2"><FileText size={14} className="text-aspis-blue"/> 4-Page PDF Export</span>
                  <span className="text-text-primary font-bold">Ready</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {filteredStudents.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-muted text-sm border border-dashed border-white/10 rounded-md">
            No students found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
