import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { UserPlus, ArrowLeft, Save, Info, Building2, Users } from "lucide-react";

export default function StudentCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", enrollment_number: "", gender: "", school: "", class_section: "" });
  const [classes, setClasses] = useState<{ id: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const schools = [
    { id: "1", name: "Delhi Public School" },
    { id: "2", name: "Kendriya Vidyalaya" },
  ];

  const mockClasses: Record<string, { id: string; display_name: string }[]> = {
    "1": [{ id: "c1", display_name: "5A" }, { id: "c2", display_name: "5B" }, { id: "c3", display_name: "6A" }],
    "2": [{ id: "c4", display_name: "4A" }, { id: "c5", display_name: "4B" }],
  };

  const handleSchoolChange = (schoolId: string) => {
    setForm({ ...form, school: schoolId, class_section: "" });
    setClasses(mockClasses[schoolId] || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.enrollment_number || !form.gender || !form.school || !form.class_section) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success(`Student ${form.full_name} created!`);
      navigate("/students");
      setLoading(false);
    }, 500);
  };

  return (
    <div>
      <nav className="text-xs text-muted-foreground mb-3 flex items-center gap-1 font-medium">
        <Link to="/students" className="hover:text-primary transition-colors">Students</Link>
        <span className="mx-1">/</span>
        <span className="text-foreground font-semibold">Add New</span>
      </nav>

      <div className="mb-5">
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-success" />
          </div>
          Add New Student
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Create a new student record and enroll in a class</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="elevated-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30 text-xs font-bold uppercase tracking-wide text-muted-foreground">Student Information</div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Full Name <span className="text-destructive">*</span></label>
                  <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 transition-all" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Enrollment No. <span className="text-destructive">*</span></label>
                  <input type="text" value={form.enrollment_number} onChange={(e) => setForm({ ...form, enrollment_number: e.target.value })} className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 transition-all" required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Gender <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ v: "M", l: "♂ Male" }, { v: "F", l: "♀ Female" }, { v: "O", l: "Other" }].map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => setForm({ ...form, gender: g.v })}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all active:scale-[0.98] ${
                        form.gender === g.v ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-muted"
                      }`}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <h6 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Class Assignment</h6>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">School <span className="text-destructive">*</span></label>
                    <select value={form.school} onChange={(e) => handleSchoolChange(e.target.value)} className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 transition-all" required>
                      <option value="">Select School</option>
                      {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Class <span className="text-destructive">*</span></label>
                    <select value={form.class_section} onChange={(e) => setForm({ ...form, class_section: e.target.value })} className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 transition-all" disabled={!form.school} required>
                      <option value="">{form.school ? "Select Class" : "Select School First"}</option>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Link to="/students" className="px-4 py-2.5 border border-input rounded-xl text-xs font-medium hover:bg-accent flex items-center gap-1.5 transition-colors active:scale-[0.98]">
                  <ArrowLeft className="w-3.5 h-3.5" />Cancel
                </Link>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-success text-success-foreground rounded-xl text-xs font-bold hover:shadow-md transition-all flex items-center gap-1.5 active:scale-[0.98]">
                  <Save className="w-3.5 h-3.5" />{loading ? "Creating..." : "Create Student"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="elevated-card overflow-hidden h-fit">
          <div className="px-5 py-3 border-b border-border bg-muted/30 text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-info" /> Help
          </div>
          <div className="p-5">
            <div className="bg-info/10 border border-info/20 rounded-xl p-4 text-sm">
              <h6 className="font-bold text-xs mb-2">Tips</h6>
              <ul className="list-disc list-inside space-y-1 text-[10px] text-muted-foreground">
                <li>Fill all fields marked with <span className="text-destructive font-bold">*</span></li>
                <li>Enrollment number must be unique</li>
                <li>Select school before choosing class</li>
              </ul>
            </div>
            <div className="mt-4 space-y-2">
              <Link to="/students" className="block text-center py-2.5 border border-primary/20 text-primary rounded-xl text-xs font-bold hover:bg-primary/5 transition-colors">
                <Users className="w-3.5 h-3.5 inline mr-1" />View Students
              </Link>
              <Link to="/schools" className="block text-center py-2.5 border border-input rounded-xl text-xs font-medium hover:bg-accent transition-colors">
                <Building2 className="w-3.5 h-3.5 inline mr-1" />My Schools
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
