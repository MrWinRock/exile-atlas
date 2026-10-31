export function PlanDifference({
  current,
  saved,
  nodes,
  differentDataset,
  currentBudgets,
  savedBudgets,
}: {
  current: string[];
  saved: string[];
  nodes: { id: string; name: string }[];
  differentDataset: boolean;
  currentBudgets: Record<string, number | undefined>;
  savedBudgets: Record<string, number | undefined>;
}) {
  const currentSet = new Set(current),
    savedSet = new Set(saved);
  const onlyCurrent = current.filter((id) => !savedSet.has(id));
  const onlySaved = saved.filter((id) => !currentSet.has(id));
  const names = new Map(nodes.map((node) => [node.id, node.name]));
  const changedBudgets = [
    ...new Set([...Object.keys(currentBudgets), ...Object.keys(savedBudgets)]),
  ].filter((branch) => currentBudgets[branch] !== savedBudgets[branch]);
  return (
    <details>
      <summary>Compare with current plan</summary>
      {differentDataset && (
        <p>
          These plans use different datasets. Node IDs and effects may not be directly comparable.
        </p>
      )}
      <p>
        {onlyCurrent.length} only in current · {onlySaved.length} only in saved
      </p>
      {onlyCurrent.length > 0 && (
        <p>Current only: {onlyCurrent.map((id) => names.get(id) ?? id).join(", ")}</p>
      )}
      {onlySaved.length > 0 && (
        <p>Saved only: {onlySaved.map((id) => names.get(id) ?? id).join(", ")}</p>
      )}
      {changedBudgets.map((branch) => (
        <p key={branch}>
          {branch} budget: current {currentBudgets[branch] ?? "no limit"} / saved{" "}
          {savedBudgets[branch] ?? "no limit"}
        </p>
      ))}
      <p className="fine-print">
        Compares allocated node IDs and branch budgets; effects are not calculated.
      </p>
    </details>
  );
}
