import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box } from "../../../Components/Box/Box";
import { Frame } from "../../../Components/Frame/Frame";
import { Title } from "../../../Components/Title/Title";
import { SolicitudHistorial } from "../../../Components/SolicitudHistorial/SolicitudHistorial";
import { SolicitudItemsFormulario } from "../../../Components/SolicitudItems/SolicitudItemsFormulario";
import { nuevaFila, validarFilas, type FilaSolicitud } from "../../../Components/SolicitudItems/solicitudItems";
import { CreateSolicitudCompra, GetEgresoCatalogos, GetMisSolicitudes } from "../../../Helpers/APIConnector";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol, type EgresoCatalogos, type SolicitudCompraCreate, type SolicitudMaterial } from "../../../types/general";
import css from "../RegistroMermasConsumo/RegistroMermasConsumo.module.css";

export function SolicitudesCompra() {
  const permitido = useValidateRol([Rol.bodega]);
  const { search } = useLocation();
  const [catalogos, setCatalogos] = useState<EgresoCatalogos | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudMaterial[]>([]);
  const [filas, setFilas] = useState<FilaSolicitud[]>([nuevaFila()]);
  const [obraId, setObraId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!permitido) return;
    let activo = true;
    Promise.all([GetEgresoCatalogos(), GetMisSolicitudes()])
      .then(([catalogo, lista]) => {
        if (!activo) return;
        if (!catalogo || catalogo.error || !catalogo.data) {
          throw new Error(catalogo?.mensaje || "No se pudo cargar el catálogo.");
        }
        if (lista.error || !lista.data) throw new Error(lista.mensaje);
        setError("");
        setCatalogos(catalogo.data);
        setSolicitudes(lista.data);
        const id = new URLSearchParams(search).get("articulo");
        if (id) {
          const articulo = catalogo.data.articulos.find((item) => String(item.id) === id);
          if (!articulo) throw new Error("No se encontró el artículo seleccionado.");
          setFilas([{ ...nuevaFila(), articuloId: String(articulo.id),
            cantidad: String(Math.max(1, articulo.stock_minimo - articulo.stock_actual)) }]);
        }
      })
      .catch((e: unknown) => {
        if (activo) setError(e instanceof Error ? e.message : "No se pudieron cargar los datos.");
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [permitido, search]);

  async function guardar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errorFilas = validarFilas(filas, false);
    if (errorFilas || !motivo.trim()) {
      setError(errorFilas || "Indique el motivo.");
      return;
    }
    const body: SolicitudCompraCreate = {
      obra_id: obraId ? Number(obraId) : null,
      motivo: motivo.trim(),
      items: filas.map((fila) => ({
        cantidad: Number(fila.cantidad),
        ...(fila.tipo === "existente"
          ? { articulo_id: Number(fila.articuloId) }
          : { nombre_articulo: fila.nombre.trim(), descripcion_articulo: fila.descripcion.trim() }),
      })),
    };
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      const resultado = await CreateSolicitudCompra(body);
      if (resultado.error || !resultado.data) throw new Error(resultado.mensaje);
      const solicitud = resultado.data;
      setSolicitudes((actuales) => [solicitud, ...actuales]);
      setAviso(`Solicitud #${solicitud.id} registrada. El inventario no fue modificado.`);
      setFilas([nuevaFila()]);
      setMotivo("");
      setObraId("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la solicitud.");
    } finally {
      setGuardando(false);
    }
  }

  if (!permitido) return null;
  return (
    <Frame>
      <Box style={{ flexFlow: "column nowrap", alignItems: "stretch" }}>
        <div className={css.header}>
          <Title>Solicitar compra a Finanzas</Title>
          <p>La solicitud no crea artículos ni modifica el stock o el Cardex.</p>
        </div>
        {error && <p className={css.error} role="alert">{error}</p>}
        {aviso && <p className={css.notice} role="status">{aviso}</p>}
        {cargando ? <p>Cargando datos...</p> : catalogos && (
          <form className={css.form} onSubmit={(event) => void guardar(event)}>
            <SolicitudItemsFormulario filas={filas} setFilas={setFilas} articulos={catalogos.articulos} tecnico={false} disabled={guardando} />
            <label className={css.field}>Obra (opcional)
              <select className={css.input} disabled={guardando} value={obraId} onChange={(e) => setObraId(e.target.value)}>
                <option value="">Sin obra</option>
                {catalogos.obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.codigo_obra} · {obra.nombre_obra}</option>)}
              </select>
            </label>
            <label className={css.field}>Motivo
              <textarea className={`${css.input} ${css.textarea}`} disabled={guardando} required maxLength={2000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </label>
            <div className={css.actions}>
              <button className={css.submit} type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Enviar solicitud"}</button>
            </div>
          </form>
        )}
        <SolicitudHistorial solicitudes={solicitudes} cargando={cargando} disponible={catalogos !== null} />
      </Box>
    </Frame>
  );
}
