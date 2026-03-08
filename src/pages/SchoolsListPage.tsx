import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, MapPin, Users, BookOpen, Eye, Info } from "lucide-react";

const mockSchools = [
  { school: { id: "1", name: "Delhi Public School", block: "Rohini", district: "North Delhi", udise: "0912345" }, enrollment_count: 85, class_count: 4 },
  { school: { id: "2", name: "Kendriya Vidyalaya", block: "Dwarka", district: "South West Delhi", udise: "0912346" }, enrollment_count: 62, class_count: 3 },
  { school: { id: "3", name: "Government Senior Secondary", block: "Karol Bagh", district: "Central Delhi", udise: "0912347" }, enrollment_count: 45, class_count: 2 },
];

export default function SchoolsListPage() {
  const schools = mockSchools;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          My Assigned Schools
        </h2>
      </div>

      <p className="text-muted-foreground text-sm mb-4">
        <Info className="w-4 h-4 inline mr-1" />
        {schools.length} school{schools.length !== 1 ? "s" : ""} assigned
      </p>

      {schools.length === 0 ? (
        <div className="bg-info/10 border border-info/30 rounded-lg p-6 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-info" />
          <p className="font-medium">No schools assigned</p>
          <p className="text-sm text-muted-foreground">Contact your administrator to assign schools.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((item, i) => (
            <motion.div
              key={item.school.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {item.school.name}
                  </h5>
                  <span className="px-2 py-0.5 bg-success/10 text-success text-xs rounded-full font-medium">Active</span>
                </div>
                <p className="text-muted-foreground text-sm mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {item.school.block}, {item.school.district}
                </p>
                <p className="text-muted-foreground text-sm mb-4">UDISE: {item.school.udise}</p>

                <div className="grid grid-cols-2 text-center gap-2 mb-3">
                  <div className="border-r border-border">
                    <div className="text-primary font-bold text-lg">{item.enrollment_count}</div>
                    <div className="text-xs text-muted-foreground">Students</div>
                  </div>
                  <div>
                    <div className="text-success font-bold text-lg">{item.class_count}</div>
                    <div className="text-xs text-muted-foreground">Classes</div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-border bg-muted/30 flex gap-2">
                <Link to={`/schools/${item.school.id}`} className="flex-1 text-center px-3 py-1.5 border border-primary/30 text-primary rounded-lg text-sm font-medium hover:bg-primary/10 transition-colors">
                  <Eye className="w-3.5 h-3.5 inline mr-1" />View Classes
                </Link>
                <Link to={`/students?school=${item.school.id}`} className="flex-1 text-center px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  <Users className="w-3.5 h-3.5 inline mr-1" />View Students
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
