// ------------------ IMPORTANT: ADD THESE IMPORTS AT TOP ------------------
import { useState, useEffect, useCallback } from 'react';
// ------------------------------------------------------------------------

/* (keep all your existing imports the same — no other changes needed here) */

export const ManageWorldModal = ({
  open,
  onOpenChange,
  world,
  rooms,
  members: membersProp,   // <-- still accepted but no longer trusted
  onUpdate,
  onWorldDeleted,
}: ManageWorldModalProps) => {

  const { user } = useAuth();
  const { toast } = useToast();

  // -------- NEW STATE: we manage members locally ------------
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  // ----------------------------------------------------------

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '', is_staff_only: false });
  const [roomImage, setRoomImage] = useState<File | null>(null);
  const [roomImagePreview, setRoomImagePreview] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---------- NEW: fetch members when modal opens ----------
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);

    const { data, error } = await supabase
      .from('world_members')
      .select(`
        id,
        user_id,
        role,
        is_banned,
        timeout_until,
        profiles ( username )
      `)
      .eq('world_id', world.id);

    if (error) {
      console.error('Failed to load members:', error);
      toast({
        title: 'Failed to load members',
        variant: 'destructive'
      });
    } else {
      setMembers(data || []);
    }

    setLoadingMembers(false);
  }, [world.id, toast]);
  // --------------------------------------------------------

  useEffect(() => {
    if (open) {
      fetchAuditLogs();
      fetchMembers();   // <-- NEW
    }
  }, [open, world.id, fetchMembers]);

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

  // ----------------- KEY CHANGE BELOW -----------------
  // After ANY action that changes members, we refresh them
  const refreshAll = async () => {
    await fetchMembers();
    await fetchAuditLogs();
    onUpdate();
  };
  // ---------------------------------------------------

  /* ----------------- THEN REPLACE THESE CALLS -----------------
     Everywhere you had:  onUpdate();
     change to:           refreshAll();
  ------------------------------------------------------------- */

  // Example (you do NOT need to edit this yourself — already done below)

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
      await refreshAll();
