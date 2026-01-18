import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Plus, Trash2, DoorOpen, Users, Shield, Clock, 
  Ban, Crown, Upload, X, FileText, AlertTriangle, Bot, Link2
} from 'lucide-react';
import { AICharacterManager } from './AICharacterManager';
import { InviteManager } from './InviteManager';

interface World {
  id: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  background_url: string | null;
  is_staff_only: boolean;
  sort_order: number;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  is_banned: boolean;
  timeout_until: string | null;
  profiles: {
    username: string | null;
  } | null;
}

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  actor?: {
    username: string | null;
  } | null;
  target_user?: {
    username: string | null;
  } | null;
  details: Record<string, any> | null;
}

interface ManageWorldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  world: World;
  rooms: Room[];
  members: Member[];
  onUpdate: () => void;
  onWorldDeleted?: () => void;
}

const TIMEOUT_DURATIONS = [
  { label: '30 seconds', value: 30, unit: 'seconds' },
  { label: '1 minute', value: 60, unit: 'seconds' },
  { label: '2 minutes', value: 120, unit: 'seconds' },
  { label: '5 minutes', value: 300, unit: 'seconds' },
  { label: '1 hour', value: 3600, unit: 'seconds' },
  { label: '24 hours', value: 86400, unit: 'seconds' },
];

export const ManageWorldModal = ({
  open,
  onOpenChange,
  world,
  rooms,
  members,
  onUpdate,
  onWorldDeleted,
}: ManageWorldModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '', is_staff_only: false });
  const [roomImage, setRoomImage] = useState<File | null>(null);
  const [roomImagePreview, setRoomImagePreview] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAuditLogs();
    }
  }, [open, world.id]);

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        created_at,
        details,
        actor:profiles!audit_logs_actor_id_fkey(username),
        target_user:profiles!audit_logs_target_user_id_fkey(username)
      `)
      .eq('world_id', world.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const processedLogs = data.map(log => ({
        ...log,
        actor: Array.isArray(log.actor) ? log.actor[0] : log.actor,
        target_user: Array.isArray(log.target_user) ? log.target_user[0] : log.target_user,
        details: log.details as Record<string, any> | null
      }));
      setAuditLogs(processedLogs);
    }
    setLoadingLogs(false);
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim() || !user) return;

    try {
      let backgroundUrl = null;

      if (roomImage) {
        const fileExt = roomImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-room.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('world-images')
          .upload(fileName, roomImage);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('world-images')
            .getPublicUrl(fileName);
          backgroundUrl = publicUrl;
        }
      }

      const { error } = await supabase.from('world_rooms').insert({
        world_id: world.id,
        name: newRoom.name,
        description: newRoom.description || null,
        background_url: backgroundUrl,
        is_staff_only: newRoom.is_staff_only,
        sort_order: rooms.length,
      });

      if (error) throw error;

      await logAudit('room_created', null, null, { room_name: newRoom.name });
      
      toast({ title: 'Room created!' });
      setNewRoom({ name: '', description: '', is_staff_only: false });
      setRoomImage(null);
      setRoomImagePreview(null);
      setIsCreatingRoom(false);
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Failed to create room', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    const { error } = await supabase.from('world_rooms').delete().eq('id', roomId);
    if (error) {
      toast({ title: 'Failed to delete room', variant: 'destructive' });
    } else {
      await logAudit('room_deleted', null, roomId, { room_name: roomName });
      toast({ title: 'Room deleted' });
      onUpdate();
    }
  };

  const handleDeleteWorld = async () => {
    if (!user) return;
    setIsDeleting(true);

    try {
      // Delete all related data first (rooms, members, messages, etc.)
      // These will cascade due to foreign keys, but we need to delete messages manually
      const { data: worldRooms } = await supabase
        .from('world_rooms')
        .select('id')
        .eq('world_id', world.id);

      if (worldRooms) {
        for (const room of worldRooms) {
          await supabase.from('messages').delete().eq('room_id', room.id);
          await supabase.from('system_messages').delete().eq('room_id', room.id);
        }
      }

      // Delete world rooms
      await supabase.from('world_rooms').delete().eq('world_id', world.id);
      
      // Delete world members
      await supabase.from('world_members').delete().eq('world_id', world.id);
      
      // Delete AI characters
      await supabase.from('ai_characters').delete().eq('world_id', world.id);
      
      // Delete temp AI characters
      await supabase.from('temp_ai_characters').delete().eq('world_id', world.id);
      
      // Delete world invites
      await supabase.from('world_invites').delete().eq('world_id', world.id);
      
      // Delete audit logs
      await supabase.from('audit_logs').delete().eq('world_id', world.id);
      
      // Delete moderation logs
      await supabase.from('moderation_logs').delete().eq('world_id', world.id);
      
      // Delete timeouts
      await supabase.from('timeouts').delete().eq('world_id', world.id);
      
      // Delete world events
      await supabase.from('world_events').delete().eq('world_id', world.id);

      // Finally delete the world itself
      const { error } = await supabase.from('worlds').delete().eq('id', world.id);

      if (error) throw error;

      toast({ title: 'World deleted successfully' });
      onOpenChange(false);
      onWorldDeleted?.();
    } catch (error: any) {
      toast({ title: 'Failed to delete world', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePromote = async (memberId: string, userId: string, newRole: string) => {
    const { error } = await supabase
      .from('world_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Failed to update role', variant: 'destructive' });
    } else {
      toast({ title: `Role updated to ${newRole}` });
      await logAudit(`promoted_to_${newRole}`, userId, null, {});
      await logModeration(userId, `Promoted to ${newRole}`);
      onUpdate();
    }
  };

  const handleBan = async (memberId: string, userId: string) => {
    // Get username for system message
    const member = members.find(m => m.user_id === userId);
    const username = member?.profiles?.username || 'Someone';

    const { error } = await supabase
      .from('world_members')
      .update({ is_banned: true })
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Failed to ban user', variant: 'destructive' });
    } else {
      // Send system message to first room
      const { data: worldRooms } = await supabase
        .from('world_rooms')
        .select('id')
        .eq('world_id', world.id)
        .limit(1);

      if (worldRooms && worldRooms.length > 0) {
        await supabase.from('system_messages').insert({
          room_id: worldRooms[0].id,
          message_type: 'ban',
          user_id: userId,
          username
        });
      }

      toast({ title: 'User banned' });
      await logAudit('ban', userId, null, {});
      await logModeration(userId, 'Banned');
      onUpdate();
    }
  };

  const handleUnban = async (memberId: string, userId: string) => {
    const { error } = await supabase
      .from('world_members')
      .update({ is_banned: false })
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Failed to unban user', variant: 'destructive' });
    } else {
      toast({ title: 'User unbanned' });
      await logAudit('unban', userId, null, {});
      await logModeration(userId, 'Unbanned');
      onUpdate();
    }
  };

  const handleTimeout = async (memberId: string, userId: string, seconds: number, label: string) => {
    const timeoutUntil = new Date(Date.now() + seconds * 1000).toISOString();
    
    // Get username for system message
    const member = members.find(m => m.user_id === userId);
    const username = member?.profiles?.username || 'Someone';

    // Update world_members
    const { error: memberError } = await supabase
      .from('world_members')
      .update({ timeout_until: timeoutUntil })
      .eq('id', memberId);

    // Also create timeout record
    const { error: timeoutError } = await supabase
      .from('timeouts')
      .insert({
        user_id: userId,
        world_id: world.id,
        expires_at: timeoutUntil,
        issued_by: user?.id,
        reason: `Timed out for ${label}`
      });

    if (memberError || timeoutError) {
      toast({ title: 'Failed to timeout user', variant: 'destructive' });
    } else {
      // Send system message
      const { data: worldRooms } = await supabase
        .from('world_rooms')
        .select('id')
        .eq('world_id', world.id)
        .limit(1);

      if (worldRooms && worldRooms.length > 0) {
        await supabase.from('system_messages').insert({
          room_id: worldRooms[0].id,
          message_type: 'timeout',
          user_id: userId,
          username,
          duration: label
        });
      }

      toast({ title: `User timed out for ${label}` });
      await logAudit('timeout', userId, null, { duration: label });
      await logModeration(userId, `Timed out for ${label}`);
      onUpdate();
    }
  };

  const handleKick = async (memberId: string, userId: string) => {
    // Get username for system message
    const member = members.find(m => m.user_id === userId);
    const username = member?.profiles?.username || 'Someone';

    // Send system message BEFORE deleting (so we still have access to the member data)
    const { data: worldRooms } = await supabase
      .from('world_rooms')
      .select('id')
      .eq('world_id', world.id)
      .limit(1);

    if (worldRooms && worldRooms.length > 0) {
      await supabase.from('system_messages').insert({
        room_id: worldRooms[0].id,
        message_type: 'kick',
        user_id: userId,
        username
      });
    }

    const { error } = await supabase
      .from('world_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Failed to kick user', variant: 'destructive' });
    } else {
      toast({ title: 'User kicked' });
      await logAudit('kick', userId, null, {});
      await logModeration(userId, 'Kicked');
      onUpdate();
    }
  };

  const logModeration = async (targetUserId: string, action: string) => {
    if (!user) return;
    await supabase.from('moderation_logs').insert({
      world_id: world.id,
      moderator_id: user.id,
      target_user_id: targetUserId,
      action,
    });
  };

  const logAudit = async (
    action: string, 
    targetUserId: string | null, 
    targetRoomId: string | null,
    details: Record<string, any>
  ) => {
    if (!user) return;
    await supabase.from('audit_logs').insert({
      world_id: world.id,
      actor_id: user.id,
      action,
      target_user_id: targetUserId,
      target_room_id: targetRoomId,
      details
    });
  };

  const handleRoomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRoomImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setRoomImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-glass-border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            Manage {world.name}
          </DialogTitle>
          <DialogDescription>Configure rooms, members, AI characters, and invites.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="rooms" className="mt-4">
          <TabsList className="w-full bg-secondary flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="rooms" className="flex-1 min-w-[80px]">
              <DoorOpen className="w-4 h-4 mr-1" /> Rooms
            </TabsTrigger>
            <TabsTrigger value="invites" className="flex-1 min-w-[80px]">
              <Link2 className="w-4 h-4 mr-1" /> Invites
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 min-w-[80px]">
              <Users className="w-4 h-4 mr-1" /> Members
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 min-w-[80px]">
              <Bot className="w-4 h-4 mr-1" /> AI
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex-1 min-w-[80px]">
              <FileText className="w-4 h-4 mr-1" /> Logs
            </TabsTrigger>
            <TabsTrigger value="danger" className="flex-1 min-w-[80px] text-destructive">
              <AlertTriangle className="w-4 h-4 mr-1" /> Danger
            </TabsTrigger>
          </TabsList>

          {/* Rooms Tab */}
          <TabsContent value="rooms" className="space-y-4 mt-4">
            <Button
              onClick={() => setIsCreatingRoom(!isCreatingRoom)}
              className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>

            <AnimatePresence>
              {isCreatingRoom && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 p-4 rounded-lg bg-secondary"
                >
                  <div className="space-y-2">
                    <Label className="text-foreground">Room Name *</Label>
                    <Input
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                      placeholder="Enter room name"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Description</Label>
                    <Input
                      value={newRoom.description}
                      onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                      placeholder="Room description"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Background Image</Label>
                    <label className="cursor-pointer block">
                      <input type="file" accept="image/*" onChange={handleRoomImageChange} className="hidden" />
                      <div className="h-24 rounded-lg bg-input border border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
                        {roomImagePreview ? (
                          <div className="relative w-full h-full">
                            <img src={roomImagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setRoomImage(null); setRoomImagePreview(null); }}
                              className="absolute top-1 right-1 p-1 rounded-full bg-background/80"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Staff Only</Label>
                      <p className="text-xs text-muted-foreground">Only owners and admins can access</p>
                    </div>
                    <Switch
                      checked={newRoom.is_staff_only}
                      onCheckedChange={(checked) => setNewRoom({ ...newRoom, is_staff_only: checked })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setIsCreatingRoom(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRoom} disabled={!newRoom.name.trim()} className="flex-1">
                      Create
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              {rooms.map(room => (
                <div key={room.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div className="flex items-center gap-3">
                    <DoorOpen className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{room.name}</p>
                      {room.is_staff_only && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Staff only
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRoom(room.id, room.name)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites" className="space-y-4 mt-4">
            <InviteManager worldId={world.id} />
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4 mt-4">
            {members.map(member => {
              const isOwnerMember = member.role === 'owner';
              const isCurrentUser = member.user_id === user?.id;

              return (
                <div key={member.id} className="p-4 rounded-lg bg-secondary">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {member.profiles?.username || 'Unknown'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        member.role === 'owner' ? 'bg-primary text-primary-foreground' :
                        member.role === 'admin' ? 'bg-accent text-accent-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {member.role}
                      </span>
                      {member.is_banned && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-destructive text-destructive-foreground">
                          Banned
                        </span>
                      )}
                      {member.timeout_until && new Date(member.timeout_until) > new Date() && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Timed out
                        </span>
                      )}
                    </div>
                  </div>

                  {!isOwnerMember && !isCurrentUser && (
                    <div className="flex flex-wrap gap-2">
                      {member.role !== 'admin' ? (
                        <Button size="sm" variant="secondary" onClick={() => handlePromote(member.id, member.user_id, 'admin')}>
                          <Crown className="w-3 h-3 mr-1" /> Promote
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => handlePromote(member.id, member.user_id, 'member')}>
                          <Shield className="w-3 h-3 mr-1" /> Demote
                        </Button>
                      )}
                      
                      {/* Timeout with duration selector */}
                      <Select onValueChange={(value) => {
                        const duration = TIMEOUT_DURATIONS.find(d => d.value.toString() === value);
                        if (duration) {
                          handleTimeout(member.id, member.user_id, duration.value, duration.label);
                        }
                      }}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          <SelectValue placeholder="Timeout" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEOUT_DURATIONS.map(d => (
                            <SelectItem key={d.value} value={d.value.toString()}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button size="sm" variant="secondary" onClick={() => handleKick(member.id, member.user_id)}>
                        <X className="w-3 h-3 mr-1" /> Kick
                      </Button>
                      
                      {!member.is_banned ? (
                        <Button size="sm" variant="destructive" onClick={() => handleBan(member.id, member.user_id)}>
                          <Ban className="w-3 h-3 mr-1" /> Ban
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => handleUnban(member.id, member.user_id)}>
                          Unban
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* AI NPCs Tab */}
          <TabsContent value="ai" className="mt-4">
            {user && (
              <AICharacterManager worldId={world.id} ownerId={user.id} />
            )}
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="logs" className="mt-4">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-semibold text-foreground mb-2">No Audit Logs</h4>
                <p className="text-muted-foreground text-sm">
                  Actions taken by staff will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditLogs.map(log => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 rounded-lg bg-secondary text-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <ActionIcon action={log.action} />
                        <div>
                          <span className="font-medium text-foreground">
                            {log.actor?.username || 'System'}
                          </span>
                          <span className="text-muted-foreground"> {formatAction(log.action)} </span>
                          {log.target_user && (
                            <span className="font-medium text-foreground">
                              {log.target_user.username}
                            </span>
                          )}
                          {log.details?.room_name && (
                            <span className="text-muted-foreground">
                              {' '}{log.details.room_name}
                            </span>
                          )}
                          {log.details?.duration && (
                            <span className="text-yellow-400">
                              {' '}({log.details.duration})
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Danger Zone */}
          <TabsContent value="danger" className="mt-4">
            <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
              <h4 className="font-semibold text-destructive flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Danger Zone
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete this world and all its data. This action cannot be undone.
              </p>
              
              {!showDeleteConfirm ? (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete World
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-destructive font-medium">
                    Are you sure? Type the world name to confirm: <strong>{world.name}</strong>
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteWorld}
                      disabled={isDeleting}
                      className="flex-1"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const ActionIcon = ({ action }: { action: string }) => {
  const iconClass = "w-4 h-4";
  
  switch (action) {
    case 'ban':
      return <Ban className={`${iconClass} text-red-400`} />;
    case 'unban':
      return <Ban className={`${iconClass} text-green-400`} />;
    case 'kick':
      return <X className={`${iconClass} text-orange-400`} />;
    case 'timeout':
      return <Clock className={`${iconClass} text-yellow-400`} />;
    case 'promoted_to_admin':
      return <Crown className={`${iconClass} text-primary`} />;
    case 'promoted_to_member':
      return <Shield className={`${iconClass} text-muted-foreground`} />;
    case 'room_created':
      return <DoorOpen className={`${iconClass} text-green-400`} />;
    case 'room_deleted':
      return <Trash2 className={`${iconClass} text-red-400`} />;
    default:
      return <AlertTriangle className={`${iconClass} text-muted-foreground`} />;
  }
};

const formatAction = (action: string): string => {
  switch (action) {
    case 'ban': return 'banned';
    case 'unban': return 'unbanned';
    case 'kick': return 'kicked';
    case 'timeout': return 'timed out';
    case 'promoted_to_admin': return 'promoted to admin';
    case 'promoted_to_member': return 'demoted to member';
    case 'room_created': return 'created room';
    case 'room_deleted': return 'deleted room';
    default: return action.replace(/_/g, ' ');
  }
};