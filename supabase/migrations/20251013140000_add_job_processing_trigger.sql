-- Create function to trigger job processing
CREATE OR REPLACE FUNCTION public.trigger_job_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for new pending jobs
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
    -- Call the edge function to process jobs (async)
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/auto-process-jobs',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after insert or update on scraping_jobs
CREATE OR REPLACE TRIGGER trigger_process_scraping_jobs
  AFTER INSERT OR UPDATE ON public.scraping_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_job_processing();

-- Add configuration settings (these will need to be set manually)
-- ALTER DATABASE postgres SET app.supabase_url = 'your-supabase-url';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status_created ON public.scraping_jobs(status, created_at);

-- Add function to manually trigger job processing
CREATE OR REPLACE FUNCTION public.process_pending_jobs()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-scraping-jobs',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;