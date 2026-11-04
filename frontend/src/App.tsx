import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { LoginPage } from "./Pages/Login/LoginPage";
import { Main } from "./Pages/Main/Main";
import { NotFound } from "./Pages/NotFound/NotFound";
import { Inventario } from "./Pages/Inventario/Inventario";
import { Nav } from "./Components/Nav/Nav";
import { Frame } from "./Components/Frame/Frame";
import { Footer } from "./Components/Footer/Footer";
import { AgregarArticulo } from "./Pages/AgregarArticulo/AgregarArticulo";

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
