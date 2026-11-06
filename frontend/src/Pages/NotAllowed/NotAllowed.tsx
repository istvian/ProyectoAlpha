import { Link } from "react-router-dom";
import { Frame } from "../../Components/Frame/Frame";
import { Title } from "../../Components/Title/Title";
import css from "./NotAllowed.module.css";

export function NotAllowed() {
  return (
    <Frame>
      <Title>Error 403: No tienes permiso para ver esta ruta.</Title>
      <Link to="/">Volver a el inicio</Link>
    </Frame>
  );
}
