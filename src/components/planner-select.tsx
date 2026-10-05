"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import styles from "./planner-select.module.css";

export type PlannerSelectOption = { value: string; label: string; detail?: string };

export function PlannerSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: PlannerSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({ above: false, height: 320, offset: 48 });
  const selected = options.findIndex((option) => option.value === value);
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));
  const unavailable = disabled || !options.length;

  useEffect(() => {
    if (!open) return;
    function outside(event: Event) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function position() {
      const box = trigger.current?.getBoundingClientRect();
      if (!box) return;
      const below = window.innerHeight - box.bottom - 16;
      const above = box.top - 16;
      const showAbove = below < 220 && above > below;
      setPlacement({
        above: showAbove,
        height: Math.max(64, Math.min(320, showAbove ? above : below)),
        offset: box.height + 6,
      });
    }
    position();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function show(index = Math.max(0, selected)) {
    if (unavailable) return;
    search.current = { text: "", time: 0 };
    setActive(index);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    if (option.value !== value) onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (unavailable) return;
    const { key } = event;
    if (key === "Tab") {
      setOpen(false);
      return;
    }
    if (key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else show();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) {
      event.preventDefault();
      if (key === "Home") {
        if (open) setActive(0);
        else show(0);
      } else if (key === "End") {
        if (open) setActive(options.length - 1);
        else show(options.length - 1);
      } else if (!open) show();
      else
        setActive((current) =>
          Math.max(0, Math.min(options.length - 1, current + (key === "ArrowDown" ? 1 : -1))),
        );
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const previous = now - search.current.time < 650 ? search.current.text : "";
      const next = previous + key.toLocaleLowerCase();
      const term = [...next].every((letter) => letter === next[0]) ? next[0] : next;
      search.current = { text: next, time: now };
      const from = open ? activeIndex : Math.max(0, selected);
      for (let offset = 1; offset <= options.length; offset++) {
        const index = (from + offset) % options.length;
        if (options[index].label.toLocaleLowerCase().startsWith(term)) {
          setActive(index);
          setOpen(true);
          break;
        }
      }
    }
  }

  return (
    <div className={styles.root} ref={root}>
      <span className={styles.label} id={labelId}>
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        disabled={unavailable}
        className={`${styles.trigger} ${open ? styles.open : ""}`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={keyDown}
      >
        <span>{options[selected]?.label ?? "Select an option"}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className={`${styles.list} ${placement.above ? styles.above : ""}`}
          style={{
            maxHeight: placement.height,
            bottom: placement.above ? placement.offset : undefined,
          }}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={value === option.value}
              className={`${styles.option} ${index === activeIndex ? styles.active : ""}`}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span className={styles.optionText}>
                <span>{option.label}</span>
                {option.detail && <small>{option.detail}</small>}
              </span>
              {value === option.value && <Check size={14} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
