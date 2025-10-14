import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Download, Search, ExternalLink, FileSpreadsheet, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ScrapedData {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  content: string | null;
  created_at: string;
}

interface DataTableProps {
  userId: string;
}

export const DataTable = ({ userId }: DataTableProps) => {
  const [data, setData] = useState<ScrapedData[]>([]);
  const [filteredData, setFilteredData] = useState<ScrapedData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data: scrapedData, error } = await supabase
      .from("scraped_data")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } else {
      setData(scrapedData || []);
      setFilteredData(scrapedData || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("data-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scraped_data", filter: `user_id=eq.${userId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const filtered = data.filter(
      (item) =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, data]);

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    // Enhanced CSV export with more company-relevant fields
    const headers = [
      "URL", 
      "Title", 
      "Description", 
      "Content Preview", 
      "Date Scraped",
      "Domain",
      "Content Length",
      "Has Contact Info",
      "Has About Section"
    ];
    
    const csvContent = [
      headers.join(","),
      ...filteredData.map((item) => {
        const domain = new URL(item.url).hostname;
        const contentPreview = item.content 
          ? item.content.substring(0, 200).replace(/"/g, '""').replace(/\n/g, ' ')
          : "";
        const hasContactInfo = item.content 
          ? /contact|email|phone|address/i.test(item.content)
          : false;
        const hasAboutSection = item.content 
          ? /about|company|mission|vision|history/i.test(item.content)
          : false;
        
        return [
          `"${item.url}"`,
          `"${(item.title || "").replace(/"/g, '""')}"`,
          `"${(item.description || "").replace(/"/g, '""')}"`,
          `"${contentPreview}"`,
          new Date(item.created_at).toLocaleDateString(),
          `"${domain}"`,
          item.content?.length || 0,
          hasContactInfo ? "Yes" : "No",
          hasAboutSection ? "Yes" : "No"
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `company-data-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({ 
      title: "Export successful", 
      description: `${filteredData.length} records exported to CSV` 
    });
  };

  const exportToJSON = () => {
    if (filteredData.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const jsonContent = JSON.stringify(filteredData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `company-data-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({ title: "Export successful", description: "JSON file downloaded" });
  };

  const exportToGoogleSheets = async () => {
    if (filteredData.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('export-to-google-sheets', {
        body: {
          user_id: userId,
          search_term: searchTerm
        }
      });

      if (error) throw error;

      if (data?.success) {
        // If the backend provided a direct Google Sheets URL, open it
        if (data.sheetUrl) {
          window.open(data.sheetUrl, '_blank');
          toast({ title: 'Exported to Google Sheets', description: 'Your sheet has been updated.' });
          return;
        }

        // Fallback: create a CSV for manual import
        const csvContent = [
          data.data.headers.join(","),
          ...data.data.preview.map((row: any[]) => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          ),
          ...filteredData.slice(5).map((item) => {
            const domain = new URL(item.url).hostname;
            const contentPreview = item.content 
              ? item.content.substring(0, 200).replace(/\"/g, '""').replace(/\n/g, ' ')
              : "";
            const hasContactInfo = item.content 
              ? /contact|email|phone|address/i.test(item.content)
              : false;
            const hasAboutSection = item.content 
              ? /about|company|mission|vision|history/i.test(item.content)
              : false;
            
            return [
              `"${item.url}"`,
              `"${(item.title || "").replace(/\"/g, '""')}"`,
              `"${(item.description || "").replace(/\"/g, '""')}"`,
              `"${contentPreview}"`,
              new Date(item.created_at).toLocaleDateString(),
              `"${domain}"`,
              item.content?.length || 0,
              hasContactInfo ? "Yes" : "No",
              hasAboutSection ? "Yes" : "No"
            ].join(",");
          })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `google-sheets-import-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({ 
          title: "Google Sheets export ready", 
          description: "CSV file downloaded. Import it to Google Sheets manually for now." 
        });
      }
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportShareableCsvLink = async () => {
    if (filteredData.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    try {
      const headers = [
        "URL", 
        "Title", 
        "Description", 
        "Content Preview", 
        "Date Scraped",
        "Domain",
        "Content Length",
        "Has Contact Info",
        "Has About Section"
      ];

      const csvContent = [
        headers.join(","),
        ...filteredData.map((item) => {
          const domain = new URL(item.url).hostname;
          const contentPreview = item.content 
            ? item.content.substring(0, 200).replace(/"/g, '""').replace(/\n/g, ' ')
            : "";
          const hasContactInfo = item.content 
            ? /contact|email|phone|address/i.test(item.content)
            : false;
          const hasAboutSection = item.content 
            ? /about|company|mission|vision|history/i.test(item.content)
            : false;
          
          return [
            `"${item.url}"`,
            `"${(item.title || "").replace(/"/g, '""')}"`,
            `"${(item.description || "").replace(/"/g, '""')}"`,
            `"${contentPreview}"`,
            new Date(item.created_at).toLocaleDateString(),
            `"${domain}"`,
            item.content?.length || 0,
            hasContactInfo ? "Yes" : "No",
            hasAboutSection ? "Yes" : "No"
          ].join(",");
        })
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const filePath = `exports/${userId}/${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

      const { error: uploadError } = await supabase.storage
        .from('exports')
        .upload(filePath, blob, { contentType: 'text/csv', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('exports')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      await navigator.clipboard.writeText(publicUrl);
      toast({ title: 'Shareable link copied', description: 'CSV link copied to clipboard.' });
      
      // Also open in new tab for convenience
      window.open(publicUrl, '_blank');
    } catch (error: any) {
      console.error('CSV share link error:', error);
      toast({ title: 'Share failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Scraped Data
            </CardTitle>
            <CardDescription>
              {filteredData.length} of {data.length} records
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportToJSON}>
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={exportToGoogleSheets}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Google Sheets
            </Button>
            <Button variant="outline" size="sm" onClick={exportShareableCsvLink}>
              <Link2 className="w-4 h-4 mr-2" />
              Share CSV Link
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, description, or URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading data...</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {data.length === 0
              ? "No data yet. Complete a scraping job to see results!"
              : "No results found for your search."}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {item.title || "N/A"}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {item.description || "N/A"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="max-w-xs truncate">{item.url}</span>
                      </a>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
