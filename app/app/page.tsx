import { requireChatGPTUser } from "../chatgpt-auth";
import WorkspaceApp from "./workspace-app";
import "./app.css";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await requireChatGPTUser("/app");
  return <WorkspaceApp initialUser={{ name: user.displayName, email: user.email }} />;
}
