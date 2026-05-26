import { Hand } from "lucide-react";

export function TouchControls({
  joystick,
  joystickRef,
  onJoystickStart,
  onJoystickMove,
  onJoystickRelease,
  onActionPress,
  onActionRelease
}) {
  return (
    <section className="touch-controls" aria-label="Сенсорное управление">
      <div
        className={joystick.active ? "touch-joystick active" : "touch-joystick"}
        ref={joystickRef}
        aria-label="Джойстик движения"
        role="application"
        style={{
          "--stick-x": joystick.x,
          "--stick-z": joystick.z
        }}
        onPointerDown={onJoystickStart}
        onPointerMove={(event) => {
          if (joystick.active) onJoystickMove(event);
        }}
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
          className="touch-button touch-action"
          type="button"
          aria-label="Действие"
          title="Действие"
          onPointerDown={onActionPress}
          onPointerUp={onActionRelease}
          onPointerCancel={onActionRelease}
          onLostPointerCapture={onActionRelease}
          onContextMenu={(event) => event.preventDefault()}
        >
          <Hand size={30} strokeWidth={2.6} />
        </button>
      </div>
    </section>
  );
}
