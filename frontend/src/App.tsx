import { BrowserRouter, Route, Routes } from "react-router-dom";
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

function App() {
  return (
    <div className="App">
      <Frame>
        <BrowserRouter>
          <Nav />
          <Routes>
            <Route element={<Main />} path="/" />
            <Route element={<LoginPage />} path="/login" />
            <Route element={<Inventario />} path="/inventario" />
            <Route element={<FinanzasMain />} path="/finanzas" />
            <Route element={<Bodega />} path="/bodega" />
            <Route element={<AgregarArticulo />} path="/inventario/agregar" />
            <Route element={<NotFound />} path="*" />
          </Routes>
        </BrowserRouter>
        <Footer />
      </Frame>
    </div>
  );
}

export default App;
