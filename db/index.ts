import { drizzle } from "drizzle-orm/postgres-js";
import { getPostgresClient } from "@/platform/hostinger-env";
import * as schema from "./schema";

export function getDb() {
  return drizzle(getPostgresClient(), { schema });
}
