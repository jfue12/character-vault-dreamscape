-- Fix function search path for update_showcase_rating_stats
CREATE OR REPLACE FUNCTION public.update_showcase_rating_stats()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix function search path for update_showcase_comment_count
CREATE OR REPLACE FUNCTION public.update_showcase_comment_count()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;