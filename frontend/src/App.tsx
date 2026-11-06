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
import { AgregarArticulo } from "./Pages/InventariosPages/AgregarArticulo/AgregarArticulo";
import { FinanzasMain } from "./Pages/FinanzasPages/FinanzasMain/FinanzasMain";
import { Bodega } from "./Pages/BodegaPages/Bodega/Bodega";
import { Spinner } from "./Components/Spinner/Spinner";
import useIsLogin from "./Hooks/useIsLogin";

function ProtectedRoute() {
  const status = useIsLogin();

  if (status === "checking") return <Spinner />;
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
          <Routes>
            <Route element={<LoginPage />} path="/login" />
            <Route element={<ProtectedRoute />}>
              <Route element={<PrivateLayout />}>
                <Route element={<Main />} path="/" />
                <Route element={<Inventario />} path="/inventario" />
                <Route element={<FinanzasMain />} path="/finanzas" />
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
      </Frame>
    </div>
  );
}

export default App;
