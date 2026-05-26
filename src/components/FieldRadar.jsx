export function FieldRadar({ radar, goalType }) {
  if (!radar) return null;

  const xFor = (point) => 2 + point.x * 96;
  const yFor = (point) => 2 + point.z * 62;

  return (
    <aside className="radar" aria-label="Радар поля">
      <svg viewBox="0 0 100 66" aria-hidden="true">
        <rect className="radar-field" x="2" y="2" width="96" height="62" rx="2" />
        <line className="radar-line" x1="50" y1="2" x2="50" y2="64" />
        <circle className="radar-center" cx="50" cy="33" r="7" />
        {radar.goals.map((goal) => (
          <circle
            className={`radar-goal ${goal.team} ${goalType}`}
            cx={xFor(goal)}
            cy={yFor(goal)}
            key={goal.team}
            r={goalType === "kazan" ? 4.6 : 5.3}
          />
        ))}
        {radar.riders.map((rider) => (
          <g key={rider.name}>
            {rider.holder && (
              <circle className="radar-holder-ring" cx={xFor(rider)} cy={yFor(rider)} r="3.7" />
            )}
            <circle
              className={[
                "radar-rider",
                rider.team,
                rider.human ? "human" : "",
                rider.contesting ? "contesting" : "",
                rider.supporting ? "supporting" : ""
              ].filter(Boolean).join(" ")}
              cx={xFor(rider)}
              cy={yFor(rider)}
              r={rider.human ? 2.2 : 1.75}
            />
          </g>
        ))}
        {!radar.serke.carried && (
          <path
            className={radar.serke.flight ? "radar-serke flight" : "radar-serke"}
            d={`M ${xFor(radar.serke)} ${yFor(radar.serke) - 2.8} l 2.8 2.8 -2.8 2.8 -2.8 -2.8 Z`}
          />
        )}
      </svg>
    </aside>
  );
}
