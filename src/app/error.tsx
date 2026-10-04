"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>A detour in the journey.</h1>
      <p>This page could not load. Your saved browser drafts are still here.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
