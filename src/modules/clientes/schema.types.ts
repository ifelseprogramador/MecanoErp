import type { InferSelectModel } from "drizzle-orm";
import type { customers } from "./schema";

export type Customer = InferSelectModel<typeof customers>;
