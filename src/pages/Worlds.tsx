import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Globe, Compass, Star } from 'lucide-react';

export default function Worlds() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  return (
    <AppLayout title="Worlds">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-primary neon-glow" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">
            Explore Worlds
          </h2>
          <p className="text-muted-foreground mb-6">
            Discover roleplay worlds created by the community. Join adventures, meet characters, and create stories together.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground">
              <Compass className="w-4 h-4" />
              <span>Coming Soon</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground">
              <Star className="w-4 h-4" />
              <span>Featured Worlds</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
