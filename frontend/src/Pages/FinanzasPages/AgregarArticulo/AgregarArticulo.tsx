import { useEffect, useState } from "react";
import { Btn } from "../../../Components/Btn/Btn";
import { InputText } from "../../../Components/InputText/InputText";
import { Title } from "../../../Components/Title/Title";
import {
  CreateArticulo,
  EditarArticulo,
} from "../../../Helpers/APIConnector";
import css from "./AgregarArticulo.module.css";
import type { ArticuloCRUD } from "../../../types/general";

interface AgregarArticuloProps {
  isEdit: boolean;
  data?: ArticuloCRUD | null;
  onEnd: () => void;
}

export function AgregarArticulo({
  isEdit,
  onEnd,
  data,
}: AgregarArticuloProps) {
  const BASE_ARTICULO: ArticuloCRUD = {
    id: null,
    codigo_sku: "",
    nombre: "",
    descripcion: "",
    categoria: "",
    ubicacion: "",
    stock_actual: 0,
    stock_minimo: 0,
    precio_lista: null,
  };
  const [articulo, setArticulo] = useState<ArticuloCRUD>({ ...BASE_ARTICULO });

  useEffect(() => {
    if (data) {
      setArticulo({ ...data });
    } else {
      setArticulo({ ...BASE_ARTICULO });
    }
  }, [data]);

  function HandleSaveOrEdit() {
    if (isEdit) {
      EditarArticulo(articulo).then((res) => {
        window.alert(res?.mensaje);
      });
    } else {
      CreateArticulo(articulo).then((res) => {
        window.alert(res?.mensaje);
      });
    }
    onEnd();
  }

  return (
    <div className={css.main}>
      <Title>{isEdit ? "Editar" : "Crear"} artículo</Title>
      <div className={css.form}>
        <InputText
          label="Código SKU"
          placeholder="Ej: EPP-001"
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, codigo_sku: text }));
          }}
          value={articulo.codigo_sku ?? ""}
        />
        <InputText
          label="Nombre *"
          placeholder="Ingrese el nombre del artículo"
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, nombre: text }));
          }}
          value={articulo.nombre}
        />
        <InputText
          label="Categoría"
          placeholder="Ej: EPP"
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, categoria: text }));
          }}
          value={articulo.categoria ?? ""}
        />
        <InputText
          label="Ubicación"
          placeholder="Ej: Estante 1"
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, ubicacion: text }));
          }}
          value={articulo.ubicacion ?? ""}
        />
        <InputText
          label="Stock actual"
          type="number"
          placeholder="Ej: 10"
          onChange={(text) => {
            setArticulo((prev) => ({
              ...prev,
              stock_actual: Number(text) || 0,
            }));
          }}
          value={String(articulo.stock_actual)}
        />
        <InputText
          label="Stock mínimo"
          type="number"
          placeholder="Ej: 5"
          onChange={(text) => {
            setArticulo((prev) => ({
              ...prev,
              stock_minimo: Number(text) || 0,
            }));
          }}
          value={String(articulo.stock_minimo)}
        />
        <InputText
          label="Precio lista"
          type="number"
          placeholder="Ej: 15000"
          onChange={(text) => {
            setArticulo((prev) => ({
              ...prev,
              precio_lista: text === "" ? null : Number(text),
            }));
          }}
          value={articulo.precio_lista == null ? "" : String(articulo.precio_lista)}
        />
        <InputText
          label="Descripción"
          placeholder="Ingrese una descripción del artículo"
          isArea
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, descripcion: text }));
          }}
          value={articulo.descripcion ?? ""}
        />
      </div>
      <div className={css.row}>
        <Btn
          onClick={() => {
            onEnd();
          }}
          warning
        >
          Cancelar
        </Btn>
        <Btn
          disabled={!articulo.nombre.trim()}
          onClick={() => {
            HandleSaveOrEdit();
          }}
        >
          {isEdit ? "Guardar artículo" : "Crear artículo"}
        </Btn>
      </div>
    </div>
  );
}
