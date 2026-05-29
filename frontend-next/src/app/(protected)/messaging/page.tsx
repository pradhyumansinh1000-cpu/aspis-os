"use client";

import { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Users, 
  Hash, 
  ShieldAlert, 
  Check, 
  Search,
  MessageCircle,
  X
} from "lucide-react";
import { 
  ChatChannel, 
  ChatMessage, 
  INITIAL_CHANNELS, 
  INITIAL_MESSAGES 
} from "@/data/mockData";

const TEACHER_STAFF_LIST = [
  { id: "t1", name: "Priya Sharma", subject: "Math" },
  { id: "t2", name: "Amit Verma", subject: "Science" },
  { id: "t3", name: "Sunita Rao", subject: "English" },
  { id: "t4", name: "Ritu Singhal", subject: "Physics" },
  { id: "t5", name: "Vikram Sen", subject: "Social Sci" }
];

export default function TeamsMessaging() {
  const [channels, setChannels] = useState<ChatChannel[]>(INITIAL_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState("g1");
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [inputMessage, setInputMessage] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage, check active channel redirect
  useEffect(() => {
    const savedMsgs = localStorage.getItem("aspis_chat_messages");
    if (savedMsgs) {
      setMessages(JSON.parse(savedMsgs));
    } else {
      setMessages(INITIAL_MESSAGES);
      localStorage.setItem("aspis_chat_messages", JSON.stringify(INITIAL_MESSAGES));
    }

    const redirectChannelId = localStorage.getItem("active_chat_channel");
    if (redirectChannelId) {
      setActiveChannelId(redirectChannelId);
      localStorage.removeItem("active_chat_channel");
    }
  }, []);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChannelId, messages]);

  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];
  const currentChatLogs = messages[activeChannelId] || [];

  // Send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      senderName: "Dr. Ramesh Iyer",
      senderRole: "Principal",
      content: inputMessage,
      timestamp: "Just now",
      isSelf: true
    };

    setMessages(prev => {
      const updated = {
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] || []), newMsg]
      };
      localStorage.setItem("aspis_chat_messages", JSON.stringify(updated));
      return updated;
    });

    setInputMessage("");
  };

  // Toggle staff selection for new team
  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  // Create Team Group
  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || selectedStaff.length === 0) return;

    const newGroupId = `g_${Date.now()}`;
    const newGroupChannel: ChatChannel = {
      id: newGroupId,
      name: newTeamName,
      type: "group",
      subText: `${selectedStaff.length} members`,
      avatarText: newTeamName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    };

    setChannels(prev => [newGroupChannel, ...prev]);
    setMessages(prev => {
      const updated = {
        ...prev,
        [newGroupId]: [
          {
            id: `m_init_${Date.now()}`,
            senderName: "System",
            senderRole: "Compliance Audit",
            content: `Team group '${newTeamName}' created by Principal. Audit log recorded under DPDPA coordination guidelines.`,
            timestamp: "Just now",
            isSelf: false
          }
        ]
      };
      localStorage.setItem("aspis_chat_messages", JSON.stringify(updated));
      return updated;
    });

    setActiveChannelId(newGroupId);
    setIsModalOpen(false);
    setNewTeamName("");
    setSelectedStaff([]);
  };

  return (
    <div className="min-h-screen bg-background-primary p-6 md:p-10 flex flex-col">
      
      {/* Title Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Teams & Messaging Portal</h1>
          <p className="text-xs text-text-secondary mt-1">
            Direct coordination and department-level messaging. Securely audited school communication board.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow transition-transform hover:-translate-y-[1px] ml-auto"
        >
          <Plus size={15} /> Create Group Team
        </button>
      </div>

      {/* Main chat board layout */}
      <div className="flex-1 bg-background-card border border-white/5 rounded-md shadow-card overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
        
        {/* Left column: Channel/User list */}
        <div className="md:col-span-1 border-r border-white/5 flex flex-col bg-white/[0.005]">
          
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2 bg-background-glass border border-white/5 px-3 py-2 rounded-sm w-full">
              <Search size={13} className="text-text-muted" />
              <input 
                type="text" 
                placeholder="Search chats, groups..."
                className="bg-transparent border-none outline-none text-xs text-text-primary w-full"
              />
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-4">
            
            {/* Group Channels section */}
            <div>
              <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-2 mb-2 flex items-center justify-between">
                <span>Group Teams</span>
                <span className="bg-white/5 px-1.5 py-0.5 rounded text-[8px]">Groups</span>
              </div>
              <div className="flex flex-col gap-1 select-none">
                {channels.filter(c => c.type === "group").map(c => {
                  const isActive = c.id === activeChannelId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveChannelId(c.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-sm cursor-pointer transition-all ${
                        isActive ? "bg-aspis-blue/10 text-aspis-blue font-bold" : "text-text-secondary hover:bg-white/[0.02] hover:text-text-primary"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-sm bg-background-primary border border-white/5 flex items-center justify-center text-[10px] font-black uppercase text-text-primary">
                        {c.avatarText}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{c.name}</div>
                        <div className="text-[9px] text-text-muted truncate mt-0.5">{c.subText}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Messages section */}
            <div>
              <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-2 mb-2 flex items-center justify-between">
                <span>Direct Messages</span>
                <span className="bg-white/5 px-1.5 py-0.5 rounded text-[8px]">Staff</span>
              </div>
              <div className="flex flex-col gap-1 select-none">
                {channels.filter(c => c.type === "direct").map(c => {
                  const isActive = c.id === activeChannelId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveChannelId(c.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-sm cursor-pointer transition-all ${
                        isActive ? "bg-aspis-blue/10 text-aspis-blue font-bold" : "text-text-secondary hover:bg-white/[0.02] hover:text-text-primary"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-aspis-blue to-aspis-behavioral flex items-center justify-center text-[9px] font-black text-white uppercase">
                          {c.avatarText}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background-secondary ${c.statusColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{c.name}</div>
                        <div className="text-[9px] text-text-muted truncate mt-0.5">{c.subText}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Right column: Chat active dialog window */}
        <div className="md:col-span-2 flex flex-col justify-between h-[520px]">
          
          {/* Active Chat Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.005]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-background-primary border border-white/5 rounded-sm flex items-center justify-center text-xs font-black uppercase text-text-primary">
                {activeChannel.avatarText}
              </div>
              <div>
                <h3 className="text-xs font-black text-text-primary">{activeChannel.name}</h3>
                <p className="text-[9px] text-text-muted mt-0.5">{activeChannel.subText}</p>
              </div>
            </div>
            <div className="text-[10px] text-risk-low bg-risk-low/5 border border-risk-low/10 px-2 py-0.5 rounded-sm font-bold uppercase flex items-center gap-1">
              <Check size={10} /> Secure Ledger Audit Logged
            </div>
          </div>

          {/* Messages Flow Area */}
          <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
            {currentChatLogs.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-3 text-xs max-w-[80%] ${msg.isSelf ? "self-end flex-row-reverse" : "self-start"}`}
              >
                
                {!msg.isSelf && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-aspis-blue to-aspis-academic flex-shrink-0 flex items-center justify-center font-black text-[10px] uppercase text-white">
                    {msg.senderName.split(" ").map(n => n[0]).join("")}
                  </div>
                )}

                <div>
                  <div className={`flex items-baseline gap-2 mb-1 ${msg.isSelf ? "justify-end" : "justify-start"}`}>
                    <span className="font-extrabold text-text-primary">{msg.senderName}</span>
                    <span className="text-[9px] text-text-muted font-bold uppercase">{msg.senderRole}</span>
                    <span className="text-[9px] text-text-muted font-normal">{msg.timestamp}</span>
                  </div>

                  <div className={`p-3 rounded-sm leading-normal border ${
                    msg.isSelf 
                      ? "bg-aspis-blue/10 border-aspis-blue/20 text-text-primary rounded-tr-none"
                      : "bg-white/[0.02] border-white/5 text-text-secondary rounded-tl-none"
                  }`}>
                    {msg.content}
                  </div>
                </div>

              </div>
            ))}
            
            {currentChatLogs.length === 0 && (
              <div className="text-center py-20 text-xs text-text-muted flex flex-col items-center justify-center h-full">
                <MessageSquare size={36} className="text-white/5 mb-4 animate-bounce" />
                <p>Begin secure messaging coordination with {activeChannel.name}.</p>
                <p className="text-[9px] opacity-75 mt-1">DPDPA 2023 access compliance restrictions apply.</p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Message Text Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-white/[0.005] flex gap-3">
            <input 
              type="text" 
              placeholder={`Send secure message to ${activeChannel.name}...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-grow bg-background-primary border border-white/10 text-xs text-text-primary p-3 rounded-sm outline-none focus:border-aspis-blue"
            />
            <button 
              type="submit"
              className="w-11 h-11 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white rounded-sm flex items-center justify-center hover:shadow-glow hover:-translate-y-[1px] transition-transform flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </form>

        </div>

      </div>

      {/* CREATE TEAM GROUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-[460px] bg-background-card border border-white/10 p-8 rounded-md shadow-card">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="text-aspis-blue" size={20} />
              <h2 className="text-lg font-black text-text-primary">Establish Group Team</h2>
            </div>

            <form onSubmit={handleCreateTeam} className="flex flex-col gap-4 text-xs font-semibold text-text-secondary">
              
              <div className="flex flex-col gap-1.5">
                <label>Team/Group Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Science Committee"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="bg-background-glass border border-white/10 focus:border-aspis-blue p-3 text-text-primary rounded-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="mb-1">Select Department Staff members</label>
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1 border border-white/5 p-3 rounded-sm bg-white/[0.005]">
                  {TEACHER_STAFF_LIST.map((staff) => {
                    const isChecked = selectedStaff.includes(staff.id);
                    return (
                      <div 
                        key={staff.id}
                        onClick={() => toggleStaffSelection(staff.id)}
                        className="flex items-center justify-between p-2 rounded-sm bg-background-primary/40 hover:bg-white/[0.03] cursor-pointer transition-all border border-transparent hover:border-white/5"
                      >
                        <div>
                          <div className="text-text-primary font-bold">{staff.name}</div>
                          <div className="text-[9px] text-text-muted mt-0.5">{staff.subject} Teacher</div>
                        </div>
                        <div className={`w-4.5 h-4.5 rounded-sm border flex items-center justify-center transition-all ${
                          isChecked ? "bg-aspis-blue border-aspis-blue text-white" : "border-white/20"
                        }`}>
                          {isChecked && <Check size={11} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!newTeamName.trim() || selectedStaff.length === 0}
                className="w-full mt-4 py-3 bg-gradient-to-r from-aspis-blue to-aspis-academic text-white font-extrabold text-xs rounded-sm hover:shadow-glow hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Create and Open Chat
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
