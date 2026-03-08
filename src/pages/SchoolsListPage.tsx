import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, MapPin, Users, Eye } from "lucide-react";

const mockSchools = [
  { school: { id: "1", name: "Delhi Public School", block: "Rohini", district: "North Delhi", udise: "0912345" }, enrollment_count: 85, class_count: 4 },
  { school: { id: "2", name: "Kendriya Vidyalaya", block: "Dwarka", district: "South West Delhi", udise: "0912346" }, enrollment_count: 62, class_count: 3 },
  { school: { id: "3", name: "Government Senior Secondary", block: "Karol Bagh", district: "Central Delhi", udise: "0912347" }, enrollment_count: 45, class_count: 2 },
];

export default function SchoolsListPage() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          My Schools
        </h2>
        <p className="text-muted-foreground text-sm mt-1">{mockSchools.length} schools assigned to you</p>
      </div>

      {mockSchools.length === 0 ? (
        <div className="elevated-card p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-semibold text-sm">No schools assigned</p>
          <p className="text-xs text-muted-foreground mt-1">Contact your administrator to assign schools.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockSchools.map((item, i) => (
            <motion.div
              key={item.school.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="elevated-card overflow-hidden hover:shadow-lg transition-all group"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="font-bold text-sm">{item.school.name}</h5>
                  <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] rounded-full font-bold uppercase tracking-wide">Active</span>
                </div>
                <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3" />
                  {item.school.block}, {item.school.district}
                </p>
                <p className="text-muted-foreground text-xs mb-4">UDISE: {item.school.udise}</p>

                <div className="grid grid-cols-2 gap-3 mb-1">
                  <div className="bg-primary/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-extrabold text-primary">{item.enrollment_count}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">Students</div>
                  </div>
                  <div className="bg-success/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-extrabold text-success">{item.class_count}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">Classes</div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-border bg-muted/30 flex gap-2">
                <Link to={`/schools/${item.school.id}`} className="flex-1 text-center py-2 rounded-xl border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors active:scale-[0.98]">
                  <Eye className="w-3.5 h-3.5 inline mr-1" />Classes
                </Link>
                <Link to={`/students?school=${item.school.id}`} className="flex-1 text-center py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold hover:shadow-md hover:shadow-primary/20 transition-all active:scale-[0.98]">
                  <Users className="w-3.5 h-3.5 inline mr-1" />Students
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
