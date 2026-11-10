import { Car, FileDown, FileUp, List, Plus } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { FacilFilters } from "@/components/facil/facil-filters";
import { hasActiveFilter } from "@/core/list-filters";
import { FacilKpi } from "@/components/facil/facil-kpi";
import { FacilModuleHome } from "@/components/facil/facil-page";
import { FacilList } from "@/components/facil/facil-list";
import { FacilTile } from "@/components/facil/facil-tile";
import { formatPlate } from "@/core/format";
import { getVehicleDashboardSummary, listVehicleYears, listVehicles } from "../queries";
import { PendingVehicles } from "./pending-vehicles";
import {
  VEHICLE_DEFAULT_SORT,
  VEHICLE_SORT_CHOICES,
  vehicleFilters,
  type VehicleListOptions,
} from "../list-config";

const INITIAL_LIMIT = 12;

/**
 * Janela inicial de Veículos no modo Fácil: total, cards de ação, busca
 * grande por placa e os últimos veículos em cards. Mesmas queries da tela
 * formal. Com busca ou `?ver=todos` mostra a lista inteira.
 */
export async function VeiculosFacilHome({
  options,
  showAll,
}: {
  options: VehicleListOptions;
  showAll: boolean;
}) {
  const filtered = hasActiveFilter(options);
  const [vehicles, summary, years] = await Promise.all([
    listVehicles(options),
    getVehicleDashboardSummary(),
    listVehicleYears(),
  ]);
  const everything = showAll || filtered;

  return (
    <FacilModuleHome
      title="Veículos"
      subtitle="Os carros dos seus clientes"
      icon={Car}
      kpis={<FacilKpi icon={Car} label="Veículos cadastrados" value={summary.total} index={0} />}
      actions={
        <>
          <FacilTile href="/veiculos/novo" label="Novo veículo" icon={Plus} size="lg" index={0} />
          {!everything && (
            <FacilTile
              href="/veiculos?ver=todos"
              label="Ver todos"
              icon={List}
              size="lg"
              index={1}
            />
          )}
          <FacilTile
            href="/veiculos/importar"
            label="Importar planilha"
            icon={FileUp}
            size="lg"
            index={2}
          />
          <FacilTile
            href="/veiculos/exportar"
            label="Baixar planilha"
            icon={FileDown}
            size="lg"
            index={3}
            download
          />
        </>
      }
    >
      <SearchBox large placeholder="Buscar veículo pela placa" />
      <FacilFilters
        filters={vehicleFilters(years)}
        sortOptions={VEHICLE_SORT_CHOICES}
        defaultSort={VEHICLE_DEFAULT_SORT}
      />
      <PendingVehicles />
      <FacilList
        items={vehicles.map((vehicle) => ({
          id: vehicle.id,
          href: `/veiculos/${vehicle.id}`,
          title: formatPlate(vehicle.plate),
          subtitle:
            [[vehicle.brand, vehicle.model].filter(Boolean).join(" "), vehicle.customerName]
              .filter(Boolean)
              .join(" · ") || undefined,
          icon: Car,
        }))}
        limit={everything ? Number.POSITIVE_INFINITY : INITIAL_LIMIT}
        moreHref="/veiculos?ver=todos"
        emptyTitle={filtered ? "Nenhum veículo encontrado" : "Você ainda não tem veículos"}
        emptyHint={
          filtered ? "Confira a placa ou limpe os filtros." : "Cadastre o primeiro veículo agora."
        }
        emptyAction={
          filtered ? undefined : (
            <FacilTile href="/veiculos/novo" label="Novo veículo" icon={Plus} size="lg" />
          )
        }
      />
    </FacilModuleHome>
  );
}
