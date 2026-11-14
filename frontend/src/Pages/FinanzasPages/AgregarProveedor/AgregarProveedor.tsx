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

function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

function formatearRut(rut: string): string {
  const rutLimpio = limpiarRut(rut);
  if (rutLimpio.length < 2) return rutLimpio;

  const cuerpo = rutLimpio.slice(0, -1);
  const digitoVerificador = rutLimpio.slice(-1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFormateado}-${digitoVerificador}`;
}

function rutEsValido(rut: string): boolean {
  const rutLimpio = limpiarRut(rut);
  const cuerpo = rutLimpio.slice(0, -1);
  const digitoVerificador = rutLimpio.slice(-1);
  if (!/^\d{7,8}$/.test(cuerpo) || !/^[0-9K]$/.test(digitoVerificador)) {
    return false;
  }

  let suma = 0;
  let multiplicador = 2;
  for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cuerpo[indice]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  const verificadorEsperado =
    resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return digitoVerificador === verificadorEsperado;
}

function normalizarRut(rut: string): string {
  const rutLimpio = limpiarRut(rut);
  return `${rutLimpio.slice(0, -1)}-${rutLimpio.slice(-1)}`;
}

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
  const [rutRevisado, setRutRevisado] = useState(false);
  const rutValido = rutEsValido(proveedor.rut);

  useEffect(() => {
    if (data) {
      setProveedor({ ...data, rut: formatearRut(data.rut) });
    } else {
      setProveedor({ ...BASE_PROVEEDOR });
    }
    setRutRevisado(false);
  }, [data]);

  function HandleSaveOrEdit() {
    if (!rutEsValido(proveedor.rut)) {
      setRutRevisado(true);
      return;
    }

    const proveedorValidado = {
      ...proveedor,
      rut: normalizarRut(proveedor.rut),
    };
    if (isEdit) {
      EditarProveedor(proveedorValidado).then((res) => {
        window.alert(res?.mensaje);
      });
    } else {
      CreateProveedor(proveedorValidado).then((res) => {
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
        label="RUT *"
        placeholder="12.345.678-5"
        onChange={(text) => {
          setProveedor((prev) => ({ ...prev, rut: text }));
        }}
        onBlur={() => {
          setRutRevisado(true);
          setProveedor((prev) => ({ ...prev, rut: formatearRut(prev.rut) }));
        }}
        value={proveedor.rut}
      />
      <p className={css.rutHelp}>
        Formato sugerido: <strong>12.345.678-5</strong>. Se formatea
        automáticamente al salir del campo.
      </p>
      {rutRevisado && (
        <p className={rutValido ? css.rutValid : css.rutError} role="status">
          {rutValido
            ? "RUT válido."
            : "RUT inválido. Revisa el número y su dígito verificador."}
        </p>
      )}
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
          disabled={!proveedor.razon_social.trim() || !rutValido}
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
