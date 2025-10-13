-- Create function to trigger job processing
CREATE OR REPLACE FUNCTION public.trigger_job_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for new pending jobs
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
    -- Use pg_notify to signal that new jobs are available
    PERFORM pg_notify('new_scraping_jobs', json_build_object(
      'job_id', NEW.id,
      'user_id', NEW.user_id,
      'url', NEW.url
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new jobs
DROP TRIGGER IF EXISTS trigger_new_scraping_jobs ON public.scraping_jobs;
CREATE TRIGGER trigger_new_scraping_jobs
  AFTER INSERT OR UPDATE ON public.scraping_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_job_processing();

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status_created ON public.scraping_jobs(status, created_at);

-- Add function to get job statistics
CREATE OR REPLACE FUNCTION public.get_user_job_stats(user_uuid UUID)
RETURNS TABLE (
  total_jobs BIGINT,
  pending_jobs BIGINT,
  running_jobs BIGINT,
  completed_jobs BIGINT,
  failed_jobs BIGINT,
  total_pages_scraped BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
    COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
    COALESCE(SUM(scraped_pages), 0) as total_pages_scraped
  FROM public.scraping_jobs 
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_job_stats(UUID) TO authenticated;