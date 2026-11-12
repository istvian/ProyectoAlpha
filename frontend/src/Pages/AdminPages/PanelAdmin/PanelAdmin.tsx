import { useNavigate } from "react-router-dom";
import css from "./PanelAdmin.module.css";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol, type SystemLog, type UserData } from "../../../types/general";
import { Frame } from "../../../Components/Frame/Frame";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Title } from "../../../Components/Title/Title";
import { CardContainer } from "../../../Components/CardContainer/CardContainer";
import { Card } from "../../../Components/Card/Card";
import { Selector } from "../../../Components/Selector/Selector";
import { InputText } from "../../../Components/InputText/InputText";
import { InputDate } from "../../../Components/InputDate/InputDate";
import { Popup } from "../../../Components/Popup/Popup";
import { useEffect, useState } from "react";
import {
  CreateNewUser,
  GetLogs,
  GetUserList,
  UpdateUser,
} from "../../../Helpers/APIConnector";

export function PanelAdmin() {
  const BASE_USUARIO: UserData = {
    correo: "",
    enabled: true,
    nombre: "",
    password: "",
    rol_id: 0,
    rol: "",
  };
  const [showPopup, setshowPopup] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [user, setUser] = useState<UserData>({ ...BASE_USUARIO });

  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [rolQuery, setRolQuery] = useState<number>(0);
  const [statusQuery, setStatusQuery] = useState<number | string>("");
  const ROLES_OPTIONS = [
    "Todos",
    "Admin",
    "Bodega",
    "Finanzas",
    "Supervisor",
    "Técnico",
  ];

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [paginaLog, setPaginaLog] = useState(1);

  useEffect(() => {
    GetUserList().then((res) => {
      if (!res?.error) {
        console.log(res);
        if (res?.data) {
          setUsersList(res.data);
          setFilteredUsers(res.data);
        }
      }
    });
  }, [showPopup]);

  useEffect(() => {
    GetLogs(20, paginaLog).then((res) => {
      if (!res?.error && res?.data) setLogs(res?.data);
    });
  }, [paginaLog]);

  function HandleSearch() {
    const query = searchQuery?.toLowerCase()?.trim();

    const filtered = usersList.filter((item) => {
      const matchesQuery =
        !query ||
        item.nombre.toLowerCase().includes(query) ||
        item.correo.toLowerCase().includes(query);

      let matchesRol = true;
      const selectedRolName = ROLES_OPTIONS[rolQuery - 1];
      matchesRol = item.rol?.toLowerCase() === selectedRolName?.toLowerCase();
      if (rolQuery - 1 <= 0) {
        matchesRol = true;
      }

      let matchesStatus = true;
      if (
        statusQuery === 1 ||
        statusQuery === "1" ||
        statusQuery === "Activo"
      ) {
        matchesStatus = item.enabled === true;
      } else if (
        statusQuery === 2 ||
        statusQuery === "2" ||
        statusQuery === "Suspendido"
      ) {
        matchesStatus = item.enabled === false;
      }

      return matchesQuery && matchesRol && matchesStatus;
    });

    setFilteredUsers(filtered);
  }

  function HandleClear() {
    setSearchQuery("");
    setRolQuery(0);
    setStatusQuery("");
    setFilteredUsers(usersList);
  }

  async function HandleSaveOrEdit() {
    setshowPopup(false);
    if (isEdit) {
      await UpdateUser(user).then((res) => {
        alert(res?.mensaje);
        setUser({ ...BASE_USUARIO });
      });
    } else {
      await CreateNewUser(user).then((res) => {
        alert(res?.mensaje);
        setUser({ ...BASE_USUARIO });
      });
    }
  }

  if (useValidateRol([Rol.admin]))
    return (
      <Frame>
        <Popup isVisible={showPopup}>
          <Title>{isEdit ? "Editar" : "Crear"} usuario</Title>
          <InputText
            label="Correo electrónico"
            placeholder="Ingrese correo electrónico"
            onChange={(text) => {
              setUser((prev) => ({ ...prev, correo: text }));
            }}
            value={user.correo}
          />
          <InputText
            label="Nombre"
            placeholder="Ingrese nombre del trabajador"
            onChange={(text) => {
              setUser((prev) => ({ ...prev, nombre: text }));
            }}
            value={user.nombre}
          />
          {isEdit ? (
            <p>Si ingresa una contraseña sobreescribira a la anterior</p>
          ) : (
            ""
          )}
          <InputText
            label="Contraseña"
            placeholder="Ingrese contraseña del trabajador"
            onChange={(text) => {
              setUser((prev) => ({ ...prev, password: text }));
            }}
            value={user.password || ""}
          />
          <Selector
            title="Rol"
            data={user.rol_id}
            setValue={(value) => {
              setUser((prev) => ({ ...prev, rol_id: value }));
            }}
            options={[
              "Administrador",
              "Bodega",
              "Finanzas",
              "Supervisor",
              "Técnico",
            ]}
            firstOption="Selecciona un rol"
          />
          <Selector
            title="Estado"
            data={user.enabled ? 1 : 2}
            setValue={(value) => {
              setUser((prev) => ({
                ...prev,
                enabled: value == 1 ? true : false,
              }));
            }}
            options={["Activo", "Suspendido"]}
            firstOption="Selecciona un estado"
          />
          <div className={css.row}>
            <Btn
              onClick={() => {
                setshowPopup(false);
                setUser({ ...BASE_USUARIO });
              }}
              warning
            >
              Cancelar
            </Btn>
            <Btn
              onClick={() => {
                HandleSaveOrEdit();
              }}
            >
              {isEdit ? "Guardar usuario" : "Crear usuario"}
            </Btn>
          </div>
        </Popup>
        <Box
          style={{
            flexFlow: "row nowrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Title>Panel Admin TI</Title>
            <p>
              Administra usuarios, asigna roles y consulta la actividad del
              sistema.
            </p>
          </div>
          <div className={css.actions}>
            <Btn
              onClick={() => {
                setshowPopup(true);
                setIsEdit(false);
              }}
            >
              Crear nuevo usuario
            </Btn>
          </div>
        </Box>
        <CardContainer>
          <Card
            title="Usuarios registrados"
            content={usersList.length + " usuarios"}
            footer={`${usersList.filter((item) => item.enabled).length} activos - ${usersList.filter((item) => !item.enabled).length} suspendido`}
          />
          <Card
            title="Roles disponibles"
            content={`${new Set(usersList.map((item) => item.rol)).size} roles`}
            footer="Permisos según perfíl de acceso"
          />
          <Card
            title="Actividad de hoy"
            content={`${logs.length} eventos`}
            footer={`Último registro: ${new Date(logs[0]?.fecha_local).toLocaleString("es-CL")}`}
          />
        </CardContainer>
        <Box>
          <div className={css.row}>
            <Title>Gestión de usuarios</Title>
            <p className={css.resumen}>Administra datos, estados y accesos</p>
          </div>
          <div className={css.filters}>
            <InputText
              label="Buscar usuario"
              onChange={(text) => {
                setSearchQuery(text);
              }}
              placeholder="Nombre o correo electrónico"
              value={searchQuery}
            />
            <Selector
              title="Rol"
              data={rolQuery}
              setValue={(value) => {
                setRolQuery(value);
              }}
              options={ROLES_OPTIONS}
              firstOption="Selecciona un rol"
            />
            <Selector
              title="Estado"
              data={statusQuery}
              setValue={(value) => {
                setStatusQuery(value);
              }}
              options={["Activo", "Suspendido"]}
              firstOption="Selecciona un estado"
            />
            <Btn
              onClick={() => {
                HandleSearch();
              }}
            >
              Buscar
            </Btn>
            <Btn
              onClick={() => {
                HandleClear();
              }}
            >
              Limpiar
            </Btn>
          </div>
          <div className={css.rolContainer}>
            <span className={css.rolCount}>
              Administrador:
              {filteredUsers.filter((item) => item.rol_id == Rol.admin).length}
            </span>
            <span className={css.rolCount}>
              Finanzas:{" "}
              {
                filteredUsers.filter((item) => item.rol_id == Rol.finanzas)
                  .length
              }
            </span>
            <span className={css.rolCount}>
              Bodeguero:{" "}
              {
                filteredUsers.filter((item) => item.rol_id === Rol.bodega)
                  .length
              }
            </span>
            <span className={css.rolCount}>
              Supervisor:{" "}
              {
                filteredUsers.filter((item) => item.rol_id == Rol.supervisor)
                  .length
              }
            </span>
          </div>
          <div className={css.tableContainer}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo electrónico</th>
                  <th>Rol asignado</th>
                  <th>Estado</th>
                  <th>Fecha de creación</th>
                  <th>Administración</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers?.map((item) => {
                  return (
                    <tr key={item.correo}>
                      <td>{item.nombre}</td>
                      <td>{item.correo}</td>
                      <td>{item.rol}</td>
                      <td>{item.enabled ? "Activo" : "Suspendido"}</td>
                      <td>
                        {new Date(item?.created || "").toLocaleString("es-CL")}
                      </td>
                      <td>
                        <Btn
                          onClick={() => {
                            setIsEdit(true);
                            setshowPopup(true);
                            setUser(item);
                          }}
                        >
                          Modificar
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className={css.row}>
              <p className={css.resumen}>
                Mostrando {filteredUsers.length} de {usersList.length} usuarios
              </p>
            </div>
          </div>
        </Box>
        <Box>
          <div className={css.row}>
            <Title>Logs del sistema</Title>
            <p className={css.resumen}>
              Auditoría de accesos y cambios administrativos. Registros de sólo
              lectura, sin edición ni eliminación
            </p>
          </div>
          <div className={css.tableContainer}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Fecha/hora</th>
                  <th>Usuario que ejecuta</th>
                  <th>Evento y detalle</th>
                  <th>Resultado</th>
                  <th>IP / origen</th>
                  <th>Consulta</th>
                  <th>Ruta</th>
                  <th>Query</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => {
                  return (
                    <tr key={item._id}>
                      <td>
                        {new Date(item.fecha_local).toLocaleString("es-CL")}
                      </td>
                      <td>{item.usuario}</td>
                      <td>{item.evento}</td>
                      <td>{item.resultado}</td>
                      <td>{item.ipOrigen}</td>
                      <td>{item.consulta.method}</td>
                      <td>{item.consulta.path}</td>
                      <td>{item.consulta.query}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className={css.row}>
              <p className={css.resumen}>
                Actualizado a las {new Date().toLocaleTimeString("es-CL")}
              </p>
              <div className={css.navegacion}>
                <p className={css.resumen}>20 por página</p>
                <p
                  className={css.btn}
                  onClick={() => {
                    if (paginaLog > 1) {
                      setPaginaLog((prev) => prev - 1);
                    }
                  }}
                >
                  Anterior
                </p>
                <p className={css.btnActive}>{paginaLog}</p>
                <p
                  className={css.btn}
                  onClick={() => {
                    setPaginaLog((prev) => prev + 1);
                  }}
                >
                  Siguiente
                </p>
              </div>
            </div>
          </div>
        </Box>
      </Frame>
    );
}
