import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GetUserData } from "../Helpers/APIConnector";
import { Rol } from "../types/general";

// Verifica si el usuario tiene un rol asignado y si es igual al requerido para la página o componente
// El rol puede ser uno definido o admin
const useValidateRol = (rol: Rol): boolean => {
  const nav = useNavigate();
  const [status, setStatus] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setStatus(false);

    GetUserData()
      .then((res) => {
        if (cancelled) return;
        console.log(`Comparando rol ${rol} con rol de token: ${res?.rolID}`);

        if (res?.error) {
          setStatus(false);
          nav("/403");
          return;
        }
        if (res?.rolID === rol || res?.rolID === Rol.admin) {
          setStatus(true);
        } else {
          setStatus(false);
          nav("/403");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus(false);
        nav("/403");
      });

    return () => {
      cancelled = true;
    };
  }, [rol, nav]);

  return status;
};

export default useValidateRol;
