import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { X, Plus, LogOut, Trash2, Crown, Image, Shield, ScrollText, AlertTriangle, Eye, Lock, Users, Clock, Scroll, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Room {
  id: string;
  name: string;
  description: string | null;
  background_url: string | null;
  avatar_url: string | null;
  room_lore: string | null;
  is_staff_only: boolean;
}

interface Member {
  userId: string;
  username: string;
  role: 'owner' | 'admin' | 'member';
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
  onRoomDeleted
}: ChatSettingsPanelProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'rooms' | 'members' | 'settings' | 'logs'>('rooms');
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  // ===== EXISTING ROOM CREATION STATE =====
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomLore, setNewRoomLore] = useState('');
  const [newRoomBackgroundUrl, setNewRoomBackgroundUrl] = useState('');
  const [newRoomAvatarUrl, setNewRoomAvatarUrl] = useState('');
  const [newRoomStaffOnly, setNewRoomStaffOnly] = useState(false);
  const [creating, setCreating] = useState(false);

  // ===== NEW: EDIT LORE STATE =====
  const [editingLoreRoomId, setEditingLoreRoomId] = useState<string | null>(null);
  const [loreDraft, setLoreDraft] = useState('');

  const [isPublic, setIsPublic] = useState(true);
  const [isNsfw, setIsNsfw] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen && isOwner) {
      fetchWorldSettings();
    }
  }, [isOpen, isOwner, worldId]);

  useEffect(() => {
    if (activeTab === 'logs' && isOwner) {
      fetchAuditLogs();
    }
  }, [activeTab, isOwner, worldId]);

  const fetchWorldSettings = async () => {
    const { data } = await supabase
      .from('worlds')
      .select('is_public, is_nsfw')
      .eq('id', worldId)
      .single();

    if (data) {
      setIsPublic(data.is_public);
      setIsNsfw(data.is_nsfw);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from('audit_logs')
      .select(`
        *,
        actor:profiles!audit_logs_actor_id_fkey(username),
        target_user:profiles!audit_logs_target_user_id_fkey(username),
        target_room:world_rooms!audit_logs_target_room_id_fkey(name)
      `)
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setAuditLogs(data as AuditLog[]);
    }
    setLoadingLogs(false);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast({ title: 'Room name is required', variant: 'destructive' });
      return;
    }

    setCreating(true);
    const { error } = await supabase.from('world_rooms').insert({
      world_id: worldId,
      name: newRoomName.trim(),
      description: newRoomDescription.trim() || null,
      room_lore: newRoomLore.trim() || null,
      background_url: newRoomBackgroundUrl.trim() || null,
      avatar_url: newRoomAvatarUrl.trim() || null,
      is_staff_only: newRoomStaffOnly,
      sort_order: rooms.length + 1
    });

    if (error) {
      toast({ title: 'Failed to create room', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Room created!' });
      setNewRoomName('');
      setNewRoomDescription('');
      setNewRoomLore('');
      setNewRoomBackgroundUrl('');
      setNewRoomAvatarUrl('');
      setNewRoomStaffOnly(false);
      setShowCreateRoom(false);
      onRoomCreated();
    }
    setCreating(false);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (rooms.length <= 1) {
      toast({ title: 'Cannot delete', description: 'World must have at least one room', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('world_rooms').delete().eq('id', roomId);
    if (error) {
      toast({ title: 'Failed to delete room', variant: 'destructive' });
    } else {
      toast({ title: 'Room deleted' });
      onRoomDeleted(roomId);
    }
  };

  // ===== NEW FUNCTION: SAVE ROOM LORE =====
  const handleSaveRoomLore = async () => {
    if (!editingLoreRoomId) return;

    const { error } = await supabase
      .from('world_rooms')
      .update({ room_lore: loreDraft.trim() || null })
      .eq('id', editingLoreRoomId);

    if (error) {
      toast({ title: 'Failed to save lore', variant: 'destructive' });
    } else {
      toast({ title: 'AI Lore updated' });
      setEditingLoreRoomId(null);
      onRoomCreated(); // refresh list
    }
  };

  const isStaff = isOwner || isAdmin;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50 shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground">{worldName}</h2>
                <p className="text-xs text-muted-foreground">Chat Settings</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex border-b border-border">
              <button onClick={() => setActiveTab('rooms')} className={`flex-1 py-3 text-xs font-medium ${activeTab === 'rooms' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>Rooms</button>
              <button onClick={() => setActiveTab('members')} className={`flex-1 py-3 text-xs font-medium ${activeTab === 'members' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>Members</button>
              {isOwner && (
                <>
                  <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 text-xs font-medium ${activeTab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>Settings</button>
                  <button onClick={() => setActiveTab('logs')} className={`flex-1 py-3 text-xs font-medium ${activeTab === 'logs' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>Logs</button>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'rooms' && (
                <div className="space-y-3">
                  {isOwner && !showCreateRoom && (
                    <Button variant="outline" className="w-full" onClick={() => setShowCreateRoom(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Create Room
                    </Button>
                  )}

                  {rooms.map((room) => (
                    <div key={room.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                          {(room.avatar_url || room.background_url) ? (
                            <img src={room.avatar_url || room.background_url || ''} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{room.name}</p>
                          {room.is_staff_only && <span className="text-[10px] text-amber-500">Staff only</span>}
                        </div>

                        {isOwner && (
                          <>
                            <button
                              onClick={() => {
                                setEditingLoreRoomId(room.id);
                                setLoreDraft(room.room_lore || '');
                              }}
                              className="p-1.5 hover:bg-primary/20 rounded text-primary"
                              title="Edit AI Lore"
                            >
                              <ScrollText className="w-4 h-4" />
                            </button>

                            {rooms.length > 1 && (
                              <button onClick={() => handleDeleteRoom(room.id)} className="p-1.5 hover:bg-destructive/20 rounded text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {editingLoreRoomId === room.id && (
                        <div className="mt-2 p-2 bg-card border rounded-lg space-y-2">
                          <Label className="text-xs uppercase text-muted-foreground">AI Room Lore</Label>
                          <Textarea
                            value={loreDraft}
                            onChange={(e) => setLoreDraft(e.target.value)}
                            placeholder="Rules, canon, tone, facts, and boundaries the AI must follow..."
                            className="min-h-[100px] text-xs"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingLoreRoomId(null)}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveRoomLore}>Save Lore</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

