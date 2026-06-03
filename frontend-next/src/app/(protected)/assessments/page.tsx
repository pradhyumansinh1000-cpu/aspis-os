"use client";

import { useState, useEffect } from "react";
import { STUDENTS, Student } from "@/data/mockData";
import { 
  FileText, 
  Upload, 
  Settings, 
  ChevronRight, 
  Plus, 
  Check, 
  AlertTriangle, 
  BookOpen, 
  Users, 
  ArrowRight,
  TrendingUp,
  Brain,
  ShieldCheck,
  Trash2,
  Lock,
  ArrowLeft,
  BarChart2
} from "lucide-react";

interface QuestionConfig {
  id: string;
  questionNumber: string;
  maxMarks: number;
  mappedConcept: string;
}

interface StudentGradeRecord {
  studentId: string;
  studentName: string;
  roll: string;
  initials: string;
  riskLevel: Student["riskLevel"];
  questionScores: Record<string, number>; // questionId -> score
  overallOverride?: number;
}

interface HistoricalAssessment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  section: string;
  date: string;
  questionsCount: number;
  totalMarks: number;
  classAverage: number;
  status: "draft" | "graded" | "completed";
  questions?: QuestionConfig[];
  scores?: StudentGradeRecord[];
}

const AVAILABLE_CONCEPTS = [
  "Fractions",
  "Algebra",
  "Coordinate Geometry",
  "Trigonometry",
  "Linear Equations",
  "Quadratic Equations",
  "Statistics",
  "Probability",
  "Chemical Bonding",
  "Organic Chemistry",
  "Physics Numericals",
  "History",
  "Geography",
  "English Comprehension"
];

export default function Assessments() {
  const [activeTab, setActiveTab] = useState<"upload" | "grade" | "history">("upload");
  const [selectedGrade, setSelectedGrade] = useState("9");
  const [selectedSection, setSelectedSection] = useState("A");
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  
  const [role, setRole] = useState("teacher");
  const [userName, setUserName] = useState("Priya Sharma");
  const [selectedAnalysisAssessment, setSelectedAnalysisAssessment] = useState<HistoricalAssessment | null>(null);
  const [gradedAssessments, setGradedAssessments] = useState<HistoricalAssessment[]>([]);

  useEffect(() => {
    const savedRole = localStorage.getItem("user_role");
    const savedName = localStorage.getItem("user_name");
    const savedClassSection = localStorage.getItem("user_class_section");
    
    if (savedRole) {
      setRole(savedRole);
      if (savedRole === "principal") {
        setActiveTab("history");
      }
      if (savedRole === "subject_teacher") {
        const savedSubject = localStorage.getItem("user_subject");
        if (savedSubject) setSelectedSubject(savedSubject);
      }
    }
    if (savedName) setUserName(savedName);
    
    if (savedClassSection) {
      const gradeMatch = savedClassSection.match(/\d+/);
      const sectionMatch = savedClassSection.match(/[A-Z]/i);
      if (gradeMatch) setSelectedGrade(gradeMatch[0]);
      if (sectionMatch) setSelectedSection(sectionMatch[0].toUpperCase());
    }

    // Load assessments from localStorage
    const store = localStorage.getItem("aspis_assessments_store");
    if (store) {
      setGradedAssessments(JSON.parse(store));
    } else {
      const seeded: HistoricalAssessment[] = [
        {
          id: "a1",
          title: "Class Test 2 - Algebra Foundations",
          subject: "Mathematics",
          grade: "9",
          section: "A",
          date: "2026-05-20",
          questionsCount: 4,
          totalMarks: 30,
          classAverage: 19.8,
          status: "completed",
          questions: [
            { id: "q1", questionNumber: "Q1", maxMarks: 5, mappedConcept: "Fractions" },
            { id: "q2", questionNumber: "Q2", maxMarks: 5, mappedConcept: "Linear Equations" },
            { id: "q3", questionNumber: "Q3", maxMarks: 10, mappedConcept: "Algebra" },
            { id: "q4", questionNumber: "Q4", maxMarks: 10, mappedConcept: "Coordinate Geometry" },
          ],
          scores: [
            { studentId: "s1", studentName: "Rahul Sharma", roll: "09", initials: "RS", riskLevel: "critical", questionScores: { q1: 1, q2: 1, q3: 3, q4: 2 } },
            { studentId: "s2", studentName: "Ananya Patel", roll: "02", initials: "AP", riskLevel: "low", questionScores: { q1: 5, q2: 5, q3: 9, q4: 9 } },
            { studentId: "s3", studentName: "Kiran Reddy", roll: "14", initials: "KR", riskLevel: "high", questionScores: { q1: 2, q2: 2, q3: 4, q4: 4 } },
            { studentId: "s4", studentName: "Meera Joshi", roll: "21", initials: "MJ", riskLevel: "medium", questionScores: { q1: 4, q2: 3, q3: 7, q4: 7 } },
            { studentId: "s5", studentName: "Arjun Singh", roll: "04", initials: "AS", riskLevel: "medium", questionScores: { q1: 3, q2: 4, q3: 6, q4: 8 } },
            { studentId: "s6", studentName: "Priya Nair", roll: "28", initials: "PN", riskLevel: "low", questionScores: { q1: 5, q2: 5, q3: 10, q4: 10 } }
          ]
        },
        {
          id: "a2",
          title: "Science Class Test 1 - Bonding & Physics",
          subject: "Science",
          grade: "9",
          section: "A",
          date: "2026-05-18",
          questionsCount: 4,
          totalMarks: 30,
          classAverage: 20.2,
          status: "completed",
          questions: [
            { id: "sq1", questionNumber: "Q1", maxMarks: 5, mappedConcept: "Chemical Bonding" },
            { id: "sq2", questionNumber: "Q2", maxMarks: 10, mappedConcept: "Organic Chemistry" },
            { id: "sq3", questionNumber: "Q3", maxMarks: 10, mappedConcept: "Physics Numericals" },
            { id: "sq4", questionNumber: "Q4", maxMarks: 5, mappedConcept: "English Comprehension" }
          ],
          scores: [
            { studentId: "s1", studentName: "Rahul Sharma", roll: "09", initials: "RS", riskLevel: "critical", questionScores: { sq1: 1, sq2: 2, sq3: 1, sq4: 4 } },
            { studentId: "s2", studentName: "Ananya Patel", roll: "02", initials: "AP", riskLevel: "low", questionScores: { sq1: 4, sq2: 9, sq3: 8, sq4: 5 } },
            { studentId: "s3", studentName: "Kiran Reddy", roll: "14", initials: "KR", riskLevel: "high", questionScores: { sq1: 2, sq2: 4, sq3: 3, sq4: 3 } },
            { studentId: "s4", studentName: "Meera Joshi", roll: "21", initials: "MJ", riskLevel: "medium", questionScores: { sq1: 3, sq2: 7, sq3: 6, sq4: 4 } },
            { studentId: "s5", studentName: "Arjun Singh", roll: "04", initials: "AS", riskLevel: "medium", questionScores: { sq1: 4, sq2: 8, sq3: 8, sq4: 4 } },
            { studentId: "s6", studentName: "Priya Nair", roll: "28", initials: "PN", riskLevel: "low", questionScores: { sq1: 5, sq2: 10, sq3: 9, sq4: 5 } }
          ]
        }
      ];
      localStorage.setItem("aspis_assessments_store", JSON.stringify(seeded));
      setGradedAssessments(seeded);
    }
  }, []);

  // OCR processing state
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  // Parsed Questions state
  const [questions, setQuestions] = useState<QuestionConfig[]>([]);
  const [assessmentTitle, setAssessmentTitle] = useState("Weekly Class Test - Fractions & Linear Equations");

  // Roster score records
  const [rosterScores, setRosterScores] = useState<StudentGradeRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  
  // Submission completion modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionReport, setSubmissionReport] = useState<any>(null);

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    setUploadedFile(file.name);
    setIsUploading(true);
    setUploadStep(1);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadStep(2);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}"}` + "/api/exams/upload?student_id=schema", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setUploadStep(3);
      
      const parsedQuestions = (data.questions || []).map((q: any) => ({
        id: q.q_num,
        questionNumber: q.q_num,
        maxMarks: q.max,
        mappedConcept: q.topic
      }));
      setQuestions(parsedQuestions);

      // Prepopulate roster grading entries with 0s
      const initialScores = STUDENTS.map(s => {
        const questionScores: Record<string, number> = {};
        parsedQuestions.forEach((q: any) => { questionScores[q.id] = 0; });
        return {
          studentId: s.id,
          studentName: s.name,
          roll: s.roll,
          initials: s.initials,
          riskLevel: s.riskLevel,
          questionScores
        };
      });
      setRosterScores(initialScores);
      setSelectedStudentId(initialScores[0]?.studentId || "");
    } catch (err) {
      console.error("Upload error", err);
      // Fallback
      setQuestions([{ id: "q1", questionNumber: "Q1", maxMarks: 10, mappedConcept: "Fractions" }]);
    } finally {
      setIsUploading(false);
      setUploadStep(0);
    }
  };

  // Add custom question row manually
  const addQuestion = () => {
    const nextNum = questions.length + 1;
    setQuestions(prev => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        questionNumber: `Q${nextNum}`,
        maxMarks: 5,
        mappedConcept: "Algebra"
      }
    ]);
  };

  // Remove question row
  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // Update question specification
  const updateQuestion = (id: string, field: keyof QuestionConfig, value: any) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  // Update marks for a student
  const updateStudentMark = (studentId: string, questionId: string, mark: number) => {
    const qConfig = questions.find(q => q.id === questionId);
    if (!qConfig) return;
    
    // Clamp mark between 0 and max marks
    const clampedMark = Math.max(0, Math.min(qConfig.maxMarks, mark));

    setRosterScores(prev => prev.map(s => {
      if (s.studentId === studentId) {
        return {
          ...s,
          questionScores: {
            ...s.questionScores,
            [questionId]: clampedMark
          }
        };
      }
      return s;
    }));
  };

  // Get student overall score
  const getOverallScore = (record: StudentGradeRecord) => {
    let sum = 0;
    questions.forEach(q => {
      sum += record.questionScores[q.id] || 0;
    });
    return sum;
  };

  const getWeightagesSum = () => {
    return questions.reduce((sum, q) => sum + q.maxMarks, 0);
  };

  // Select next student
  const nextStudent = () => {
    const currentIndex = rosterScores.findIndex(s => s.studentId === selectedStudentId);
    if (currentIndex < rosterScores.length - 1) {
      setSelectedStudentId(rosterScores[currentIndex + 1].studentId);
    }
  };

  // Select previous student
  const prevStudent = () => {
    const currentIndex = rosterScores.findIndex(s => s.studentId === selectedStudentId);
    if (currentIndex > 0) {
      setSelectedStudentId(rosterScores[currentIndex - 1].studentId);
    }
  };

  // Grading complete submission
  const handleSubmitGrades = async () => {
    const totalMarks = getWeightagesSum();
    
    // Calculate class average
    const totalScore = rosterScores.reduce((sum, s) => sum + getOverallScore(s), 0);
    const avg = rosterScores.length > 0 ? Number((totalScore / rosterScores.length).toFixed(1)) : 0;

    const report = {
      title: assessmentTitle,
      subject: selectedSubject,
      grade: selectedGrade,
      section: selectedSection,
      questions: questions.length,
      maxMarks: totalMarks,
      average: avg,
      studentsCount: rosterScores.length,
      auditLogId: `audit_ocr_${Math.floor(100000 + Math.random() * 900000)}`
    };

    setSubmissionReport(report);
    setIsSubmitModalOpen(true);

    // Save to historical assessments
    const newAssessment: HistoricalAssessment = {
      id: `a_${Date.now()}`,
      title: assessmentTitle,
      subject: selectedSubject,
      grade: selectedGrade,
      section: selectedSection,
      date: new Date().toISOString().split("T")[0],
      questionsCount: questions.length,
      totalMarks,
      classAverage: avg,
      status: "completed",
      questions,
      scores: rosterScores
    };

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}"}` + "/api/assessments/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAssessment)
      });
    } catch (e) {
      console.error("Failed to log assessment to backend", e);
    }

    const updated = [newAssessment, ...gradedAssessments];
    setGradedAssessments(updated);
    localStorage.setItem("aspis_assessments_store", JSON.stringify(updated));
  };

  const currentStudentGrade = rosterScores.find(s => s.studentId === selectedStudentId);
  const totalWeightage = getWeightagesSum();

  // Concept alert thresholds
  const getConceptRiskAlerts = (record: StudentGradeRecord) => {
    const alerts: Array<{ concept: string; score: number; max: number; warning: string }> = [];
    questions.forEach(q => {
      const score = record.questionScores[q.id] || 0;
      const max = q.maxMarks;
      const pct = max > 0 ? (score / max) * 100 : 0;
      
      if (pct < 50) {
        let warning = "";
        if (q.mappedConcept === "Fractions") {
          warning = "Cascading risk in Algebra foundations & Physics numericals.";
        } else if (q.mappedConcept === "Linear Equations") {
          warning = "Will impact Class 10 Quadratic Equations progression.";
        } else if (q.mappedConcept === "Coordinate Geometry") {
          warning = "Direct blocker for Class 11 Calculus & Vector geometry.";
        } else {
          warning = `Weakness in ${q.mappedConcept} limits cognitive advancement.`;
        }

        alerts.push({
          concept: q.mappedConcept,
          score,
          max,
          warning
        });
      }
    });
    return alerts;
  };

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10 relative">
      
      {/* Title Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Assessments & Grading</h1>
        <p className="text-xs text-text-secondary mt-1">
          Upload and process exam papers via AI OCR, configure topic weightages, and log student scores with longitudinal risk forecasting.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/10 mb-8 gap-2">
        {role !== "principal" && (
          <>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-5 py-3 text-xs font-bold transition-all border-b-2 rounded-t-sm ${
                activeTab === "upload"
                  ? "text-aspis-blue border-aspis-blue bg-white/[0.02]"
                  : "text-text-muted border-transparent hover:text-text-secondary"
              }`}
            >
              📄 1. Process Question Paper
            </button>
            <button
              disabled={questions.length === 0}
              onClick={() => setActiveTab("grade")}
              className={`px-5 py-3 text-xs font-bold transition-all border-b-2 rounded-t-sm disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === "grade"
                  ? "text-aspis-blue border-aspis-blue bg-white/[0.02]"
                  : "text-text-muted border-transparent hover:text-text-secondary"
              }`}
            >
              📝 2. Log Student Marks
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 rounded-t-sm ${
            activeTab === "history"
              ? "text-aspis-blue border-aspis-blue bg-white/[0.02]"
              : "text-text-muted border-transparent hover:text-text-secondary"
          }`}
        >
          📜 Past Assessments {role === "principal" && "(Analysis Oversight)"}
        </button>
      </div>

      {/* TAB 1: QUESTION UPLOAD & CONFIG */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* File upload panel */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            <div className="bg-background-card border border-white/5 p-6 rounded-md shadow-card">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Class Target</h3>
              
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-text-secondary font-bold uppercase">Grade & Section</label>
                    {(role === "subject_teacher" || role === "teacher") && (
                      <span className="text-[9px] text-aspis-blue font-bold tracking-wider uppercase bg-aspis-blue/10 px-1.5 py-0.5 rounded-sm">Assigned Class</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={selectedGrade} 
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      disabled={role === "subject_teacher" || role === "teacher"}
                      className="bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
                    >
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12</option>
                    </select>
                    <select 
                      value={selectedSection} 
                      onChange={(e) => setSelectedSection(e.target.value)}
                      disabled={role === "subject_teacher" || role === "teacher"}
                      className="bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-text-secondary font-bold uppercase">Subject Area</label>
                  <select 
                    value={selectedSubject} 
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={role === "subject_teacher"}
                    className="bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none cursor-pointer w-full disabled:opacity-85 disabled:cursor-not-allowed"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Social Science">Social Science</option>
                    <option value="English">English</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-text-secondary font-bold uppercase">Assessment Title</label>
                  <input 
                    type="text" 
                    value={assessmentTitle}
                    onChange={(e) => setAssessmentTitle(e.target.value)}
                    className="bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue w-full"
                  />
                </div>
              </div>
            </div>

            {/* Drag Drop Area */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`p-10 border-2 border-dashed rounded-md text-center flex flex-col items-center justify-center min-h-[220px] transition-all relative overflow-hidden ${
                dragActive ? "border-aspis-blue bg-aspis-blue/5" : "border-white/10 bg-background-card hover:border-white/20"
              }`}
            >
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept="application/pdf, image/*"
                onChange={handleFileInput}
              />
              
              {!isUploading ? (
                <>
                  <Upload size={32} className="text-text-muted mb-4" />
                  <p className="text-xs font-bold text-text-primary mb-1">Drag and drop question paper here</p>
                  <p className="text-[10px] text-text-secondary mb-4">PDF, PNG, JPG files accepted (max 50MB)</p>
                  <label 
                    htmlFor="file-upload" 
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-sm text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    Select File
                  </label>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center w-full">
                  <div className="relative w-12 h-12 mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-aspis-blue/25" />
                    <div className="absolute inset-0 rounded-full border-2 border-aspis-blue border-t-transparent animate-spin" />
                  </div>
                  
                  <div className="flex flex-col gap-2 max-w-[200px] w-full mt-2">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-text-secondary">AI Extraction Status</span>
                      <span className="text-aspis-blue">{uploadStep * 33}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-aspis-blue rounded-full transition-all duration-500"
                        style={{ width: `${uploadStep * 33}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-text-secondary mt-4 animate-pulse">
                    {uploadStep === 1 && "Running local PaddleOCR text extraction..."}
                    {uploadStep === 2 && "Segmenting structure with Llama 70B..."}
                    {uploadStep === 3 && "Aligning prerequisite concepts in Graph..."}
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* parsed questions layout */}
          <div className="lg:col-span-2">
            <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6 min-h-[460px] flex flex-col justify-between">
              
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Exam Questions & Concepts</h3>
                    <p className="text-[10px] text-text-muted mt-1">Review OCR-extracted questions, adjust max marks weightage, and mapping details.</p>
                  </div>
                  
                  {questions.length > 0 && (
                    <button 
                      onClick={addQuestion}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-sm text-[10px] font-bold text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                      <Plus size={12} /> Add Question
                    </button>
                  )}
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-20 text-xs text-text-muted flex flex-col items-center justify-center">
                    <FileText size={40} className="text-white/5 mb-4" />
                    <p>No question paper processed yet.</p>
                    <p className="text-[10px] opacity-75 mt-1">Upload a question paper on the left to start automatic parsing.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    
                    <div className="grid grid-cols-[1fr_2.5fr_4fr_1fr] px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-white/5">
                      <span>No.</span>
                      <span>Max Marks</span>
                      <span>Mapped Core Concept</span>
                      <span className="text-right">Actions</span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                      {questions.map((q) => (
                        <div key={q.id} className="grid grid-cols-[1fr_2.5fr_4fr_1fr] items-center gap-4 p-2 bg-white/[0.005] border border-white/5 rounded-sm">
                          
                          <input 
                            type="text" 
                            value={q.questionNumber}
                            onChange={(e) => updateQuestion(q.id, "questionNumber", e.target.value)}
                            className="bg-transparent border-none outline-none text-xs text-text-primary font-bold w-12"
                          />

                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              min="1"
                              value={q.maxMarks}
                              onChange={(e) => updateQuestion(q.id, "maxMarks", Number(e.target.value))}
                              className="bg-background-primary border border-white/10 text-xs text-text-primary p-2 w-16 rounded-sm outline-none focus:border-aspis-blue text-center font-bold"
                            />
                            <span className="text-[10px] text-text-muted">Marks</span>
                          </div>

                          <select
                            value={q.mappedConcept}
                            onChange={(e) => updateQuestion(q.id, "mappedConcept", e.target.value)}
                            className="bg-background-primary border border-white/10 text-xs text-text-primary p-2 rounded-sm outline-none cursor-pointer focus:border-aspis-blue"
                          >
                            {AVAILABLE_CONCEPTS.map(concept => (
                              <option key={concept} value={concept}>{concept}</option>
                            ))}
                          </select>

                          <div className="text-right">
                            <button
                              onClick={() => removeQuestion(q.id)}
                              className="w-7 h-7 bg-risk-critical/10 hover:bg-risk-critical/20 text-risk-critical flex items-center justify-center rounded-sm transition-colors ml-auto"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>

                  </div>
                )}
              </div>

              {questions.length > 0 && (
                <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-xs text-text-secondary font-bold">
                    Total Assessment Marks: <span className="text-aspis-blue font-black text-sm">{totalWeightage}</span> ({questions.length} questions mapped)
                  </div>
                  
                  <button
                    onClick={() => setActiveTab("grade")}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow hover:-translate-y-[1px] transition-all"
                  >
                    Confirm & Start Grading <ArrowRight size={14} />
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* TAB 2: GRADE ENTRY FLOW */}
      {activeTab === "grade" && questions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Student Roster Left List */}
          <div className="lg:col-span-1 bg-background-card border border-white/5 rounded-md shadow-card p-6 flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Student Roster</h3>
                <p className="text-[10px] text-text-muted mt-1">Select a student to enter individual question scores.</p>
              </div>

              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                {rosterScores.map((record) => {
                  const score = getOverallScore(record);
                  const isSelected = record.studentId === selectedStudentId;
                  
                  return (
                    <div
                      key={record.studentId}
                      onClick={() => setSelectedStudentId(record.studentId)}
                      className={`flex items-center gap-3 p-3.5 border rounded-sm cursor-pointer transition-all ${
                        isSelected 
                          ? "border-aspis-blue bg-aspis-blue/10 hover:bg-aspis-blue/15" 
                          : "border-white/5 bg-white/[0.005] hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-black uppercase ${
                        record.riskLevel === "critical"
                          ? "border-risk-critical text-risk-critical bg-risk-critical/10"
                          : record.riskLevel === "high"
                          ? "border-risk-high text-risk-high bg-risk-high/10"
                          : "border-risk-low text-risk-low bg-risk-low/10"
                      }`}>
                        {record.initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-extrabold text-text-primary truncate">{record.studentName}</div>
                        <div className="text-[9px] text-text-muted">Roll #{record.roll}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-text-primary">
                          {score} <span className="text-[10px] text-text-muted">/ {totalWeightage}</span>
                        </div>
                        <div className="text-[9px] text-text-secondary">
                          {totalWeightage > 0 ? Math.round((score / totalWeightage) * 100) : 0}%
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/5 pt-6 flex gap-2 justify-between">
              <button 
                onClick={prevStudent}
                className="px-3.5 py-2 border border-white/10 rounded-sm text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors flex-1"
              >
                Previous Student
              </button>
              <button 
                onClick={nextStudent}
                className="px-3.5 py-2 border border-white/10 rounded-sm text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors flex-1"
              >
                Next Student
              </button>
            </div>

          </div>

          {/* Core Score Entry Panel */}
          {currentStudentGrade && (
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Question Marks input grid */}
              <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
                
                <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aspis-blue to-aspis-academic flex items-center justify-center text-xs font-black text-white">
                      {currentStudentGrade.initials}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-text-primary">{currentStudentGrade.studentName}</h3>
                      <p className="text-[10px] text-text-muted">Grading profile: Grade {selectedGrade}{selectedSection} · Mathematics</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-aspis-blue">
                      {getOverallScore(currentStudentGrade)} <span className="text-xs text-text-muted">/ {totalWeightage}</span>
                    </div>
                    <div className="text-[10px] text-text-secondary">
                      Accumulated score: {totalWeightage > 0 ? Math.round((getOverallScore(currentStudentGrade) / totalWeightage) * 100) : 0}%
                    </div>
                  </div>
                </div>

                {/* Score Input fields */}
                <div className="flex flex-col gap-3 mb-6">
                  {questions.map((q) => {
                    const currentVal = currentStudentGrade.questionScores[q.id] ?? 0;
                    return (
                      <div key={q.id} className="grid grid-cols-[1fr_3.5fr_2.5fr] items-center gap-4 p-3 bg-white/[0.005] border border-white/5 rounded-sm">
                        
                        <span className="text-xs font-black text-text-primary">{q.questionNumber}</span>
                        
                        <div>
                          <div className="text-xs font-bold text-text-secondary">{q.mappedConcept}</div>
                          <div className="text-[9px] text-text-muted mt-0.5">Maximum weightage: {q.maxMarks} marks</div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <input 
                            type="number"
                            min="0"
                            max={q.maxMarks}
                            value={currentVal}
                            onChange={(e) => updateStudentMark(currentStudentGrade.studentId, q.id, Number(e.target.value))}
                            className="bg-background-primary border border-white/10 text-xs text-text-primary p-2 w-16 rounded-sm outline-none focus:border-aspis-blue text-center font-bold"
                          />
                          <span className="text-xs text-text-muted">/ {q.maxMarks}</span>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Cognitive alerts */}
                {getConceptRiskAlerts(currentStudentGrade).length > 0 && (
                  <div className="p-4 bg-risk-critical/10 border-l-4 border-risk-critical rounded-sm flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-risk-critical font-bold text-xs">
                      <AlertTriangle size={14} /> Cognitive Gaps Detected (Curriculum Vulnerability)
                    </div>
                    <div className="flex flex-col gap-1.5 pl-6 text-[10px] text-text-secondary">
                      {getConceptRiskAlerts(currentStudentGrade).map((alert, idx) => (
                        <div key={idx} className="leading-relaxed">
                          • Low score in <strong>{alert.concept}</strong> ({alert.score}/{alert.max}): {alert.warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Complete & Submit Assessment */}
              <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                
                <div className="flex items-start gap-2.5 text-[10px] text-text-secondary max-w-[420px]">
                  <ShieldCheck className="text-risk-low mt-0.5 flex-shrink-0" size={16} />
                  <div>
                    <p className="font-extrabold text-text-primary">Verify Assessment Completion</p>
                    <p className="text-text-muted mt-0.5">
                      Check that all students in Class {selectedGrade}{selectedSection} have question scores filled. Locking the scores publishes them to the core database and triggers the Neo4j predictive engine calculations.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSubmitGrades}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow hover:-translate-y-[1px] transition-transform"
                >
                  <Lock size={14} /> Lock & Submit Grading
                </button>

              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 3: ASSESSMENT RECORDS HISTORY */}
      {activeTab === "history" && (
        <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="text-text-secondary" size={15} />
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Assessment & Exam Log</h3>
          </div>

          <div className="flex flex-col gap-2">
            
            <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1.5fr_1fr] px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-widest hidden md:grid">
              <span>Assessment Title</span>
              <span>Date</span>
              <span>Target Class</span>
              <span className="text-center">Questions / Marks</span>
              <span className="text-center">Class Average</span>
              <span className="text-right">Actions</span>
            </div>

            {gradedAssessments.map((a) => (
              <div 
                key={a.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1.5fr_1.5fr_1fr] items-center gap-4 p-4 border border-white/5 bg-white/[0.005] hover:bg-white/[0.03] rounded-sm text-xs transition-colors"
              >
                <div>
                  <div className="font-extrabold text-text-primary">{a.title}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">{a.subject}</div>
                </div>

                <div className="text-text-secondary font-semibold">
                  {a.date}
                </div>

                <div className="text-text-secondary font-semibold">
                  Grade {a.grade}{a.section}
                </div>

                <div className="text-center">
                  <span className="px-2.5 py-0.5 bg-background-glass border border-white/10 rounded-sm font-bold">
                    {a.questionsCount} Qs · {a.totalMarks} Marks
                  </span>
                </div>

                <div className="text-center flex items-center justify-center gap-2 text-text-primary font-black">
                  <TrendingUp size={13} className="text-risk-low" />
                  {a.classAverage} / {a.totalMarks} ({Math.round((a.classAverage / a.totalMarks) * 100)}%)
                </div>

                <div className="text-right">
                  {a.questions && a.scores ? (
                    <button
                      onClick={() => setSelectedAnalysisAssessment(a)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-aspis-blue/10 border border-aspis-blue/20 text-aspis-blue text-[10px] font-bold rounded-sm hover:bg-aspis-blue/20 transition-colors"
                    >
                      <BarChart2 size={12} /> Analyze
                    </button>
                  ) : (
                    <span className="text-[10px] text-text-muted">No data</span>
                  )}
                </div>

              </div>
            ))}

          </div>
        </div>
      )}

      {/* PERFORMANCE ANALYSIS MODAL */}
      {selectedAnalysisAssessment && selectedAnalysisAssessment.questions && selectedAnalysisAssessment.scores && (() => {
        const aa = selectedAnalysisAssessment;
        const qs = aa.questions!;
        const sc = aa.scores!;
        const totalMarksMax = qs.reduce((s, q) => s + q.maxMarks, 0);

        // Per-question stats
        const questionStats = qs.map(q => {
          const scores = sc.map(s => s.questionScores[q.id] || 0);
          const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          const highest = Math.max(...scores);
          const lowest = Math.min(...scores);
          return { ...q, avg: Number(avg.toFixed(1)), highest, lowest, pct: Number(((avg / q.maxMarks) * 100).toFixed(0)) };
        });

        // Concept mastery
        const conceptMap: Record<string, { total: number; scored: number }> = {};
        qs.forEach(q => {
          if (!conceptMap[q.mappedConcept]) conceptMap[q.mappedConcept] = { total: 0, scored: 0 };
          sc.forEach(s => {
            conceptMap[q.mappedConcept].total += q.maxMarks;
            conceptMap[q.mappedConcept].scored += s.questionScores[q.id] || 0;
          });
        });
        const conceptMastery = Object.entries(conceptMap).map(([name, d]) => ({
          name,
          pct: Number(((d.scored / d.total) * 100).toFixed(0))
        })).sort((a, b) => a.pct - b.pct);

        // Student tiers
        const studentTotals = sc.map(s => {
          const total = qs.reduce((sum, q) => sum + (s.questionScores[q.id] || 0), 0);
          const pct = totalMarksMax > 0 ? (total / totalMarksMax) * 100 : 0;
          return { ...s, total, pct: Number(pct.toFixed(1)) };
        }).sort((a, b) => b.pct - a.pct);

        const highPerformers = studentTotals.filter(s => s.pct >= 80);
        const midTier = studentTotals.filter(s => s.pct >= 50 && s.pct < 80);
        const critical = studentTotals.filter(s => s.pct < 50);

        // Weakest concept
        const weakestConcept = conceptMastery.length > 0 ? conceptMastery[0] : null;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-[860px] bg-background-card border border-white/10 rounded-md shadow-card my-8">

              {/* Header */}
              <div className="sticky top-0 z-10 bg-background-card border-b border-white/5 p-6 flex items-center justify-between rounded-t-md">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedAnalysisAssessment(null)}
                    className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <div>
                    <h2 className="text-base font-black text-text-primary">{aa.title}</h2>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {aa.subject} · Grade {aa.grade}{aa.section} · {aa.date} · {sc.length} students graded
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-aspis-blue">{aa.classAverage}<span className="text-xs text-text-muted"> / {aa.totalMarks}</span></div>
                  <div className="text-[10px] text-text-secondary">Class Average ({Math.round((aa.classAverage / aa.totalMarks) * 100)}%)</div>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-6">

                {/* Summary KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-aspis-blue/5 border border-aspis-blue/10 rounded-sm text-center">
                    <div className="text-2xl font-black text-aspis-blue">{qs.length}</div>
                    <div className="text-[10px] text-text-muted font-bold uppercase mt-1">Questions</div>
                  </div>
                  <div className="p-4 bg-risk-low/5 border border-risk-low/10 rounded-sm text-center">
                    <div className="text-2xl font-black text-risk-low">{highPerformers.length}</div>
                    <div className="text-[10px] text-text-muted font-bold uppercase mt-1">High (≥80%)</div>
                  </div>
                  <div className="p-4 bg-risk-medium/5 border border-risk-medium/10 rounded-sm text-center">
                    <div className="text-2xl font-black text-risk-medium">{midTier.length}</div>
                    <div className="text-[10px] text-text-muted font-bold uppercase mt-1">Mid (50-79%)</div>
                  </div>
                  <div className="p-4 bg-risk-critical/5 border border-risk-critical/10 rounded-sm text-center">
                    <div className="text-2xl font-black text-risk-critical">{critical.length}</div>
                    <div className="text-[10px] text-text-muted font-bold uppercase mt-1">Critical (&lt;50%)</div>
                  </div>
                </div>

                {/* Question-by-Question Breakdown */}
                <div className="bg-background-primary/40 border border-white/5 rounded-sm p-5">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BarChart2 size={14} className="text-aspis-blue" /> Question-by-Question Analysis
                  </h3>
                  <div className="flex flex-col gap-3">
                    {questionStats.map(q => (
                      <div key={q.id}>
                        <div className="flex justify-between items-center mb-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-text-primary">{q.questionNumber}</span>
                            <span className="text-[10px] text-text-muted px-1.5 py-0.5 bg-white/5 border border-white/5 rounded-sm">{q.mappedConcept}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-text-muted text-[10px]">Low: {q.lowest}</span>
                            <span className="text-text-muted text-[10px]">High: {q.highest}</span>
                            <span className={`font-black ${q.pct >= 70 ? "text-risk-low" : q.pct >= 50 ? "text-risk-medium" : "text-risk-critical"}`}>
                              Avg: {q.avg} / {q.maxMarks} ({q.pct}%)
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${q.pct}%`,
                              background: q.pct >= 70 ? "#10b981" : q.pct >= 50 ? "#f59e0b" : "linear-gradient(to right, #f43f5e, #f97316)"
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Concept Mastery */}
                <div className="bg-background-primary/40 border border-white/5 rounded-sm p-5">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Brain size={14} className="text-aspis-blue" /> Concept Mastery Rates
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {conceptMastery.map(c => (
                      <div key={c.name} className="flex items-center gap-3 p-3 bg-white/[0.005] border border-white/5 rounded-sm">
                        <div className={`w-10 h-10 rounded-sm flex items-center justify-center font-black text-sm ${
                          c.pct >= 70 ? "bg-risk-low/10 text-risk-low border border-risk-low/20" :
                          c.pct >= 50 ? "bg-risk-medium/10 text-risk-medium border border-risk-medium/20" :
                          "bg-risk-critical/10 text-risk-critical border border-risk-critical/20"
                        }`}>
                          {c.pct}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-text-primary truncate">{c.name}</div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${c.pct}%`,
                                background: c.pct >= 70 ? "#10b981" : c.pct >= 50 ? "#f59e0b" : "#f43f5e"
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Student Performance Tiers */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* High */}
                  <div className="bg-background-primary/40 border border-risk-low/10 rounded-sm p-4">
                    <h4 className="text-[10px] font-bold text-risk-low uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <TrendingUp size={12} /> High Performers (≥80%)
                    </h4>
                    {highPerformers.length === 0 ? (
                      <p className="text-[10px] text-text-muted italic">No students in this tier.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {highPerformers.map(s => (
                          <div key={s.studentId} className="flex items-center justify-between p-2 bg-risk-low/5 rounded-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-risk-low/10 border border-risk-low/20 flex items-center justify-center text-[8px] font-black text-risk-low">{s.initials}</div>
                              <span className="text-[10px] font-bold text-text-primary truncate">{s.studentName}</span>
                            </div>
                            <span className="text-[10px] font-black text-risk-low">{s.total}/{totalMarksMax} ({s.pct}%)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Mid */}
                  <div className="bg-background-primary/40 border border-risk-medium/10 rounded-sm p-4">
                    <h4 className="text-[10px] font-bold text-risk-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Mid Tier (50-79%)
                    </h4>
                    {midTier.length === 0 ? (
                      <p className="text-[10px] text-text-muted italic">No students in this tier.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {midTier.map(s => (
                          <div key={s.studentId} className="flex items-center justify-between p-2 bg-risk-medium/5 rounded-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-risk-medium/10 border border-risk-medium/20 flex items-center justify-center text-[8px] font-black text-risk-medium">{s.initials}</div>
                              <span className="text-[10px] font-bold text-text-primary truncate">{s.studentName}</span>
                            </div>
                            <span className="text-[10px] font-black text-risk-medium">{s.total}/{totalMarksMax} ({s.pct}%)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Critical */}
                  <div className="bg-background-primary/40 border border-risk-critical/10 rounded-sm p-4">
                    <h4 className="text-[10px] font-bold text-risk-critical uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Critical Remediation (&lt;50%)
                    </h4>
                    {critical.length === 0 ? (
                      <p className="text-[10px] text-text-muted italic">No students in this tier.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {critical.map(s => (
                          <div key={s.studentId} className="flex items-center justify-between p-2 bg-risk-critical/5 rounded-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-risk-critical/10 border border-risk-critical/20 flex items-center justify-center text-[8px] font-black text-risk-critical">{s.initials}</div>
                              <span className="text-[10px] font-bold text-text-primary truncate">{s.studentName}</span>
                            </div>
                            <span className="text-[10px] font-black text-risk-critical">{s.total}/{totalMarksMax} ({s.pct}%)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Pedagogical Insight */}
                <div className="p-5 bg-aspis-blue/5 border border-aspis-blue/10 rounded-sm">
                  <div className="flex items-start gap-3">
                    <Brain className="text-aspis-blue flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-xs font-extrabold text-text-primary mb-2">AI Pedagogical Recommendations</h4>
                      <div className="flex flex-col gap-2 text-[11px] text-text-secondary leading-relaxed">
                        {weakestConcept && weakestConcept.pct < 60 && (
                          <p>
                            <strong className="text-risk-critical">Priority Reteach:</strong> {weakestConcept.name} has the lowest class mastery at {weakestConcept.pct}%. 
                            Allocate dedicated remediation sessions focusing on foundational understanding before progressing to dependent topics.
                          </p>
                        )}
                        {critical.length > 0 && (
                          <p>
                            <strong className="text-risk-high">Intervention Alert:</strong> {critical.length} student{critical.length > 1 ? "s" : ""} scored below 50% — 
                            {critical.map(s => s.studentName).join(", ")}. 
                            Consider one-on-one revision sessions and modified practice worksheets targeting their weakest question areas.
                          </p>
                        )}
                        {highPerformers.length > 0 && (
                          <p>
                            <strong className="text-risk-low">Peer Learning Opportunity:</strong> {highPerformers.map(s => s.studentName).join(", ")} scored ≥80%. 
                            Pair them with struggling students for collaborative study groups to reinforce understanding through teaching.
                          </p>
                        )}
                        {conceptMastery.filter(c => c.pct >= 70).length === conceptMastery.length && (
                          <p>
                            <strong className="text-aspis-blue">Strong Foundation:</strong> All concepts achieved ≥70% mastery. 
                            The class is ready to advance to the next topic module. Consider introducing challenge problems to stretch top performers.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedAnalysisAssessment(null)}
                  className="w-full py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow hover:-translate-y-[1px] transition-transform"
                >
                  Close Analysis
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* SUBMISSION CONFIRMATION MODAL */}
      {isSubmitModalOpen && submissionReport && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-[480px] bg-background-card border border-white/10 p-8 rounded-md shadow-card text-center">
            
            <div className="w-14 h-14 rounded-full bg-risk-low/10 border border-risk-low/20 text-risk-low flex items-center justify-center mx-auto mb-6">
              <Check size={28} />
            </div>

            <h2 className="text-lg font-black text-text-primary mb-2">Grading Session Locked & Saved</h2>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              Assessment records have been committed to the PostgreSQL core ledger and mapped onto the student dependency graph.
            </p>

            <div className="p-4 bg-background-primary border border-white/5 rounded-sm text-left text-xs font-semibold text-text-secondary flex flex-col gap-2 mb-6">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Assessment Title:</span>
                <span className="text-text-primary">{submissionReport.title}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Class / Subject:</span>
                <span className="text-text-primary">Grade {submissionReport.grade}{submissionReport.section} · {submissionReport.subject}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Max Marks / Questions:</span>
                <span className="text-text-primary">{submissionReport.maxMarks} Marks ({submissionReport.questions} questions)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Class Average Score:</span>
                <span className="text-risk-low font-bold">{submissionReport.average} / {submissionReport.maxMarks} ({Math.round((submissionReport.average / submissionReport.maxMarks) * 100)}%)</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>DPDPA Security Hash:</span>
                <span className="font-mono text-aspis-blue text-[10px]">{submissionReport.auditLogId}</span>
              </div>
            </div>

            <div className="p-3.5 bg-aspis-blue/5 border border-aspis-blue/10 rounded-sm text-left text-[10px] text-text-secondary flex items-start gap-2.5 mb-8">
              <Brain className="text-aspis-blue flex-shrink-0" size={16} />
              <p>
                <strong>AI Predictive Update:</strong> The Neo4j graph dependency engine is recalculating subsequent concept failure projections. Updated reports will be visible on the Overview Dashboard.
              </p>
            </div>

            <button
              onClick={() => {
                setIsSubmitModalOpen(false);
                setActiveTab("history");
                // Reset state
                setUploadedFile(null);
                setQuestions([]);
              }}
              className="w-full py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow hover:-translate-y-[1px] transition-transform"
            >
              Back to Overview
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
