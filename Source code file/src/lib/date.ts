/** e.g. "Tuesday 15 Sep" — today's date, formatted for the dashboard header bars. */
export function formatTodayLabel(date: Date = new Date()): string {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${weekday} ${day} ${month}`;
}
