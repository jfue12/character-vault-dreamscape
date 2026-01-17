import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, ShieldCheck, AlertTriangle, Upload, X } from 'lucide-react';

interface AgeVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

export const AgeVerificationModal = ({ open, onOpenChange, onVerified }: AgeVerificationModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'intro' | 'selfie' | 'id' | 'verifying' | 'result'>('intro');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<'success' | 'failed' | null>(null);
  const [loading, setLoading] = useState(false);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (type: 'selfie' | 'id', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === 'selfie') {
        setSelfieImage(base64);
        setStep('id');
      } else {
        setIdImage(base64);
        verifyAge(selfieImage!, base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const verifyAge = async (selfie: string, idPhoto: string) => {
    if (!user) return;
    setStep('verifying');
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('verify-age', {
        body: {
          selfieBase64: selfie,
          idBase64: idPhoto,
          userId: user.id,
        },
      });

      if (response.error) throw response.error;

      const { verified, reason } = response.data;

      if (verified) {
        setVerificationResult('success');
        toast({
          title: 'Age verified',
          description: 'Your age has been successfully verified.',
        });
        
        // Clear images from memory
        setSelfieImage(null);
        setIdImage(null);
        
        setTimeout(() => {
          onVerified();
          onOpenChange(false);
        }, 2000);
      } else {
        setVerificationResult('failed');
        toast({
          title: 'Verification failed',
          description: reason || 'We could not verify your age. Please try again.',
          variant: 'destructive',
        });
      }
      
      setStep('result');
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult('failed');
      setStep('result');
      toast({
        title: 'Verification error',
        description: 'An error occurred during verification. Please try again.',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const resetVerification = () => {
    setSelfieImage(null);
    setIdImage(null);
    setVerificationResult(null);
    setStep('intro');
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetVerification();
      onOpenChange(value);
    }}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Age Verification Required
          </DialogTitle>
          <DialogDescription>
            To continue using the platform, we need to verify that you are 18 or older.
          </DialogDescription>
        </DialogHeader>

        {step === 'intro' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-4 bg-primary/10 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">How it works:</h4>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li>1. Take a selfie or upload a photo of yourself</li>
                <li>2. Upload a photo of your government-issued ID</li>
                <li>3. Our AI will verify your identity and age</li>
              </ol>
            </div>

            <div className="p-4 bg-muted rounded-lg flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Your privacy is protected</p>
                <p className="text-muted-foreground">
                  We do not store your photos or ID information. Images are processed in memory and immediately discarded.
                </p>
              </div>
            </div>

            <Button onClick={() => setStep('selfie')} className="w-full">
              Begin Verification
            </Button>
          </motion.div>
        )}

        {step === 'selfie' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center">
              <Camera className="w-12 h-12 mx-auto text-primary mb-3" />
              <h4 className="font-medium text-foreground">Take a Selfie</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Make sure your face is clearly visible and well-lit
              </p>
            </div>

            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => handleCapture('selfie', e)}
              className="hidden"
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => selfieInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <Button
                onClick={() => {
                  if (selfieInputRef.current) {
                    selfieInputRef.current.setAttribute('capture', 'user');
                    selfieInputRef.current.click();
                  }
                }}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Selfie
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'id' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center">
              {selfieImage && (
                <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-green-500">
                  <img src={selfieImage} alt="Selfie" className="w-full h-full object-cover" />
                </div>
              )}
              <h4 className="font-medium text-foreground">Upload ID Photo</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Take a clear photo of your government-issued ID showing your date of birth
              </p>
            </div>

            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleCapture('id', e)}
              className="hidden"
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => idInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload ID
              </Button>
              <Button
                onClick={() => {
                  if (idInputRef.current) {
                    idInputRef.current.setAttribute('capture', 'environment');
                    idInputRef.current.click();
                  }
                }}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'verifying' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-8 text-center"
          >
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <h4 className="font-medium text-foreground">Verifying your identity...</h4>
            <p className="text-sm text-muted-foreground mt-1">
              This may take a few moments
            </p>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-8 text-center"
          >
            {verificationResult === 'success' ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="font-medium text-foreground">Verification Successful!</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Your age has been verified. Welcome to the platform!
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-destructive/20 rounded-full flex items-center justify-center">
                  <X className="w-8 h-8 text-destructive" />
                </div>
                <h4 className="font-medium text-foreground">Verification Failed</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  We could not verify your age. Please ensure your photos are clear and try again.
                </p>
                <Button onClick={resetVerification} className="mt-4">
                  Try Again
                </Button>
              </>
            )}
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};