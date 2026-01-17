import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Shield, LogOut, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Member {
  userId: string;
  username: string;
  characterName: string;
  characterAvatar: string | null;
  role: 'owner' | 'admin' | 'member';
  isOnline?: boolean;
}

interface ChatMemberListProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  memberCount: number;
  currentUserRole?: 'owner' | 'admin' | 'member';
  currentUserId?: string;
  onLeaveWorld?: () => void;
  onInviteFriends?: () => void;
}

export const ChatMemberList = ({ 
  isOpen, 
  onClose, 
  members, 
  memberCount,
  currentUserRole = 'member',
  currentUserId,
  onLeaveWorld,
  onInviteFriends
}: ChatMemberListProps) => {
  const navigate = useNavigate();

  const handleViewProfile = (userId: string) => {
    if (userId !== currentUserId) {
      navigate(`/user/${userId}`);
      onClose();
    }
  };

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
              <h2 className="font-semibold text-foreground">
                Members ({memberCount})
              </h2>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Invite Friends Button */}
            {onInviteFriends && (
              <div className="p-4 border-b border-border">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={onInviteFriends}
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Friends
                </Button>
              </div>
            )}

            {/* Member List */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {members.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => handleViewProfile(member.userId)}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors w-full text-left ${
                    member.userId !== currentUserId ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border">
                      {member.characterAvatar ? (
                        <img
                          src={member.characterAvatar}
                          alt={member.characterName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                          {member.characterName[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Online indicator */}
                    {member.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground truncate">
                        {member.characterName}
                      </span>
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
                    <span className="text-xs text-muted-foreground truncate block">
                      @{member.username}
                    </span>
                  </div>
                </button>
              ))}

              {members.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No members online
                </p>
              )}
            </div>

            {/* Footer - Leave Button for non-owners */}
            {currentUserRole !== 'owner' && onLeaveWorld && (
              <div className="p-4 border-t border-border">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={onLeaveWorld}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave World
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
