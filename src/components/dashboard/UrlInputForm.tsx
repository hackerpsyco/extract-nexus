import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Globe, Loader2, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UrlInputFormProps {
  userId: string;
}

export const UrlInputForm = ({ userId }: UrlInputFormProps) => {
  const [url, setUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (urls: string[]) => {
    setIsLoading(true);
    try {
      // Validate and clean URLs
      const validUrls = urls
        .map(u => u.trim())
        .filter(u => {
          try {
            new URL(u);
            return true;
          } catch {
            return false;
          }
        });

      if (validUrls.length === 0) {
        throw new Error("No valid URLs provided");
      }

      if (validUrls.length !== urls.length) {
        toast({
          title: "Warning",
          description: `${urls.length - validUrls.length} invalid URLs were skipped.`,
          variant: "destructive",
        });
      }

      const jobs = validUrls.map((u) => ({
        user_id: userId,
        url: u,
        status: "pending",
      }));

      const { error } = await supabase.from("scraping_jobs").insert(jobs);

      if (error) throw error;

      // Trigger processing
      try {
        const { error: functionError } = await supabase.functions.invoke('process-scraping-jobs');
        if (functionError) {
          console.warn('Failed to trigger processing:', functionError);
          // Don't fail the whole operation, jobs will be processed eventually
        }
      } catch (processingError) {
        console.warn('Processing trigger failed:', processingError);
      }

      toast({
        title: "Jobs created!",
        description: `${jobs.length} scraping job(s) added to queue and processing started.`,
      });

      setUrl("");
      setBulkUrls("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      handleSubmit([url]);
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = bulkUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length > 0) {
      handleSubmit(urls);
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Start Scraping
        </CardTitle>
        <CardDescription>Enter URLs to extract data from websites</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single URL</TabsTrigger>
            <TabsTrigger value="bulk">Bulk URLs</TabsTrigger>
          </TabsList>
          <TabsContent value="single">
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Scraping
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="bulk">
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-urls">
                  <List className="w-4 h-4 inline mr-2" />
                  Bulk URLs (one per line)
                </Label>
                <Textarea
                  id="bulk-urls"
                  placeholder="https://example.com&#10;https://another-site.com&#10;https://third-site.com"
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  disabled={isLoading}
                  rows={6}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Bulk Scraping
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
