import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useJobProcessor = (userId: string) => {
  const processingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const processPendingJobs = async () => {
    if (processingRef.current) return;

    try {
      processingRef.current = true;

      const { data: pendingJobs, error } = await supabase
        .from('scraping_jobs')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .limit(1);

      if (error) throw error;

      if (pendingJobs && pendingJobs.length > 0) {
        const { error: functionError } = await supabase.functions.invoke('process-scraping-jobs');

        if (functionError) {
          console.warn('Failed to trigger job processing:', functionError);
        }
      }
    } catch (error) {
      console.error('Error in auto job processor:', error);
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => {
    processPendingJobs();

    intervalRef.current = setInterval(() => {
      processPendingJobs();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId]);

  return { processPendingJobs };
};
