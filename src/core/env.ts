/**
 * Lê uma variável de ambiente obrigatória, lançando um erro claro se
 * faltar. Evita repetir o mesmo `if (!x) throw` em cada arquivo e (ao
 * contrário de checar e usar a variável original) devolve um tipo `string`
 * que o TypeScript estreita corretamente dentro de closures.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} não configurada. Copie .env.example para .env.local.`);
  }
  return value;
}
