import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { MessageCircle, Users, Sparkles } from 'lucide-react';

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  return (
    <AppLayout title="Messages">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-10 h-10 text-accent neon-glow" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">
            Your Messages
          </h2>
          <p className="text-muted-foreground mb-6">
            Start conversations with other roleplayers. Your character interactions and stories will appear here.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground">
              <Users className="w-4 h-4" />
              <span>No messages yet</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground">
              <Sparkles className="w-4 h-4" />
              <span>Start a story</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
