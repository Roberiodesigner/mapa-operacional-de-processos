import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";
import { isPlatformAdmin } from "../api/_lib/commercial";
import AdminDashboard from "./admin-dashboard";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getChatGPTUser();
  if (!user) redirect("/admin/login");
  if (!await isPlatformAdmin(user.email)) redirect("/app");
  return <AdminDashboard initialAdmin={{ name: user.displayName, email: user.email }} />;
}
