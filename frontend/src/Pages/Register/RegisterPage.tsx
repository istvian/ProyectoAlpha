import { useState } from "react";
import { Frame } from "../../Components/Frame/Frame";
import { InputText } from "../../Components/InputText/InputText";
import css from "./RegisterPage.module.css";
import { Btn } from "../../Components/Btn/Btn";
import { Box } from "../../Components/Box/Box";
import { Title } from "../../Components/Title/Title";
import type { RegisterData } from "../../types/general";
import { Register } from "../../Helpers/APIConnector";
import { Link } from "react-router-dom";

export function RegisterPage() {
  const [registerData, setRegisterData] = useState<RegisterData>({
    password: "",
    correo: "",
    nombre: "",
  });
  const [errorMsg, setErrorMsg] = useState("");

  async function HandleSubmit() {
    await Register(registerData, (res) => {
      if (res.error) {
        setErrorMsg(res.mensaje);
      } else {
        alert("¡Usuario registrado correctamente!");
      }
    });
  }

  return (
    <Frame style={{ justifyContent: "center", alignItems: "center" }}>
      <div className={css.box}>
        <img src="/logo.png" alt="Logo de empresa FYAG" className={css.logo} />
        <Title>Registro</Title>
        <form
          className={css.box}
          onSubmit={(e) => {
            e.preventDefault();
            HandleSubmit();
          }}
        >
          <InputText
            label="Nombre"
            type="text"
            onChange={(text) => {
              setRegisterData((prev) => ({
                ...prev,
                nombre: text,
              }));
            }}
            placeholder="Juan Perez"
            value={registerData?.nombre}
          />
          <InputText
            label="Correo"
            type="email"
            onChange={(text) => {
              setRegisterData((prev) => ({
                ...prev,
                correo: text.toLowerCase().trim(),
              }));
            }}
            placeholder="correo@frioyagroindustria.cl"
            value={registerData?.correo}
          />
          <InputText
            label="Contraseña"
            type="password"
            onChange={(text) => {
              setRegisterData((prev) => ({
                ...prev,
                password: text.trim(),
              }));
            }}
            placeholder="Mínimo 8 carácteres, 1 mayuscula, 1 minuscula y 1 número"
            value={registerData?.password}
          />
          {errorMsg != "" ? <p className={css.msg}>{errorMsg}</p> : ""}
          <Btn
            onClick={() => {
              HandleSubmit();
            }}
            disabled={
              registerData.nombre != "" &&
              registerData.password != "" &&
              registerData.correo != ""
                ? false
                : true
            }
          >
            Registrar
          </Btn>
        </form>
        <Link className={css.link} to={"/login"}>
          O quizás quieras iniciar sesión
        </Link>
      </div>
    </Frame>
  );
}
