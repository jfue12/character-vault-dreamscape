import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, MessageSquare, Users, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminPermissions {
  can_moderate_messages?: boolean;
  can_manage_members?: boolean;
  can_manage_rooms?: boolean;
}

interface AdminPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldId: string;
  memberId: string;
  memberUsername: string;
  currentPermissions?: AdminPermissions;
  onSuccess: () => void;
}

const DEFAULT_PERMISSIONS: AdminPermissions = {
  can_moderate_messages: true,
  can_manage_members: true,
  can_manage_rooms: true,
};

export const AdminPermissionsModal = ({
  isOpen,
  onClose,
  worldId,
  memberId,
  memberUsername,
  currentPermissions,
  onSuccess,
}: AdminPermissionsModalProps) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<AdminPermissions>(() => ({
    ...DEFAULT_PERMISSIONS,
    ...currentPermissions,
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentPermissions) {
      setPermissions({
        ...DEFAULT_PERMISSIONS,
        ...currentPermissions,
      });
    } else {
      setPermissions(DEFAULT_PERMISSIONS);
    }
  }, [currentPermissions]);

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('world_members')
      .update({ permissions: permissions as any })
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Failed to update permissions', variant: 'destructive' });
    } else {
      toast({ title: 'Permissions updated!' });
      onSuccess();
      onClose();
    }
    
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-4 top-1/4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 bg-card border border-border rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-foreground">Admin Permissions</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure what <span className="text-foreground font-medium">@{memberUsername}</span> can do as an admin.
              </p>

              {/* Message Moderation */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Message Moderation</p>
                    <p className="text-xs text-muted-foreground">Delete messages and manage chat</p>
                  </div>
                </div>
                <Switch
                  checked={permissions.can_moderate_messages}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_moderate_messages: checked })
                  }
                />
              </div>

              {/* Member Management */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Member Management</p>
                    <p className="text-xs text-muted-foreground">Kick, ban, and timeout users</p>
                  </div>
                </div>
                <Switch
                  checked={permissions.can_manage_members}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_manage_members: checked })
                  }
                />
              </div>

              {/* Room Management */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DoorOpen className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Room Management</p>
                    <p className="text-xs text-muted-foreground">Create and edit rooms</p>
                  </div>
                </div>
                <Switch
                  checked={permissions.can_manage_rooms}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_manage_rooms: checked })
                  }
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
