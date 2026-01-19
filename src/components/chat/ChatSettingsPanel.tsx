import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
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
  const [activeTab, setActiveTab] = useState<"rooms" | "members" | "settings" | "logs">("rooms");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomStaffOnly, setNewRoomStaffOnly] = useState(false);
  const [creating, setCreating] = useState(false);

  // World settings state
  const [isPublic, setIsPublic] = useState(true);
  const [isNsfw, setIsNsfw] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Room-specific editable state (new fields)
  const [roomStates, setRoomStates] = useState(
    rooms.map((r) => ({
      ...r,
      saving: false,
      notifications_enabled: true, // default, adjust if fetching from DB
      theme_color: r.background_url || "#ffffff",
    })),
  );

  useEffect(() => {
    setRoomStates(
      rooms.map((r) => ({
        ...r,
        saving: false,
        notifications_enabled: true,
        theme_color: r.background_url || "#ffffff",
      })),
    );
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

  const fetchWorldSettings = async () => {
    const { data } = await supabase.from("worlds").select("is_public, is_nsfw").eq("id", worldId).single();

    if (data) {
      setIsPublic(data.is_public);
      setIsNsfw(data.is_nsfw);
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
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        details: { [field]: value },
      });
    }
    setLoadingSettings(false);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast({ title: "Room name is required", variant: "destructive" });
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("world_rooms").insert({
      world_id: worldId,
      name: newRoomName.trim(),
      description: newRoomDescription.trim() || null,
      is_staff_only: newRoomStaffOnly,
      sort_order: rooms.length + 1,
    });

    if (error) {
      toast({ title: "Failed to create room", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Room created!" });
      setNewRoomName("");
      setNewRoomDescription("");
      setNewRoomStaffOnly(false);
      setShowCreateRoom(false);
      onRoomCreated();
    }
    setCreating(false);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (rooms.length <= 1) {
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

  // --- MEMBER HANDLERS (unchanged) ---
  // handlePromoteMember, handleDemoteMember, handleKickMember, handleBanMember, handleTimeoutMember

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
    };
    return actionMap[action] || action.replace(/_/g, " ");
  };

  const isStaff = isOwner || isAdmin;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50 shadow-xl flex flex-col"
          >
            {/* Header, Tabs, Rooms, Members Tabs unchanged */}

            {/* Settings Tab */}
            {activeTab === "settings" && isOwner && (
              <div className="space-y-6">
                {/* Existing Privacy, Age, Auto Moderation, Phantom AI sections unchanged */}

                {/* --- NEW ROOM EXTENSIONS --- */}
                {roomStates.map((room, index) => (
                  <div key={room.id} className="p-3 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-medium text-foreground">{room.name}</h4>

                    <div className="space-y-1">
                      <Label htmlFor={`desc-${room.id}`} className="text-sm font-medium">
                        Room Description
                      </Label>
                      <Input
                        id={`desc-${room.id}`}
                        value={room.description || ""}
                        onChange={(e) =>
                          setRoomStates((prev) =>
                            prev.map((r) => (r.id === room.id ? { ...r, description: e.target.value } : r)),
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`color-${room.id}`} className="text-sm font-medium">
                        Theme Color
                      </Label>
                      <input
                        id={`color-${room.id}`}
                        type="color"
                        value={room.theme_color || "#ffffff"}
                        onChange={(e) =>
                          setRoomStates((prev) =>
                            prev.map((r) => (r.id === room.id ? { ...r, theme_color: e.target.value } : r)),
                          )
                        }
                        className="w-16 h-8 rounded border border-border cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor={`notif-${room.id}`} className="text-sm font-medium">
                        Enable Notifications
                      </Label>
                      <Switch
                        id={`notif-${room.id}`}
                        checked={room.notifications_enabled}
                        onCheckedChange={(val) =>
                          setRoomStates((prev) =>
                            prev.map((r) => (r.id === room.id ? { ...r, notifications_enabled: val } : r)),
                          )
                        }
                      />
                    </div>

                    <Button
                      onClick={async () => {
                        const { error } = await supabase
                          .from("world_rooms")
                          .update({
                            description: room.description,
                            background_url: room.theme_color,
                            notifications_enabled: room.notifications_enabled,
                          })
                          .eq("id", room.id);

                        if (error) toast({ title: "Failed to save room settings", variant: "destructive" });
                        else toast({ title: `Settings saved for ${room.name}` });
                      }}
                      disabled={room.saving}
                      className="w-full"
                    >
                      {room.saving ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Audit Logs Tab unchanged */}

            {/* Footer unchanged */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
