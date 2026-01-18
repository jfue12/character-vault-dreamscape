import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { CreateCharacterModal } from '@/components/characters/CreateCharacterModal';
import { Plus, Users, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Create() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const createOptions = [
    {
      icon: Users,
      title: 'New Character',
      description: 'Create a new OC for your collection',
      gradient: 'from-neon-purple to-neon-pink',
      action: () => setIsCharacterModalOpen(true),
    },
    {
      icon: Globe,
      title: 'New World',
      description: 'Build a roleplay world',
      gradient: 'from-neon-blue to-neon-purple',
      action: () => navigate('/create-world'),
    },
    {
      icon: Sparkles,
      title: 'New Story',
      description: 'Start a roleplay scenario',
      gradient: 'from-neon-pink to-neon-blue',
      action: () => navigate('/plots'),
    },
  ];

  return (
    <AppLayout title="Create">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            What would you like to create?
          </h2>
          <p className="text-muted-foreground">
            Bring your imagination to life
          </p>
        </motion.div>

        <div className="grid gap-4">
          {createOptions.map((option, index) => (
            <motion.div
              key={option.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={option.action}
                className="w-full glass-card p-6 text-left group hover:neon-border transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center group-hover:animate-pulse-neon transition-all`}>
                    <option.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {option.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      <CreateCharacterModal
        open={isCharacterModalOpen}
        onOpenChange={setIsCharacterModalOpen}
        onSuccess={() => navigate('/profile')}
      />
    </AppLayout>
  );
}
