import { useState } from "react";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { InputText } from "../../../Components/InputText/InputText";
import { Title } from "../../../Components/Title/Title";
import css from "./AgregarArticulo.module.css";
import type { Articulo } from "../../../types/general";

interface AgregarArticuloProps {
  onEnd: () => void;
}

export function AgregarArticulo({ onEnd }: AgregarArticuloProps) {
  const ARTICULO__BASE: Articulo = {
    categoria: "",
    codigo: "",
    descripcion: "",
    nombre: "",
    stock: 0,
    stockMinimo: 0,
    ubicacion: "",
  };
  const [articulo, setArticulo] = useState<Articulo>(ARTICULO__BASE);
  return (
    <Box
      style={{
        flexFlow: "column nowrap",
        alignItems: "flex-start",
        justifyContent: "flex-start",
      }}
    >
      <div>
        <Title>Agregar artículo</Title>
        <p>Completa el formulario para agregar un artículo al inventario</p>
      </div>
      <div className={css.inputs}>
        <InputText
          label="Código"
          placeholder="Ej:EPP-001"
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, codigo: text }));
          }}
          value={articulo.codigo}
        />
        <InputText
          label="Nombre del artículo"
          placeholder="Ej: Guantes termicos de seguridad"
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, nombre: text }));
          }}
          value={articulo.nombre}
        />
        <InputText
          label="Descripción"
          placeholder="Ej: Este artículo es de uso obligatorio para el personal de mantenimiento"
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, descripcion: text }));
          }}
          value={articulo.descripcion}
        />
        <InputText
          label="Categoría"
          placeholder="Ej: EPP"
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, categoria: text }));
          }}
          value={articulo.categoria}
        />
        <InputText
          label="Stock"
          type="number"
          placeholder="Ej: 10"
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, stock: Number(text) || 0 }));
          }}
          value={String(articulo.stock)}
        />
        <InputText
          label="Stock mínimo"
          type="number"
          placeholder="Ej: 5"
          onChange={(text) => {
            setArticulo((prev) => ({
              ...prev,
              stockMinimo: Number(text) || 0,
            }));
          }}
          value={String(articulo.stockMinimo)}
        />
        <InputText
          label="Ubicación"
          placeholder="Ej: Estante 1"
          onChange={(text) => {
            setArticulo((prev) => ({ ...prev, ubicacion: text }));
          }}
          value={articulo.ubicacion}
        />
      </div>
      <div className={css.row}>
        <Btn
          onClick={() => {
            onEnd();
          }}
        >
          Cancelar
        </Btn>
        <Btn
          onClick={() => {
            onEnd();
          }}
        >
          Crear nuevo artículo
        </Btn>
      </div>
    </Box>
  );
}
