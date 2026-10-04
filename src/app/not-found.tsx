import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <span className="eyebrow">AN UNCHARTED PATH</span>
      <h1>This page has wandered off.</h1>
      <p>Return to your workspace to continue the journey.</p>
      <Link className="button primary" href="/">
        Back to overview
      </Link>
    </div>
  );
}
