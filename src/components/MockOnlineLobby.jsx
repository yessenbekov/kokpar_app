import { Check, CircleDot, Radio, Shield, Users } from "lucide-react";

const MOCK_PLAYERS = [
  { id: "bot-arman", name: "Арман", horseName: "Сұңқар", team: "blue", ready: true },
  { id: "bot-bek", name: "Бек", horseName: "Боран", team: "red", ready: true },
  { id: "bot-samat", name: "Самат", horseName: "Қарагер", team: "red", ready: false }
];

function goalLabel(goalType) {
  return goalType === "kazan" ? "Казан" : "Круг";
}

function teamLabel(team) {
  return team === "red" ? "Қызыл" : "Көк";
}

function LobbyPlayer({ player, current }) {
  return (
    <li className={current ? "lobby-player current" : "lobby-player"}>
      <span>
        <strong>{player.name}</strong>
        <small>{player.horseName}</small>
      </span>
      {player.ready && <Check size={15} strokeWidth={2.5} />}
    </li>
  );
}

export function MockOnlineLobby({ profile, selectedHorse, settings, ready, onReadyChange, onTeamChange }) {
  const currentPlayer = {
    id: "you",
    name: profile.riderName,
    horseName: selectedHorse.name,
    team: settings.teamSide,
    ready
  };
  const players = [currentPlayer, ...MOCK_PLAYERS];
  const bluePlayers = players.filter((player) => player.team === "blue");
  const redPlayers = players.filter((player) => player.team === "red");

  return (
    <section className="online-lobby" aria-label="Онлайн комната">
      <div className="lobby-topline">
        <span>
          <Radio size={16} strokeWidth={2.5} />
          Комната KOK-742
        </span>
        <span>{players.length}/{settings.teamSize * 2} игроков</span>
      </div>

      <div className="lobby-summary">
        <span>
          <Users size={15} strokeWidth={2.4} />
          {settings.teamSize}×{settings.teamSize}
        </span>
        <span>
          <CircleDot size={15} strokeWidth={2.4} />
          {goalLabel(settings.goalType)}
        </span>
        <span>
          <Shield size={15} strokeWidth={2.4} />
          {settings.matchMinutes}:00
        </span>
      </div>

      <div className="team-pick" aria-label="Выбор стороны">
        {["blue", "red"].map((team) => (
          <button
            className={settings.teamSide === team ? `team-choice ${team} active` : `team-choice ${team}`}
            type="button"
            key={team}
            onClick={() => onTeamChange(team)}
          >
            {teamLabel(team)}
          </button>
        ))}
      </div>

      <div className="lobby-teams">
        <div className="lobby-team blue">
          <strong>Көк команда</strong>
          <ul>
            {bluePlayers.map((player) => (
              <LobbyPlayer player={player} current={player.id === "you"} key={player.id} />
            ))}
          </ul>
        </div>
        <div className="lobby-team red">
          <strong>Қызыл команда</strong>
          <ul>
            {redPlayers.map((player) => (
              <LobbyPlayer player={player} current={player.id === "you"} key={player.id} />
            ))}
          </ul>
        </div>
      </div>

      <button className={ready ? "ready-button active" : "ready-button"} type="button" onClick={() => onReadyChange(!ready)}>
        <Check size={17} strokeWidth={2.6} />
        <span>{ready ? "Готов" : "Готовиться"}</span>
      </button>
    </section>
  );
}
