import { useNavigate } from "react-router-dom";
import css from "./PanelAdmin.module.css";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol } from "../../../types/general";
import { Frame } from "../../../Components/Frame/Frame";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Title } from "../../../Components/Title/Title";
import { CardContainer } from "../../../Components/CardContainer/CardContainer";
import { Card } from "../../../Components/Card/Card";
import { Selector } from "../../../Components/Selector/Selector";
import { InputText } from "../../../Components/InputText/InputText";
import { InputDate } from "../../../Components/InputDate/InputDate";

export function PanelAdmin() {
  const nav = useNavigate();
  if (useValidateRol([Rol.admin]))
    return (
      <Frame>
        <Box
          style={{
            flexFlow: "row nowrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Title>Panel Admin</Title>
            <p>
              Administra usuarios, asigna roles y consulta la actividad del
              sistema.
            </p>
          </div>
          <div className={css.actions}>
            <Btn onClick={() => {}}>Crear nuevo usuario</Btn>
          </div>
        </Box>
        <CardContainer>
          <Card
            title="Usuarios registrados"
            content="7 usuarios"
            footer="6 activos - 1 suspendido"
          />
          <Card
            title="Roles disponibles"
            content="4 roles"
            footer="Permisos según perfíl de acceso"
          />
          <Card
            title="Inicios de sesión fallidos hoy"
            content="2 intentos"
            footer="1 contraseña incorrecta - 1 cuenta suspendida"
          />
          <Card
            title="Actividad de hoy"
            content="6 eventos"
            footer="Último registro: 13/10/2026 - 09:5"
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
              onChange={() => {}}
              placeholder="Nombre o correo electrónico"
              value=""
            />
            <Selector
              title="Rol"
              data=""
              setData={() => {}}
              options={[
                "Todos los roles",
                "Administrador",
                "Finanzas",
                "Bodega",
                "Supervisor",
              ]}
              firstOption="Selecciona un rol"
            />
            <Selector
              title="Estado"
              data=""
              setData={() => {}}
              options={["Todos los estados", "Activo", "Suspendido"]}
              firstOption="Selecciona un estado"
            />
            <Btn onClick={() => {}}>Buscar</Btn>
            <Btn onClick={() => {}}>Limpiar</Btn>
          </div>
          <div className={css.rolContainer}>
            <span className={css.rolCount}>Administrador: 2</span>
            <span className={css.rolCount}>Finanzas: 2</span>
            <span className={css.rolCount}>Bodeguero: 2</span>
            <span className={css.rolCount}>Supervisor: 2</span>
          </div>
          <div className={css.tableContainer}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo electrónico</th>
                  <th>Rol asignado</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th>Administración</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Usuario</td>
                  <td>Correo electrónico</td>
                  <td>Rol asignado</td>
                  <td>Estado</td>
                  <td>Último acceso</td>
                  <td>Administración</td>
                </tr>
              </tbody>
            </table>
            <div className={css.row}>
              <p className={css.resumen}>Mostrando 7 de 7 usuarios</p>
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
          <div className={css.filters}>
            <InputText
              label="Usuario o origen"
              onChange={() => {}}
              placeholder="Buscar correo o IP"
              value=""
            />
            <InputDate label="Desde" onChange={() => {}} value={new Date()} />
            <InputDate label="Hasta" onChange={() => {}} value={new Date()} />
            <Selector
              title="Resultado"
              data=""
              setData={() => {}}
              options={["Todos", "Exitoso", "Denegado"]}
              firstOption="Selecciona un resultado"
            />

            <Btn onClick={() => {}}>Buscar</Btn>
            <Btn onClick={() => {}}>Limpiar</Btn>
          </div>
          <div className={css.rolContainer}>
            <span className={css.rolCount}>Administrador: 2</span>
            <span className={css.rolCount}>Finanzas: 2</span>
            <span className={css.rolCount}>Bodeguero: 2</span>
            <span className={css.rolCount}>Supervisor: 2</span>
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
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fecha/hora</td>
                  <td>Usuario que ejecuta</td>
                  <td>Evento y detalle</td>
                  <td>Resultado</td>
                  <td>IP / origen</td>
                  <td>Consulta</td>
                </tr>
              </tbody>
            </table>
            <div className={css.row}>
              <p className={css.resumen}>Actualizado a las 09:30</p>
            </div>
          </div>
        </Box>
      </Frame>
    );
}
