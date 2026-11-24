import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box } from "../../../Components/Box/Box";
import { Frame } from "../../../Components/Frame/Frame";
import { Title } from "../../../Components/Title/Title";
import { SolicitudHistorial } from "../../../Components/SolicitudHistorial/SolicitudHistorial";
import { CreateSolicitudCompra, GetEgresoCatalogos, GetMisSolicitudes } from "../../../Helpers/APIConnector";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol, type EgresoCatalogos, type SolicitudCompraCreate, type SolicitudMaterial } from "../../../types/general";
import css from "../RegistroMermasConsumo/RegistroMermasConsumo.module.css";

export function SolicitudesCompra() {
  const permitido = useValidateRol([Rol.bodega]);
  const { search } = useLocation();
  const [catalogos, setCatalogos] = useState<EgresoCatalogos | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudMaterial[]>([]);
  const [tipo, setTipo] = useState<"existente" | "nuevo">("existente");
  const [articuloId, setArticuloId] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("");
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
          setTipo("existente");
          setArticuloId(String(articulo.id));
          setCantidad(String(Math.max(1, articulo.stock_minimo - articulo.stock_actual)));
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
    const unidades = Number(cantidad);
    if (!Number.isSafeInteger(unidades) || unidades <= 0 || unidades > 2147483647 ||
        !motivo.trim() || (tipo === "existente" ? !articuloId : !nombre.trim())) {
      setError("Indique el artículo, una cantidad entera positiva y el motivo.");
      return;
    }
    const body: SolicitudCompraCreate = {
      cantidad: unidades,
      obra_id: obraId ? Number(obraId) : null,
      motivo: motivo.trim(),
      ...(tipo === "existente"
        ? { articulo_id: Number(articuloId) }
        : { nombre_articulo: nombre.trim(), descripcion_articulo: descripcion.trim() }),
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
      setCantidad("");
      setMotivo("");
      setNombre("");
      setDescripcion("");
      setObraId("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la solicitud.");
    } finally {
      setGuardando(false);
    }
  }

  if (!permitido) return null;
  const articulo = catalogos?.articulos.find((item) => String(item.id) === articuloId);
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
            <label className={css.field}>
              Tipo de artículo
              <select className={css.input} value={tipo} onChange={(e) => setTipo(e.target.value === "nuevo" ? "nuevo" : "existente")}>
                <option value="existente">Artículo existente</option>
                <option value="nuevo">Artículo nuevo</option>
              </select>
            </label>
            {tipo === "existente" ? (
              <>
                <label className={css.field}>
                  Artículo
                  <select className={css.input} required value={articuloId} onChange={(e) => setArticuloId(e.target.value)} aria-describedby={articulo ? "stock-articulo" : undefined}>
                    <option value="">Seleccione un artículo</option>
                    {catalogos.articulos.map((item) => <option key={item.id} value={item.id}>{item.codigo_sku || "Sin SKU"} · {item.nombre}</option>)}
                  </select>
                </label>
                {articulo && <small id="stock-articulo">Stock actual: {articulo.stock_actual} · Mínimo: {articulo.stock_minimo}</small>}
              </>
            ) : (
              <>
                <label className={css.field}>Nombre del artículo
                  <input className={css.input} required maxLength={150} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </label>
                <label className={css.field}>Descripción
                  <textarea className={`${css.input} ${css.textarea}`} maxLength={255} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                </label>
              </>
            )}
            <label className={css.field}>Cantidad
              <input className={css.input} type="number" min="1" max="2147483647" step="1" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </label>
            <label className={css.field}>Obra (opcional)
              <select className={css.input} value={obraId} onChange={(e) => setObraId(e.target.value)}>
                <option value="">Sin obra</option>
                {catalogos.obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.codigo_obra} · {obra.nombre_obra}</option>)}
              </select>
            </label>
            <label className={css.field}>Motivo
              <textarea className={`${css.input} ${css.textarea}`} required maxLength={2000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
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
