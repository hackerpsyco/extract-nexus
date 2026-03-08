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
      toast.success(`Student ${form.full_name} created successfully!`);
      navigate("/students");
      setLoading(false);
    }, 500);
  };

  return (
    <div>
      <nav className="text-xs text-muted-foreground mb-2">
        <Link to="/students" className="hover:text-primary">Students</Link>
        <span className="mx-2">/</span>
        <span>Add New Student</span>
      </nav>

      <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
        <UserPlus className="w-6 h-6" />
        Add New Student
      </h2>
      <p className="text-muted-foreground text-sm mb-6">Create a new student record and enroll them in a class</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30 font-semibold text-sm">Student Information</div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name <span className="text-destructive">*</span></label>
                  <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Enrollment Number <span className="text-destructive">*</span></label>
                  <input type="text" value={form.enrollment_number} onChange={(e) => setForm({ ...form, enrollment_number: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" required />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Gender <span className="text-destructive">*</span></label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" required>
                    <option value="">Select Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>

              <hr className="my-4 border-border" />
              <h6 className="font-semibold text-sm mb-3">Class Assignment</h6>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">School <span className="text-destructive">*</span></label>
                  <select value={form.school} onChange={(e) => handleSchoolChange(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" required>
                    <option value="">Select School</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Class Section <span className="text-destructive">*</span></label>
                  <select value={form.class_section} onChange={(e) => setForm({ ...form, class_section: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" disabled={!form.school} required>
                    <option value="">{form.school ? "Select Class" : "Select School First"}</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Link to="/students" className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" />Cancel
                </Link>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1">
                  <Save className="w-4 h-4" />{loading ? "Creating..." : "Create Student"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden h-fit">
          <div className="px-5 py-3 border-b border-border bg-muted/30 font-semibold text-sm"><Info className="w-4 h-4 inline mr-1" />Instructions</div>
          <div className="p-5">
            <div className="bg-info/10 border border-info/30 rounded-lg p-4 text-sm">
              <h6 className="font-semibold mb-2">Creating a New Student</h6>
              <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                <li>Fill in all required fields marked with <span className="text-destructive">*</span></li>
                <li>Enrollment number must be unique</li>
                <li>Select the school and class for enrollment</li>
                <li>You can only assign students to your schools</li>
              </ul>
            </div>
            <div className="mt-4 space-y-2">
              <Link to="/students" className="block text-center px-3 py-2 border border-primary/30 text-primary rounded-lg text-sm hover:bg-primary/10">
                <Users className="w-4 h-4 inline mr-1" />View All Students
              </Link>
              <Link to="/schools" className="block text-center px-3 py-2 border border-border rounded-lg text-sm hover:bg-accent">
                <Building2 className="w-4 h-4 inline mr-1" />View My Schools
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
