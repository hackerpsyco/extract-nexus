export interface ExtractedData {
  companyName?: string;
  emails: string[];
  phoneNumbers: string[];
  addresses: string[];
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  hrContacts: Array<{
    name?: string;
    email?: string;
    phone?: string;
    position?: string;
  }>;
  packagesPricing: Array<{
    name?: string;
    price?: string;
    features?: string[];
    duration?: string;
  }>;
  services: string[];
  industry?: string;
  companySize?: string;
  foundedYear?: string;
}

export function extractCompanyData(content: string, url: string, metadata?: any): ExtractedData {
  const data: ExtractedData = {
    emails: [],
    phoneNumbers: [],
    addresses: [],
    socialLinks: {},
    hrContacts: [],
    packagesPricing: [],
    services: [],
  };

  if (!content) return data;

  data.companyName = extractCompanyName(content, url, metadata);
  data.emails = extractEmails(content);
  data.phoneNumbers = extractPhoneNumbers(content);
  data.addresses = extractAddresses(content);
  data.socialLinks = extractSocialLinks(content);
  data.hrContacts = extractHRContacts(content, data.emails);
  data.packagesPricing = extractPackagesPricing(content);
  data.services = extractServices(content);
  data.industry = extractIndustry(content);
  data.companySize = extractCompanySize(content);
  data.foundedYear = extractFoundedYear(content);

  return data;
}

function extractCompanyName(content: string, url: string, metadata?: any): string {
  if (metadata?.ogSiteName) return metadata.ogSiteName;
  if (metadata?.title) {
    const title = metadata.title.split('|')[0].split('-')[0].trim();
    return title;
  }

  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    return lines[0].trim().substring(0, 100);
  }

  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch {
    return 'Unknown Company';
  }
}

function extractEmails(content: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = content.match(emailRegex) || [];

  const filtered = emails
    .filter(email => {
      const domain = email.split('@')[1];
      return !domain.includes('example.com') &&
             !domain.includes('sentry.io') &&
             !domain.includes('wixpress.com');
    })
    .filter((email, index, self) => self.indexOf(email) === index);

  return filtered.slice(0, 20);
}

function extractPhoneNumbers(content: string): string[] {
  const phoneRegex = /(\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}|\+?\d{10,15}/g;
  const phones = content.match(phoneRegex) || [];

  const filtered = phones
    .filter(phone => phone.replace(/\D/g, '').length >= 10)
    .filter((phone, index, self) => self.indexOf(phone) === index);

  return filtered.slice(0, 10);
}

function extractAddresses(content: string): string[] {
  const addresses: string[] = [];

  const addressPatterns = [
    /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way)[,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}\s+\d{5}/gi,
    /[A-Z][a-z]+\s+[A-Z][a-z]+[,\s]+\d+[,\s]+[A-Za-z\s]+[,\s]+[A-Za-z\s]+[-\s]\d{6}/gi,
  ];

  for (const pattern of addressPatterns) {
    const matches = content.match(pattern) || [];
    addresses.push(...matches);
  }

  return addresses
    .filter((addr, index, self) => self.indexOf(addr) === index)
    .slice(0, 5);
}

function extractSocialLinks(content: string): ExtractedData['socialLinks'] {
  const links: ExtractedData['socialLinks'] = {};

  const patterns = {
    linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9-]+/gi,
    twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/gi,
    facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+/gi,
    instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._]+/gi,
    youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c|channel|user)\/[a-zA-Z0-9_-]+/gi,
  };

  for (const [platform, pattern] of Object.entries(patterns)) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      links[platform as keyof typeof links] = matches[0];
    }
  }

  return links;
}

function extractHRContacts(content: string, emails: string[]): ExtractedData['hrContacts'] {
  const hrContacts: ExtractedData['hrContacts'] = [];

  const hrKeywords = ['hr', 'human resource', 'recruiter', 'recruitment', 'talent', 'hiring', 'careers'];
  const lines = content.toLowerCase().split('\n');

  const hrEmails = emails.filter(email =>
    hrKeywords.some(keyword => email.toLowerCase().includes(keyword))
  );

  for (const email of hrEmails) {
    hrContacts.push({
      email: email,
      position: 'HR Contact'
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (hrKeywords.some(keyword => line.includes(keyword))) {
      const emailInContext = emails.find(email =>
        content.toLowerCase().indexOf(email.toLowerCase()) > content.toLowerCase().indexOf(line) - 200 &&
        content.toLowerCase().indexOf(email.toLowerCase()) < content.toLowerCase().indexOf(line) + 200
      );

      if (emailInContext && !hrContacts.find(c => c.email === emailInContext)) {
        hrContacts.push({
          email: emailInContext,
          position: 'HR/Recruitment'
        });
      }
    }
  }

  return hrContacts.slice(0, 10);
}

function extractPackagesPricing(content: string): ExtractedData['packagesPricing'] {
  const packages: ExtractedData['packagesPricing'] = [];

  const priceRegex = /\$\d+(?:,\d{3})*(?:\.\d{2})?|\₹\d+(?:,\d{2,3})*(?:\.\d{2})?|€\d+(?:,\d{3})*(?:\.\d{2})?|£\d+(?:,\d{3})*(?:\.\d{2})?/g;
  const prices = content.match(priceRegex) || [];

  const packageKeywords = ['plan', 'package', 'pricing', 'tier', 'subscription', 'basic', 'premium', 'enterprise', 'starter', 'professional'];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length && packages.length < 10; i++) {
    const line = lines[i].toLowerCase();

    if (packageKeywords.some(keyword => line.includes(keyword))) {
      const pricesInLine = lines[i].match(priceRegex);
      if (pricesInLine) {
        const features: string[] = [];
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].trim().length > 0 && lines[j].trim().length < 100) {
            features.push(lines[j].trim());
          }
        }

        packages.push({
          name: lines[i].trim().substring(0, 100),
          price: pricesInLine[0],
          features: features.slice(0, 5)
        });
      }
    }
  }

  return packages;
}

function extractServices(content: string): string[] {
  const services: string[] = [];

  const serviceKeywords = [
    'service', 'solution', 'product', 'offering', 'consulting', 'development',
    'design', 'marketing', 'support', 'training', 'implementation', 'integration'
  ];

  const lines = content.toLowerCase().split('\n');

  for (const line of lines) {
    if (serviceKeywords.some(keyword => line.includes(keyword)) && line.length < 150) {
      const cleaned = line.trim().replace(/[•\-\*]\s*/, '');
      if (cleaned.length > 10) {
        services.push(cleaned);
      }
    }
  }

  return services
    .filter((service, index, self) => self.indexOf(service) === index)
    .slice(0, 20);
}

function extractIndustry(content: string): string | undefined {
  const industries = [
    'technology', 'software', 'healthcare', 'finance', 'education', 'retail',
    'manufacturing', 'consulting', 'real estate', 'hospitality', 'logistics',
    'entertainment', 'automotive', 'energy', 'telecommunications', 'construction'
  ];

  const contentLower = content.toLowerCase();

  for (const industry of industries) {
    if (contentLower.includes(industry)) {
      return industry.charAt(0).toUpperCase() + industry.slice(1);
    }
  }

  return undefined;
}

function extractCompanySize(content: string): string | undefined {
  const sizePatterns = [
    /(\d+[\s-]+\d+)\s+employees/i,
    /team\s+of\s+(\d+)/i,
    /(\d+)\+\s+employees/i,
    /small business|startup/i,
    /enterprise|large company/i,
    /mid-size|medium business/i
  ];

  for (const pattern of sizePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

function extractFoundedYear(content: string): string | undefined {
  const yearPattern = /(?:founded|established|since)\s+(?:in\s+)?(\d{4})/i;
  const match = content.match(yearPattern);

  if (match && match[1]) {
    const year = parseInt(match[1]);
    if (year >= 1800 && year <= new Date().getFullYear()) {
      return match[1];
    }
  }

  return undefined;
}