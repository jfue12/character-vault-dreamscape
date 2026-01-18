import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UsernameSetupModal } from './UsernameSetupModal';

export const GlobalUsernamePrompt = () => {
  const { user, profile, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only check once after auth is loaded
    if (!loading && user && profile && !hasChecked) {
      setHasChecked(true);
      
      // Show modal if username is missing or is an email-like value
      const needsUsername = !profile.username || profile.username.includes('@');
      if (needsUsername) {
        // Small delay to let the app load first
        const timer = setTimeout(() => {
          setShowModal(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, user, profile, hasChecked]);

  // Reset check when user changes
  useEffect(() => {
    if (!user) {
      setHasChecked(false);
      setShowModal(false);
    }
  }, [user]);

  return (
    <UsernameSetupModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      onSuccess={() => setShowModal(false)}
    />
  );
};
