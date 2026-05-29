"use client";

import React, { useState } from "react";
import { STUDENTS, Student } from "@/data/mockData";
import { Upload, CheckCircle, FileText, Brain, AlertTriangle } from "lucide-react";

interface QuestionResult {
  q_num: string;
  topic: string;
  awarded: number;
  max: number;
  ocr_text: string;
}

interface ExamResult {
  student_id: string;
  subject: string;
  total_score: number;
  max_score: number;
  confidence_score: number;
  questions: QuestionResult[];
  ai_analysis: string;
}

export default function AcademicPortal() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectedStudent = selectedStudentId ? STUDENTS.find(s => s.id === selectedStudentId) : null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedStudentId) return;
    setIsUploading(true);
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`http://localhost:8000/api/exams/upload?student_id=${selectedStudentId}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setExamResult(data);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10 flex">
      {/* Sidebar - Roster */}
      <div className="w-1/3 border-r border-white/5 pr-6 overflow-y-auto h-[80vh]">
        <h2 className="text-xl font-bold text-white mb-6">Academic Roster</h2>
        <div className="space-y-2">
          {STUDENTS.map(student => (
            <div
              key={student.id}
              onClick={() => { setSelectedStudentId(student.id); setExamResult(null); }}
              className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                selectedStudentId === student.id
                  ? "bg-aspis-academic/10 border-aspis-academic/30 text-white"
                  : "bg-background-card border-white/5 text-text-secondary hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{student.name}</div>
                  <div className="text-xs opacity-70">Roll: {student.roll} | Class: {student.grade}-{student.section}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-2/3 pl-6">
        {selectedStudent ? (
          <div>
            <div className="mb-6 pb-6 border-b border-white/5">
              <h1 className="text-3xl font-bold text-white tracking-tight">{selectedStudent.name}</h1>
              <p className="text-text-secondary mt-1">Upload scanned exam papers for AI-powered OCR parsing and question-wise tracking.</p>
            </div>

            {/* Upload Area */}
            <div className="bg-background-card rounded-xl border border-white/5 p-8 mb-6 text-center border-dashed">
              <Upload className="w-10 h-10 text-aspis-academic mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">Upload Scanned Exam (PDF/PNG)</h3>
              <p className="text-sm text-text-secondary mb-4">The AI will extract handwritten answers and map them to syllabus topics.</p>
              
              <label className="cursor-pointer bg-aspis-academic/20 text-aspis-academic hover:bg-aspis-academic/30 px-6 py-2 rounded-full text-sm font-semibold transition-colors">
                {isUploading ? "Processing via OCR Pipeline..." : "Select File"}
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={isUploading} />
              </label>
            </div>

            {/* OCR Results */}
            {examResult && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background-card p-4 rounded-xl border border-white/5">
                    <span className="text-text-muted text-xs uppercase font-bold tracking-widest">Total Score</span>
                    <div className="text-4xl font-bold text-white mt-1">{examResult.total_score} <span className="text-xl text-text-muted">/ {examResult.max_score}</span></div>
                  </div>
                  <div className="bg-background-card p-4 rounded-xl border border-white/5">
                    <span className="text-text-muted text-xs uppercase font-bold tracking-widest">OCR Confidence</span>
                    <div className="text-4xl font-bold text-aspis-blue mt-1">{(examResult.confidence_score * 100).toFixed(0)}%</div>
                  </div>
                </div>

                <div className="bg-aspis-academic/10 border border-aspis-academic/20 rounded-xl p-5">
                  <h3 className="text-aspis-academic font-semibold flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5" /> AI Pedagogical Analysis
                  </h3>
                  <p className="text-sm text-white/90 leading-relaxed">{examResult.ai_analysis}</p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Question-Wise Performance</h3>
                  <div className="space-y-3">
                    {examResult.questions.map((q, idx) => (
                      <div key={idx} className="bg-background-card p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">Q{q.q_num}: {q.topic}</span>
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${q.awarded === q.max ? 'bg-risk-low/20 text-risk-low' : 'bg-risk-medium/20 text-risk-medium'}`}>
                            {q.awarded} / {q.max} pts
                          </span>
                        </div>
                        <div className="bg-background-primary p-3 rounded-md border border-white/5 font-mono text-xs text-text-secondary break-words">
                          <span className="text-text-muted uppercase tracking-widest text-[10px] block mb-1">OCR Extracted Text:</span>
                          "{q.ocr_text}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted">
            Select a student to upload or review academic assessments.
          </div>
        )}
      </div>
    </div>
  );
}
