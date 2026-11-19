import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import "./App.css";
import { LoginPage } from "./Pages/Login/LoginPage";
import { Main } from "./Pages/Dashboard/Main";
import { NotFound } from "./Pages/NotFound/NotFound";
import { Inventario } from "./Pages/InventariosPages/Inventario/Inventario";
import { Nav } from "./Components/Nav/Nav";
import { Frame } from "./Components/Frame/Frame";
import { Footer } from "./Components/Footer/Footer";
import { FinanzasMain } from "./Pages/FinanzasPages/FinanzasMain/FinanzasMain";
import { Bodega } from "./Pages/BodegaPages/Bodega/Bodega";
import { Spinner } from "./Components/Spinner/Spinner";
import useIsLogin from "./Hooks/useIsLogin";
import { NotAllowed } from "./Pages/NotAllowed/NotAllowed";
import { CardexMain } from "./Pages/CardexPages/CardexMain/CardexMain";
import { PanelAdmin } from "./Pages/AdminPages/PanelAdmin/PanelAdmin";
import { useSessionStore } from "./Stores/session";
import { useEffect } from "react";
import { RenewToken } from "./Helpers/APIConnector";
import { SalidaMateriales } from "./Pages/BodegaPages/SalidaMateriales/SalidaMateriales";
import { RecepcionCompras } from "./Pages/BodegaPages/RecepcionCompras/RecepcionCompras";
import { ConteoInventarioPage } from "./Pages/BodegaPages/ConteoInventario/ConteoInventario";
import { RegistroMermasConsumo } from "./Pages/BodegaPages/RegistroMermasConsumo/RegistroMermasConsumo";

function ProtectedRoute() {
  const status = useIsLogin();

  if (status === "checking") return <Spinner />;
  if (status === "unauthorized") return <NotAllowed />;
  if (status !== "authorized") return <Navigate to="/login" replace />;

  return <Outlet />;
}
function PrivateLayout() {
  return (
    <>
      <Nav />
      <Outlet />
      <Footer />
    </>
  );
}

function App() {
  const { expiresAt, setExpiresAt, clear } = useSessionStore();
  useEffect(() => {
    if (!expiresAt) return;

    const delay = expiresAt - Date.now() - 60_000; // 1 min antes de expirar
    console.log("Ahora:", new Date().toISOString());
    console.log("Expira:", new Date(expiresAt).toISOString());
    console.log("Aviso en:", delay, "ms");

    const timeoutId = setTimeout(
      async () => {
        const ok = confirm(
          "Su sesión está por caducar. ¿Desea seguir utilizando la cuenta?",
        );

        if (ok) {
          try {
            await RenewToken();
          } catch {
            clear();
            window.location.href = "/login";
          }
        } else {
          clear();
          window.location.href = "/login";
        }
      },
      Math.max(delay, 0),
    );

    return () => clearTimeout(timeoutId);
  }, [expiresAt, setExpiresAt, clear]);

  return (
    <div className="App">
      <Frame>
        <BrowserRouter>
          <Routes>
            <Route element={<LoginPage />} path="/login" />
            <Route element={<NotAllowed />} path="/403" />
            <Route element={<ProtectedRoute />}>
              <Route element={<PrivateLayout />}>
                <Route element={<Main />} path="/" />
                <Route element={<Inventario />} path="/inventario" />
                <Route element={<FinanzasMain />} path="/finanzas" />
                <Route element={<CardexMain />} path="/cardex" />
                <Route element={<PanelAdmin />} path="/admin" />
                <Route element={<Bodega />} path="/bodega" />
                <Route
                  element={<RecepcionCompras />}
                  path="/bodega/recepcion"
                />
                <Route
                  element={<ConteoInventarioPage />}
                  path="/bodega/conteo"
                />
                <Route element={<SalidaMateriales />} path="/bodega/salida" />
                <Route
                  element={<RegistroMermasConsumo />}
                  path="/bodega/mermas"
                />
                <Route element={<NotFound />} path="*" />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </Frame>
    </div>
  );
}

export default App;
