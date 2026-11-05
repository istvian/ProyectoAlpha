import css from "./Selector.module.css";

interface SelectorProps {
  isDisabled?: boolean;
  setData: (selected: string) => void;
  options: string[];
  firstOption: string;
  data: string;
  title: string;
}
export function Selector({
  isDisabled = false,
  options,
  setData,
  data,
  firstOption = "",
  title = "",
}: SelectorProps) {
  return (
    <div className={css.main}>
      <p className={css.label}>{title}</p>
      <select
        className={css.select}
        disabled={isDisabled}
        onChange={(e) => {
          setData(e.target.value);
        }}
        value={data}
      >
        <option value="" disabled>
          {firstOption}
        </option>
        {options.map((item, index) => {
          return (
            <option key={index} value={item}>
              {item}
            </option>
          );
        })}
      </select>
    </div>
  );
}
