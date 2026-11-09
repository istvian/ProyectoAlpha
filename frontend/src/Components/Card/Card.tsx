import type { ReactNode } from "react";
import css from "./Card.module.css";

interface CardProps {
  title: string;
  content?: string;
  customContent?: ReactNode;
  icon?: string;
  footer?: string;
}

export function Card({
  content,
  footer,
  title,
  icon,
  customContent,
}: CardProps) {
  return (
    <div className={css.card}>
      <div className={css.row}>
        <p className={css.title}>{title}</p>
        <i className={icon}></i>
      </div>
      {content ? <p className={css.content}>{content}</p> : ""}
      {customContent ? customContent : ""}
      <p className={css.mini}>{footer}</p>
    </div>
  );
}
