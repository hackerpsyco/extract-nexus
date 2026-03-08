import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function StudentImportPage() {
  const { classId } = useParams();
  const [file, setFile] = useState<File | null>(null);

  const handleImport = () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }
    toast.success("Students imported successfully!");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-1">Import Students</h2>
      <p className="text-sm text-muted-foreground mb-6">Class 5A</p>

      <div className="bg-card rounded-xl border p-5 mb-4">
        {/* Download Sample */}
        <div className="bg-info/10 border border-info/30 rounded-lg p-4 mb-5">
          <p className="text-sm mb-3">
            <strong>Need help?</strong> Download a sample CSV file to see the required format.
          </p>
          <button className="px-4 py-2 bg-info text-info-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2">
            <Download className="w-4 h-4" />Download Sample CSV
          </button>
        </div>

        {/* Upload Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select CSV or Excel File</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                file ? "border-success bg-success/5" : "border-border hover:border-primary"
              }`}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div>
                  <FileSpreadsheet className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select file</p>
                  <p className="text-xs text-muted-foreground mt-1">Supported: CSV, XLSX, XLS</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleImport} className="px-6 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:opacity-90">
              ✓ Import Students
            </button>
            <Link to="/students" className="px-6 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-accent">
              ✕ Cancel
            </Link>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-muted/50 rounded-xl p-5">
        <h3 className="font-semibold mb-3">📋 Import Instructions</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li><strong>Required Columns:</strong> enrollment_number, full_name, gender, start_date</li>
          <li><strong>Gender Values:</strong> M or F</li>
          <li><strong>Date Format:</strong> YYYY-MM-DD (e.g., 2026-01-12)</li>
          <li><strong>Duplicates:</strong> Students with existing enrollment_number will be skipped</li>
          <li><strong>Empty Rows:</strong> Rows with missing required fields will be skipped</li>
        </ul>
      </div>
    </div>
  );
}
