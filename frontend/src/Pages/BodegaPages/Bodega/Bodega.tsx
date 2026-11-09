import { useNavigate } from "react-router-dom";
import css from "./Bodega.module.css";
import { Frame } from "../../../Components/Frame/Frame";
import { Box } from "../../../Components/Box/Box";
import { Title } from "../../../Components/Title/Title";
import { Btn } from "../../../Components/Btn/Btn";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol } from "../../../types/general";
import { Card } from "../../../Components/Card/Card";
import { InputText } from "../../../Components/InputText/InputText";
import { InputDate } from "../../../Components/InputDate/InputDate";
import { Selector } from "../../../Components/Selector/Selector";
import { CardContainer } from "../../../Components/CardContainer/CardContainer";

export function Bodega() {
  const nav = useNavigate();
  if (useValidateRol(Rol.bodega))
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
            <Title>Operaciones de Bodega</Title>
            <p>
              Registra salidas y traslados. Controla cada movimiento de tus
              bodega.
            </p>
          </div>
          <div className={css.actions}>
            <Btn
              onClick={() => {
                nav("/bodega/salida");
              }}
            >
              Registrar salida
            </Btn>
          </div>
        </Box>
        <CardContainer>
          <Card title="Movimientos de hoy" content="7 registros" />
          <Card title="Entradas de hoy" content="2 entradas" />
          <Card title="Salidas de hoy" content="5 salidas" />
        </CardContainer>
        <p className={css.resumen}>Resumen de hoy · 12 oct 2026 · 3 bodegas</p>
        <div className={css.historial}>
          <div className={css.row}>
            <Title>Historial de movimientos</Title>
            <p>248 registros</p>
          </div>
          <div className={css.filters}>
            <InputText
              label="Buscar movimiento"
              onChange={(text) => {}}
              placeholder="Referencia, código o nombre del artículo..."
              value=""
            />
            <InputDate
              label="Fecha desde"
              onChange={() => {}}
              value={new Date()}
            />
            <InputDate
              label="Fecha hasta"
              onChange={() => {}}
              value={new Date()}
            />
            <Selector
              data=""
              options={[""]}
              title="Operación"
              setData={(selected) => {}}
              firstOption="Todas las operaciones"
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
                  <th>Fecha</th>
                  <th>Referencia</th>
                  <th>Operacion</th>
                  <th>Artículo</th>
                  <th>Cantidad</th>
                  <th>Destino</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fecha</td>
                  <td>Referencia</td>
                  <td>Operacion</td>
                  <td>Artículo</td>
                  <td>Cantidad</td>
                  <td>Destino</td>
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
