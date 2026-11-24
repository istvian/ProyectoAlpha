import type { SolicitudMaterialItem } from "../../types/general";

export function SolicitudItemsLista({ items }: { items: SolicitudMaterialItem[] }) {
  return (
    <ul aria-label="Artículos solicitados">
      {items.map((item) => (
        <li key={item.id}>
          <strong>{item.articulo_id === null ? "No catalogado" : "Catálogo"}: {item.nombre_articulo}</strong>
          {item.codigo_sku && ` · SKU: ${item.codigo_sku}`}
          {` · Cantidad: ${item.cantidad}`}
          {item.descripcion_articulo && <div>Descripción: {item.descripcion_articulo}</div>}
        </li>
      ))}
    </ul>
  );
}
