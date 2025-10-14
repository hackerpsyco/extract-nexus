-- Create function to get user job statistics
CREATE OR REPLACE FUNCTION get_user_job_stats(p_user_id uuid)
RETURNS TABLE (
  total_jobs bigint,
  completed_jobs bigint,
  pending_jobs bigint,
  running_jobs bigint,
  failed_jobs bigint,
  total_pages_scraped bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
    COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
    COALESCE(SUM(scraped_pages), 0) as total_pages_scraped
  FROM scraping_jobs
  WHERE user_id = p_user_id;
END;
$$;