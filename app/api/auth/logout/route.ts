import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createSupabaseServerClient } from "../../../supabase/server";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const user = await getChatGPTUser();
  if (user?.authProvider === "chatgpt") {
    return NextResponse.redirect(`${origin}/signout-with-chatgpt?return_to=${encodeURIComponent("/")}`);
  }
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(`${origin}/`);
}
