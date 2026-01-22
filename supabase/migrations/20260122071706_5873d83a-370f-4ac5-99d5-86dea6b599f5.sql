-- Create table for OC showcase submissions
CREATE TABLE public.oc_showcase (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  average_rating NUMERIC(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  UNIQUE(character_id) -- Each character can only be showcased once
);

-- Create table for OC ratings
CREATE TABLE public.oc_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  showcase_id UUID NOT NULL REFERENCES public.oc_showcase(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(showcase_id, user_id) -- Each user can only rate once per showcase
);

-- Create table for OC comments
CREATE TABLE public.oc_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  showcase_id UUID NOT NULL REFERENCES public.oc_showcase(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oc_showcase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oc_showcase
CREATE POLICY "Anyone authenticated can view showcases"
ON public.oc_showcase FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own showcases"
ON public.oc_showcase FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own showcases"
ON public.oc_showcase FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own showcases"
ON public.oc_showcase FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for oc_ratings
CREATE POLICY "Anyone authenticated can view ratings"
ON public.oc_ratings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create ratings"
ON public.oc_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON public.oc_ratings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON public.oc_ratings FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for oc_comments
CREATE POLICY "Anyone authenticated can view comments"
ON public.oc_comments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create comments"
ON public.oc_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.oc_comments FOR DELETE
USING (auth.uid() = user_id);

-- Function to update showcase stats when a rating is added/updated/deleted
CREATE OR REPLACE FUNCTION update_showcase_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.oc_showcase
    SET 
      average_rating = COALESCE((SELECT AVG(rating)::NUMERIC(2,1) FROM public.oc_ratings WHERE showcase_id = OLD.showcase_id), 0),
      rating_count = (SELECT COUNT(*) FROM public.oc_ratings WHERE showcase_id = OLD.showcase_id),
      updated_at = now()
    WHERE id = OLD.showcase_id;
    RETURN OLD;
  ELSE
    UPDATE public.oc_showcase
    SET 
      average_rating = COALESCE((SELECT AVG(rating)::NUMERIC(2,1) FROM public.oc_ratings WHERE showcase_id = NEW.showcase_id), 0),
      rating_count = (SELECT COUNT(*) FROM public.oc_ratings WHERE showcase_id = NEW.showcase_id),
      updated_at = now()
    WHERE id = NEW.showcase_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for rating stats
CREATE TRIGGER update_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON public.oc_ratings
FOR EACH ROW EXECUTE FUNCTION update_showcase_rating_stats();

-- Function to update comment count
CREATE OR REPLACE FUNCTION update_showcase_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.oc_showcase
    SET comment_count = (SELECT COUNT(*) FROM public.oc_comments WHERE showcase_id = OLD.showcase_id),
        updated_at = now()
    WHERE id = OLD.showcase_id;
    RETURN OLD;
  ELSE
    UPDATE public.oc_showcase
    SET comment_count = (SELECT COUNT(*) FROM public.oc_comments WHERE showcase_id = NEW.showcase_id),
        updated_at = now()
    WHERE id = NEW.showcase_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment count
CREATE TRIGGER update_comment_count
AFTER INSERT OR DELETE ON public.oc_comments
FOR EACH ROW EXECUTE FUNCTION update_showcase_comment_count();

-- Enable realtime for showcase
ALTER PUBLICATION supabase_realtime ADD TABLE public.oc_showcase;
ALTER PUBLICATION supabase_realtime ADD TABLE public.oc_comments;