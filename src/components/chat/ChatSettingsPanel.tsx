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

  // Room-specific editable state
  const [roomStates, setRoomStates] = useState<any[]>([]);

  // Initialize roomStates after rooms prop is populated
  useEffect(() => {
    if (rooms.length > 0) {
      setRoomStates(
        rooms.map((r) => ({
          ...r,
          saving: false,
          notifications_enabled: true, // default or fetch from DB if exists
          theme_color: r.background_url || "#ffffff",
        }))
      );
    }
  }, [rooms]);

  useEffect(() => {
    if (isOpen && isOwner) {
      fetchWorldSettings();
    }
  }, [isOpen, isOwner, worldId]);

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
      `
      )
      .eq("world_id", worldId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setAuditLogs(data as AuditLog[]);
    setLoadingLogs(false);
  };

  const handleUpdateWorldSettings = async (field: "is_public" | "is_nsfw", value: boolean) => {
    setLoadingSettings(true);
    const updateData: any = { [field]: value };
    if (field === "is_nsfw" && value) updateData.is_nsfw = true;

    const { error } = await supabase.from("worlds").update(updateData).eq("id", worldId);

    if (error) toast({ title: "Failed to update settings", variant: "destructive" });
    else {
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
    if (error) toast({ title: "Failed to create room", description: error.message, variant: "destructive" });
    else {
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
      toast({ title: "Cannot delete", description: "World must

