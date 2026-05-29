export interface Student {
  id: string;
  name: string;
  grade: string;
  section: string;
  roll: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number;
  overall_accuracy: number;
  attendance: number;
  initials: string;
  weakTopics: string[];
  strongTopics: string[];
  behavioral: {
    composite: number;
    participation: number;
    leadership: number;
    assignment: number;
  };
  sports: {
    sports: string[];
    fitness: number;
    is_leader: boolean;
  };
  health: {
    absences: number;
    exam_absences: number;
    vision_flag: boolean;
  };
  trend: "improving" | "declining" | "stable";
  futureRisks: Array<{
    from: string;
    to: string;
    grade: string;
    impact: number;
    gap: number;
    cross?: boolean;
  }>;
  aiNarrative: {
    strengths: string[];
    concerns: string[];
    teacher_recommendation: string;
    student_message: string;
    parent_summary: string;
  };
}

export const STUDENTS: Student[] = [
  {
    id: "s1",
    name: "Rahul Sharma",
    grade: "9",
    section: "A",
    roll: "09",
    riskLevel: "critical",
    riskScore: 78.4,
    overall_accuracy: 42.1,
    attendance: 61,
    initials: "RS",
    weakTopics: ["Fractions", "Algebra", "Coordinate Geometry"],
    strongTopics: ["History", "Geography"],
    behavioral: { composite: 4.2, participation: 3.8, leadership: 4.5, assignment: 3.2 },
    sports: { sports: ["Cricket"], fitness: 72, is_leader: false },
    health: { absences: 18, exam_absences: 5, vision_flag: true },
    trend: "declining",
    futureRisks: [
      { from: "Fractions", to: "Algebra", grade: "9", impact: 0.87, gap: 0 },
      { from: "Algebra", to: "Coordinate Geometry", grade: "10", impact: 0.72, gap: 1 },
      { from: "Algebra", to: "Physics Numericals", grade: "11", impact: 0.68, gap: 2, cross: true },
    ],
    aiNarrative: {
      strengths: ["Strong in Humanities subjects with consistent theory scores", "Shows leadership potential in sports environment"],
      concerns: ["Critical weakness in Fractions cascading to 3 future topics", "Vision concern may be impacting board work comprehension", "18 medical absences indicate chronic health pattern"],
      teacher_recommendation: "1. One-on-one Fractions revision 3x per week. 2. Schedule eye check referral. 3. Parent meeting to discuss attendance pattern.",
      student_message: "Your geography scores show real understanding! Mastering fractions will unlock so much more — let's work on it together.",
      parent_summary: "Rahul is struggling with Math foundations that will impact higher grades. His health absences need urgent attention.",
    },
  },
  {
    id: "s2",
    name: "Ananya Patel",
    grade: "9",
    section: "A",
    roll: "02",
    riskLevel: "low",
    riskScore: 18.2,
    overall_accuracy: 84.3,
    attendance: 96,
    initials: "AP",
    weakTopics: ["Trigonometry"],
    strongTopics: ["Algebra", "Biology", "English"],
    behavioral: { composite: 8.8, participation: 9.1, leadership: 8.2, assignment: 9.0 },
    sports: { sports: ["Badminton", "Athletics"], fitness: 91, is_leader: true },
    health: { absences: 2, exam_absences: 0, vision_flag: false },
    trend: "improving",
    futureRisks: [],
    aiNarrative: {
      strengths: ["Outstanding academic consistency (84% overall)", "Sports captain — high leadership and stress resilience", "Zero exam-period absences — excellent health management"],
      concerns: ["Mild weakness in Trigonometry — watch before Class 11 Physics"],
      teacher_recommendation: "1. Consider for peer tutoring program. 2. Provide advanced-level Trig problems. 3. Nominate for science olympiad.",
      student_message: "You're doing brilliantly — your consistency is your superpower! Keep pushing on Trigonometry.",
      parent_summary: "Ananya is performing exceptionally well across all domains. She's one of the class's top performers.",
    },
  },
  {
    id: "s3",
    name: "Kiran Reddy",
    grade: "9",
    section: "A",
    roll: "14",
    riskLevel: "high",
    riskScore: 62.7,
    overall_accuracy: 55.8,
    attendance: 74,
    initials: "KR",
    weakTopics: ["Fractions", "Linear Equations", "Chemical Bonding"],
    strongTopics: ["Physical Education", "Drawing"],
    behavioral: { composite: 5.4, participation: 4.8, leadership: 5.0, assignment: 4.2 },
    sports: { sports: ["Football"], fitness: 85, is_leader: false },
    health: { absences: 9, exam_absences: 3, vision_flag: false },
    trend: "stable",
    futureRisks: [
      { from: "Linear Equations", to: "Quadratic Equations", grade: "10", impact: 0.82, gap: 1 },
      { from: "Chemical Bonding", to: "Organic Chemistry", grade: "11", impact: 0.78, gap: 2, cross: false },
    ],
    aiNarrative: {
      strengths: ["Excellent physical fitness and sports attendance", "Strong visual/kinesthetic learning style"],
      concerns: ["Multiple weak topics across Math and Chemistry", "3 exam-period absences affecting assessment continuity"],
      teacher_recommendation: "1. Provide visual/diagram-based learning materials. 2. Group study with stronger students. 3. Attendance improvement plan.",
      student_message: "Your sports dedication shows you can master anything. Let's apply that same focus to Math!",
      parent_summary: "Kiran has potential but needs academic support in core subjects. Sports discipline can be channeled into study habits.",
    },
  },
  {
    id: "s4",
    name: "Meera Joshi",
    grade: "9",
    section: "B",
    roll: "21",
    riskLevel: "medium",
    riskScore: 41.3,
    overall_accuracy: 68.9,
    attendance: 88,
    initials: "MJ",
    weakTopics: ["Algebra", "Probability"],
    strongTopics: ["English", "History", "Biology"],
    behavioral: { composite: 7.1, participation: 7.8, leadership: 6.4, assignment: 6.9 },
    sports: { sports: ["Basketball"], fitness: 78, is_leader: false },
    health: { absences: 5, exam_absences: 1, vision_flag: false },
    trend: "improving",
    futureRisks: [
      { from: "Algebra", to: "Coordinate Geometry", grade: "10", impact: 0.71, gap: 1 },
    ],
    aiNarrative: {
      strengths: ["Strong humanities performance", "Good participation and engagement"],
      concerns: ["Algebra weakness may impact future Math", "Assignment consistency needs improvement"],
      teacher_recommendation: "1. Extra algebra practice sessions. 2. Encourage assignment tracking.",
      student_message: "Your strong English and History scores show great analytical thinking. Apply that to Algebra word problems!",
      parent_summary: "Meera is doing well overall with room for improvement in Mathematics.",
    },
  },
  {
    id: "s5",
    name: "Arjun Singh",
    grade: "9",
    section: "A",
    roll: "04",
    riskLevel: "medium",
    riskScore: 38.9,
    overall_accuracy: 71.2,
    attendance: 82,
    initials: "AS",
    weakTopics: ["Fractions", "Statistics"],
    strongTopics: ["Physics Theory", "Chemistry", "Computer Science"],
    behavioral: { composite: 6.8, participation: 6.2, leadership: 7.4, assignment: 7.1 },
    sports: { sports: ["Chess", "Swimming"], fitness: 74, is_leader: true },
    health: { absences: 6, exam_absences: 2, vision_flag: false },
    trend: "stable",
    futureRisks: [
      { from: "Fractions", to: "Algebra", grade: "9", impact: 0.78, gap: 0 },
    ],
    aiNarrative: {
      strengths: ["Exceptional in Physics theory and analytical subjects", "Chess shows strategic thinking ability"],
      concerns: ["Fraction weakness will impact Physics numericals directly", "Application questions significantly weaker than theory"],
      teacher_recommendation: "1. Focus on Fraction applications in Physics context. 2. More application-type practice problems.",
      student_message: "Your Physics theory knowledge is impressive! Strengthening fractions will make those numericals much easier.",
      parent_summary: "Arjun shows strong analytical ability but needs to bridge theory-to-application gap in Math.",
    },
  },
  {
    id: "s6",
    name: "Priya Nair",
    grade: "9",
    section: "B",
    roll: "28",
    riskLevel: "low",
    riskScore: 12.1,
    overall_accuracy: 91.4,
    attendance: 98,
    initials: "PN",
    weakTopics: [],
    strongTopics: ["All subjects"],
    behavioral: { composite: 9.4, participation: 9.6, leadership: 9.2, assignment: 9.8 },
    sports: { sports: ["Volleyball", "Athletics"], fitness: 95, is_leader: true },
    health: { absences: 1, exam_absences: 0, vision_flag: false },
    trend: "improving",
    futureRisks: [],
    aiNarrative: {
      strengths: ["Top performer across all domains", "Perfect attendance and zero exam absences", "Multiple sports leadership roles"],
      concerns: [],
      teacher_recommendation: "1. Enroll in inter-school competitions. 2. Assign as class mentor.",
      student_message: "You are excelling in every dimension — keep this momentum through the board years!",
      parent_summary: "Priya is one of the strongest students in school across academics, behavior, and sports.",
    },
  },
];

export const CLASS_STATS = {
  total_students: 38,
  critical_risk: 3,
  high_risk: 6,
  medium_risk: 12,
  low_risk: 17,
  avg_accuracy: 67.4,
  avg_attendance: 84.2,
  class_health: "moderate_concern",
  top_weak_topics: [
    { name: "Fractions", affected: 16, pct: 42.1, subject: "Mathematics" },
    { name: "Algebra", affected: 13, pct: 34.2, subject: "Mathematics" },
    { name: "Chemical Bonding", affected: 11, pct: 28.9, subject: "Chemistry" },
    { name: "Coordinate Geometry", affected: 9, pct: 23.7, subject: "Mathematics" },
    { name: "Trigonometry", affected: 8, pct: 21.1, subject: "Mathematics" },
  ],
  monthly_scores: [62, 65, 61, 68, 66, 72, 70, 74],
  months: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"],
};

export const NOTIFICATIONS = [
  { id: 1, type: "critical", text: "Rahul Sharma risk level increased to CRITICAL", time: "2h ago" },
  { id: 2, type: "warning", text: "43% of Class 9A weak in Fractions — reteach needed", time: "5h ago" },
  { id: 3, type: "info", text: "Intelligence profiles rebuilt for 38 students", time: "1d ago" },
  { id: 4, type: "success", text: "Ananya Patel improved from Medium → Low risk", time: "2d ago" },
];

export interface ChatChannel {
  id: string;
  name: string;
  type: "direct" | "group";
  statusColor?: string;
  subText: string;
  avatarText: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
  isSelf: boolean;
}

export const INITIAL_CHANNELS: ChatChannel[] = [
  { id: "g1", name: "Math Department", type: "group", subText: "3 members", avatarText: "MD" },
  { id: "g2", name: "Grade 9 Committee", type: "group", subText: "5 members", avatarText: "G9" },
  { id: "g3", name: "Compliance Board", type: "group", subText: "4 members", avatarText: "CB" },
  { id: "d1", name: "Priya Sharma", type: "direct", statusColor: "bg-risk-low", subText: "Online", avatarText: "PS" },
  { id: "d2", name: "Amit Verma", type: "direct", statusColor: "bg-risk-medium", subText: "Missing Attendance Today", avatarText: "AV" },
  { id: "d3", name: "Sunita Rao", type: "direct", statusColor: "bg-risk-medium", subText: "Grading Overdue 6 Days", avatarText: "SR" },
  { id: "d4", name: "Ritu Singhal", type: "direct", statusColor: "bg-risk-critical", subText: "AI Warning Unaddressed", avatarText: "RS" },
  { id: "d5", name: "Vikram Sen", type: "direct", statusColor: "bg-risk-low", subText: "Offline", avatarText: "VS" }
];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  g1: [
    { id: "m1", senderName: "Priya Sharma", senderRole: "Teacher", content: "I've uploaded the Math CT2 marks and locked attendance. The fractions concept gaps are showing severe risk chains for Rahul. Dr. Anil Mehta, can we schedule a medical audit check?", timestamp: "Yesterday 16:30", isSelf: false },
    { id: "m2", senderName: "Vikram Sen", senderRole: "Teacher", content: "I noticed something similar in Grade 9 history maps. The students missing math concepts also struggle with timeline sequencing.", timestamp: "Yesterday 17:15", isSelf: false },
    { id: "m3", senderName: "Dr. Ramesh Iyer", senderRole: "Principal", content: "Priya, thank you. Let's discuss this in our Grade 9 committee meeting tomorrow. We should review the Neo4j projections.", timestamp: "Yesterday 18:00", isSelf: true }
  ],
  g2: [
    { id: "m4", senderName: "Amit Verma", senderRole: "Teacher", content: "Grade 9B science lab averages are up to 74%. However, attendance in Period 4 remains a concern.", timestamp: "Today 10:15", isSelf: false },
    { id: "m5", senderName: "Priya Sharma", senderRole: "Teacher", content: "Agreed, we need a unified parent outreach. The DPDPA logs show parental consent is recorded for SMS alerts.", timestamp: "Today 11:00", isSelf: false }
  ],
  d1: [
    { id: "m6", senderName: "Dr. Ramesh Iyer", senderRole: "Principal", content: "Priya, your system maintenance log looks exceptional. Thanks for keeping the mathematics metrics up-to-date.", timestamp: "Today 09:00", isSelf: true },
    { id: "m7", senderName: "Priya Sharma", senderRole: "Teacher", content: "Thank you, Principal! I'm trying to ensure the predictive analytics charts have accurate data.", timestamp: "Today 09:12", isSelf: false }
  ],
  d2: [
    { id: "m8", senderName: "Dr. Ramesh Iyer", senderRole: "Principal", content: "Amit, our compliance tracker flags your Period 4 Science attendance as overdue for today. Please update the logs.", timestamp: "Today 12:40", isSelf: true }
  ]
};

export interface TeacherComplianceRecord {
  id: string;
  name: string;
  classSection: string;
  attendanceStatus: "up_to_date" | "overdue";
  attendanceDetail: string;
  marksStatus: "up_to_date" | "overdue";
  marksDetail: string;
  alertsStatus: "up_to_date" | "ignored";
  alertsDetail: string;
  complianceLevel: "compliant" | "warning" | "critical";
  initials: string;
  credentialsActive: boolean;
  username: string;
  email: string;
  password: string;
}

export const INITIAL_TEACHERS: TeacherComplianceRecord[] = [
  {
    id: "t1",
    name: "Priya Sharma",
    classSection: "Grade 9A",
    attendanceStatus: "up_to_date",
    attendanceDetail: "Period 1 logged today 10:30",
    marksStatus: "up_to_date",
    marksDetail: "CT2 graded 1d ago",
    alertsStatus: "up_to_date",
    alertsDetail: "No unresolved alerts",
    complianceLevel: "compliant",
    initials: "PS",
    credentialsActive: true,
    username: "priya.sharma",
    email: "priya.sharma@school.edu",
    password: "password123"
  },
  {
    id: "t2",
    name: "Amit Verma",
    classSection: "Grade 9B",
    attendanceStatus: "overdue",
    attendanceDetail: "Missing Period 4 Science attendance today",
    marksStatus: "up_to_date",
    marksDetail: "CT1 graded 3d ago",
    alertsStatus: "up_to_date",
    alertsDetail: "No unresolved alerts",
    complianceLevel: "warning",
    initials: "AV",
    credentialsActive: true,
    username: "amit.verma",
    email: "amit.verma@school.edu",
    password: "password123"
  },
  {
    id: "t3",
    name: "Sunita Rao",
    classSection: "Grade 10A",
    attendanceStatus: "up_to_date",
    attendanceDetail: "Period 3 logged today 12:15",
    marksStatus: "overdue",
    marksDetail: "Mid-Term English grading pending for 6 days",
    alertsStatus: "up_to_date",
    alertsDetail: "No unresolved alerts",
    complianceLevel: "warning",
    initials: "SR",
    credentialsActive: true,
    username: "sunita.rao",
    email: "sunita.rao@school.edu",
    password: "password123"
  },
  {
    id: "t4",
    name: "Ritu Singhal",
    classSection: "Grade 11 Science",
    attendanceStatus: "up_to_date",
    attendanceDetail: "Period 2 logged today 09:45",
    marksStatus: "up_to_date",
    marksDetail: "CT2 graded 1d ago",
    alertsStatus: "ignored",
    alertsDetail: "Ignored high risk Math-Calculus alert for 3 days",
    complianceLevel: "critical",
    initials: "RS",
    credentialsActive: true,
    username: "ritu.singhal",
    email: "ritu.singhal@school.edu",
    password: "password123"
  },
  {
    id: "t5",
    name: "Vikram Sen",
    classSection: "Grade 10B",
    attendanceStatus: "up_to_date",
    attendanceDetail: "Period 5 logged today 14:00",
    marksStatus: "up_to_date",
    marksDetail: "CT1 graded 4d ago",
    alertsStatus: "up_to_date",
    alertsDetail: "No unresolved alerts",
    complianceLevel: "compliant",
    initials: "VS",
    credentialsActive: true,
    username: "vikram.sen",
    email: "vikram.sen@school.edu",
    password: "password123"
  }
];

export interface SubjectTeacherRecord {
  id: string;
  name: string;
  subject: string;
  email: string;
  password: string;
  credentialsActive: boolean;
  initials: string;
  username: string;
  classSection: string;
}

export const INITIAL_SUBJECT_TEACHERS: SubjectTeacherRecord[] = [
  {
    id: "st1",
    name: "Amit Verma",
    subject: "Science",
    email: "amit.verma@school.edu",
    password: "password123",
    credentialsActive: true,
    initials: "AV",
    username: "amit.verma",
    classSection: "Grade 9A"
  },
  {
    id: "st2",
    name: "Sunita Rao",
    subject: "English",
    email: "sunita.rao@school.edu",
    password: "password123",
    credentialsActive: true,
    initials: "SR",
    username: "sunita.rao",
    classSection: "Grade 9A"
  },
  {
    id: "st3",
    name: "Vikram Sen",
    subject: "Social Science",
    email: "vikram.sen@school.edu",
    password: "password123",
    credentialsActive: true,
    initials: "VS",
    username: "vikram.sen",
    classSection: "Grade 9A"
  }
];

