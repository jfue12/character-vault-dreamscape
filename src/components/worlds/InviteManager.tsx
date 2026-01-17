import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Link2, Copy, Plus, Trash2, Clock, Users, Check, X } from 'lucide-react';

interface Invite {
  id: string;
  code: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
}

interface InviteManagerProps {
  worldId: string;
}

const EXPIRATION_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: '1 hour', value: '3600' },
  { label: '6 hours', value: '21600' },
  { label: '12 hours', value: '43200' },
  { label: '1 day', value: '86400' },
  { label: '7 days', value: '604800' },
  { label: '30 days', value: '2592000' },
];

const MAX_USES_OPTIONS = [
  { label: 'Unlimited', value: 'unlimited' },
  { label: '1 use', value: '1' },
  { label: '5 uses', value: '5' },
  { label: '10 uses', value: '10' },
  { label: '25 uses', value: '25' },
  { label: '50 uses', value: '50' },
  { label: '100 uses', value: '100' },
];

export const InviteManager = ({ worldId }: InviteManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expiration, setExpiration] = useState('604800'); // 7 days default
  const [maxUses, setMaxUses] = useState('unlimited');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites();
  }, [worldId]);

  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from('world_invites')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvites(data);
    }
    setLoading(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createInvite = async () => {
    if (!user) return;
    setCreating(true);

    try {
      const code = generateCode();
      const expiresAt = expiration === 'never' 
        ? null 
        : new Date(Date.now() + parseInt(expiration) * 1000).toISOString();
      const maxUsesValue = maxUses === 'unlimited' ? null : parseInt(maxUses);

      const { data, error } = await supabase
        .from('world_invites')
        .insert({
          world_id: worldId,
          code,
          created_by: user.id,
          expires_at: expiresAt,
          max_uses: maxUsesValue,
        })
        .select()
        .single();

      if (error) throw error;

      setInvites([data, ...invites]);
      setShowCreateForm(false);
      toast({ title: 'Invite created!' });

      // Auto-copy to clipboard
      const inviteUrl = `${window.location.origin}/invite/${code}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedId(data.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: any) {
      toast({ title: 'Failed to create invite', description: err.message, variant: 'destructive' });
    }

    setCreating(false);
  };

  const deleteInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('world_invites')
      .delete()
      .eq('id', inviteId);

    if (error) {
      toast({ title: 'Failed to delete invite', variant: 'destructive' });
    } else {
      setInvites(invites.filter(i => i.id !== inviteId));
      toast({ title: 'Invite deleted' });
    }
  };

  const toggleInvite = async (invite: Invite) => {
    const { error } = await supabase
      .from('world_invites')
      .update({ is_active: !invite.is_active })
      .eq('id', invite.id);

    if (error) {
      toast({ title: 'Failed to update invite', variant: 'destructive' });
    } else {
      setInvites(invites.map(i => 
        i.id === invite.id ? { ...i, is_active: !i.is_active } : i
      ));
    }
  };

  const copyInviteLink = async (code: string, inviteId: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedId(inviteId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Invite link copied!' });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxedOut = (maxUses: number | null, useCount: number) => {
    if (!maxUses) return false;
    return useCount >= maxUses;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Invite Link
      </Button>

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 p-4 rounded-lg bg-secondary"
          >
            <div className="space-y-2">
              <Label className="text-foreground">Expires After</Label>
              <Select value={expiration} onValueChange={setExpiration}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Max Uses</Label>
              <Select value={maxUses} onValueChange={setMaxUses}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAX_USES_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={() => setShowCreateForm(false)} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={createInvite} 
                disabled={creating}
                className="flex-1"
              >
                {creating ? 'Creating...' : 'Generate'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing invites */}
      <div className="space-y-2">
        {invites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No invite links yet</p>
          </div>
        ) : (
          invites.map(invite => {
            const expired = isExpired(invite.expires_at);
            const maxedOut = isMaxedOut(invite.max_uses, invite.use_count);
            const disabled = !invite.is_active || expired || maxedOut;

            return (
              <div 
                key={invite.id} 
                className={`p-3 rounded-lg bg-secondary ${disabled ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    <code className="text-sm font-mono text-foreground">
                      {invite.code}
                    </code>
                    {disabled && (
                      <span className="px-2 py-0.5 rounded text-xs bg-destructive/20 text-destructive">
                        {expired ? 'Expired' : maxedOut ? 'Max uses reached' : 'Disabled'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyInviteLink(invite.code, invite.id)}
                      className="h-8 w-8"
                    >
                      {copiedId === invite.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleInvite(invite)}
                      className="h-8 w-8"
                    >
                      {invite.is_active ? (
                        <X className="w-4 h-4 text-destructive" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteInvite(invite.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {invite.use_count}{invite.max_uses ? `/${invite.max_uses}` : ''} uses
                  </span>
                  {invite.expires_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {expired ? 'Expired' : `Expires ${format(new Date(invite.expires_at), 'MMM d, h:mm a')}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
