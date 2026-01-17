import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Trash2, DoorOpen, Users, Shield, Clock, 
  Ban, Crown, Upload, X, FileText
} from 'lucide-react';

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

interface ManageWorldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  world: World;
  rooms: Room[];
  members: Member[];
  onUpdate: () => void;
}

export const ManageWorldModal = ({
  open,
  onOpenChange,
  world,
  rooms,
  members,
  onUpdate,
}: ManageWorldModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '', is_staff_only: false });
  const [roomImage, setRoomImage] = useState<File | null>(null);
  const [roomImagePreview, setRoomImagePreview] = useState<string | null>(null);

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

  const handleDeleteRoom = async (roomId: string) => {
    const { error } = await supabase.from('world_rooms').delete().eq('id', roomId);
    if (error) {
      toast({ title: 'Failed to delete room', variant: 'destructive' });
    } else {
      toast({ title: 'Room deleted' });
      onUpdate();
    }
  };

  const handlePromote = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from('world_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Failed to update role', variant: 'destructive' });
    } else {
      toast({ title: `Role updated to ${newRole}` });
      await logModeration(memberId, `Promoted to ${newRole}`);
      onUpdate();
    }
  };

  const handleBan = async (memberId: string, userId: string) => {
    const { error } = await supabase
      .from('world_members')
      .update({ is_banned: true })
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Failed to ban user', variant: 'destructive' });
    } else {
      toast({ title: 'User banned' });
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
      await logModeration(userId, 'Unbanned');
      onUpdate();
    }
  };

  const handleTimeout = async (memberId: string, userId: string, hours: number) => {
    const timeoutUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('world_members')
      .update({ timeout_until: timeoutUntil })
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Failed to timeout user', variant: 'destructive' });
    } else {
      toast({ title: `User timed out for ${hours} hours` });
      await logModeration(userId, `Timed out for ${hours} hours`);
      onUpdate();
    }
  };

  const handleKick = async (memberId: string, userId: string) => {
    const { error } = await supabase
      .from('world_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Failed to kick user', variant: 'destructive' });
    } else {
      toast({ title: 'User kicked' });
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
        </DialogHeader>

        <Tabs defaultValue="rooms" className="mt-4">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="rooms" className="flex-1">
              <DoorOpen className="w-4 h-4 mr-2" /> Rooms
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1">
              <Users className="w-4 h-4 mr-2" /> Members
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex-1">
              <FileText className="w-4 h-4 mr-2" /> Logs
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
                        <span className="text-xs text-accent">Staff only</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRoom(room.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
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
                    </div>
                  </div>

                  {!isOwnerMember && !isCurrentUser && (
                    <div className="flex flex-wrap gap-2">
                      {member.role !== 'admin' ? (
                        <Button size="sm" variant="secondary" onClick={() => handlePromote(member.id, 'admin')}>
                          <Crown className="w-3 h-3 mr-1" /> Promote
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => handlePromote(member.id, 'member')}>
                          <Shield className="w-3 h-3 mr-1" /> Demote
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => handleTimeout(member.id, member.user_id, 1)}>
                        <Clock className="w-3 h-3 mr-1" /> 1h Timeout
                      </Button>
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

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-4">
            <div className="glass-card p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground mb-2">Moderation Logs</h4>
              <p className="text-muted-foreground text-sm">
                Moderation actions are being logged. Full log viewer coming soon.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
