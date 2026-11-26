import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GetUserData } from "../Helpers/APIConnector";
import { Rol } from "../types/general";

export const useRolAutorizado = (roles: Rol[]): Rol | null => {
  const nav = useNavigate();
  const [rolAutorizado, setRolAutorizado] = useState<Rol | null>(null);

  // estabilizamos la referencia del array para evitar loop en el useEffect
  const rolesKey = useMemo(() => roles.join(","), [roles]);

  useEffect(() => {
    let cancelled = false;
    setRolAutorizado(null);

    GetUserData()
      .then((res) => {
        if (cancelled) return;

        const rolUsuario = res?.rol_id as Rol | undefined;

        console.log(
          `Roles permitidos: [${roles.join(", ")}] | rol del token: ${rolUsuario}`,
        );

        if (res?.error || rolUsuario === undefined) {
          setRolAutorizado(null);
          nav("/403");
          return;
        }

        const tieneAcceso =
          rolUsuario === Rol.admin || roles.includes(rolUsuario);

        setRolAutorizado(tieneAcceso ? rolUsuario : null);
        if (!tieneAcceso) nav("/403");
      })
      .catch(() => {
        if (cancelled) return;
        setRolAutorizado(null);
        nav("/403");
      });

    return () => {
      cancelled = true;
    };
  }, [rolesKey, nav]);

  return rolAutorizado;
};

const useValidateRol = (roles: Rol[]): boolean =>
  useRolAutorizado(roles) !== null;

export default useValidateRol;
