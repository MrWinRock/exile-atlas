"use client";
import Editor, { loader } from "@monaco-editor/react";
loader.config({ paths: { vs: "/monaco/vs" } });
export function CodeEditor({
  value,
  onChange,
  language = "plaintext",
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}) {
  return (
    <Editor
      height="430px"
      theme="vs-dark"
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        padding: { top: 18 },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
      }}
      loading={<p className="loading">Loading advanced editor…</p>}
    />
  );
}
