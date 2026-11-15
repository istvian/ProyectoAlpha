import { useEffect, useState } from "react";
import { Box } from "../../Components/Box/Box";
import { Frame } from "../../Components/Frame/Frame";
import { Title } from "../../Components/Title/Title";
import css from "./Main.module.css";
import {
  GetAdminDashboard,
  GetUserData,
} from "../../Helpers/APIConnector";
import { Rol, type AdminDashboardData } from "../../types/general";
import { Btn } from "../../Components/Btn/Btn";
import { Card } from "../../Components/Card/Card";
import { CardContainer } from "../../Components/CardContainer/CardContainer";
import useValidateRol from "../../Hooks/useValidateRol";
import { Spinner } from "../../Components/Spinner/Spinner";
import { useNavigate } from "react-router-dom";

function formatoDinero(valor: string): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(valor));
}

export function Main() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorDashboard, setErrorDashboard] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    GetUserData().then((res) => {
      if (!res || res.error) return;
      if (res.rol_id === Rol.admin) return;
      if (res?.rol_id === Rol.bodega) nav("bodega");
      if (res?.rol_id === Rol.finanzas) nav("finanzas");
      if (res?.rol_id === Rol.supervisor) nav("inventario");
    });
  }, []);
  useEffect(() => {
    let active = true;
    GetAdminDashboard()
      .then((response) => {
        if (!response || response.error || !response.data) {
          throw new Error(
            response?.mensaje || "No se pudieron cargar los indicadores.",
          );
        }
        if (active) setDashboard(response.data);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorDashboard(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los indicadores.",
          );
        }
      })
      .finally(() => {
        if (active) setCargando(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isAdmin = useValidateRol([Rol.admin]);
  if (!isAdmin) return <Spinner />;

  const movimientos = dashboard?.movimientos_hoy;
  const roles = dashboard?.usuarios_por_rol ?? {};
  const contenido = (valor: number | undefined) =>
    cargando ? "…" : errorDashboard ? "—" : String(valor ?? 0);

  return (
    <Frame>
      <Box
        style={{
          flexFlow: "row wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className={css.welcome}>
          <Title>Panel de administración</Title>
          <p>Indicadores calculados desde inventario, usuarios y Cardex.</p>
        </div>
        <div className={css.actions}>
          <Btn onClick={() => nav("/bodega")}>Operaciones de Bodega</Btn>
          <Btn onClick={() => nav("/bodega/recepcion")}>
            Recepción y aprobaciones
          </Btn>
          <Btn onClick={() => nav("/bodega/salida")}>Registrar salida</Btn>
          <Btn onClick={() => nav("/finanzas")}>Compras y facturación</Btn>
          <Btn onClick={() => nav("/cardex")}>Cardex y reportes</Btn>
          <Btn onClick={() => nav("/admin")}>Usuarios y auditoría</Btn>
        </div>
      </Box>
      {errorDashboard && (
        <p className={css.error} role="alert">
          No se pudo cargar el panel: {errorDashboard}
        </p>
      )}
      <CardContainer>
        <Card
          title="Total de productos"
          content={contenido(dashboard?.productos)}
          footer="Registros de artículos"
        />
        <Card
          title="Valor en inventario"
          content={
            cargando
              ? "…"
              : errorDashboard || !dashboard
                ? "—"
                : formatoDinero(dashboard.valor_inventario)
          }
          footer="Stock actual valorizado a PMP"
        />
        <Card
          title="Stock crítico"
          content={contenido(dashboard?.stock_critico)}
          footer="Artículos en o bajo su mínimo"
        />
        <Card
          title="Movimientos de hoy"
          content={contenido(movimientos?.movimientos)}
          footer={`${movimientos?.entradas ?? 0} entradas · ${movimientos?.salidas ?? 0} salidas`}
        />
        <Card
          title="Usuarios activos"
          content={contenido(dashboard?.usuarios_activos)}
          footer="Usuarios habilitados"
        />
        <Card
          title="Usuarios por rol"
          customContent={
            <div className={css.roles}>
              <p>{contenido(roles.admin)} administradores</p>
              <p>{contenido(roles.finanzas)} finanzas</p>
              <p>{contenido(roles.bodega)} bodega</p>
              <p>{contenido(roles.supervisor)} supervisores</p>
              <p>{contenido(roles.tecnico)} técnicos</p>
            </div>
          }
        />
        <Card
          title="Mermas registradas"
          content={contenido(dashboard?.mermas_registradas)}
          footer="Movimientos de merma en Cardex"
        />
        <Card
          title="Proveedores activos"
          content={contenido(dashboard?.proveedores_activos)}
          footer="Proveedores habilitados"
        />
      </CardContainer>
    </Frame>
  );
}
