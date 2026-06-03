"use client";

import { useState, useEffect } from "react";
import {
  Heart,
  Activity,
  Eye,
  AlertTriangle,
  Search,
  Plus,
  Check,
  X,
  Users,
  Stethoscope,
  FileText,
  ClipboardList,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { STUDENTS, Student } from "@/data/mockData";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface HealthRecord {
  studentId: string;
  height: string;
  weight: string;
  bmi: string;
  bloodGroup: string;
  vision: "normal" | "needs_check" | "corrected";
  hearing: "normal" | "needs_check";
  dental: "normal" | "needs_check" | "treatment_ongoing";
  bodyCheckup: "completed" | "pending" | "scheduled";
  allergies: string;
  chronicConditions: string;
  medications: string;
  lastCheckupDate: string;
  vaccinationStatus: "up_to_date" | "pending" | "overdue";
  fitnessCategory: "A" | "B" | "C" | "D";
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// Seed Data
// ──────────────────────────────────────────────
const STORAGE_KEY = "aspis_health_records_v2";

function generateSeedRecords(): HealthRecord[] {
  return [
    {
      studentId: "s1",
      height: "162",
      weight: "54",
      bmi: "20.6",
      bloodGroup: "B+",
      vision: "needs_check",
      hearing: "normal",
      dental: "needs_check",
      bodyCheckup: "completed",
      allergies: "Dust mites, Pollen",
      chronicConditions: "Mild asthma",
      medications: "Salbutamol inhaler (as needed)",
      lastCheckupDate: "2026-02-10",
      vaccinationStatus: "overdue",
      fitnessCategory: "C",
      notes:
        "Vision flag raised during board-work observation. 18 medical absences this term — chronic respiratory pattern suspected. Recommend ophthalmology referral and parent meeting for attendance plan.",
      updatedBy: "Dr. Anil Mehta",
      updatedAt: "2026-05-20T10:30:00",
    },
    {
      studentId: "s2",
      height: "158",
      weight: "48",
      bmi: "19.2",
      bloodGroup: "O+",
      vision: "normal",
      hearing: "normal",
      dental: "normal",
      bodyCheckup: "completed",
      allergies: "None",
      chronicConditions: "None",
      medications: "None",
      lastCheckupDate: "2026-04-15",
      vaccinationStatus: "up_to_date",
      fitnessCategory: "A",
      notes:
        "Excellent health profile. Sports captain — high fitness. Zero exam-period absences. Model health record.",
      updatedBy: "Dr. Anil Mehta",
      updatedAt: "2026-05-18T09:15:00",
    },
    {
      studentId: "s3",
      height: "170",
      weight: "68",
      bmi: "23.5",
      bloodGroup: "A+",
      vision: "normal",
      hearing: "normal",
      dental: "normal",
      bodyCheckup: "scheduled",
      allergies: "Shellfish",
      chronicConditions: "Seasonal allergies",
      medications: "Cetirizine 10mg (seasonal)",
      lastCheckupDate: "2026-03-22",
      vaccinationStatus: "pending",
      fitnessCategory: "B",
      notes:
        "Good fitness from football. Slightly above-average BMI — monitor dietary habits. 9 absences mostly coincide with allergy season.",
      updatedBy: "Dr. Anil Mehta",
      updatedAt: "2026-05-15T14:45:00",
    },
    {
      studentId: "s4",
      height: "155",
      weight: "46",
      bmi: "19.1",
      bloodGroup: "AB+",
      vision: "normal",
      hearing: "normal",
      dental: "treatment_ongoing",
      bodyCheckup: "completed",
      allergies: "None",
      chronicConditions: "None",
      medications: "None",
      lastCheckupDate: "2026-04-02",
      vaccinationStatus: "up_to_date",
      fitnessCategory: "B",
      notes:
        "Healthy profile. Improving trend in attendance. Encourage continued sports participation for basketball.",
      updatedBy: "Dr. Anil Mehta",
      updatedAt: "2026-05-12T11:00:00",
    },
    {
      studentId: "s5",
      height: "167",
      weight: "58",
      bmi: "20.8",
      bloodGroup: "A-",
      vision: "normal",
      hearing: "normal",
      dental: "normal",
      bodyCheckup: "pending",
      allergies: "Penicillin",
      chronicConditions: "None",
      medications: "None",
      lastCheckupDate: "2026-01-28",
      vaccinationStatus: "overdue",
      fitnessCategory: "B",
      notes:
        "Penicillin allergy flagged in all medical records — ensure alternative antibiotics if needed. Vaccination booster overdue since January. Chess and swimming keep fitness adequate.",
      updatedBy: "Dr. Anil Mehta",
      updatedAt: "2026-05-10T16:20:00",
    },
    {
      studentId: "s6",
      height: "160",
      weight: "50",
      bmi: "19.5",
      bloodGroup: "O-",
      vision: "normal",
      hearing: "normal",
      dental: "normal",
      bodyCheckup: "completed",
      allergies: "None",
      chronicConditions: "None",
      medications: "None",
      lastCheckupDate: "2026-05-01",
      vaccinationStatus: "up_to_date",
      fitnessCategory: "A",
      notes:
        "Outstanding health. Near-perfect attendance. Multiple sports leadership roles. Ideal benchmark student for health and wellness.",
      updatedBy: "Dr. Anil Mehta",
      updatedAt: "2026-05-22T08:30:00",
    },
  ];
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function calcBMI(h: string, w: string): string {
  const height = parseFloat(h);
  const weight = parseFloat(w);
  if (!height || !weight || height <= 0) return "";
  const bmi = weight / Math.pow(height / 100, 2);
  return bmi.toFixed(1);
}

function getStudentById(id: string): Student | undefined {
  return STUDENTS.find((s) => s.id === id);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function getHealthColor(student: Student, record?: HealthRecord): string {
  if (!record) return "from-text-muted to-text-muted";
  if (
    record.vision === "needs_check" ||
    record.vaccinationStatus === "overdue" ||
    student.health.absences > 10
  )
    return "from-risk-critical to-risk-high";
  if (
    record.vaccinationStatus === "pending" ||
    record.fitnessCategory === "C" ||
    student.health.absences > 5
  )
    return "from-risk-medium to-risk-high";
  return "from-risk-low to-aspis-sports";
}

function getVisionBadge(v: string) {
  switch (v) {
    case "needs_check":
      return {
        text: "Vision ⚠",
        cls: "bg-risk-critical/10 text-risk-critical border-risk-critical/20",
      };
    case "corrected":
      return {
        text: "Corrected",
        cls: "bg-aspis-blue/10 text-aspis-blue border-aspis-blue/20",
      };
    default:
      return {
        text: "Normal",
        cls: "bg-risk-low/10 text-risk-low border-risk-low/20",
      };
  }
}

function getVaccinationBadge(v: string) {
  switch (v) {
    case "overdue":
      return {
        text: "Overdue",
        cls: "bg-risk-critical/10 text-risk-critical border-risk-critical/20",
      };
    case "pending":
      return {
        text: "Pending",
        cls: "bg-risk-medium/10 text-risk-medium border-risk-medium/20",
      };
    default:
      return {
        text: "Up to date",
        cls: "bg-risk-low/10 text-risk-low border-risk-low/20",
      };
  }
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
export default function MedicalDashboard() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<HealthRecord | null>(null);
  const [searchGrade, setSearchGrade] = useState("9");
  const [searchSection, setSearchSection] = useState("A");
  const [searchGrNo, setSearchGrNo] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Load from API on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}"}` + "/api/medical")
      .then(res => res.json())
      .then(data => {
        const parsed = Object.values(data) as HealthRecord[];
        if (parsed.length > 0) {
          setRecords(parsed);
        } else {
          // Seed demo data
          const seed = generateSeedRecords();
          seed.forEach(r => {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/medical/${r.studentId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(r)
            });
          });
          setRecords(seed);
        }
      })
      .catch(err => console.error("Failed to fetch medical records from API:", err));
  }, []);

  // Select a student → populate edit form
  useEffect(() => {
    if (selectedId) {
      const existing = records.find((r) => r.studentId === selectedId);
      if (existing) {
        setEditRecord({ ...existing });
      } else {
        // New blank record
        setEditRecord({
          studentId: selectedId,
          height: "",
          weight: "",
          bmi: "",
          bloodGroup: "O+",
          vision: "normal",
          hearing: "normal",
          dental: "normal",
          bodyCheckup: "pending",
          allergies: "",
          chronicConditions: "",
          medications: "",
          lastCheckupDate: "",
          vaccinationStatus: "pending",
          fitnessCategory: "B",
          notes: "",
          updatedBy: "Dr. Anil Mehta",
          updatedAt: "",
        });
      }
    } else {
      setEditRecord(null);
    }
    setSaveStatus("idle");
  }, [selectedId, records]);

  // Update height/weight → auto-calc BMI
  function handleFieldChange(field: keyof HealthRecord, value: string) {
    if (!editRecord) return;
    const updated = { ...editRecord, [field]: value };
    if (field === "height" || field === "weight") {
      updated.bmi = calcBMI(
        field === "height" ? value : updated.height,
        field === "weight" ? value : updated.weight
      );
    }
    setEditRecord(updated);
  }

  // Save to state + localStorage
  function handleSave() {
    if (!editRecord) return;
    setSaveStatus("saving");
    const now = new Date().toISOString();
    const finalRecord: HealthRecord = {
      ...editRecord,
      updatedBy: "Dr. Anil Mehta",
      updatedAt: now,
    };

    const newRecords = records.filter(
      (r) => r.studentId !== finalRecord.studentId
    );
    newRecords.push(finalRecord);
    setRecords(newRecords);
    
    // Save to API
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/medical/${finalRecord.studentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalRecord)
    }).catch(err => console.error("Failed to save to API:", err));

    setTimeout(() => setSaveStatus("saved"), 300);
    setTimeout(() => setSaveStatus("idle"), 2200);
  }

  // ── Computed KPIs ──
  const totalScreened = records.length;
  const visionFlags = records.filter((r) => r.vision !== "normal").length;
  const vaccinationOverdue = records.filter(
    (r) => r.vaccinationStatus === "overdue"
  ).length;
  const avgBMI =
    records.length > 0
      ? (
          records.reduce((s, r) => s + (parseFloat(r.bmi) || 0), 0) /
          records.length
        ).toFixed(1)
      : "—";

  // ── Search filter ──
  const filteredStudents = STUDENTS.filter((s) => {
    if (searchGrNo.trim() !== "") {
      return s.id.toLowerCase() === searchGrNo.trim().toLowerCase() || s.roll === searchGrNo.trim();
    }
    return s.grade === searchGrade && s.section === searchSection;
  });

  // ── Health alerts ──
  const alerts: Array<{
    icon: React.ReactNode;
    studentName: string;
    concern: string;
    severity: "critical" | "warning" | "info";
  }> = [];

  STUDENTS.forEach((s) => {
    const rec = records.find((r) => r.studentId === s.id);
    if (s.health.vision_flag) {
      alerts.push({
        icon: <Eye size={14} />,
        studentName: s.name,
        concern: "Vision flag raised — needs ophthalmology check",
        severity: "critical",
      });
    }
    if (s.health.absences > 10) {
      alerts.push({
        icon: <Activity size={14} />,
        studentName: s.name,
        concern: `${s.health.absences} medical absences this term — chronic pattern`,
        severity: "critical",
      });
    }
    if (rec && rec.vaccinationStatus === "overdue") {
      alerts.push({
        icon: <AlertTriangle size={14} />,
        studentName: s.name,
        concern: "Vaccination booster overdue — compliance risk",
        severity: "warning",
      });
    }
    if (s.health.absences > 5 && s.health.absences <= 10) {
      alerts.push({
        icon: <ClipboardList size={14} />,
        studentName: s.name,
        concern: `${s.health.absences} absences — monitor attendance pattern`,
        severity: "info",
      });
    }
  });

  const selectedStudent = selectedId
    ? getStudentById(selectedId)
    : null;

  const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10">
      {/* ═══════ HEADER ═══════ */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-sm bg-aspis-health/10 flex items-center justify-center text-aspis-health">
              <Stethoscope size={20} />
            </div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">
              Medical Health Records
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1 ml-[52px]">
            Manage student health profiles, track medical conditions, and flag
            health-related academic risks.
          </p>
        </div>
        <div className="px-4 py-2 bg-risk-low/10 border border-risk-low/20 rounded-sm text-xs font-semibold text-risk-low flex items-center gap-2 shrink-0">
          <ShieldCheck size={14} />
          DPDPA Health Data Isolation Active
        </div>
      </div>

      {/* ═══════ KPI CARDS ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Screened */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-aspis-blue/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-aspis-blue" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              Students Screened
            </span>
            <div className="w-9 h-9 rounded-sm bg-aspis-blue/10 flex items-center justify-center text-aspis-blue">
              <Users size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-aspis-blue">
            {totalScreened}
          </div>
          <div className="text-[10px] text-text-muted mt-2">
            Of {STUDENTS.length} enrolled students
          </div>
        </div>

        {/* Vision Flags */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-risk-high/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-high" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              Vision Flags
            </span>
            <div className="w-9 h-9 rounded-sm bg-risk-high/10 flex items-center justify-center text-risk-high">
              <Eye size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-risk-high">
            {visionFlags}
          </div>
          <div className="text-[10px] text-text-muted mt-2">
            Students with non-normal vision status
          </div>
        </div>

        {/* Vaccination Overdue */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-risk-critical/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-critical" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              Vaccination Overdue
            </span>
            <div className="w-9 h-9 rounded-sm bg-risk-critical/10 flex items-center justify-center text-risk-critical">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-risk-critical">
            {vaccinationOverdue}
          </div>
          <div className="text-[10px] text-text-muted mt-2">
            Require immediate booster scheduling
          </div>
        </div>

        {/* Average BMI */}
        <div className="p-6 bg-background-card border border-white/5 rounded-md shadow-card relative overflow-hidden group hover:border-risk-low/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-risk-low" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              Average BMI
            </span>
            <div className="w-9 h-9 rounded-sm bg-risk-low/10 flex items-center justify-center text-risk-low">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-4xl font-black text-risk-low">{avgBMI}</div>
          <div className="text-[10px] text-text-muted mt-2">
            Healthy range: 18.5 – 24.9
          </div>
        </div>
      </div>

      {/* ═══════ MAIN CONTENT — TWO COLUMNS ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 mb-8">
        {/* ── LEFT: Student List ── */}
        <div className="bg-background-card border border-white/5 rounded-md shadow-card flex flex-col overflow-hidden">
          {/* Search / Filters */}
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={searchGrade}
                onChange={(e) => setSearchGrade(e.target.value)}
                className="w-1/2 bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors appearance-none cursor-pointer"
              >
                <option value="9" className="bg-background-primary">Grade 9</option>
                <option value="10" className="bg-background-primary">Grade 10</option>
              </select>
              <select
                value={searchSection}
                onChange={(e) => setSearchSection(e.target.value)}
                className="w-1/2 bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors appearance-none cursor-pointer"
              >
                <option value="A" className="bg-background-primary">Div A</option>
                <option value="B" className="bg-background-primary">Div B</option>
                <option value="C" className="bg-background-primary">Div C</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest px-2">OR</div>
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  placeholder="GR No (e.g. s1, 101)"
                  value={searchGrNo}
                  onChange={(e) => setSearchGrNo(e.target.value)}
                  className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 pl-9 rounded-sm outline-none focus:border-aspis-blue transition-colors"
                />
              </div>
            </div>
            <div className="text-[9px] text-text-muted mt-2 uppercase tracking-widest font-bold">
              {filteredStudents.length} Student{filteredStudents.length !== 1 ? "s" : ""} Found
            </div>
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
            {filteredStudents.map((student) => {
              const rec = records.find((r) => r.studentId === student.id);
              const isSelected = selectedId === student.id;
              const healthGradient = getHealthColor(student, rec);
              const vBadge = rec ? getVisionBadge(rec.vision) : null;
              const vacBadge = rec
                ? getVaccinationBadge(rec.vaccinationStatus)
                : null;

              return (
                <button
                  key={student.id}
                  onClick={() => setSelectedId(student.id)}
                  className={`w-full text-left flex items-center gap-3.5 p-4 border-b border-white/5 transition-all duration-200 ${
                    isSelected
                      ? "bg-aspis-blue/[0.08] border-l-2 border-l-aspis-blue"
                      : "hover:bg-white/[0.03] border-l-2 border-l-transparent"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${healthGradient} flex items-center justify-center text-xs font-black text-white shrink-0`}
                  >
                    {student.initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-extrabold text-text-primary truncate">
                      {student.name}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Grade {student.grade}
                      {student.section} · Roll #{student.roll}
                    </div>
                    {/* Badges row */}
                    {rec && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {vBadge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold border ${vBadge.cls}`}
                          >
                            {vBadge.text}
                          </span>
                        )}
                        {vacBadge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold border ${vacBadge.cls}`}
                          >
                            Vax: {vacBadge.text}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded-sm text-[8px] font-bold border border-white/10 text-text-muted bg-background-glass">
                          Cat {rec.fitnessCategory}
                        </span>
                      </div>
                    )}
                    {!rec && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="px-1.5 py-0.5 rounded-sm text-[8px] font-bold border border-white/10 text-text-muted bg-background-glass">
                          No record
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Risk indicator */}
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-aspis-blue shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Detail / Edit Panel ── */}
        <div className="bg-background-card border border-white/5 rounded-md shadow-card overflow-hidden flex flex-col">
          {!selectedId || !editRecord ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-background-glass border border-white/5 flex items-center justify-center mb-6">
                <FileText size={28} className="text-text-muted" />
              </div>
              <h3 className="text-sm font-bold text-text-secondary mb-2">
                Select a Student
              </h3>
              <p className="text-xs text-text-muted max-w-xs">
                Click on a student from the list to view, create, or update
                their health record.
              </p>
            </div>
          ) : (
            /* Health Record Form */
            <div className="flex-1 overflow-y-auto max-h-[680px]">
              {/* Panel Header */}
              <div className="sticky top-0 z-10 bg-background-card border-b border-white/5 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${getHealthColor(
                      selectedStudent!,
                      editRecord
                    )} flex items-center justify-center text-xs font-black text-white`}
                  >
                    {selectedStudent?.initials}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-text-primary">
                      {selectedStudent?.name}
                    </h2>
                    <p className="text-[10px] text-text-muted">
                      Grade {selectedStudent?.grade}
                      {selectedStudent?.section} · Roll #
                      {selectedStudent?.roll} · {selectedStudent?.id.toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-8 h-8 rounded-sm bg-background-glass border border-white/5 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/[0.08] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* ── Section: Physical Measurements ── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Heart size={14} className="text-aspis-health" />
                    <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                      Physical Measurements
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Height */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        value={editRecord.height}
                        onChange={(e) =>
                          handleFieldChange("height", e.target.value)
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors"
                        placeholder="e.g. 165"
                      />
                    </div>
                    {/* Weight */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={editRecord.weight}
                        onChange={(e) =>
                          handleFieldChange("weight", e.target.value)
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors"
                        placeholder="e.g. 55"
                      />
                    </div>
                    {/* BMI (auto) */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        BMI (auto)
                      </label>
                      <div className="w-full bg-background-glass/50 border border-white/5 text-xs text-text-secondary p-2.5 rounded-sm font-mono">
                        {editRecord.bmi || "—"}
                      </div>
                    </div>
                    {/* Blood Group */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Blood Group
                      </label>
                      <select
                        value={editRecord.bloodGroup}
                        onChange={(e) =>
                          handleFieldChange("bloodGroup", e.target.value)
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors appearance-none cursor-pointer"
                      >
                        {BLOOD_GROUPS.map((bg) => (
                          <option
                            key={bg}
                            value={bg}
                            className="bg-background-primary"
                          >
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Section: Comprehensive Checkups ── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Eye size={14} className="text-aspis-blue" />
                    <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                      Sensory & General Checkups
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Vision */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Vision Status
                      </label>
                      <select
                        value={editRecord.vision}
                        onChange={(e) =>
                          handleFieldChange("vision", e.target.value)
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors appearance-none cursor-pointer"
                      >
                        <option
                          value="normal"
                          className="bg-background-primary"
                        >
                          Normal
                        </option>
                        <option
                          value="needs_check"
                          className="bg-background-primary"
                        >
                          Needs Check
                        </option>
                        <option
                          value="corrected"
                          className="bg-background-primary"
                        >
                          Corrected (Glasses/Lenses)
                        </option>
                      </select>
                    </div>
                    {/* Hearing */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Hearing Status
                      </label>
                      <select
                        value={editRecord.hearing}
                        onChange={(e) =>
                          handleFieldChange("hearing", e.target.value)
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors appearance-none cursor-pointer"
                      >
                        <option
                          value="normal"
                          className="bg-background-primary"
                        >
                          Normal
                        </option>
                        <option
                          value="needs_check"
                          className="bg-background-primary"
                        >
                          Needs Check
                        </option>
                      </select>
                    </div>
                    {/* Dental */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Dental Health
                      </label>
                      <select
                        value={editRecord.dental}
                        onChange={(e) =>
                          handleFieldChange("dental", e.target.value)
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors appearance-none cursor-pointer"
                      >
                        <option value="normal" className="bg-background-primary">Normal</option>
                        <option value="needs_check" className="bg-background-primary">Needs Check</option>
                        <option value="treatment_ongoing" className="bg-background-primary">Treatment Ongoing</option>
                      </select>
                    </div>
                    {/* Body Checkup */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Full Body Checkup
                      </label>
                      <select
                        value={editRecord.bodyCheckup}
                        onChange={(e) =>
                          handleFieldChange("bodyCheckup", e.target.value)
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors appearance-none cursor-pointer"
                      >
                        <option value="completed" className="bg-background-primary">Completed</option>
                        <option value="pending" className="bg-background-primary">Pending</option>
                        <option value="scheduled" className="bg-background-primary">Scheduled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Section: Medical History ── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardList size={14} className="text-aspis-behavioral" />
                    <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                      Medical History
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Allergies */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Allergies
                      </label>
                      <input
                        type="text"
                        value={editRecord.allergies}
                        onChange={(e) =>
                          handleFieldChange("allergies", e.target.value)
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors"
                        placeholder="e.g. Pollen, Dust mites"
                      />
                    </div>
                    {/* Chronic Conditions */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Chronic Conditions
                      </label>
                      <input
                        type="text"
                        value={editRecord.chronicConditions}
                        onChange={(e) =>
                          handleFieldChange(
                            "chronicConditions",
                            e.target.value
                          )
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors"
                        placeholder="e.g. Asthma, Diabetes"
                      />
                    </div>
                    {/* Medications */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Current Medications
                      </label>
                      <input
                        type="text"
                        value={editRecord.medications}
                        onChange={(e) =>
                          handleFieldChange("medications", e.target.value)
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors"
                        placeholder="e.g. Inhaler, Cetirizine"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Section: Compliance ── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck size={14} className="text-risk-low" />
                    <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                      Compliance
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Last Checkup */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Last Checkup Date
                      </label>
                      <input
                        type="date"
                        value={editRecord.lastCheckupDate}
                        onChange={(e) =>
                          handleFieldChange(
                            "lastCheckupDate",
                            e.target.value
                          )
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors"
                      />
                    </div>
                    {/* Vaccination */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Vaccination Status
                      </label>
                      <select
                        value={editRecord.vaccinationStatus}
                        onChange={(e) =>
                          handleFieldChange(
                            "vaccinationStatus",
                            e.target.value
                          )
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors appearance-none cursor-pointer"
                      >
                        <option
                          value="up_to_date"
                          className="bg-background-primary"
                        >
                          Up to Date
                        </option>
                        <option
                          value="pending"
                          className="bg-background-primary"
                        >
                          Pending
                        </option>
                        <option
                          value="overdue"
                          className="bg-background-primary"
                        >
                          Overdue
                        </option>
                      </select>
                    </div>
                    {/* Fitness Category */}
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block mb-1.5">
                        Fitness Category
                      </label>
                      <select
                        value={editRecord.fitnessCategory}
                        onChange={(e) =>
                          handleFieldChange(
                            "fitnessCategory",
                            e.target.value
                          )
                        }
                        className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-2.5 rounded-sm outline-none focus:border-aspis-blue transition-colors appearance-none cursor-pointer"
                      >
                        {(["A", "B", "C", "D"] as const).map((cat) => (
                          <option
                            key={cat}
                            value={cat}
                            className="bg-background-primary"
                          >
                            Category {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Section: Notes ── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText size={14} className="text-risk-medium" />
                    <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                      Medical Notes
                    </h3>
                  </div>
                  <textarea
                    value={editRecord.notes}
                    onChange={(e) =>
                      handleFieldChange("notes", e.target.value)
                    }
                    rows={4}
                    className="w-full bg-background-glass border border-white/10 text-xs text-text-primary p-3 rounded-sm outline-none focus:border-aspis-blue transition-colors resize-none leading-relaxed"
                    placeholder="Enter clinical observations, recommendations, follow-up notes..."
                  />
                </div>
              </div>

              {/* ── Footer: Save Bar ── */}
              <div className="sticky bottom-0 bg-background-card border-t border-white/5 p-4 flex items-center justify-between">
                <div className="text-[10px] text-text-muted">
                  {editRecord.updatedAt ? (
                    <>
                      Last updated by{" "}
                      <span className="text-text-secondary font-semibold">
                        {editRecord.updatedBy}
                      </span>{" "}
                      on{" "}
                      <span className="text-text-secondary font-semibold">
                        {formatDate(editRecord.updatedAt)}
                      </span>
                    </>
                  ) : (
                    "New record — not yet saved"
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-bold transition-all duration-300 ${
                    saveStatus === "saved"
                      ? "bg-risk-low/20 text-risk-low border border-risk-low/30"
                      : "bg-gradient-to-r from-aspis-blue to-aspis-academic text-white hover:-translate-y-[1px] hover:shadow-glow"
                  }`}
                >
                  {saveStatus === "saved" ? (
                    <>
                      <Check size={14} />
                      Saved Successfully
                    </>
                  ) : saveStatus === "saving" ? (
                    <>
                      <Activity size={14} className="animate-pulse" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Save Record
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ HEALTH ALERTS SECTION ═══════ */}
      <div className="bg-background-card border border-white/5 rounded-md shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-risk-high" />
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Health Alerts &amp; Flags
            </h3>
          </div>
          <span className="text-[10px] text-text-muted font-semibold">
            {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-xs text-text-secondary font-semibold">
              No active health alerts.
            </p>
            <p className="text-[10px] text-text-muted mt-1">
              All students are within healthy parameters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert, idx) => {
              const severityStyles = {
                critical:
                  "bg-risk-critical/[0.06] border-l-4 border-l-risk-critical",
                warning:
                  "bg-risk-medium/[0.06] border-l-4 border-l-risk-medium",
                info: "bg-aspis-blue/[0.06] border-l-4 border-l-aspis-blue",
              };
              const iconStyles = {
                critical: "text-risk-critical bg-risk-critical/10",
                warning: "text-risk-medium bg-risk-medium/10",
                info: "text-aspis-blue bg-aspis-blue/10",
              };
              const textColor = {
                critical: "text-risk-critical",
                warning: "text-risk-medium",
                info: "text-aspis-blue",
              };

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-sm border border-white/5 flex items-start gap-3 transition-all hover:-translate-y-[1px] ${severityStyles[alert.severity]}`}
                >
                  <div
                    className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${iconStyles[alert.severity]}`}
                  >
                    {alert.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-extrabold ${textColor[alert.severity]}`}
                    >
                      {alert.studentName}
                    </div>
                    <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                      {alert.concern}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
