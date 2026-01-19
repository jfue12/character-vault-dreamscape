import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  X,
  Plus,
  LogOut,
  Trash2,
  Crown,
  Image as ImageIcon,
  Shield,
  ScrollText,
  AlertTriangle,
  Eye,
  Lock,
  Unlock,
  Users,
  Clock,
  BookOpen,
  Bell,
  Sparkles,
  Camera,
  Scale,
  Ghost,
  Eraser,
  Search,
  UserX,
  UserPlus,
  UserCheck,
  Link2,
  Copy,
  RefreshCw,
  ExternalLink,
  FileText,
  Share2,
  Hammer,
  AlertOctagon,
  UserMinus,
  Pencil,
  UserCog,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Room {
  id: string;
  name: string;
  description: string | null;
  background_url: string | null;
  is_staff_only: boolean;
}

interface Member {
  userId: string;
  username: string;
  role: "owner" | "admin" | "member";
}

interface ChatSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  worldId: string;
  worldName: string;
  rooms: Room[];
  isOwner: boolean;
  isAdmin: boolean;
  members: Member[];
  onLeaveWorld: () => void;
  onRoomCreated: () => void;
  onRoomDeleted: (roomId: string) => void;
}

export const ChatSettingsPanel = ({
  isOpen,
  onClose,
  worldId,
  worldName,
  rooms,
  isOwner,
  isAdmin,
  members,
  onLeaveWorld,
  onRoomCreated,
  onRoomDeleted,
}: ChatSettingsPanelProps) => {
  const { toast } = useToast();
  
  // Tab States
  const [activeTab, setActiveTab] = useState<"rooms" | "members" | "lore" | "media" | "settings" | "logs">("rooms");
  const [loreSubTab, setLoreSubTab] = useState<"bible" | "npcs" | "rules">("bible");
  const [memberSubTab, setMemberSubTab] = useState<"list" | "permissions" | "banned" | "pending">("list");
  const [mediaTarget, setMediaTarget] = useState<"world" | "rooms">("world");

  // Data States
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  
  const [worldData, setWorldData] = useState({
    is_public: true,
    is_nsfw: false,
    is_read_only: false,
    lore_description: "",
    world_summary: "",
    world_rules: [] as string[],
    world_icon_url: "",
    invite_code: "",
    ai_reactivity: 50,
    auto_delete_messages: "never",
    enforce_rules: false,
    permissions: {
      members_can_invite: true,
      members_can_delete_own: true,
      admins_can_edit_lore: true,
      admins_can_manage_rooms: true,
    }
  });

  const isStaff = isOwner || isAdmin;

  useEffect(() => {
    if (isOpen) {
      fetchWorldData();
      if (isStaff) {
        fetchPendingRequests();
        fetchBannedUsers();
      }
    }
  }, [isOpen, worldId]);

  const fetchWorldData = async () => {
    const { data } = await supabase.from("worlds").select("*").eq("id", worldId).single();
    if (data) setWorldData(data);
  };

  const fetchPendingRequests = async () => {
    const { data } = await supabase.from("world_join_requests").select("*, profiles(username)").eq("world_id", worldId).eq("status", "pending");
    if (data) setPendingRequests(data);
  };

  const fetchBannedUsers = async () => {
    const { data } = await supabase.from("world_members").select("user_id, profiles(username)").eq("world_id", worldId).eq("is_banned", true);
    if (data) setBannedUsers(data);
  };

  const updateWorldField = async (field: string, value: any) => {
    setWorldData(prev => ({ ...prev, [field]: value }));
    const { error } = await supabase.from("worlds").update({ [field]: value }).eq("id", worldId);
    if (!error) toast({ title: "Updated successfully" });
  };

  const generateInvite = async () => {
    setIsGenerating(true);
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    await updateWorldField("invite_code", newCode);
    setIsGenerating(false);
  };

  const filteredMembers = members.filter(m => m.username.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50 shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
              <div className="truncate">
                <h2 className="font-bold text-sm truncate">{worldName}</h2>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Admin Console</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-muted/20 border-b border-border overflow-x-auto no-scrollbar">
              {["rooms", "members", "lore", "media", "settings", "logs"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`relative px-4 py-3 text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === tab ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground opacity-60"}`}
                >
                  {tab}
                  {tab === "members" && pendingRequests.length > 0 && <span className="absolute top-2 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">

                {/* --- ROOMS TAB --- */}
                {activeTab === "rooms" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase text-muted-foreground">Active Rooms</h3>
                      {isStaff && <Button size="sm" className="h-7 text-[10px]" onClick={onRoomCreated}><Plus className="w-3 h-3 mr-1" /> NEW</Button>}
                    </div>
                    <div className="space-y-2">
                      {rooms.map(room => (
                        <div key={room.id} className="p-3 rounded-lg bg-muted/30 border border-border group">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold flex items-center gap-2">#{room.name} {room.is_staff_only && <Lock className="w-2.5 h-2.5" />}</span>
                            {isStaff && <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onRoomDeleted(room.id)}><Trash2 className="w-3 h-3" /></Button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* --- MEMBERS TAB --- */}
                {activeTab === "members" && (
                  <div className="space-y-4">
                    <div className="flex p-1 bg-muted rounded-md text-[9px] font-black">
                      <button onClick={() => setMemberSubTab("list")} className={`flex-1 py-1 rounded uppercase ${memberSubTab === "list" ? "bg-background shadow-sm text-primary" : "opacity-50"}`}>Users</button>
                      <button onClick={() => setMemberSubTab("pending")} className={`flex-1 py-1 rounded uppercase ${memberSubTab === "pending" ? "bg-background shadow-sm text-primary" : "opacity-50"}`}>Pending ({pendingRequests.length})</button>
                      {isOwner && <button onClick={() => setMemberSubTab("permissions")} className={`flex-1 py-1 rounded uppercase ${memberSubTab === "permissions" ? "bg-background shadow-sm text-primary" : "opacity-50"}`}>Roles</button>}
                      <button onClick={() => setMemberSubTab("banned")} className={`flex-1 py-1 rounded uppercase ${memberSubTab === "banned" ? "bg-background shadow-sm text-destructive" : "opacity-50"}`}>Bans</button>
                    </div>

                    {memberSubTab === "list" && (
                      <div className="space-y-3">
                        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 opacity-30" /><Input placeholder="Search..." className="pl-8 h-8 text-xs bg-muted/40" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                        {filteredMembers.map(m => (
                          <div key={m.userId} className="flex justify-between items-center p-2 bg-muted/20 rounded border border-border">
                            <span className="text-xs font-bold">{m.username} {m.role === 'owner' && <Crown className="w-3 h-3 inline text-amber-500" />}</span>
                            <span className="text-[9px] uppercase font-black opacity-30">{m.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {memberSubTab === "pending" && (
                      <div className="space-y-2">
                        {pendingRequests.map(r => (
                          <div key={r.id} className="p-3 bg-muted/40 border rounded-lg flex justify-between items-center">
                            <span className="text-xs font-bold">{r.profiles.username}</span>
                            <div className="flex gap-
    