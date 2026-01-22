import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  LogOut,
  Trash2,
  Crown,
  Image,
  Shield,
  ScrollText,
  AlertTriangle,
  Eye,
  Lock,
  Users,
  Clock,
  Bot,
  BookOpen,
  GripVertical,
  MessageSquareOff,
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
import { useAuth } from "@/contexts/AuthContext";

interface Room {
  id: string;
  name: string;
  description: string | null;
  background_url: string | null;
  is_staff_only: boolean;
  sort_order: number;
}

interface Member {
  userId: string;
  username: string;
  role: "owner" | "admin" | "member";
}

interface AuditLog {
  id: string;
  action: string;
  actor_id: string | null;
  target_user_id: string | null;
  target_room_id: string | null;
  details: any;
  created_at: string;
  actor?: { username: string | null };
  target_user?: { username: string | null };
  target_room?: { name: string };
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"rooms" | "members" | "ai" | "settings" | "logs">("rooms");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomStaffOnly, setNewRoomStaffOnly] = useState(false);
  const [newRoomImage, setNewRoomImage] = useState<File | null>(null);
  const [newRoomImagePreview, setNewRoomImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // World settings state
  const [isPublic, setIsPublic] = useState(true);
  const [isNsfw, setIsNsfw] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // AI settings state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiLore, setAiLore] = useState("");
  const [aiUseOwnerCharsOnly, setAiUseOwnerCharsOnly] = useState(true);
  const [aiIntensity, setAiIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [savingAiSettings, setSavingAiSettings] = useState(false);

  // Room editing state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomBackground, setEditingRoomBackground] = useState<File | null>(null);
  const [editingRoomBackgroundPreview, setEditingRoomBackgroundPreview] = useState<string | null>(null);

  // Drag and drop state
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);
  const [localRooms, setLocalRooms] = useState<Room[]>([]);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // AI NPCs state
  interface TempNPC {
    id: string;
    name: string;
    bio: string | null;
    social_rank: string | null;
    personality_traits: any;
    is_deceased: boolean;
    saved_character_id: string | null;
  }
  const [tempNPCs, setTempNPCs] = useState<TempNPC[]>([]);
  const [loadingNPCs, setLoadingNPCs] = useState(false);
  const [editingNPC, setEditingNPC] = useState<TempNPC | null>(null);

  const roomImageInputRef = useRef<HTMLInputElement>(null);
  const editRoomImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalRooms([...rooms].sort((a, b) => a.sort_order - b.sort_order));
  }, [rooms]);

  // Fetch world settings on open
  useEffect(() => {
    if (isOpen && isOwner) {
      fetchWorldSettings();
    }
  }, [isOpen, isOwner, worldId]);

  // Fetch audit logs when viewing logs tab
  useEffect(() => {
    if (activeTab === "logs" && isOwner) {
      fetchAuditLogs();
    }
  }, [activeTab, isOwner, worldId]);

  // Fetch AI NPCs when viewing AI tab
  useEffect(() => {
    if (activeTab === "ai" && (isOwner || isAdmin)) {
      fetchTempNPCs();
    }
  }, [activeTab, isOwner, isAdmin, worldId]);

  const fetchWorldSettings = async () => {
    const { data } = await supabase
      .from("worlds")
      .select("is_public, is_nsfw, ai_enabled, ai_lore, ai_use_owner_characters_only, ai_intensity")
      .eq("id", worldId)
      .single();

    if (data) {
      setIsPublic(data.is_public);
      setIsNsfw(data.is_nsfw);
      setAiEnabled(data.ai_enabled ?? true);
      setAiLore(data.ai_lore || "");
      setAiUseOwnerCharsOnly(data.ai_use_owner_characters_only ?? true);
      setAiIntensity((data as any).ai_intensity || 'medium');
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("audit_logs")
      .select(
        `
        *,
        actor:profiles!audit_logs_actor_id_fkey(username),
        target_user:profiles!audit_logs_target_user_id_fkey(username),
        target_room:world_rooms!audit_logs_target_room_id_fkey(name)
      `,
      )
      .eq("world_id", worldId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setAuditLogs(data as AuditLog[]);
    }
    setLoadingLogs(false);
  };

  const fetchTempNPCs = async () => {
    setLoadingNPCs(true);
    const { data } = await supabase
      .from("temp_ai_characters")
      .select("id, name, bio, social_rank, personality_traits, is_deceased, saved_character_id")
      .eq("world_id", worldId)
      .order("created_at", { ascending: false });
    
    if (data) {
      setTempNPCs(data as TempNPC[]);
    }
    setLoadingNPCs(false);
  };

  const handleKillNPC = async (npcId: string, charId: string | null) => {
    // Mark as deceased in temp_ai_characters
    await supabase
      .from("temp_ai_characters")
      .update({ is_deceased: true })
      .eq("id", npcId);
    
    // Also mark the backing character as deceased
    if (charId) {
      await supabase
        .from("characters")
        .update({ is_deceased: true })
        .eq("id", charId);
    }
    
    toast({ title: "NPC marked as deceased" });
    fetchTempNPCs();
  };

  const handleReviveNPC = async (npcId: string, charId: string | null) => {
    await supabase
      .from("temp_ai_characters")
      .update({ is_deceased: false })
      .eq("id", npcId);
    
    if (charId) {
      await supabase
        .from("characters")
        .update({ is_deceased: false })
        .eq("id", charId);
    }
    
    toast({ title: "NPC revived!" });
    fetchTempNPCs();
  };

  const handleDeleteNPC = async (npcId: string, charId: string | null) => {
    // Delete temp_ai_characters record
    await supabase
      .from("temp_ai_characters")
      .delete()
      .eq("id", npcId);
    
    // Delete the backing character
    if (charId) {
      await supabase
        .from("characters")
        .delete()
        .eq("id", charId);
    }
    
    toast({ title: "NPC permanently deleted" });
    fetchTempNPCs();
  };

  const handleUpdateNPC = async (npc: TempNPC) => {
    await supabase
      .from("temp_ai_characters")
      .update({
        name: npc.name,
        bio: npc.bio,
        social_rank: npc.social_rank,
      })
      .eq("id", npc.id);
    
    // Also update the backing character
    if (npc.saved_character_id) {
      await supabase
        .from("characters")
        .update({
          name: npc.name,
          bio: npc.bio,
        })
        .eq("id", npc.saved_character_id);
    }
    
    toast({ title: "NPC updated!" });
    setEditingNPC(null);
    fetchTempNPCs();
  };

  const handleUpdateWorldSettings = async (field: "is_public" | "is_nsfw", value: boolean) => {
    setLoadingSettings(true);

    const updateData: any = { [field]: value };

    if (field === "is_nsfw" && value) {
      updateData.is_nsfw = true;
    }

    const { error } = await supabase.from("worlds").update(updateData).eq("id", worldId);

    if (error) {
      toast({ title: "Failed to update settings", variant: "destructive" });
    } else {
      if (field === "is_public") setIsPublic(value);
      if (field === "is_nsfw") setIsNsfw(value);
      toast({ title: "Settings updated" });

      await supabase.from("audit_logs").insert({
        world_id: worldId,
        action:
          field === "is_public"
            ? value
              ? "world_made_public"
              : "world_made_private"
            : value
              ? "nsfw_enabled"
              : "nsfw_disabled",
        actor_id: user?.id,
        details: { [field]: value },
      });
    }
    setLoadingSettings(false);
  };

  const handleSaveAiSettings = async () => {
    setSavingAiSettings(true);
    const { error } = await supabase
      .from("worlds")
      .update({
        ai_enabled: aiEnabled,
        ai_lore: aiLore || null,
        ai_use_owner_characters_only: aiUseOwnerCharsOnly,
        ai_intensity: aiIntensity,
      })
      .eq("id", worldId);

    if (error) {
      toast({ title: "Failed to save AI settings", variant: "destructive" });
    } else {
      toast({ title: "AI settings saved!" });
      await supabase.from("audit_logs").insert({
        world_id: worldId,
        action: "ai_settings_updated",
        actor_id: user?.id,
        details: { ai_enabled: aiEnabled, ai_use_owner_characters_only: aiUseOwnerCharsOnly, ai_intensity: aiIntensity },
      });
    }
    setSavingAiSettings(false);
  };

  const handleNewRoomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewRoomImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewRoomImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !user) {
      toast({ title: "Room name is required", variant: "destructive" });
      return;
    }

    setCreating(true);
    
    let backgroundUrl = null;
    if (newRoomImage) {
      const fileExt = newRoomImage.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-room.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('world-images')
        .upload(fileName, newRoomImage);
      
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('world-images')
          .getPublicUrl(fileName);
        backgroundUrl = publicUrl;
      }
    }

    const { error } = await supabase.from("world_rooms").insert({
      world_id: worldId,
      name: newRoomName.trim(),
      description: newRoomDescription.trim() || null,
      is_staff_only: newRoomStaffOnly,
      background_url: backgroundUrl,
      sort_order: localRooms.length + 1,
    });

    if (error) {
      toast({ title: "Failed to create room", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Room created!" });
      setNewRoomName("");
      setNewRoomDescription("");
      setNewRoomStaffOnly(false);
      setNewRoomImage(null);
      setNewRoomImagePreview(null);
      setShowCreateRoom(false);
      onRoomCreated();
    }
    setCreating(false);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (localRooms.length <= 1) {
      toast({ title: "Cannot delete", description: "World must have at least one room", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("world_rooms").delete().eq("id", roomId);
    if (error) {
      toast({ title: "Failed to delete room", variant: "destructive" });
    } else {
      toast({ title: "Room deleted" });
      onRoomDeleted(roomId);
    }
  };

  const handleUpdateRoomBackground = async (roomId: string, remove: boolean = false) => {
    if (!user) return;
    
    let backgroundUrl: string | null = null;
    
    if (!remove && editingRoomBackground) {
      const fileExt = editingRoomBackground.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-room.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('world-images')
        .upload(fileName, editingRoomBackground);
      
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('world-images')
          .getPublicUrl(fileName);
        backgroundUrl = publicUrl;
      }
    }

    const { error } = await supabase
      .from("world_rooms")
      .update({ background_url: backgroundUrl })
      .eq("id", roomId);

    if (error) {
      toast({ title: "Failed to update room", variant: "destructive" });
    } else {
      toast({ title: remove ? "Background removed" : "Background updated" });
      setEditingRoomId(null);
      setEditingRoomBackground(null);
      setEditingRoomBackgroundPreview(null);
      onRoomCreated(); // Refresh rooms
    }
  };

  const handleDragStart = (roomId: string) => {
    setDraggedRoomId(roomId);
  };

  const handleDragOver = (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    if (!draggedRoomId || draggedRoomId === targetRoomId) return;
    
    const dragIndex = localRooms.findIndex(r => r.id === draggedRoomId);
    const targetIndex = localRooms.findIndex(r => r.id === targetRoomId);
    
    if (dragIndex === -1 || targetIndex === -1) return;
    
    const newRooms = [...localRooms];
    const [draggedRoom] = newRooms.splice(dragIndex, 1);
    newRooms.splice(targetIndex, 0, draggedRoom);
    setLocalRooms(newRooms);
  };

  const handleDragEnd = async () => {
    if (!draggedRoomId) return;
    
    // Save new order to database
    const updates = localRooms.map((room, index) => ({
      id: room.id,
      sort_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from("world_rooms")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
    }

    setDraggedRoomId(null);
    toast({ title: "Room order saved" });
    onRoomCreated(); // Refresh
  };

  const handlePromoteMember = async (userId: string) => {
    const { error } = await supabase
      .from("world_members")
      .update({ role: "admin" })
      .eq("world_id", worldId)
      .eq("user_id", userId);

    if (!error) {
      toast({ title: "Member promoted to admin" });
      await supabase.from("audit_logs").insert({
        world_id: worldId,
        action: "promote_admin",
        actor_id: user?.id,
        target_user_id: userId,
      });
    }
  };

  const handleDemoteMember = async (userId: string) => {
    const { error } = await supabase
      .from("world_members")
      .update({ role: "member" })
      .eq("world_id", worldId)
      .eq("user_id", userId);

    if (!error) {
      toast({ title: "Admin demoted to member" });
      await supabase.from("audit_logs").insert({
        world_id: worldId,
        action: "demote_admin",
        actor_id: user?.id,
        target_user_id: userId,
      });
    }
  };

  const handleKickMember = async (userId: string, username: string) => {
    const { error } = await supabase.from("world_members").delete().eq("world_id", worldId).eq("user_id", userId);

    if (!error) {
      toast({ title: `${username} has been kicked` });
      await supabase.from("audit_logs").insert({
        world_id: worldId,
        action: "kick",
        actor_id: user?.id,
        target_user_id: userId,
      });
    }
  };

  const handleBanMember = async (userId: string, username: string) => {
    const { error } = await supabase
      .from("world_members")
      .update({ is_banned: true })
      .eq("world_id", worldId)
      .eq("user_id", userId);

    if (!error) {
      toast({ title: `${username} has been banned` });
      await supabase.from("audit_logs").insert({
        world_id: worldId,
        action: "ban",
        actor_id: user?.id,
        target_user_id: userId,
      });
    }
  };

  const handleTimeoutMember = async (userId: string, username: string, duration: string) => {
    const durationMap: Record<string, number> = {
      "30s": 30 * 1000,
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "12h": 12 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
    };

    const expiresAt = new Date(Date.now() + (durationMap[duration] || 60000)).toISOString();

    const { error } = await supabase.from("timeouts").insert({
      user_id: userId,
      world_id: worldId,
      expires_at: expiresAt,
      issued_by: user?.id,
      reason: `Timed out for ${duration}`,
    });

    if (!error) {
      toast({ title: `${username} timed out for ${duration}` });
      await supabase.from("audit_logs").insert({
        world_id: worldId,
        action: "timeout",
        actor_id: user?.id,
        target_user_id: userId,
        details: { duration },
      });
    } else {
      toast({ title: "Failed to timeout user", variant: "destructive" });
    }
  };

  const formatAction = (action: string): string => {
    const actionMap: Record<string, string> = {
      promote_admin: "Promoted to Admin",
      demote_admin: "Demoted to Member",
      kick: "Kicked",
      ban: "Banned",
      unban: "Unbanned",
      timeout: "Timed Out",
      world_made_public: "Made World Public",
      world_made_private: "Made World Private",
      nsfw_enabled: "Enabled NSFW",
      nsfw_disabled: "Disabled NSFW",
      room_created: "Created Room",
      room_deleted: "Deleted Room",
      ai_settings_updated: "AI Settings Updated",
    };
    return actionMap[action] || action.replace(/_/g, " ");
  };

  const isStaff = isOwner || isAdmin;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50 shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground">{worldName}</h2>
                <p className="text-xs text-muted-foreground">Chat Settings</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("rooms")}
                className={`flex-1 py-3 text-xs font-medium transition-colors ${
                  activeTab === "rooms" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                }`}
              >
                Rooms
              </button>
              <button
                onClick={() => setActiveTab("members")}
                className={`flex-1 py-3 text-xs font-medium transition-colors ${
                  activeTab === "members" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                }`}
              >
                Members
              </button>
              {(isOwner || isAdmin) && (
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`flex-1 py-3 text-xs font-medium transition-colors ${
                    activeTab === "ai" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                  }`}
                >
                  NPCs
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`flex-1 py-3 text-xs font-medium transition-colors ${
                      activeTab === "settings" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                    }`}
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => setActiveTab("logs")}
                    className={`flex-1 py-3 text-xs font-medium transition-colors ${
                      activeTab === "logs" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                    }`}
                  >
                    Logs
                  </button>
                </>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Rooms Tab */}
              {activeTab === "rooms" && (
                <div className="space-y-3">
                  {isOwner && (
                    <>
                      {!showCreateRoom ? (
                        <Button variant="outline" className="w-full" onClick={() => setShowCreateRoom(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Room
                        </Button>
                      ) : (
                        <div className="space-y-3 p-3 bg-muted rounded-lg">
                          <Input
                            placeholder="Room name"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                          />
                          <Textarea
                            placeholder="Description (optional)"
                            value={newRoomDescription}
                            onChange={(e) => setNewRoomDescription(e.target.value)}
                            className="min-h-[60px]"
                          />
                          
                          {/* Room Background Image */}
                          <div className="space-y-2">
                            <Label className="text-xs">Background Image</Label>
                            <input
                              ref={roomImageInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleNewRoomImageChange}
                              className="hidden"
                            />
                            {newRoomImagePreview ? (
                              <div className="relative">
                                <img 
                                  src={newRoomImagePreview} 
                                  alt="Preview" 
                                  className="w-full h-20 object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => {
                                    setNewRoomImage(null);
                                    setNewRoomImagePreview(null);
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full"
                                >
                                  <X className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => roomImageInputRef.current?.click()}
                              >
                                <Image className="w-4 h-4 mr-2" />
                                Add Background
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="staff-only" className="text-sm">
                              Staff Only
                            </Label>
                            <Switch id="staff-only" checked={newRoomStaffOnly} onCheckedChange={setNewRoomStaffOnly} />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" className="flex-1" onClick={() => setShowCreateRoom(false)}>
                              Cancel
                            </Button>
                            <Button className="flex-1" onClick={handleCreateRoom} disabled={creating}>
                              Create
                            </Button>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground text-center">
                        Drag rooms to reorder
                      </p>
                    </>
                  )}

                  {localRooms.map((room) => (
                    <div
                      key={room.id}
                      draggable={isOwner}
                      onDragStart={() => handleDragStart(room.id)}
                      onDragOver={(e) => handleDragOver(e, room.id)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 rounded-lg bg-muted/50 ${
                        draggedRoomId === room.id ? 'opacity-50' : ''
                      } ${isOwner ? 'cursor-move' : ''}`}
                    >
                      {isOwner && (
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div 
                        className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                        onClick={() => isOwner && setEditingRoomId(editingRoomId === room.id ? null : room.id)}
                      >
                        {room.background_url ? (
                          <img src={room.background_url} alt={room.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                            <Image className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{room.name}</p>
                        {room.is_staff_only && <span className="text-[10px] text-amber-500">Staff only</span>}
                      </div>
                      {isOwner && localRooms.length > 1 && (
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="p-1.5 hover:bg-destructive/20 rounded text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Room Background Edit Panel */}
                  {editingRoomId && isOwner && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-muted rounded-lg space-y-2"
                    >
                      <p className="text-xs font-medium">Edit Room Background</p>
                      <input
                        ref={editRoomImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setEditingRoomBackground(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setEditingRoomBackgroundPreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      {editingRoomBackgroundPreview ? (
                        <img 
                          src={editingRoomBackgroundPreview} 
                          alt="Preview" 
                          className="w-full h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => editRoomImageInputRef.current?.click()}
                        >
                          <Image className="w-4 h-4 mr-2" />
                          Choose Image
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUpdateRoomBackground(editingRoomId, true)}
                        >
                          Remove BG
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={!editingRoomBackground}
                          onClick={() => handleUpdateRoomBackground(editingRoomId, false)}
                        >
                          Save
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Members Tab */}
              {activeTab === "members" && (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm">@{member.username}</span>
                        {member.role === "owner" && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            <Crown className="w-2.5 h-2.5" />
                            Owner
                          </span>
                        )}
                        {member.role === "admin" && (
                          <span className="flex items-center gap-0.5 text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                            <Shield className="w-2.5 h-2.5" />
                            Admin
                          </span>
                        )}
                      </div>
                      {isOwner && member.role !== "owner" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              member.role === "admin"
                                ? handleDemoteMember(member.userId)
                                : handlePromoteMember(member.userId)
                            }
                          >
                            {member.role === "admin" ? "Demote" : "Promote"}
                          </Button>
                          <Select
                            onValueChange={(duration) => handleTimeoutMember(member.userId, member.username, duration)}
                          >
                            <SelectTrigger className="h-7 w-20 text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              <SelectValue placeholder="Timeout" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30s">30 sec</SelectItem>
                              <SelectItem value="1m">1 min</SelectItem>
                              <SelectItem value="5m">5 min</SelectItem>
                              <SelectItem value="15m">15 min</SelectItem>
                              <SelectItem value="30m">30 min</SelectItem>
                              <SelectItem value="1h">1 hour</SelectItem>
                              <SelectItem value="6h">6 hours</SelectItem>
                              <SelectItem value="12h">12 hours</SelectItem>
                              <SelectItem value="24h">24 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleKickMember(member.userId, member.username)}
                          >
                            Kick
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleBanMember(member.userId, member.username)}
                          >
                            Ban
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* AI NPCs Tab */}
              {activeTab === "ai" && (isOwner || isAdmin) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    AI Generated NPCs
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Manage AI-generated characters in this world. Kill NPCs to stop them from responding, 
                    or revive them using OOC commands.
                  </p>

                  {loadingNPCs ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Loading NPCs...</div>
                  ) : tempNPCs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No AI NPCs have been generated yet
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {tempNPCs.map((npc) => (
                          <div key={npc.id} className={`p-3 bg-muted/50 rounded-lg ${npc.is_deceased ? 'opacity-50' : ''}`}>
                            {editingNPC?.id === npc.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingNPC.name}
                                  onChange={(e) => setEditingNPC({ ...editingNPC, name: e.target.value })}
                                  placeholder="NPC Name"
                                />
                                <Textarea
                                  value={editingNPC.bio || ''}
                                  onChange={(e) => setEditingNPC({ ...editingNPC, bio: e.target.value })}
                                  placeholder="NPC Bio"
                                  className="min-h-[60px]"
                                />
                                <Select
                                  value={editingNPC.social_rank || 'commoner'}
                                  onValueChange={(v) => setEditingNPC({ ...editingNPC, social_rank: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="royalty">Royalty</SelectItem>
                                    <SelectItem value="noble">Noble</SelectItem>
                                    <SelectItem value="merchant">Merchant</SelectItem>
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="commoner">Commoner</SelectItem>
                                    <SelectItem value="servant">Servant</SelectItem>
                                    <SelectItem value="outcast">Outcast</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setEditingNPC(null)}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={() => handleUpdateNPC(editingNPC)}>
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-foreground text-sm flex items-center gap-2">
                                    {npc.name}
                                    {npc.is_deceased && (
                                      <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                                        DECEASED
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground capitalize">
                                    {npc.social_rank || 'commoner'}
                                  </span>
                                </div>
                                {npc.bio && (
                                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{npc.bio}</p>
                                )}
                                <div className="flex gap-1 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setEditingNPC(npc)}
                                  >
                                    Edit
                                  </Button>
                                  {npc.is_deceased ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs text-green-500 hover:text-green-400"
                                      onClick={() => handleReviveNPC(npc.id, npc.saved_character_id)}
                                    >
                                      Revive
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs text-amber-500 hover:text-amber-400"
                                      onClick={() => handleKillNPC(npc.id, npc.saved_character_id)}
                                    >
                                      Kill
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteNPC(npc.id, npc.saved_character_id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* OOC Commands Info for NPCs */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">OOC Commands (Staff Only):</strong>
                    </p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      <li><span className="text-primary font-mono">//revive [name]</span> - Bring back a deceased NPC</li>
                      <li><span className="text-primary font-mono">//kill [name]</span> - Remove an NPC from the scene</li>
                      <li><span className="text-primary font-mono">//spawn [type]</span> - Create a new NPC</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && isOwner && (
                <div className="space-y-6">
                  {/* Privacy Toggle */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Privacy
                    </h3>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">Public World</p>
                        <p className="text-xs text-muted-foreground">Anyone can find and join</p>
                      </div>
                      <Switch
                        checked={isPublic}
                        onCheckedChange={(value) => handleUpdateWorldSettings("is_public", value)}
                        disabled={loadingSettings}
                      />
                    </div>
                  </div>

                  {/* Age Toggle */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Age Restriction
                    </h3>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">18+ Only (NSFW)</p>
                        <p className="text-xs text-muted-foreground">
                          {isNsfw ? "Cannot be disabled while NSFW" : "Restrict to adults only"}
                        </p>
                      </div>
                      <Switch
                        checked={isNsfw}
                        onCheckedChange={(value) => handleUpdateWorldSettings("is_nsfw", value)}
                        disabled={loadingSettings}
                      />
                    </div>
                    {isNsfw && (
                      <p className="text-xs text-amber-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        NSFW worlds must remain 18+ only
                      </p>
                    )}
                  </div>

                  {/* AI Settings */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      AI Settings
                    </h3>
                    
                    {/* AI Toggle */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">Enable Phantom AI</p>
                        <p className="text-xs text-muted-foreground">Dynamic NPCs and stage management</p>
                      </div>
                      <Switch
                        checked={aiEnabled}
                        onCheckedChange={setAiEnabled}
                      />
                    </div>

                    {/* AI Character Restriction */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">Use Owner Characters Only</p>
                        <p className="text-xs text-muted-foreground">AI won't use other users' characters</p>
                      </div>
                      <Switch
                        checked={aiUseOwnerCharsOnly}
                        onCheckedChange={setAiUseOwnerCharsOnly}
                      />
                    </div>

                    {/* AI Intensity */}
                    <div className="space-y-2">
                      <Label className="text-sm">AI Intensity</Label>
                      <Select
                        value={aiIntensity}
                        onValueChange={(value: 'low' | 'medium' | 'high') => setAiIntensity(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2">
                              <span>🌙 Low</span>
                              <span className="text-xs text-muted-foreground">- Minimal AI responses</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              <span>⚡ Medium</span>
                              <span className="text-xs text-muted-foreground">- Balanced responses</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              <span>🔥 High</span>
                              <span className="text-xs text-muted-foreground">- Very active AI</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Controls how often and how actively the AI responds to messages.
                      </p>
                    </div>

                    {/* AI Lore */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm">AI Lore & Instructions</Label>
                      </div>
                      <Textarea
                        placeholder="Add custom lore or instructions for the AI to follow..."
                        value={aiLore}
                        onChange={(e) => setAiLore(e.target.value)}
                        className="min-h-[120px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        The AI will follow these rules and incorporate this lore into responses.
                      </p>
                    </div>

                    <Button 
                      onClick={handleSaveAiSettings} 
                      disabled={savingAiSettings}
                      className="w-full"
                    >
                      {savingAiSettings ? "Saving..." : "Save AI Settings"}
                    </Button>
                  </div>

                  {/* OOC Commands Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MessageSquareOff className="w-4 h-4" />
                      OOC Commands
                    </h3>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Use <span className="text-primary font-mono">//</span> or <span className="text-primary font-mono">OOC:</span> prefix 
                        for out-of-character commands. The AI will interpret these as meta-instructions.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Example: <span className="text-primary font-mono">//spawn a merchant</span>
                      </p>
                    </div>
                  </div>

                  {/* Auto Spam Detection Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Auto Moderation
                    </h3>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Spam detection is <span className="text-green-500 font-medium">active</span>. Users sending
                        rapid messages or duplicate content will be auto-warned and timed out.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit Logs Tab */}
              {activeTab === "logs" && isOwner && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <ScrollText className="w-4 h-4" />
                    Moderation Log
                  </h3>

                  {loadingLogs ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Loading logs...</div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No moderation actions yet</div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="p-3 bg-muted/50 rounded-lg text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-foreground">{formatAction(log.action)}</span>
                              <span className="text-muted-foreground">
                                {format(new Date(log.created_at), "MMM d, HH:mm")}
                              </span>
                            </div>
                            <div className="text-muted-foreground">
                              {log.actor?.username && <span>By @{log.actor.username}</span>}
                              {log.target_user?.username && <span> → @{log.target_user.username}</span>}
                              {log.target_room?.name && <span> in {log.target_room.name}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>

            {/* Footer - Leave Button */}
            <div className="p-4 border-t border-border">
              {!isOwner && (
                <Button variant="destructive" className="w-full" onClick={onLeaveWorld}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave World
                </Button>
              )}
              {isOwner && (
                <p className="text-xs text-center text-muted-foreground">As the owner, you cannot leave this world.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
