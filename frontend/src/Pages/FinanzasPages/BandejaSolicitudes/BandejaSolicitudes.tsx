import { useEffect, useState } from "react";
import { Box } from "../../../Components/Box/Box";
import { Frame } from "../../../Components/Frame/Frame";
import { Title } from "../../../Components/Title/Title";
import { SolicitudItemsLista } from "../../../Components/SolicitudItems/SolicitudItemsLista";
import { GetSolicitudesFinanzas, ResolverSolicitud } from "../../../Helpers/APIConnector";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol, type EstadoSolicitudMaterial, type SolicitudMaterial, type TipoSolicitudMaterial } from "../../../types/general";
import css from "../../BodegaPages/RegistroMermasConsumo/RegistroMermasConsumo.module.css";
import styles from "./BandejaSolicitudes.module.css";

export function BandejaSolicitudes() {
  const permitido = useValidateRol([Rol.finanzas]);
  const [estado, setEstado] = useState<EstadoSolicitudMaterial | "">("PENDIENTE");
  const [tipo, setTipo] = useState<TipoSolicitudMaterial | "">("");
  const [solicitudes, setSolicitudes] = useState<SolicitudMaterial[]>([]);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [disponible, setDisponible] = useState(false);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!permitido) return;
    let activo = true;
    GetSolicitudesFinanzas(estado, tipo)
      .then((resultado) => {
        if (!activo) return;
        if (resultado.error || !resultado.data) throw new Error(resultado.mensaje);
        setSolicitudes(resultado.data);
        setDisponible(true);
      })
      .catch((e: unknown) => {
        if (activo) {
          setDisponible(false);
          setError(e instanceof Error ? e.message : "No se pudieron consultar las solicitudes.");
        }
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [permitido, estado, tipo, version]);

  function actualizar() {
    setError("");
    setCargando(true);
    setVersion((actual) => actual + 1);
  }

  async function resolver(item: SolicitudMaterial, decision: "aprobar" | "rechazar") {
    const comentario = (comentarios[item.id] || "").trim();
    if (decision === "rechazar" && !comentario) {
      setError("Indique el motivo del rechazo.");
      return;
    }
    setError("");
    setAviso("");
    setGuardando(item.id);
    try {
      const resultado = await ResolverSolicitud(item.id, decision, comentario);
      if (resultado.error || !resultado.data) throw new Error(resultado.mensaje);
      const actualizada = resultado.data;
      setSolicitudes((actuales) => actuales.flatMap((actual) => {
        if (actual.id !== item.id) return [actual];
        return estado && actualizada.estado !== estado ? [] : [actualizada];
      }));
      setAviso(`Solicitud #${item.id} ${decision === "aprobar" ? "aprobada" : "rechazada"}. No se modificó el inventario ni se generó una orden.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo resolver la solicitud.");
    } finally {
      setGuardando(null);
    }
  }

  if (!permitido) return null;
  return (
    <Frame>
      <Box style={{ flexFlow: "column nowrap", alignItems: "stretch" }}>
        <div className={css.header}>
          <Title>Solicitudes de material</Title>
          <p>Revise las solicitudes de Bodega y Técnico. La decisión no crea una orden ni modifica el inventario.</p>
        </div>
        <div className={styles.filters}>
          <label className={css.field}>Estado
            <select className={css.input} value={estado} disabled={guardando !== null} onChange={(e) => {
              const valor = e.target.value;
              if (valor === "" || valor === "PENDIENTE" || valor === "APROBADA" || valor === "RECHAZADA") {
                setError(""); setCargando(true); setEstado(valor);
              }
            }}>
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="APROBADA">Aprobadas</option>
              <option value="RECHAZADA">Rechazadas</option>
            </select>
          </label>
          <label className={css.field}>Tipo
            <select className={css.input} value={tipo} disabled={guardando !== null} onChange={(e) => {
              const valor = e.target.value;
              if (valor === "" || valor === "COMPRA_BODEGA" || valor === "MATERIAL_TECNICO") {
                setError(""); setCargando(true); setTipo(valor);
              }
            }}>
              <option value="">Todos</option>
              <option value="COMPRA_BODEGA">Compra de Bodega</option>
              <option value="MATERIAL_TECNICO">Material de Técnico</option>
            </select>
          </label>
          <button type="button" className={styles.button} onClick={actualizar} disabled={cargando || guardando !== null}>Actualizar</button>
        </div>
        {error && <p className={css.error} role="alert">{error}</p>}
        {aviso && <p className={css.notice} role="status">{aviso}</p>}
        {cargando ? <p>Cargando solicitudes...</p> : disponible && (
          <section aria-label="Bandeja de solicitudes">
            {solicitudes.length === 0 && <p>No hay solicitudes para los filtros seleccionados.</p>}
            <ul className={css.historialLista}>
              {solicitudes.map((item) => (
                <li key={item.id} className={css.historialItem}>
                  <article aria-label={`Solicitud ${item.id}`}>
                    <h2>Solicitud #{item.id}</h2>
                    <p>{item.tipo_solicitud === "COMPRA_BODEGA" ? "Compra de Bodega" : "Material de Técnico"} · {item.estado} · Prioridad: {item.prioridad}</p>
                    <p>Solicitó: {item.solicitante_nombre} · Obra: {item.obra || "Sin obra"}</p>
                    <SolicitudItemsLista items={item.items} />
                    <p>Motivo: {item.motivo}</p>
                    <p>Fecha: <time dateTime={item.fecha_creacion}>{new Date(item.fecha_creacion).toLocaleString("es-CL")}</time></p>
                    {item.revisado_por_nombre && <p>Revisó: {item.revisado_por_nombre}{item.fecha_revision && ` · ${new Date(item.fecha_revision).toLocaleString("es-CL")}`}</p>}
                    {item.comentario_revision && <p>Respuesta: {item.comentario_revision}</p>}
                    {item.estado === "PENDIENTE" && (
                      <>
                        <p>La decisión se aplica a todos los artículos de esta solicitud.</p>
                        <label className={css.field}>Comentario de resolución (obligatorio para rechazar)
                          <textarea className={`${css.input} ${css.textarea}`} maxLength={2000} value={comentarios[item.id] || ""} onChange={(e) => setComentarios((actuales) => ({ ...actuales, [item.id]: e.target.value }))} />
                        </label>
                        <div className={styles.actions}>
                          <button type="button" className={styles.button} disabled={guardando !== null} onClick={() => void resolver(item, "aprobar")}>Aprobar</button>
                          <button type="button" className={styles.button} disabled={guardando !== null} onClick={() => void resolver(item, "rechazar")}>Rechazar</button>
                        </div>
                      </>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Box>
    </Frame>
  );
}
