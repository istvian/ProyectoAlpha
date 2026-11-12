import { useNavigate } from "react-router-dom";
import css from "./CardexMain.module.css";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol } from "../../../types/general";
import { Frame } from "../../../Components/Frame/Frame";
import { Box } from "../../../Components/Box/Box";
import { Title } from "../../../Components/Title/Title";
import { Btn } from "../../../Components/Btn/Btn";
import { InputText } from "../../../Components/InputText/InputText";
import { Selector } from "../../../Components/Selector/Selector";
import { CardContainer } from "../../../Components/CardContainer/CardContainer";
import { Card } from "../../../Components/Card/Card";
import { InputDate } from "../../../Components/InputDate/InputDate";

export function CardexMain() {
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
            <Title>Consultas y Cardex</Title>
            <p>
              Consulta el historial de inventario y la trazabilidad de cada
              movimiento.
            </p>
          </div>
        </Box>
        <CardContainer>
          <Card
            title="Saldo inicial"
            content="120 cajas"
            footer="Al 30/09/2026"
          />
          <Card
            title="Entradas del período"
            content="190 cajas"
            footer="Al 30/09/2026"
          />
          <Card
            title="Salidas del período"
            content="135 cajas"
            footer="Al 30/09/2026"
          />
          <Card
            title="Saldo al cierre"
            content="175 cajas"
            footer="Al 30/09/2026"
          />
        </CardContainer>
        <Box>
          <div className={css.filters}>
            <Selector
              title="Producto"
              data=""
              setData={() => {}}
              options={[""]}
              firstOption="Selecciona un producto"
            />
            <InputDate label="Desde" onChange={() => {}} value={new Date()} />
            <InputDate label="Hasta" onChange={() => {}} value={new Date()} />
            <Selector
              title="Obra"
              data=""
              setData={() => {}}
              options={[""]}
              firstOption="Selecciona la obra"
            />
            <Selector
              title="Tipo de movimiento"
              data=""
              setData={() => {}}
              options={["Entrada", "Salida"]}
              firstOption="Selecciona un tipo de movimiento"
            />
            <InputText
              label="Documento"
              onChange={() => {}}
              placeholder="Buscar número o folio"
              value=""
            />
            <Btn onClick={() => {}}>Consultar</Btn>
            <Btn onClick={() => {}}>Limpiar</Btn>
          </div>
        </Box>

        <Box>
          <div className={css.row}>
            <Title>Cardex</Title>
            <p className={css.resumen}>Solo lectura</p>
          </div>
          <div className={css.tableContainer}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Fecha/hora</th>
                  <th>Producrto</th>
                  <th>Documento</th>
                  <th>Movimiento</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Saldo</th>
                  <th>Saldo neto</th>
                  <th>Responsable</th>
                  <th>Consulta</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>01/10/2026 09:15</td>
                  <td>Guantes de nitrilo</td>
                  <td>Documento</td>
                  <td>Movimiento</td>
                  <td>Entrada</td>
                  <td>Salida</td>
                  <td>Saldo</td>
                  <td>Saldo neto</td>
                  <td>Responsable</td>
                  <td>Consulta</td>
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
        </Box>
      </Frame>
    );
}
