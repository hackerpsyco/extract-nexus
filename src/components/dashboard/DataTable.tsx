import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Download, Search, ExternalLink, FileSpreadsheet, Eye, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CompanyDetailsDialog } from "./CompanyDetailsDialog";
import { Badge } from "@/components/ui/badge";
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
  company_name: string | null;
  emails: string[] | null;
  phone_numbers: string[] | null;
  addresses: string[] | null;
  social_links: any;
  hr_contacts: any[] | null;
  packages_pricing: any[] | null;
  services: string[] | null;
  industry: string | null;
  company_size: string | null;
  founded_year: string | null;
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
  const [selectedCompany, setSelectedCompany] = useState<ScrapedData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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
      "Company Name",
      "URL",
      "Industry",
      "Company Size",
      "Founded Year",
      "Emails",
      "Phone Numbers",
      "Addresses",
      "HR Contacts",
      "Packages/Pricing",
      "Services",
      "LinkedIn",
      "Date Scraped"
    ];
    
    const csvContent = [
      headers.join(","),
      ...filteredData.map((item) => {
        const emails = item.emails?.join('; ') || '';
        const phones = item.phone_numbers?.join('; ') || '';
        const addresses = item.addresses?.join('; ') || '';
        const hrContacts = item.hr_contacts?.map((c: any) => c.email || '').join('; ') || '';
        const packages = item.packages_pricing?.map((p: any) => `${p.name}: ${p.price}`).join('; ') || '';
        const services = item.services?.slice(0, 5).join('; ') || '';
        const linkedin = item.social_links?.linkedin || '';

        return [
          `"${(item.company_name || item.title || '').replace(/"/g, '""')}"`,
          `"${item.url}"`,
          `"${item.industry || ''}"`,
          `"${item.company_size || ''}"`,
          `"${item.founded_year || ''}"`,
          `"${emails.replace(/"/g, '""')}"`,
          `"${phones.replace(/"/g, '""')}"`,
          `"${addresses.replace(/"/g, '""')}"`,
          `"${hrContacts.replace(/"/g, '""')}"`,
          `"${packages.replace(/"/g, '""')}"`,
          `"${services.replace(/"/g, '""')}"`,
          `"${linkedin}"`,
          new Date(item.created_at).toLocaleDateString()
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
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>HR Contacts</TableHead>
                  <TableHead>Packages</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold">{item.company_name || item.title || "N/A"}</p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {new URL(item.url).hostname}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.industry ? (
                        <Badge variant="secondary">{item.industry}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.emails && item.emails.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Mail className="w-3 h-3 mr-1" />
                            {item.emails.length}
                          </Badge>
                        )}
                        {item.phone_numbers && item.phone_numbers.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Phone className="w-3 h-3 mr-1" />
                            {item.phone_numbers.length}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.hr_contacts && item.hr_contacts.length > 0 ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {item.hr_contacts.length} HR
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.packages_pricing && item.packages_pricing.length > 0 ? (
                        <Badge variant="outline">{item.packages_pricing.length}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCompany(item);
                          setDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CompanyDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        company={selectedCompany}
      />
    </Card>
  );
};
