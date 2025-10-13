import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useJobProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processJobs = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-scraping-jobs');
      
      if (error) {
        throw error;
      }

      const result = data as { success: boolean; processed_jobs: number; results: any[] };
      
      if (result.success) {
        toast({
          title: 'Jobs processed successfully',
          description: `Processed ${result.processed_jobs} job(s)`,
        });
      } else {
        throw new Error('Processing failed');
      }

      return result;
    } catch (error: any) {
      console.error('Error processing jobs:', error);
      toast({
        title: 'Processing failed',
        description: error.message || 'Failed to process scraping jobs',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const checkPendingJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .select('id')
        .eq('status', 'pending');

      if (error) throw error;

      return data?.length || 0;
    } catch (error) {
      console.error('Error checking pending jobs:', error);
      return 0;
    }
  };

  return {
    processJobs,
    checkPendingJobs,
    isProcessing,
  };
};