import type { ReactNode } from "react";
import { Box } from "../Box/Box";
import css from "./Card.module.css";

interface CardProps {
  title: string;
  content: ReactNode;
  footer: ReactNode;
}

export function Card({ content, footer, title }: CardProps) {
  return (
    <Box>
      <p className={css.cardTitle}>{title}</p>
      <p className={css.cardNumber}>{content}</p>
      <p className={css.cardPorcent}>{footer}</p>
    </Box>
  );
}
