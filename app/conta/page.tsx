import { requireChatGPTUser } from "../chatgpt-auth";
import AccountPage from "./subscription-page";
import "./subscription.css";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const user = await requireChatGPTUser("/conta");
  return <AccountPage user={{ name: user.displayName, email: user.email }} />;
}

