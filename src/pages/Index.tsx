import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, Globe, Zap, Shield, BarChart3, Download } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Globe,
      title: "Multi-Site Scraping",
      description: "Extract data from multiple websites simultaneously with intelligent crawling",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process thousands of pages quickly with our optimized scraping engine",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and stored securely with enterprise-grade protection",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Monitor your scraping jobs with live updates and detailed statistics",
    },
    {
      icon: Database,
      title: "Structured Data",
      description: "Automatically organize extracted data with smart pattern recognition",
    },
    {
      icon: Download,
      title: "Easy Export",
      description: "Export your data in CSV, JSON, or Excel format with one click",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="container relative mx-auto px-4 py-24 text-center">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary border border-primary/20">
              <Database className="w-4 h-4" />
              <span>Professional Web Intelligence Platform</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Intelligent Web Data
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                {" "}Collection Platform
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Extract, organize, and analyze data from any website with DataIntel's powerful scraping
              engine. Built for companies, researchers, and data professionals.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="shadow-lg shadow-primary/30">
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/dashboard")}>
                View Dashboard
              </Button>
            </div>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                <span>Fast</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-accent" />
                <span>Scalable</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need for Web Data Collection</h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed for professional data extraction and analysis
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
            <div className="relative px-6 py-16 text-center sm:px-12 lg:px-16">
              <h2 className="text-3xl font-bold mb-4">Ready to Start Collecting Data?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of professionals using DataIntel for their web data intelligence needs
              </p>
              <Button size="lg" onClick={() => navigate("/auth")} className="shadow-lg shadow-primary/30">
                Start Your Free Trial
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">DataIntel</span>
          </div>
          <p>© 2025 DataIntel. Professional Web Intelligence Platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
