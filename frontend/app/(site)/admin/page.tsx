import type { Metadata } from "next";
import AdminDashboard from "@/components/pages/admin-dashboard";

export const metadata: Metadata = { title: "Admin — Beat KL traffic", robots: { index: false } };

export default function Page() {
  return <AdminDashboard />;
}
