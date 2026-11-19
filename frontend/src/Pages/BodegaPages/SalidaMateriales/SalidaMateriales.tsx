import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Frame } from "../../../Components/Frame/Frame";
import { InputText } from "../../../Components/InputText/InputText";
import { Title } from "../../../Components/Title/Title";
import {
  CreateEgreso,
  GetEgresoCatalogos,
} from "../../../Helpers/APIConnector";
import useValidateRol from "../../../Hooks/useValidateRol";
import {
  Rol,
  type EgresoCatalogos,
  type SalidaMateriales as FormularioSalida,
  type SalidaProducto,
} from "../../../types/general";
import css from "./SalidaMateriales.module.css";

const PRODUCTO_VACIO: SalidaProducto = {
  articulo_id: 0,
  cantidad: 0,
  nombre: "",
  sku: "",
};

export function SalidaMateriales() {
  const nav = useNavigate();
  const isAllowed = useValidateRol([Rol.bodega]);
  const [catalogos, setCatalogos] = useState<EgresoCatalogos | null>(null);
  const [formData, setFormData] = useState<FormularioSalida>({
    obra: "",
    tecnico: "",
    producto: [],
  });
  const [selectedProduct, setSelectedProduct] =
    useState<SalidaProducto>(PRODUCTO_VACIO);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isAllowed) return;
    let active = true;
    GetEgresoCatalogos()
      .then((response) => {
        if (!response || response.error || !response.data) {
          throw new Error(
            response?.mensaje || "No se pudieron cargar los catálogos.",
          );
        }
        if (active) setCatalogos(response.data);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los catálogos.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAllowed]);

  if (!isAllowed) return null;

  const obraSeleccionada = catalogos?.obras.find(
    (obra) => String(obra.id) === formData.obra,
  );
  const tecnicoSeleccionado = catalogos?.tecnicos.find(
    (tecnico) => String(tecnico.id) === formData.tecnico,
  );
  const articuloSeleccionado = catalogos?.articulos.find(
    (articulo) => articulo.id === selectedProduct.articulo_id,
  );

  function seleccionarObra(id: string) {
    const obra = catalogos?.obras.find((item) => String(item.id) === id);
    setFormData((previous) => ({
      ...previous,
      obra: id,
      tecnico: obra ? String(obra.tecnico_responsable_id) : "",
    }));
    setErrorMessage("");
  }

  function seleccionarProducto(id: string) {
    const articulo = catalogos?.articulos.find(
      (item) => String(item.id) === id,
    );
    setSelectedProduct(
      articulo
        ? {
            articulo_id: articulo.id,
            cantidad: 0,
            nombre: articulo.nombre,
            sku: articulo.codigo_sku ?? "",
          }
        : PRODUCTO_VACIO,
    );
    setErrorMessage("");
  }

  function agregarProducto() {
    if (!articuloSeleccionado || selectedProduct.cantidad <= 0) {
      setErrorMessage("Seleccione un artículo e indique una cantidad válida.");
      return;
    }
    const cantidadExistente =
      formData.producto.find(
        (item) => item.articulo_id === articuloSeleccionado.id,
      )?.cantidad ?? 0;
    if (
      cantidadExistente + selectedProduct.cantidad >
      articuloSeleccionado.stock_actual
    ) {
      setErrorMessage(
        `Stock insuficiente para ${articuloSeleccionado.nombre}. Disponible: ${articuloSeleccionado.stock_actual}.`,
      );
      return;
    }

    setFormData((previous) => {
      const existe = previous.producto.some(
        (item) => item.articulo_id === articuloSeleccionado.id,
      );
      return {
        ...previous,
        producto: existe
          ? previous.producto.map((item) =>
              item.articulo_id === articuloSeleccionado.id
                ? {
                    ...item,
                    cantidad: item.cantidad + selectedProduct.cantidad,
                  }
                : item,
            )
          : [...previous.producto, selectedProduct],
      };
    });
    setSelectedProduct(PRODUCTO_VACIO);
    setErrorMessage("");
  }

  async function guardarSalida() {
    if (!obraSeleccionada || !tecnicoSeleccionado) {
      setErrorMessage("Seleccione la obra y el técnico receptor.");
      return;
    }
    if (formData.producto.length === 0) {
      setErrorMessage("Agregue al menos un artículo a la salida.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await CreateEgreso({
        obra_id: obraSeleccionada.id,
        tecnico_id: tecnicoSeleccionado.id,
        detalles: formData.producto.map((item) => ({
          producto_id: item.articulo_id,
          cantidad: item.cantidad,
        })),
      });
      if (!response || response.error || !response.data) {
        setErrorMessage(response?.mensaje || "No se pudo registrar la salida.");
        return;
      }
      setNotice(
        `Egreso #${response.data.egreso_id} registrado. El inventario y Cardex fueron actualizados.`,
      );
      setFormData({ obra: "", tecnico: "", producto: [] });
      setSelectedProduct(PRODUCTO_VACIO);
      const refreshedCatalogos = await GetEgresoCatalogos();
      if (refreshedCatalogos && !refreshedCatalogos.error) {
        setCatalogos(refreshedCatalogos.data ?? null);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Frame>
      <Box
        style={{
          flexFlow: "column nowrap",
          alignItems: "stretch",
          justifyContent: "flex-start",
        }}
      >
        <div className={css.header}>
          <Title>Salida de Materiales</Title>
          <p>
            Selecciona una obra y descuenta existencias con registro en Cardex.
          </p>
        </div>

        {errorMessage && (
          <p className={css.error} role="alert">
            {errorMessage}
          </p>
        )}
        {notice && (
          <p className={css.notice} role="status">
            {notice}
          </p>
        )}

        <section className={css.section} aria-labelledby="dispatch-heading">
          <h2 id="dispatch-heading" className={css.sectionTitle}>
            Datos del despacho
          </h2>
          <div className={css.fields}>
            <label className={css.field}>
              Obra
              <select
                className={css.input}
                value={formData.obra}
                disabled={isLoading || !catalogos?.obras.length}
                onChange={(event) => seleccionarObra(event.target.value)}
              >
                <option value="">Selecciona una obra activa</option>
                {(catalogos?.obras ?? []).map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.codigo_obra} - {obra.nombre_obra}
                  </option>
                ))}
              </select>
            </label>
            <label className={css.field}>
              Técnico receptor
              <select
                className={css.input}
                value={formData.tecnico}
                disabled={isLoading || !catalogos?.tecnicos.length}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    tecnico: event.target.value,
                  }))
                }
              >
                <option value="">Selecciona un técnico</option>
                {(catalogos?.tecnicos ?? []).map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nombre} ({tecnico.correo})
                  </option>
                ))}
              </select>
            </label>
          </div>
          {obraSeleccionada && (
            <p className={css.helpText}>
              Responsable de la obra:{" "}
              {obraSeleccionada.tecnico_responsable_nombre}
            </p>
          )}
        </section>

        <section className={css.section} aria-labelledby="item-heading">
          <h2 id="item-heading" className={css.sectionTitle}>
            Material solicitado
          </h2>
          <div className={css.fields}>
            <label className={css.field}>
              Producto / SKU
              <select
                className={css.input}
                value={selectedProduct.articulo_id || ""}
                disabled={isLoading || !catalogos?.articulos.length}
                onChange={(event) => seleccionarProducto(event.target.value)}
              >
                <option value="">Selecciona un producto</option>
                {(catalogos?.articulos ?? []).map((articulo) => (
                  <option key={articulo.id} value={articulo.id}>
                    {articulo.codigo_sku || "Sin SKU"} - {articulo.nombre} ·{" "}
                    stock {articulo.stock_actual}
                  </option>
                ))}
              </select>
              {articuloSeleccionado && (
                <small>
                  Disponible: {articuloSeleccionado.stock_actual} · Precio de
                  lista:{" "}
                  {articuloSeleccionado.precio_lista == null
                    ? "sin definir"
                    : `$${Number(articuloSeleccionado.precio_lista).toLocaleString("es-CL")}`}
                </small>
              )}
            </label>
            <InputText
              label="Cantidad"
              placeholder="Ingresa la cantidad"
              type="number"
              value={String(selectedProduct.cantidad)}
              onChange={(value) => {
                const tmp = catalogos?.articulos?.find(
                  (item) => item?.id === selectedProduct?.articulo_id,
                );
                const cantidad = Number(value);
                if (!tmp) return;
                if (cantidad > tmp.stock_actual) {
                  setSelectedProduct((previous) => ({
                    ...previous,
                    cantidad: tmp.stock_actual,
                  }));
                } else {
                  setSelectedProduct((previous) => ({
                    ...previous,
                    cantidad:
                      Number.isInteger(cantidad) && cantidad > 0 ? cantidad : 0,
                  }));
                }
              }}
              disabled={isLoading || !articuloSeleccionado}
            />
          </div>
          <div className={css.row}>
            <Btn
              onClick={agregarProducto}
              disabled={
                isLoading ||
                isSaving ||
                !articuloSeleccionado ||
                selectedProduct.cantidad <= 0
              }
            >
              Agregar artículo
            </Btn>
          </div>
        </section>

        <section className={css.section} aria-labelledby="products-heading">
          <h2 id="products-heading" className={css.sectionTitle}>
            Productos de la salida
          </h2>
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Cantidad</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {formData.producto.length ? (
                  formData.producto.map((item) => (
                    <tr key={item.articulo_id}>
                      <td>{item.nombre}</td>
                      <td>{item.sku || "—"}</td>
                      <td>{item.cantidad}</td>
                      <td>
                        <Btn
                          warning
                          disabled={isSaving}
                          onClick={() =>
                            setFormData((previous) => ({
                              ...previous,
                              producto: previous.producto.filter(
                                (product) =>
                                  product.articulo_id !== item.articulo_id,
                              ),
                            }))
                          }
                        >
                          Quitar
                        </Btn>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      Agrega productos para preparar la salida.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className={css.actions}>
          <Btn onClick={() => nav("/bodega")} warning>
            Cancelar
          </Btn>
          <Btn
            onClick={() => void guardarSalida()}
            disabled={
              isLoading ||
              isSaving ||
              !formData.obra ||
              !formData.tecnico ||
              !formData.producto.length
            }
          >
            {isSaving ? "Registrando..." : "Guardar salida"}
          </Btn>
        </div>
      </Box>
    </Frame>
  );
}
