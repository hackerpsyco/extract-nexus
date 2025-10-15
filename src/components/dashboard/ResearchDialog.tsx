import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Lightbulb, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Source {
  title: string;
  url: string;
  relevance: string;
}

interface ResearchResult {
  id: string;
  topic: string;
  research_summary: string;
  key_findings: string[];
  sources: Source[];
  full_analysis: string;
  created_at: string;
}

interface ResearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  research: ResearchResult | null;
}

export const ResearchDialog = ({ open, onOpenChange, research }: ResearchDialogProps) => {
  if (!research) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Deep Research: {research.topic}
          </DialogTitle>
          <DialogDescription>
            AI-powered comprehensive analysis • {new Date(research.created_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {research.research_summary}
                </p>
              </CardContent>
            </Card>

            {/* Key Findings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Key Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {research.key_findings.map((finding, index) => (
                    <li key={index} className="flex gap-3">
                      <Badge variant="outline" className="shrink-0">
                        {index + 1}
                      </Badge>
                      <span className="text-sm">{finding}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Full Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detailed Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {research.full_analysis}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sources */}
            {research.sources && research.sources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-primary" />
                    Sources & References
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {research.sources.map((source, index) => (
                      <div key={index} className="border-l-2 border-primary/20 pl-4">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline flex items-center gap-2"
                        >
                          {source.title}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-sm text-muted-foreground mt-1">
                          {source.relevance}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 break-all">
                          {source.url}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
