interface ChartDatum {
  label: string;
  values: Array<{ name: string; value: string }>;
}

export function AccessibleChartSummary({
  title,
  data,
}: {
  title: string;
  data: ChartDatum[];
}) {
  return (
    <details className="mt-3 rounded-xl border border-border bg-muted/35 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-semibold">Data teks: {title}</summary>
      <table className="mt-2 w-full text-left text-xs">
        <caption className="sr-only">{title}</caption>
        <tbody>
          {data.map((row) => (
            <tr key={row.label} className="border-t border-border/60">
              <th className="py-2 pr-3 font-medium">{row.label}</th>
              <td className="py-2 text-muted-foreground">
                {row.values.map((item) => `${item.name}: ${item.value}`).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
