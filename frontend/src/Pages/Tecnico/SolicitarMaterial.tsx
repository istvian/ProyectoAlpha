import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Box } from "../../Components/Box/Box";
import { Frame } from "../../Components/Frame/Frame";
import { SolicitudHistorial } from "../../Components/SolicitudHistorial/SolicitudHistorial";
import { Title } from "../../Components/Title/Title";
import { CreateSolicitudTecnico, GetContextoSolicitudTecnico, GetMisSolicitudes } from "../../Helpers/APIConnector";
import { useRolAutorizado } from "../../Hooks/useValidateRol";
import { Rol, type ContextoSolicitudTecnico, type SolicitudMaterial, type SolicitudTecnicoCreate } from "../../types/general";
import css from "../BodegaPages/RegistroMermasConsumo/RegistroMermasConsumo.module.css";

export function SolicitarMaterial() {
  const rol = useRolAutorizado([Rol.tecnico]);
  const [contexto, setContexto] = useState<ContextoSolicitudTecnico | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudMaterial[]>([]);
  const [obraId, setObraId] = useState("");
  const [tipo, setTipo] = useState<"existente" | "nuevo">("existente");
  const [articuloId, setArticuloId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [prioridad, setPrioridad] = useState<SolicitudTecnicoCreate["prioridad"]>("NORMAL");
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (rol !== Rol.tecnico) return;
    let activo = true;
    Promise.all([GetContextoSolicitudTecnico(), GetMisSolicitudes()])
      .then(([datos, lista]) => {
        if (!activo) return;
        if (datos.error || !datos.data) throw new Error(datos.mensaje);
        if (lista.error || !lista.data) throw new Error(lista.mensaje);
        setContexto(datos.data);
        setSolicitudes(lista.data);
      })
      .catch((e: unknown) => {
        if (activo) setError(e instanceof Error ? e.message : "No se pudieron cargar los datos.");
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [rol]);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const unidades = Number(cantidad);
    if (!obraId || !Number.isSafeInteger(unidades) || unidades <= 0 || unidades > 2147483647 ||
        !motivo.trim() || (tipo === "existente" ? !articuloId : !descripcion.trim())) {
      setError("Indique una obra, material, cantidad entera positiva y justificación.");
      return;
    }
    const body: SolicitudTecnicoCreate = {
      obra_id: Number(obraId),
      cantidad: unidades,
      prioridad,
      motivo: motivo.trim(),
      ...(tipo === "existente" ? { articulo_id: Number(articuloId) } : { descripcion_articulo: descripcion.trim() }),
    };
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      const resultado = await CreateSolicitudTecnico(body);
      if (resultado.error || !resultado.data) throw new Error(resultado.mensaje);
      const solicitud = resultado.data;
      setSolicitudes((actuales) => [solicitud, ...actuales]);
      setAviso(`Solicitud #${solicitud.id} registrada. El inventario no fue modificado.`);
      setCantidad("");
      setMotivo("");
      setDescripcion("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la solicitud.");
    } finally {
      setGuardando(false);
    }
  }

  if (rol === null) return null;
  if (rol !== Rol.tecnico) return <Navigate to="/403" replace />;

  return (
    <Frame>
      <Box style={{ flexFlow: "column nowrap", alignItems: "stretch" }}>
        <div className={css.header}>
          <Title>Solicitar material a Finanzas</Title>
          <p>La solicitud no modifica el inventario ni registra movimientos.</p>
        </div>
        {error && <p className={css.error} role="alert">{error}</p>}
        {aviso && <p className={css.notice} role="status">{aviso}</p>}
        {cargando ? <p>Cargando datos...</p> : contexto && (
          <>
            {contexto.obras.length === 0 && <p>No tienes obras activas asignadas. Contacta a Finanzas.</p>}
            <form className={css.form} onSubmit={(event) => void guardar(event)}>
              <label className={css.field}>Obra asignada
                <select className={css.input} required value={obraId} onChange={(e) => setObraId(e.target.value)}>
                  <option value="">Seleccione una obra</option>
                  {contexto.obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.codigo_obra} · {obra.nombre_obra}</option>)}
                </select>
              </label>
              <label className={css.field}>Tipo de material
                <select className={css.input} value={tipo} onChange={(e) => setTipo(e.target.value === "nuevo" ? "nuevo" : "existente")}>
                  <option value="existente">Material existente</option>
                  <option value="nuevo">Material no catalogado</option>
                </select>
              </label>
              {tipo === "existente" ? (
                <label className={css.field}>Material
                  <select className={css.input} required value={articuloId} onChange={(e) => setArticuloId(e.target.value)}>
                    <option value="">Seleccione un material</option>
                    {contexto.articulos.map((item) => <option key={item.id} value={item.id}>{item.codigo_sku || "Sin SKU"} · {item.nombre}</option>)}
                  </select>
                </label>
              ) : (
                <label className={css.field}>Descripción del material
                  <textarea className={`${css.input} ${css.textarea}`} required maxLength={255} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                </label>
              )}
              <label className={css.field}>Cantidad
                <input className={css.input} type="number" min="1" max="2147483647" step="1" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
              </label>
              <label className={css.field}>Prioridad
                <select className={css.input} value={prioridad} onChange={(e) => {
                  const valor = e.target.value;
                  if (valor === "BAJA" || valor === "NORMAL" || valor === "ALTA") setPrioridad(valor);
                }}>
                  <option value="BAJA">Baja</option>
                  <option value="NORMAL">Normal</option>
                  <option value="ALTA">Alta</option>
                </select>
              </label>
              <label className={css.field}>Justificación
                <textarea className={`${css.input} ${css.textarea}`} required maxLength={2000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </label>
              <div className={css.actions}>
                <button className={css.submit} type="submit" disabled={guardando || contexto.obras.length === 0}>
                  {guardando ? "Guardando..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </>
        )}
        <SolicitudHistorial solicitudes={solicitudes} cargando={cargando} disponible={contexto !== null} mostrarPrioridad />
      </Box>
    </Frame>
  );
}
