import { useEffect, useState } from "react";
import { Btn } from "../../../Components/Btn/Btn";
import { InputText } from "../../../Components/InputText/InputText";
import { Title } from "../../../Components/Title/Title";
import {
  CreateObra,
  EditarObra,
  GetTecnicos,
} from "../../../Helpers/APIConnector";
import css from "./AgregarObras.module.css";
import type { Obra, UserData } from "../../../types/general";
import { Selector } from "../../../Components/Selector/Selector";

interface AgregarProveedorProps {
  isEdit: boolean;
  obras?: Obra | null;
  onEnd: () => void;
}

export function AgregarObras({ isEdit, onEnd, obras }: AgregarProveedorProps) {
  const [tecnicos, setTecnicos] = useState<UserData[]>([]);
  const BASE_OBRA: Obra = {
    id: null,
    codigo_obra: "",
    enabled: true,
    fecha_creacion: new Date(),
    nombre_obra: "",
    tecnico_responsable_mail: tecnicos[0]?.correo || "",
    tipo_servicio: "",
  };
  const [obra, setObra] = useState<Obra>({ ...BASE_OBRA });

  useEffect(() => {
    if (obras) {
      setObra(obras);
    } else {
      setObra({ ...BASE_OBRA });
    }
  }, [obras]);

  useEffect(() => {
    console.log(obra);
  }, [obra]);

  useEffect(() => {
    GetTecnicos().then((res) => {
      if (res?.data) {
        setTecnicos(res.data);
      }
    });
  }, []);

  function HandleSaveOrEdit() {
    if (isEdit) {
      EditarObra(obra).then((res) => {
        window.alert(res?.mensaje);
      });
    } else {
      CreateObra(obra).then((res) => {
        window.alert(res?.mensaje);
      });
    }
    onEnd();
  }

  return (
    <div className={css.main}>
      <Title>{isEdit ? "Editar" : "Crear"} obra</Title>
      <InputText
        label="Nombre de obra"
        placeholder="Ingrese el nombre de la obra"
        onChange={(text) => {
          setObra((prev) => ({ ...prev, nombre_obra: text }));
        }}
        value={obra.nombre_obra}
      />
      <InputText
        label="Tipo de servicio"
        placeholder="Ingrese el tipo de servicio"
        onChange={(text) => {
          setObra((prev) => ({ ...prev, tipo_servicio: text }));
        }}
        value={obra.tipo_servicio}
      />
      <Selector
        title="Técnico responsable"
        data={obra.tecnico_responsable_mail}
        setData={(value) => {
          setObra((prev) => ({
            ...prev,
            tecnico_responsable_mail: value,
          }));
        }}
        options={tecnicos.map((item) => {
          return item.correo;
        })}
        firstOption="Selecciona un estado"
      />
      <Selector
        title="Estado"
        data={obra.enabled ? 2 : 1}
        setValue={(value) => {
          setObra((prev) => ({
            ...prev,
            enabled: value == 1 ? false : true,
          }));
        }}
        options={["Deshabilitada", "Habilitada"]}
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
          disabled={
            !obra?.nombre_obra?.trim() || !obra?.tecnico_responsable_mail
          }
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
