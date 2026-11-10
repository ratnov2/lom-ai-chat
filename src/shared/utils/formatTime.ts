export const formatTime = (value: number) =>
  new Intl.DateTimeFormat("ru", { hour: "2-digit", minute: "2-digit" }).format(
    value,
  );
