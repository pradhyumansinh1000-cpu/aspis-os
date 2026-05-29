"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Network, Search, BookOpen, Layers, Maximize2, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

// --- MOCK ONTOLOGY DATA ---
type ConceptNode = {
  id: string;
  label: string;
  category: "core" | "module" | "skill";
  x: number;
  y: number;
  status: "mastered" | "learning" | "at-risk" | "locked";
  connections: string[];
};

const MATH_ONTOLOGY: ConceptNode[] = [
  { id: "m_core", label: "Mathematics Core", category: "core", x: 400, y: 100, status: "mastered", connections: ["m_alg", "m_geo", "m_stat"] },
  { id: "m_alg", label: "Algebra", category: "module", x: 200, y: 250, status: "learning", connections: ["m_lin", "m_quad"] },
  { id: "m_geo", label: "Geometry", category: "module", x: 600, y: 250, status: "mastered", connections: ["m_trig"] },
  { id: "m_stat", label: "Statistics", category: "module", x: 400, y: 250, status: "learning", connections: ["m_prob"] },
  
  { id: "m_lin", label: "Linear Equations", category: "skill", x: 100, y: 400, status: "mastered", connections: [] },
  { id: "m_quad", label: "Quadratics", category: "skill", x: 300, y: 400, status: "at-risk", connections: ["m_calc"] },
  { id: "m_trig", label: "Trigonometry", category: "skill", x: 600, y: 400, status: "learning", connections: ["m_calc"] },
  { id: "m_prob", label: "Probability", category: "skill", x: 400, y: 400, status: "locked", connections: [] },
  
  { id: "m_calc", label: "Calculus Intro", category: "skill", x: 450, y: 550, status: "locked", connections: [] },
];

const SCIENCE_ONTOLOGY: ConceptNode[] = [
  { id: "s_core", label: "Science Core", category: "core", x: 400, y: 100, status: "mastered", connections: ["s_phy", "s_chem", "s_bio"] },
  { id: "s_phy", label: "Physics", category: "module", x: 200, y: 250, status: "at-risk", connections: ["s_kin", "s_dyn"] },
  { id: "s_chem", label: "Chemistry", category: "module", x: 400, y: 250, status: "learning", connections: ["s_atom"] },
  { id: "s_bio", label: "Biology", category: "module", x: 600, y: 250, status: "mastered", connections: ["s_cell"] },
  
  { id: "s_kin", label: "Kinematics", category: "skill", x: 100, y: 400, status: "learning", connections: [] },
  { id: "s_dyn", label: "Dynamics", category: "skill", x: 300, y: 400, status: "at-risk", connections: [] },
  { id: "s_atom", label: "Atomic Structure", category: "skill", x: 400, y: 400, status: "mastered", connections: [] },
  { id: "s_cell", label: "Cell Biology", category: "skill", x: 600, y: 400, status: "mastered", connections: [] },
];

export default function KnowledgeGraphPage() {
  const [activeSubject, setActiveSubject] = useState<"math" | "science">("math");
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["m_core", "s_core"]));
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);

  useEffect(() => {
    const rawNodes = activeSubject === "math" ? MATH_ONTOLOGY : SCIENCE_ONTOLOGY;
    // Only show nodes if their parent is expanded (or if they are core)
    const visibleNodes = rawNodes.filter(n => 
      n.category === "core" || 
      rawNodes.some(parent => parent.connections.includes(n.id) && expandedNodes.has(parent.id))
    );
    setNodes(visibleNodes);
  }, [activeSubject, expandedNodes]);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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

  // SVG lines calculation
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
            status: targetNode.status
          });
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10 flex flex-col">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight flex items-center gap-3">
            <Network className="text-aspis-blue" size={32} />
            Knowledge Graph & Curriculum Ontology
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Interactive prerequisite mapping and longitudinal competency tracking.
          </p>
        </div>
        
        <div className="flex bg-background-card p-1 rounded-sm border border-white/5">
          <button 
            onClick={() => { setActiveSubject("math"); setExpandedNodes(new Set(["m_core"])); setSelectedNode(null); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors ${activeSubject === "math" ? "bg-aspis-blue text-white" : "text-text-muted hover:text-white"}`}
          >
            Mathematics
          </button>
          <button 
            onClick={() => { setActiveSubject("science"); setExpandedNodes(new Set(["s_core"])); setSelectedNode(null); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors ${activeSubject === "science" ? "bg-aspis-blue text-white" : "text-text-muted hover:text-white"}`}
          >
            Sciences
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-[600px]">
        {/* Main Graph Area */}
        <div className="flex-1 bg-background-card border border-white/5 rounded-md relative overflow-hidden shadow-inner">
          <div className="absolute top-4 left-4 flex gap-4 text-[10px] uppercase font-bold tracking-widest bg-background-primary/80 backdrop-blur-sm p-3 rounded-md border border-white/5 z-10">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-risk-low" /> Mastered</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-aspis-blue" /> Learning</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-risk-critical" /> At-Risk</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white/20" /> Locked/Future</div>
          </div>

          {/* SVG Connection Lines */}
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

          {/* Nodes */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <AnimatePresence>
              {nodes.map(node => (
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
                      ${getNodeColor(node.status)}
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
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Side Panel: Node Inspector */}
        <div className="w-[350px] bg-background-card border border-white/5 rounded-md shadow-card flex flex-col">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-sm font-black uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Layers size={16} /> Concept Inspector
            </h2>
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
                      selectedNode.status === 'mastered' ? 'bg-risk-low/20 text-risk-low border border-risk-low/30' :
                      selectedNode.status === 'at-risk' ? 'bg-risk-critical/20 text-risk-critical border border-risk-critical/30' :
                      selectedNode.status === 'learning' ? 'bg-aspis-blue/20 text-aspis-blue border border-aspis-blue/30' :
                      'bg-white/5 text-text-muted border border-white/10'
                    }`}>
                      {selectedNode.status === 'mastered' && <CheckCircle2 size={12} />}
                      {selectedNode.status === 'at-risk' && <AlertTriangle size={12} />}
                      {selectedNode.status === 'learning' && <Activity size={12} />}
                      {selectedNode.status === 'locked' && <BookOpen size={12} />}
                      {selectedNode.status}
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/5" />

                  {selectedNode.status === 'at-risk' && (
                    <div className="p-4 bg-risk-critical/10 border border-risk-critical/20 rounded-md">
                      <h4 className="text-risk-critical text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertTriangle size={14} /> Propagation Risk
                      </h4>
                      <p className="text-sm text-text-primary leading-relaxed">
                        Weakness in <span className="font-bold">{selectedNode.label}</span> is blocking comprehension for downstream concepts. 
                        Remedial intervention heavily advised before advancing.
                      </p>
                    </div>
                  )}

                  {selectedNode.connections.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Unlocks Concepts</h4>
                      <ul className="flex flex-col gap-2">
                        {selectedNode.connections.map(connId => {
                          const target = (activeSubject === "math" ? MATH_ONTOLOGY : SCIENCE_ONTOLOGY).find(n => n.id === connId);
                          return (
                            <li key={connId} className="flex items-center gap-3 p-3 bg-white/5 rounded-sm border border-white/5">
                              <ChevronRight size={14} className="text-text-muted" />
                              <span className="text-sm text-text-primary font-bold">{target?.label}</span>
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
                  <p className="text-sm">Select a concept node in the graph to inspect its pedagogical ontology and dependencies.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
