import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, X, ImageIcon } from 'lucide-react';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

interface CharacterGalleryProps {
  characterId: string;
  isOwner: boolean;
}

export const CharacterGallery = ({ characterId, isOwner }: CharacterGalleryProps) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [caption, setCaption] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchImages();
  }, [characterId]);

  const fetchImages = async () => {
    // First verify this is not an NPC character (extra safety check)
    const { data: charData } = await supabase
      .from('characters')
      .select('is_npc')
      .eq('id', characterId)
      .single();
    
    // Don't fetch gallery for NPC characters
    if (charData?.is_npc) {
      setImages([]);
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from('character_gallery')
      .select('*')
      .eq('character_id', characterId)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setImages(data);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${characterId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('character-gallery')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('character-gallery')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('character_gallery')
        .insert({
          character_id: characterId,
          image_url: publicUrl,
          caption: caption || null,
          sort_order: images.length,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Image uploaded',
        description: 'Your image has been added to the gallery',
      });

      setShowUploadDialog(false);
      setCaption('');
      fetchImages();
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    }

    setUploading(false);
  };

  const handleDelete = async (imageId: string) => {
    const { error } = await supabase
      .from('character_gallery')
      .delete()
      .eq('id', imageId);

    if (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete image',
        variant: 'destructive',
      });
      return;
    }

    setImages(images.filter(img => img.id !== imageId));
    setSelectedImage(null);
    toast({
      title: 'Image deleted',
      description: 'The image has been removed from the gallery',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Gallery Grid */}
      {images.length === 0 ? (
        <div className="py-12 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No gallery images yet</p>
          {isOwner && (
            <Button
              onClick={() => setShowUploadDialog(true)}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Image
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedImage(image)}
              >
                <img
                  src={image.image_url}
                  alt={image.caption || 'Gallery image'}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
            
            {isOwner && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: images.length * 0.05 }}
                onClick={() => setShowUploadDialog(true)}
                className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all"
              >
                <Plus className="w-6 h-6 text-muted-foreground" />
              </motion.button>
            )}
          </div>
        </>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background/95 backdrop-blur">
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.caption || 'Gallery image'}
                className="w-full max-h-[70vh] object-contain"
              />
              
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 p-2 bg-background/80 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              {isOwner && (
                <button
                  onClick={() => handleDelete(selectedImage.id)}
                  className="absolute top-2 left-2 p-2 bg-destructive/80 text-destructive-foreground rounded-full hover:bg-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {selectedImage.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent">
                  <p className="text-foreground text-sm">{selectedImage.caption}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Add Gallery Image</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="bg-input"
              />
            </div>
            
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Choose Image
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};