import { useState } from "react";
import { Frame } from "../../Components/Frame/Frame";
import { InputText } from "../../Components/InputText/InputText";
import css from "./LoginPage.module.css";
import { Btn } from "../../Components/Btn/Btn";
import { Box } from "../../Components/Box/Box";
import { Title } from "../../Components/Title/Title";
import type { LoginData } from "../../types/general";
import { Login } from "../../Helpers/APIConnector";
import { Link, useNavigate } from "react-router-dom";

export function LoginPage() {
  const [loginData, setLoginData] = useState<LoginData>({
    password: "",
    correo: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const nav = useNavigate();

  async function HandleSubmit() {
    setIsLoading(true);
    await Login(loginData, (res) => {
      setIsLoading(false);
      if (res.error) {
        setErrorMsg(res.mensaje);
      } else {
        nav("/");
      }
    });
  }

  return (
    <Frame style={{ justifyContent: "center", alignItems: "center" }}>
      <div className={css.box}>
        <img src="/logo.png" alt="Logo de empresa FYAG" className={css.logo} />
        <Title>Inicio de sesión</Title>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            HandleSubmit();
          }}
          className={css.box}
        >
          <InputText
            label="Correo"
            type="email"
            onChange={(text) => {
              setLoginData((prev) => ({
                ...prev,
                correo: text.toLowerCase().trim(),
              }));
            }}
            placeholder="correo@frioyagroindustria.cl"
            value={loginData?.correo}
          />
          <InputText
            label="Contraseña"
            type="password"
            onChange={(text) => {
              setLoginData((prev) => ({
                ...prev,
                password: text.trim(),
              }));
            }}
            placeholder="Mínimo 8 carácteres, 1 mayuscula, 1 minuscula y 1 número"
            value={loginData?.password}
          />
          {errorMsg != "" ? <p className={css.msg}>{errorMsg}</p> : ""}
          <Btn
            onClick={() => {
              HandleSubmit();
            }}
            disabled={
              loginData.password != "" && loginData.correo != "" ? false : true
            }
          >
            Iniciar sesión
          </Btn>
        </form>
        <Link className={css.link} to={"/register"}>
          O quizás quieras crear una cuenta
        </Link>
      </div>
    </Frame>
  );
}
