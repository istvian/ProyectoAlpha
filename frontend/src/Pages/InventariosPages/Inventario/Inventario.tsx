import { useNavigate } from "react-router-dom";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Card } from "../../../Components/Card/Card";
import { Frame } from "../../../Components/Frame/Frame";
import { Title } from "../../../Components/Title/Title";
import css from "./Inventario.module.css";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol } from "../../../types/general";
import { useState } from "react";
import { AgregarArticulo } from "../AgregarArticulo/AgregarArticulo";
import { InputText } from "../../../Components/InputText/InputText";
import { InputDate } from "../../../Components/InputDate/InputDate";
import { Selector } from "../../../Components/Selector/Selector";
import { CardContainer } from "../../../Components/CardContainer/CardContainer";

export function Inventario() {
  const [agregarArticulo, setAgregarArticulo] = useState(false);
  const nav = useNavigate();
  if (useValidateRol(Rol.supervisor))
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
            <Title>Inventario y artículos</Title>
            <p>
              Administra el catálogo, consulta existencias y controla el stock
              de tus bodega.
            </p>
          </div>
          <div className={css.actions}>
            <Btn onClick={() => {}}>Gestionar existencias</Btn>
            <Btn
              onClick={() => {
                setAgregarArticulo(true);
              }}
            >
              + Agregar artículo
            </Btn>
          </div>
        </Box>
        {agregarArticulo ? (
          <AgregarArticulo
            onEnd={() => {
              setAgregarArticulo(false);
            }}
          />
        ) : (
          ""
        )}
        <CardContainer>
          <Card
            title="Artículos registrados"
            icon="fa-solid fa-boxes-stacked"
            content="265"
            footer="6 categorías"
          />
          <Card
            title="Valor total en almacén"
            icon="fa-solid fa-wallet"
            content="$15.249.040"
            footer="CLP"
          />
          <Card
            title="Stock crítico"
            icon="fa-solid fa-triangle-exclamation"
            content="4 artículos"
            footer="Existencias bajo el mínimo"
          />
          <Card
            title="Sin existencias"
            icon="fa-solid fa-box-open"
            content="2 artículos"
            footer="Requieren reposición"
          />
        </CardContainer>
        <p className={css.resumen}>Resumen de hoy · 12 oct 2026 · 3 bodegas</p>
        <div className={css.historial}>
          <div className={css.row}>
            <Title>Listado de artículos</Title>
            <p>248 registros</p>
          </div>
          <div className={css.filters}>
            <InputText
              label="Buscar artículos"
              onChange={(text) => {}}
              placeholder="Código o nombre del artículo..."
              value=""
            />
            <Selector
              data=""
              options={[""]}
              title="Categoría"
              setData={(selected) => {}}
              firstOption="Todos las categorías"
            />

            <Selector
              data=""
              options={[""]}
              title="Estado"
              setData={(selected) => {}}
              firstOption="Todos los estados"
            />
            <Btn onClick={() => {}}>Buscar</Btn>
          </div>
          <div className={css.tableContainer}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre del artículo</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Unidad</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>FRU-001</td>
                  <td>Nombre del articulo</td>
                  <td>Categoría</td>
                  <td>Stock</td>
                  <td>Unidad</td>
                  <td>Ubicación</td>
                  <td>Estado</td>
                  <td>Acciones</td>
                </tr>
              </tbody>
            </table>
            <div className={css.row}>
              <p className={css.resumen}>Mostrando 1-10 de 200 artículos</p>
              <div className={css.navegacion}>
                <p className={css.resumen}>10 por página</p>
                <p className={css.btn}>Anterior</p>
                <p className={css.btnActive}>1</p>
                <p className={css.btn}>2</p>
                <p className={css.btn}>3</p>
                <p className={css.btn}>Siguiente</p>
              </div>
            </div>
          </div>
        </div>
      </Frame>
    );
}
