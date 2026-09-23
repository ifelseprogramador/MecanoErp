import type { InferSelectModel } from "drizzle-orm";
import type { catalogItems } from "./schema";

export type CatalogItem = InferSelectModel<typeof catalogItems>;
