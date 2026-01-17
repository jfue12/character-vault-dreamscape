import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/profile');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-purple via-neon-pink to-neon-blue flex items-center justify-center mx-auto mb-8 neon-border animate-pulse-neon"
        >
          <Sparkles className="w-12 h-12 text-primary-foreground" />
        </motion.div>

        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 neon-text">
          OC Vault
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Your characters. Your worlds. Your stories.
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={() => navigate('/auth')}
            className="px-8 py-6 text-lg bg-gradient-to-r from-neon-purple via-neon-pink to-neon-blue text-primary-foreground font-semibold neon-border hover:opacity-90 transition-opacity"
          >
            Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Index;
