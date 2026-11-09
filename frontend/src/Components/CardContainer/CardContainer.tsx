import type { ReactNode } from "react";
import css from "./CardContainer.module.css";

interface CardContainerProps {
  children: ReactNode;
}
export function CardContainer({ children }: CardContainerProps) {
  return <div className={css.cardContainer}>{children}</div>;
}
