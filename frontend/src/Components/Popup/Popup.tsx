import type { ReactNode } from "react";
import css from "./Popup.module.css";

interface PopupProps {
  isVisible: boolean;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function Popup({ isVisible, children, style }: PopupProps) {
  return (
    <div className={css.popup} style={{ display: isVisible ? "flex" : "none" }}>
      <div className={css.bg}></div>
      <div className={css.content} style={style}>
        {children}
      </div>
    </div>
  );
}
