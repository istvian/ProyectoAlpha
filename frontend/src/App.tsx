import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { LoginPage } from "./Pages/Login/LoginPage";
import { Main } from "./Pages/Main/Main";
import { NotFound } from "./Pages/NotFound/NotFound";
import { Inventario } from "./Pages/Inventario/Inventario";
import { Nav } from "./Components/Nav/Nav";
import { Frame } from "./Components/Frame/Frame";
import { Footer } from "./Components/Footer/Footer";
import { AgregarArticulo } from "./Pages/InventariosPages/AgregarArticulo/AgregarArticulo";
import { FinanzasMain } from "./Pages/FinanzasPages/FinanzasMain/FinanzasMain";
import { Bodega } from "./Pages/BodegaPages/Bodega/Bodega";
import { Spinner } from "./Components/Spinner/Spinner";
import useIsLogin from "./Hooks/useIsLogin";
import { NotAllowed } from "./Pages/NotAllowed/NotAllowed";
import useValidateRol from "./Hooks/useValidateRol";
import { Rol } from "./types/general";
import { CardexMain } from "./Pages/CardexPages/CardexMain/CardexMain";
import { PanelAdmin } from "./Pages/AdminPages/PanelAdmin/PanelAdmin";
import { useSessionStore } from "./Stores/session";
import { useEffect } from "react";
import { RenewToken } from "./Helpers/APIConnector";

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
  return (
    <div className="App">
      <Frame>
        <BrowserRouter>
          <Nav />
          <Routes>
            <Route element={<Main />} path="/" />
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
                  element={<AgregarArticulo />}
                  path="/inventario/agregar"
                />
                <Route element={<NotFound />} path="*" />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Footer />
      </Frame>
    </div>
  );
}

export default App;
