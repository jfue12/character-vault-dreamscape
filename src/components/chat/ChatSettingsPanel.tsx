import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X, Settings, Users, Shield, Plus, LogOut, Trash2, Crown, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [activeTab, setActiveTab] = useState<'rooms' | 'members' | 'settings'>('rooms');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomStaffOnly, setNewRoomStaffOnly] = useState(false);
  const [creating, setCreating] = useState(false);

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
    }
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
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'rooms' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
                }`}
              >
                Rooms
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'members' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
                }`}
              >
                Members
              </button>
              {isStaff && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
                  }`}
                >
                  Settings
                </button>
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
                        <span className="font-medium text-foreground">@{member.username}</span>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => member.role === 'admin' 
                            ? handleDemoteMember(member.userId) 
                            : handlePromoteMember(member.userId)
                          }
                        >
                          {member.role === 'admin' ? 'Demote' : 'Promote'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && isStaff && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    World settings and moderation options.
                  </p>
                  {/* Add more settings here as needed */}
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