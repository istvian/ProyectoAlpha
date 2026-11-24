import type { SolicitudMaterial } from "../../types/general";
import { SolicitudItemsLista } from "../SolicitudItems/SolicitudItemsLista";
import css from "../../Pages/BodegaPages/RegistroMermasConsumo/RegistroMermasConsumo.module.css";

export function SolicitudHistorial({ solicitudes, cargando, disponible, mostrarPrioridad = false }: {
  solicitudes: SolicitudMaterial[];
  cargando: boolean;
  disponible: boolean;
  mostrarPrioridad?: boolean;
}) {
  return (
    <section className={css.historial} aria-label="Mis solicitudes">
      <h2>Mis solicitudes</h2>
      {!cargando && disponible && solicitudes.length === 0 && <p>No tienes solicitudes registradas.</p>}
      <ul className={css.historialLista}>
        {solicitudes.map((item) => (
          <li className={css.historialItem} key={item.id}>
            <strong>Solicitud #{item.id} · {item.tipo_solicitud === "COMPRA_BODEGA" ? "Compra de Bodega" : "Material de Técnico"}</strong>
            <p>Estado: {item.estado}{mostrarPrioridad && ` · Prioridad: ${item.prioridad}`}</p>
            <p>Obra: {item.obra || "Sin obra"} · Motivo: {item.motivo}</p>
            <SolicitudItemsLista items={item.items} />
            {item.revisado_por_nombre && (
              <p>Revisó: {item.revisado_por_nombre}{item.fecha_revision && ` · ${new Date(item.fecha_revision).toLocaleString("es-CL")}`}</p>
            )}
            {item.comentario_revision && <p>Respuesta: {item.comentario_revision}</p>}
            <time dateTime={item.fecha_creacion}>{new Date(item.fecha_creacion).toLocaleString("es-CL")}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
