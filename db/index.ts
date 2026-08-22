import { env } from "@/platform/hostinger-env";

export function getDb() {
  return env.DB;
}
