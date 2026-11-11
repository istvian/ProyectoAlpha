import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GetUserData } from "../Helpers/APIConnector";
import { Rol } from "../types/general";

const useValidateRol = (roles: Rol[]): boolean => {
  const nav = useNavigate();
  const [status, setStatus] = useState<boolean>(false);

  // estabilizamos la referencia del array para evitar loop en el useEffect
  const rolesKey = useMemo(() => roles.join(","), [roles]);

  useEffect(() => {
    let cancelled = false;
    setStatus(false);

    GetUserData()
      .then((res) => {
        if (cancelled) return;

        const rolUsuario = res?.rol_id as Rol | undefined;

        console.log(
          `Roles permitidos: [${roles.join(", ")}] | rol del token: ${rolUsuario}`,
        );

        if (res?.error || rolUsuario === undefined) {
          setStatus(false);
          nav("/403");
          return;
        }

        const tieneAcceso =
          rolUsuario === Rol.admin || roles.includes(rolUsuario);

        setStatus(tieneAcceso);
        if (!tieneAcceso) nav("/403");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus(false);
        nav("/403");
      });

    return () => {
      cancelled = true;
    };
  }, [rolesKey, nav]);

  return status;
};

export default useValidateRol;
