import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { FriendRequestsLobby } from '@/components/messages/FriendRequestsLobby';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageCircle } from 'lucide-react';

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

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
      headerLeftIcon="add-friend"
      headerRightIcon="notifications"
      showFab
    >
      <div className="max-w-lg mx-auto">
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
    </AppLayout>
  );
}