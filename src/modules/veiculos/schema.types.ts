import type { InferSelectModel } from "drizzle-orm";
import type { vehicles } from "./schema";

export type Vehicle = InferSelectModel<typeof vehicles>;
