import styles from "./ToolActivity.module.css";
export const ToolActivity = ({
  expression,
  result,
}: {
  expression: string;
  result?: string;
}) => (
  <div className={styles.tool}>
    ▦ Калькулятор: {expression}
    {result !== undefined ? ` = ${result}` : " …"}
  </div>
);
