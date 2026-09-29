export function TouchControls({
  joystick,
  joystickRef,
  onJoystickStart,
  onJoystickMove,
  onJoystickRelease,
  onActionPress,
  onActionRelease,
  onBodyCheck,
  bodyCheckActive,
  bodyCheckCooldown,
  bodyCheckReady
}) {
  return (
    <section className="touch-controls" aria-label="Сенсорное управление">
      <div
        className={joystick.active ? "touch-joystick active" : "touch-joystick"}
        ref={joystickRef}
        aria-label="Джойстик движения"
        role="application"
        style={{ "--stick-x": joystick.x, "--stick-z": joystick.z }}
        onPointerDown={onJoystickStart}
        onPointerMove={(event) => { if (joystick.active) onJoystickMove(event); }}
        onPointerUp={onJoystickRelease}
        onPointerCancel={onJoystickRelease}
        onLostPointerCapture={onJoystickRelease}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="touch-stick-base" />
        <span className="touch-stick-knob" />
      </div>

      <div className="touch-action-wrap">
        <button
          className={`touch-btn-dash${bodyCheckActive ? " active" : ""}${(!bodyCheckActive && !bodyCheckReady) ? " cooldown" : ""}`}
          type="button"
          aria-label="Рывок"
          onPointerDown={onBodyCheck}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="touch-btn-dash-label">Рывок</span>
          {bodyCheckCooldown > 0 && (
            <span className="touch-btn-dash-cd">{(bodyCheckCooldown * 1.45).toFixed(1)}с</span>
          )}
        </button>
        <button
          className="touch-btn-serke"
          type="button"
          aria-label="Поднять серке"
          onPointerDown={onActionPress}
          onPointerUp={onActionRelease}
          onPointerCancel={onActionRelease}
          onLostPointerCapture={onActionRelease}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="touch-btn-serke-diamond" />
          <span className="touch-btn-serke-label">Поднять</span>
        </button>
      </div>
    </section>
  );
}
