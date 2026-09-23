/**
 * Único arquivo que conhece a lista de módulos instalados — importa cada
 * `modules/<modulo>/module.ts` pelo efeito colateral de chamar
 * `registerModule(...)` (ver `core/registry.ts`).
 *
 * Adicionar um módulo novo = criar a pasta + adicionar uma linha aqui.
 * Remover um módulo = apagar a pasta + tirar a linha daqui.
 *
 * Importado uma vez em `app/(app)/layout.tsx`, antes de qualquer leitura
 * de `getEnabledModules()`.
 */

import "@/modules/clientes/module";
import "@/modules/veiculos/module";
import "@/modules/catalogo/module";
import "@/modules/ordens/module";
// import "@/modules/agenda/module"; // Fase 4
// import "@/modules/financeiro/module"; // Fase 4

export {};
