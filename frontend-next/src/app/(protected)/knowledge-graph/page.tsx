"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Network, Search, BookOpen, Layers, Maximize2, AlertTriangle, CheckCircle2, ChevronRight, User } from "lucide-react";
import { STUDENTS } from "@/data/mockData";

// --- MOCK ONTOLOGY DATA ---
type ConceptNode = {
  id: string;
  label: string;
  category: "core" | "module" | "skill";
  x: number;
  y: number;
  connections: string[];
};

const MATH_ONTOLOGY: ConceptNode[] = [
  { id: "m_core", label: "Mathematics Core", category: "core", x: 400, y: 100, connections: ["m_alg", "m_geo", "m_stat"] },
  { id: "m_alg", label: "Algebra", category: "module", x: 200, y: 250, connections: ["m_lin", "m_quad"] },
  { id: "m_geo", label: "Geometry", category: "module", x: 600, y: 250, connections: ["m_trig"] },
  { id: "m_stat", label: "Statistics", category: "module", x: 400, y: 250, connections: ["m_prob"] },
  { id: "m_lin", label: "Linear Equations", category: "skill", x: 100, y: 400, connections: [] },
  { id: "m_quad", label: "Quadratics", category: "skill", x: 300, y: 400, connections: ["m_calc"] },
  { id: "m_trig", label: "Trigonometry", category: "skill", x: 600, y: 400, connections: ["m_calc"] },
  { id: "m_prob", label: "Probability", category: "skill", x: 400, y: 400, connections: [] },
  { id: "m_calc", label: "Calculus Intro", category: "skill", x: 450, y: 550, connections: [] },
];

// Mock logic to map a student to their specific knowledge states
const getStudentConceptStatus = (studentId: string, conceptId: string): "mastered" | "learning" | "at-risk" | "locked" => {
  // Deterministic mock generation based on student ID and concept ID string values
  const hash = studentId.charCodeAt(0) + conceptId.charCodeAt(conceptId.length - 1);
  
  if (conceptId.includes("core")) return "mastered";
  if (conceptId === "m_calc") return "locked"; // Usually locked for most
  
  const mod = hash % 10;
  if (mod < 5) return "mastered";
  if (mod < 8) return "learning";
  return "at-risk";
};

export default function StudentKnowledgeGraph() {
  const [selectedStudent, setSelectedStudent] = useState<string>("s1");
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["m_core"]));
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);

  useEffect(() => {
    const rawNodes = MATH_ONTOLOGY;
    const visibleNodes = rawNodes.filter(n => 
      n.category === "core" || 
      rawNodes.some(parent => parent.connections.includes(n.id) && expandedNodes.has(parent.id))
    );
    setNodes(visibleNodes);
  }, [expandedNodes]);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getNodeColor = (status: string) => {
    switch (status) {
      case "mastered": return "border-risk-low bg-risk-low/10 text-risk-low shadow-[0_0_15px_rgba(16,185,129,0.3)]";
      case "at-risk": return "border-risk-critical bg-risk-critical/10 text-risk-critical shadow-[0_0_15px_rgba(244,63,94,0.3)]";
      case "learning": return "border-aspis-blue bg-aspis-blue/10 text-aspis-blue shadow-[0_0_15px_rgba(59,130,246,0.3)]";
      default: return "border-white/10 bg-white/5 text-text-muted";
    }
  };

  const lines = [];
  for (const node of nodes) {
    if (expandedNodes.has(node.id)) {
      for (const targetId of node.connections) {
        const targetNode = nodes.find(n => n.id === targetId);
        if (targetNode) {
          lines.push({
            id: `${node.id}-${targetId}`,
            x1: node.x,
            y1: node.y,
            x2: targetNode.x,
            y2: targetNode.y,
            status: getStudentConceptStatus(selectedStudent, targetNode.id)
          });
        }
      }
    }
  }

  const currentStudent = STUDENTS.find(s => s.id === selectedStudent);
  const activeNodeStatus = selectedNode ? getStudentConceptStatus(selectedStudent, selectedNode.id) : null;

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10 flex flex-col">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight flex items-center gap-3">
            <Network className="text-aspis-academic" size={32} />
            Student Knowledge Graph
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Plotting the granular cognitive state and conceptual mastery of individual students.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-background-card p-2 rounded-sm border border-white/5 shadow-inner">
          <User className="text-text-muted" size={16} />
          <select 
            value={selectedStudent}
            onChange={(e) => { setSelectedStudent(e.target.value); setSelectedNode(null); }}
            className="bg-transparent text-white font-bold text-sm focus:outline-none border-none outline-none pr-8 cursor-pointer appearance-none"
            style={{ WebkitAppearance: "none", MozAppearance: "none" }}
          >
            {STUDENTS.map(s => (
              <option key={s.id} value={s.id} className="bg-background-primary text-white">
                {s.name} ({s.id})
              </option>
            ))}
          </select>
          <div className="w-[1px] h-4 bg-white/10" />
          <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Graph View</div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-[600px]">
        {/* Main Graph Area */}
        <div className="flex-1 bg-background-card border border-white/5 rounded-md relative overflow-hidden shadow-inner">
          <div className="absolute top-4 left-4 flex gap-4 text-[10px] uppercase font-bold tracking-widest bg-background-primary/80 backdrop-blur-sm p-3 rounded-md border border-white/5 z-10">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-risk-low" /> Mastered</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-aspis-blue" /> Learning</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-risk-critical" /> Weakness Gap</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white/20" /> Unexplored</div>
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <AnimatePresence>
              {lines.map(line => (
                <motion.line
                  key={line.id}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={
                    line.status === 'mastered' ? 'rgba(16,185,129,0.3)' : 
                    line.status === 'at-risk' ? 'rgba(244,63,94,0.3)' : 
                    line.status === 'learning' ? 'rgba(59,130,246,0.3)' : 
                    'rgba(255,255,255,0.05)'
                  }
                  strokeWidth="2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
              ))}
            </AnimatePresence>
          </svg>

          <div className="absolute inset-0 z-10 pointer-events-none">
            <AnimatePresence>
              {nodes.map(node => {
                const status = getStudentConceptStatus(selectedStudent, node.id);
                return (
                  <motion.div
                    key={node.id}
                    layoutId={node.id}
                    style={{ left: node.x, top: node.y }}
                    initial={{ opacity: 0, scale: 0.5, x: "-50%", y: "-60%" }}
                    animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                    exit={{ opacity: 0, scale: 0.5, x: "-50%", y: "-50%" }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="absolute pointer-events-auto"
                  >
                    <button
                      onClick={() => {
                        toggleExpand(node.id);
                        setSelectedNode(node);
                      }}
                      className={`
                        px-5 py-3 rounded-full border-2 backdrop-blur-md transition-all duration-300
                        ${getNodeColor(status)}
                        ${selectedNode?.id === node.id ? 'scale-110 ring-4 ring-white/10' : 'hover:scale-105'}
                        ${node.category === 'core' ? 'font-black text-base' : 'font-bold text-sm'}
                      `}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{node.label}</span>
                        {node.connections.length > 0 && (
                          <div className="flex gap-0.5 mt-1">
                            <div className={`w-1 h-1 rounded-full ${expandedNodes.has(node.id) ? 'bg-current opacity-100' : 'bg-current opacity-30'}`} />
                            <div className={`w-1 h-1 rounded-full ${expandedNodes.has(node.id) ? 'bg-current opacity-100' : 'bg-current opacity-30'}`} />
                            <div className={`w-1 h-1 rounded-full ${expandedNodes.has(node.id) ? 'bg-current opacity-100' : 'bg-current opacity-30'}`} />
                          </div>
                        )}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Side Panel: Student Node Inspector */}
        <div className="w-[350px] bg-background-card border border-white/5 rounded-md shadow-card flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Layers size={16} /> Student Mastery
            </h2>
            <div className="w-8 h-8 rounded-full bg-background-primary flex items-center justify-center font-bold text-white text-xs border border-white/10">
              {currentStudent?.name[0]}
            </div>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <motion.div
                  key={selectedNode.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">
                      {selectedNode.category} Module
                    </div>
                    <h3 className="text-2xl font-black text-white">{selectedNode.label}</h3>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest mt-3 ${
                      activeNodeStatus === 'mastered' ? 'bg-risk-low/20 text-risk-low border border-risk-low/30' :
                      activeNodeStatus === 'at-risk' ? 'bg-risk-critical/20 text-risk-critical border border-risk-critical/30' :
                      activeNodeStatus === 'learning' ? 'bg-aspis-blue/20 text-aspis-blue border border-aspis-blue/30' :
                      'bg-white/5 text-text-muted border border-white/10'
                    }`}>
                      {activeNodeStatus === 'mastered' && <CheckCircle2 size={12} />}
                      {activeNodeStatus === 'at-risk' && <AlertTriangle size={12} />}
                      {activeNodeStatus === 'learning' && <Activity size={12} />}
                      {activeNodeStatus === 'locked' && <BookOpen size={12} />}
                      {activeNodeStatus}
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/5" />

                  {activeNodeStatus === 'at-risk' && (
                    <div className="p-4 bg-risk-critical/10 border border-risk-critical/20 rounded-md">
                      <h4 className="text-risk-critical text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertTriangle size={14} /> Knowledge Gap Detected
                      </h4>
                      <p className="text-sm text-text-primary leading-relaxed">
                        <span className="font-bold">{currentStudent?.name}</span> is struggling with <span className="font-bold">{selectedNode.label}</span>. 
                        This is acting as a blocker for future dependent concepts.
                      </p>
                    </div>
                  )}

                  {activeNodeStatus === 'mastered' && (
                    <div className="p-4 bg-risk-low/10 border border-risk-low/20 rounded-md">
                      <h4 className="text-risk-low text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={14} /> Core Competency Secured
                      </h4>
                      <p className="text-sm text-text-primary leading-relaxed">
                        <span className="font-bold">{currentStudent?.name}</span> has fully internalized this concept and is ready to advance to downstream prerequisites.
                      </p>
                    </div>
                  )}

                  {selectedNode.connections.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Dependent Concepts</h4>
                      <ul className="flex flex-col gap-2">
                        {selectedNode.connections.map(connId => {
                          const target = MATH_ONTOLOGY.find(n => n.id === connId);
                          const tStatus = getStudentConceptStatus(selectedStudent, connId);
                          return (
                            <li key={connId} className="flex items-center justify-between p-3 bg-white/5 rounded-sm border border-white/5">
                              <div className="flex items-center gap-3">
                                <ChevronRight size={14} className="text-text-muted" />
                                <span className="text-sm text-text-primary font-bold">{target?.label}</span>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${
                                tStatus === 'mastered' ? 'bg-risk-low' :
                                tStatus === 'at-risk' ? 'bg-risk-critical' :
                                tStatus === 'learning' ? 'bg-aspis-blue' : 'bg-white/20'
                              }`} />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-text-muted">
                  <Network size={48} className="opacity-20 mb-4" />
                  <p className="text-sm">Select a concept node to view <span className="font-bold text-white">{currentStudent?.name}</span>'s specific mastery metrics.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
