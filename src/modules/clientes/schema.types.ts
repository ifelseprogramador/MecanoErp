import type { InferSelectModel } from "drizzle-orm";
import type { customers, customerAddresses } from "./schema";

export type Customer = InferSelectModel<typeof customers>;

export type CustomerAddress = InferSelectModel<typeof customerAddresses>;
/** Cliente com o endereço principal (quando existe). */
export type CustomerWithAddress = Customer & { endereco: CustomerAddress | null };
