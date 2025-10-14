import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Briefcase, Package, Users, Calendar, Building2, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CompanyData {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
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

interface CompanyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyData | null;
}

export const CompanyDetailsDialog = ({ open, onOpenChange, company }: CompanyDetailsDialogProps) => {
  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            {company.company_name || company.title || "Company Details"}
          </DialogTitle>
          <DialogDescription>
            <a href={company.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              {company.url} <ExternalLink className="w-3 h-3" />
            </a>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {company.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{company.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.industry && (
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Industry:</span>
                  <Badge variant="outline">{company.industry}</Badge>
                </div>
              )}
              {company.company_size && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Size:</span>
                  <span className="text-sm">{company.company_size}</span>
                </div>
              )}
              {company.founded_year && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Founded:</span>
                  <span className="text-sm">{company.founded_year}</span>
                </div>
              )}
            </div>

            <Separator />

            {company.emails && company.emails.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email Addresses ({company.emails.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {company.emails.map((email, idx) => (
                    <a
                      key={idx}
                      href={`mailto:${email}`}
                      className="text-sm bg-secondary hover:bg-secondary/80 px-3 py-1 rounded-md"
                    >
                      {email}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {company.phone_numbers && company.phone_numbers.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Phone Numbers ({company.phone_numbers.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {company.phone_numbers.map((phone, idx) => (
                    <a
                      key={idx}
                      href={`tel:${phone}`}
                      className="text-sm bg-secondary hover:bg-secondary/80 px-3 py-1 rounded-md"
                    >
                      {phone}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {company.addresses && company.addresses.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Addresses
                </h3>
                <div className="space-y-2">
                  {company.addresses.map((address, idx) => (
                    <p key={idx} className="text-sm bg-secondary px-3 py-2 rounded-md">
                      {address}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {company.hr_contacts && company.hr_contacts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  HR Contacts ({company.hr_contacts.length})
                </h3>
                <div className="space-y-2">
                  {company.hr_contacts.map((contact: any, idx: number) => (
                    <div key={idx} className="bg-secondary px-3 py-2 rounded-md">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-sm font-medium hover:underline">
                          {contact.email}
                        </a>
                      )}
                      {contact.position && (
                        <p className="text-xs text-muted-foreground mt-1">{contact.position}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {company.packages_pricing && company.packages_pricing.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Packages & Pricing ({company.packages_pricing.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {company.packages_pricing.map((pkg: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4 bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{pkg.name}</h4>
                        {pkg.price && <Badge variant="secondary">{pkg.price}</Badge>}
                      </div>
                      {pkg.features && pkg.features.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {pkg.features.map((feature: string, fidx: number) => (
                            <li key={fidx}>• {feature}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {company.services && company.services.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Services Offered ({company.services.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {company.services.slice(0, 15).map((service, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {service.length > 50 ? service.substring(0, 50) + '...' : service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {company.social_links && Object.keys(company.social_links).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Social Media</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(company.social_links).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm bg-secondary hover:bg-secondary/80 px-3 py-1 rounded-md capitalize flex items-center gap-1"
                    >
                      {platform} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
