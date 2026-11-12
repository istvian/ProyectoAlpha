import { useEffect, useState } from "react";
import { Btn } from "../../../Components/Btn/Btn";
import { InputText } from "../../../Components/InputText/InputText";
import { Title } from "../../../Components/Title/Title";
import {
  CreateProveedor,
  EditarProveedor,
} from "../../../Helpers/APIConnector";
import css from "./AgregarProveedor.module.css";
import type { Proveedor } from "../../../types/general";
import { Selector } from "../../../Components/Selector/Selector";

interface AgregarProveedorProps {
  isEdit: boolean;
  data?: Proveedor | null;
  onEnd: () => void;
}

export function AgregarProveedor({
  isEdit,
  onEnd,
  data,
}: AgregarProveedorProps) {
  const BASE_PROVEEDOR: Proveedor = {
    razon_social: "",
    rut: "",
    deleted: false,
    id: null,
  };
  const [proveedor, setProveedor] = useState<Proveedor>({ ...BASE_PROVEEDOR });

  useEffect(() => {
    if (data) {
      setProveedor(data);
    } else {
      setProveedor({ ...BASE_PROVEEDOR });
    }
  }, [data]);

  function HandleSaveOrEdit() {
    if (isEdit) {
      EditarProveedor(proveedor).then((res) => {
        window.alert(res?.mensaje);
      });
    } else {
      CreateProveedor(proveedor).then((res) => {
        window.alert(res?.mensaje);
      });
    }
    onEnd();
  }

  return (
    <div className={css.main}>
      <Title>{isEdit ? "Editar" : "Crear"} proveedor</Title>
      <InputText
        label="Razón social"
        placeholder="Ingrese la razón social"
        onChange={(text) => {
          setProveedor((prev) => ({ ...prev, razon_social: text }));
        }}
        value={proveedor.razon_social}
      />
      <InputText
        label="RUT"
        placeholder="Ingrese el RUT"
        onChange={(text) => {
          setProveedor((prev) => ({ ...prev, rut: text }));
        }}
        value={proveedor.rut}
      />
      <Selector
        title="Estado"
        data={proveedor.deleted ? 2 : 1}
        setValue={(value) => {
          setProveedor((prev) => ({
            ...prev,
            deleted: value == 1 ? false : true,
          }));
        }}
        options={["Activo", "Deshabilitado"]}
        firstOption="Selecciona un estado"
      />
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
          disabled={!proveedor.razon_social.trim() || !proveedor.rut.trim()}
          onClick={() => {
            HandleSaveOrEdit();
          }}
        >
          {isEdit ? "Guardar proveedor" : "Crear proveedor"}
        </Btn>
      </div>
    </div>
  );
}
