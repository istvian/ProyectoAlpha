export interface FilaSolicitud {
  id: number;
  tipo: "existente" | "nuevo";
  articuloId: string;
  nombre: string;
  descripcion: string;
  cantidad: string;
}

export function nuevaFila(id = 0): FilaSolicitud {
  return { id, tipo: "existente", articuloId: "", nombre: "", descripcion: "", cantidad: "" };
}

export function validarFilas(filas: FilaSolicitud[], tecnico: boolean): string | null {
  if (filas.length === 0) return "Agregue al menos un artículo.";
  const seleccionados = new Set<string>();
  for (const fila of filas) {
    const cantidad = Number(fila.cantidad);
    if (!Number.isSafeInteger(cantidad) || cantidad <= 0 || cantidad > 2147483647 ||
        (fila.tipo === "existente" ? !fila.articuloId : !(tecnico ? fila.descripcion : fila.nombre).trim())) {
      return "Complete cada artículo con una cantidad entera positiva y sus datos.";
    }
    if (fila.tipo === "existente") {
      if (seleccionados.has(fila.articuloId)) return "No se puede repetir un artículo del catálogo.";
      seleccionados.add(fila.articuloId);
    }
  }
  return null;
}
