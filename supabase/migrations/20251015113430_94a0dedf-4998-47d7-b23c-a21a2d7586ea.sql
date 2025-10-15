-- Create research_results table to store AI research
CREATE TABLE IF NOT EXISTS public.research_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scraped_data_id UUID REFERENCES public.scraped_data(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  research_summary TEXT,
  key_findings TEXT[],
  sources JSONB,
  full_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.research_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own research"
ON public.research_results
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own research"
ON public.research_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research"
ON public.research_results
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research"
ON public.research_results
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_research_results_updated_at
BEFORE UPDATE ON public.research_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_research_results_user_id ON public.research_results(user_id);
CREATE INDEX idx_research_results_scraped_data_id ON public.research_results(scraped_data_id);