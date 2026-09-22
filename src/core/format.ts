import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
}

const PLATE_REGEX = /^([A-Z]{3})(\d[A-Z0-9]\d{2})$/;

/** Forma canônica para salvar no banco: maiúscula, sem separador. */
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidPlate(plate: string): boolean {
  return PLATE_REGEX.test(normalizePlate(plate));
}

/** Formata placa de veículo para exibição (padrão antigo ou Mercosul). */
export function formatPlate(plate: string): string {
  const clean = normalizePlate(plate);
  const match = PLATE_REGEX.exec(clean);
  if (!match) return clean;
  return `${match[1]}-${match[2]}`;
}
