import { useEffect, useRef } from "react";
import { EXAMPLE_PROMPTS } from "./consts";
import styles from "./ExamplePrompts.module.css";

export const ExamplePrompts = ({
  onSelect,
}: {
  onSelect: (text: string) => void;
}) => {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const menu = menuRef.current;
      if (menu && event.target instanceof Node && !menu.contains(event.target))
        menu.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const selectExample = (text: string) => {
    if (menuRef.current) menuRef.current.open = false;
    onSelect(text);
  };

  return (
    <details
      className={styles.menu}
      ref={menuRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>
        <span aria-hidden="true">✳</span> Примеры
      </summary>
      <div className={styles.panel}>
        <div className={styles.title}>Примеры запросов</div>
        {EXAMPLE_PROMPTS.map(({ text, description }) => (
          <button type="button" key={text} onClick={() => selectExample(text)}>
            <span>{text}</span>
            <small>{description}</small>
          </button>
        ))}
      </div>
    </details>
  );
};
