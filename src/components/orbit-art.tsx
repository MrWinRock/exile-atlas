export function OrbitArt({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={`orbit-art ${compact ? "compact" : ""}`}
      viewBox="0 0 500 400"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="orbit-glow">
          <stop stopColor="#d4a35e" stopOpacity=".14" />
          <stop offset="1" stopColor="#d4a35e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="orbit-line" x1="0" y1="0" x2="500" y2="400">
          <stop stopColor="#d4a35e" stopOpacity=".04" />
          <stop offset=".6" stopColor="#d4a35e" stopOpacity=".65" />
          <stop offset="1" stopColor="#d4a35e" stopOpacity=".04" />
        </linearGradient>
      </defs>
      <circle cx="260" cy="208" r="185" fill="url(#orbit-glow)" />
      {[62, 108, 151, 181].map((r, i) => (
        <circle
          key={r}
          cx="260"
          cy="208"
          r={r}
          stroke="#b38a51"
          strokeOpacity={i === 3 ? 0.08 : 0.18}
          strokeDasharray={i === 2 ? "2 8" : undefined}
        />
      ))}
      <path
        d="M260 25V390M70 208H450M126 73L394 343M126 343L394 73"
        stroke="#b38a51"
        strokeOpacity=".1"
      />
      <path
        d="M111 227L170 177L205 224L260 208L287 156L342 126L373 213L332 258L287 286L260 208L218 137L170 177M342 126L370 70M332 258L411 289M287 286L282 354"
        stroke="url(#orbit-line)"
        strokeWidth="1.4"
      />
      {[
        [111, 227],
        [170, 177],
        [205, 224],
        [260, 208],
        [287, 156],
        [342, 126],
        [373, 213],
        [332, 258],
        [287, 286],
        [218, 137],
        [370, 70],
        [411, 289],
        [282, 354],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r={i === 3 ? 18 : i === 5 ? 10 : 5}
            fill="#171a1c"
            stroke="#ba9158"
            strokeOpacity={i === 3 ? 1 : 0.6}
          />
          <circle
            cx={x}
            cy={y}
            r={i === 3 ? 6 : 2}
            fill="#dfb779"
            fillOpacity={i === 3 ? 1 : 0.8}
          />
          {i === 3 && (
            <path d={`M${x} ${y - 29}l5 9-5-3-5 3zM${x} ${y + 29}l5-9-5 3-5-3z`} fill="#dfb779" />
          )}
        </g>
      ))}
      <path d="M239 208l21-21 21 21-21 21z" stroke="#dfb779" strokeOpacity=".55" />
      <text x="253" y="18" fill="#a4804f" fontSize="9" letterSpacing="3">
        N
      </text>
      <text x="470" y="212" fill="#a4804f" fontSize="9">
        E
      </text>
      <text x="252" y="398" fill="#a4804f" fontSize="9" letterSpacing="3">
        S
      </text>
      <text x="48" y="212" fill="#a4804f" fontSize="9">
        W
      </text>
    </svg>
  );
}
