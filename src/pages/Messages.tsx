import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { FriendRequestsLobby } from '@/components/messages/FriendRequestsLobby';
import { ConversationList } from '@/components/messages/ConversationList';
import { UserSearchPanel } from '@/components/hub/UserSearchPanel';
import { MessageCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showUserSearch, setShowUserSearch] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleConversationSelect = (friendshipId: string, friendId: string) => {
    navigate(`/dm/${friendshipId}`);
  };

  return (
    <AppLayout 
      title="Messages"
      headerLeftIcon="back"
      headerRightIcon="notifications"
      onHeaderLeftAction={() => navigate('/hub')}
      showFab
    >
      <div className="max-w-lg mx-auto space-y-4">
        {/* Find Friends Button */}
        <Button
          onClick={() => setShowUserSearch(true)}
          variant="outline"
          className="w-full border-primary/50 text-primary hover:bg-primary/10"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Find & Add Friends
        </Button>

        {/* Friend Requests Lobby */}
        <FriendRequestsLobby 
          key={refreshKey}
          onRequestHandled={() => setRefreshKey(k => k + 1)} 
        />

        {/* Conversations */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Conversations
          </h3>
          
          <ConversationList 
            key={`convos-${refreshKey}`}
            onSelectConversation={handleConversationSelect} 
          />
        </div>
      </div>

      {/* User Search Panel */}
      <UserSearchPanel 
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
      />
    </AppLayout>
  );
}