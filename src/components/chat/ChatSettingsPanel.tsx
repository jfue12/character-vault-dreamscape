import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { X, Plus, LogOut, Trash2, Crown, Image, Shield, ScrollText, AlertTriangle, Eye, Lock, Users, Clock } from 'lucide-react';
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
  is_staff_only: boolean;
}

interface Member {
  userId: string;
  username: string;
  role: 'owner' | 'admin' | 'member';
}


interface Lore
  room_lore: value
  descripton: value

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
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomStaffOnly, setNewRoomStaffOnly] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // World settings state
  const [isPublic, setIsPublic] = useState(true);
  const [isNsfw, setIsNsfw] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch world settings on open
  useEffect(() => {
    if (isOpen && isOwner) {
      fetchWorldSettings();
    }
  }, [isOpen, isOwner, worldId]);

  // Fetch audit logs when viewing logs tab
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

  const handleUpdateWorldSettings = async (field: 'is_public' | 'is_nsfw', value: boolean) => {
    setLoadingSettings(true);
    
    // If turning off NSFW, that's allowed
    // If world is NSFW, 18+ must stay on (handled by not allowing toggle)
    const updateData: any = { [field]: value };
    
    // If marking as NSFW, keep it that way
    if (field === 'is_nsfw' && value) {
      updateData.is_nsfw = true;
    }
    
    const { error } = await supabase
      .from('worlds')
      .update(updateData)
      .eq('id', worldId);
    
    if (error) {
      toast({ title: 'Failed to update settings', variant: 'destructive' });
    } else {
      if (field === 'is_public') setIsPublic(value);
      if (field === 'is_nsfw') setIsNsfw(value);
      toast({ title: 'Settings updated' });
      
      // Log the change
      await supabase.from('audit_logs').insert({
        world_id: worldId,
        action: field === 'is_public' 
          ? (value ? 'world_made_public' : 'world_made_private')
          : (value ? 'nsfw_enabled' : 'nsfw_disabled'),
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        details: { [field]: value }
      });
    }
    setLoadingSettings(false);
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
      is_staff_only: newRoomStaffOnly,
      sort_order: rooms.length + 1
    });

    if (error) {
      toast({ title: 'Failed to create room', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Room created!' });
      setNewRoomName('');
      setNewRoomDescription('');
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

  const handlePromoteMember = async (userId: string) => {
    const { error } = await supabase
      .from('world_members')
      .update({ role: 'admin' })
      .eq('world_id', worldId)
      .eq('user_id', userId);

    if (!error) {
      toast({ title: 'Member promoted to admin' });
      await supabase.from('audit_logs').insert({
        world_id: worldId,
        action: 'promote_admin',
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        target_user_id: userId
      });
    }
  };

  const handleDemoteMember = async (userId: string) => {
    const { error } = await supabase
      .from('world_members')
      .update({ role: 'member' })
      .eq('world_id', worldId)
      .eq('user_id', userId);

    if (!error) {
      toast({ title: 'Admin demoted to member' });
      await supabase.from('audit_logs').insert({
        world_id: worldId,
        action: 'demote_admin',
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        target_user_id: userId
      });
    }
  };

  const handleKickMember = async (userId: string, username: string) => {
    const { error } = await supabase
      .from('world_members')
      .delete()
      .eq('world_id', worldId)
      .eq('user_id', userId);

    if (!error) {
      toast({ title: `${username} has been kicked` });
      await supabase.from('audit_logs').insert({
        world_id: worldId,
        action: 'kick',
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        target_user_id: userId
      });
    }
  };

  const handleBanMember = async (userId: string, username: string) => {
    const { error } = await supabase
      .from('world_members')
      .update({ is_banned: true })
      .eq('world_id', worldId)
      .eq('user_id', userId);

    if (!error) {
      toast({ title: `${username} has been banned` });
      await supabase.from('audit_logs').insert({
        world_id: worldId,
        action: 'ban',
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        target_user_id: userId
      });
    }
  };

  const handleTimeoutMember = async (userId: string, username: string, duration: string) => {
    const durationMap: Record<string, number> = {
      '30s': 30 * 1000,
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };

    const expiresAt = new Date(Date.now() + (durationMap[duration] || 60000)).toISOString();
    const currentUser = (await supabase.auth.getUser()).data.user;

    const { error } = await supabase.from('timeouts').insert({
      user_id: userId,
      world_id: worldId,
      expires_at: expiresAt,
      issued_by: currentUser?.id,
      reason: `Timed out for ${duration}`,
    });

    if (!error) {
      toast({ title: `${username} timed out for ${duration}` });
      await supabase.from('audit_logs').insert({
        world_id: worldId,
        action: 'timeout',
        actor_id: currentUser?.id,
        target_user_id: userId,
        details: { duration }
      });
    } else {
      toast({ title: 'Failed to timeout user', variant: 'destructive' });
    }
  };

  const formatAction = (action: string): string => {
    const actionMap: Record<string, string> = {
      'promote_admin': 'Promoted to Admin',
      'demote_admin': 'Demoted to Member',
      'kick': 'Kicked',
      'ban': 'Banned',
      'unban': 'Unbanned',
      'timeout': 'Timed Out',
      'world_made_public': 'Made World Public',
      'world_made_private': 'Made World Private',
      'nsfw_enabled': 'Enabled NSFW',
      'nsfw_disabled': 'Disabled NSFW',
      'room_created': 'Created Room',
      'room_deleted': 'Deleted Room',
    };
    return actionMap[action] || action.replace(/_/g, ' ');
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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
                onClick={() => setActiveTab('rooms')}
                className={`flex-1 py-3 text-xs font-medium transition-colors ${
                  activeTab === 'rooms' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
                }`}
              >
                Rooms
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex-1 py-3 text-xs font-medium transition-colors ${
                  activeTab === 'members' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
                }`}
              >
                Members
              </button>
              {isOwner && (
                <>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 py-3 text-xs font-medium transition-colors ${
                      activeTab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex-1 py-3 text-xs font-medium transition-colors ${
                      activeTab === 'logs' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
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
              {activeTab === 'rooms' && (
                <div className="space-y-3">
                  {isOwner && (
                    <>
                      {!showCreateRoom ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowCreateRoom(true)}
                        >
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
                          <div className="flex items-center justify-between">
                            <Label htmlFor="staff-only" className="text-sm">Staff Only</Label>
                            <Switch
                              id="staff-only"
                              checked={newRoomStaffOnly}
                              onCheckedChange={setNewRoomStaffOnly}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              className="flex-1"
                              onClick={() => setShowCreateRoom(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="flex-1"
                              onClick={handleCreateRoom}
                              disabled={creating}
                            >
                              Create
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
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
                        {room.is_staff_only && (
                          <span className="text-[10px] text-amber-500">Staff only</span>
                        )}
                      </div>
                      {isOwner && rooms.length > 1 && (
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="p-1.5 hover:bg-destructive/20 rounded text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Members Tab */}
              {activeTab === 'members' && (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm">@{member.username}</span>
                        {member.role === 'owner' && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            <Crown className="w-2.5 h-2.5" />
                            Owner
                          </span>
                        )}
                        {member.role === 'admin' && (
                          <span className="flex items-center gap-0.5 text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                            <Shield className="w-2.5 h-2.5" />
                            Admin
                          </span>
                        )}
                      </div>
                      {isOwner && member.role !== 'owner' && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => member.role === 'admin' 
                              ? handleDemoteMember(member.userId) 
                              : handlePromoteMember(member.userId)
                            }
                          >
                            {member.role === 'admin' ? 'Demote' : 'Promote'}
                          </Button>
                          <Select onValueChange={(duration) => handleTimeoutMember(member.userId, member.username, duration)}>
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

              {/* Settings Tab */}
              {activeTab === 'settings' && isOwner && (
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
                        onCheckedChange={(value) => handleUpdateWorldSettings('is_public', value)}
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
                          {isNsfw ? 'Cannot be disabled while NSFW' : 'Restrict to adults only'}
                        </p>
                      </div>
                      <Switch
                        checked={isNsfw}
                        onCheckedChange={(value) => handleUpdateWorldSettings('is_nsfw', value)}
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

                  {/* Auto Spam Detection Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Auto Moderation
                    </h3>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Spam detection is <span className="text-green-500 font-medium">active</span>. 
                        Users sending rapid messages or duplicate content will be auto-warned and timed out.
                      </p>
                    </div>
                  </div>

                  {/* Phantom AI Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Dynamic AI NPCs
                    </h3>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        The Phantom AI automatically creates dynamic NPCs based on context. 
                        Trigger keywords like <span className="text-primary">"Guards!"</span> or 
                        <span className="text-primary"> "Bartender"</span> to spawn characters.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit Logs Tab */}
              {activeTab === 'logs' && isOwner && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <ScrollText className="w-4 h-4" />
                    Moderation Log
                  </h3>
                  
                  {loadingLogs ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Loading logs...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No moderation actions yet
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 bg-muted/50 rounded-lg text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-foreground">
                                {formatAction(log.action)}
                              </span>
                              <span className="text-muted-foreground">
                                {format(new Date(log.created_at), 'MMM d, HH:mm')}
                              </span>
                            </div>
                            <div className="text-muted-foreground">
                              {log.actor?.username && (
                                <span>By @{log.actor.username}</span>
                              )}
                              {log.target_user?.username && (
                                <span> → @{log.target_user.username}</span>
                              )}
                              {log.target_room?.name && (
                                <span> in {log.target_room.name}</span>
                              )}
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
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={onLeaveWorld}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave World
                </Button>
              )}
              {isOwner && (
                <p className="text-xs text-center text-muted-foreground">
                  As the owner, you cannot leave this world.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};