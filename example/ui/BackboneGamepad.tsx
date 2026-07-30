import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  backboneGamepadState,
  resetBackboneGamepadState,
  type BackboneStickState,
} from "../backboneGamepadState";

type DiagnosticsSnapshot = {
  connected: boolean;
  id: string;
  index: number;
  mapping: string;
  axes: number[];
  pressedButtons: number[];
  fullscreen: boolean;
  apiAvailable: boolean;
  apiError: string;
  note: string;
};

type GamepadReadResult = {
  gamepad: Gamepad | null;
  error: string;
};

const WAITING_MESSAGE =
  "Backbone/Gamepad: waiting. Press any gamepad button if Android has not exposed it yet.";

const INITIAL_SNAPSHOT: DiagnosticsSnapshot = {
  connected: false,
  id: "",
  index: -1,
  mapping: "",
  axes: [],
  pressedButtons: [],
  fullscreen: false,
  apiAvailable: typeof navigator !== "undefined" && "getGamepads" in navigator,
  apiError: "",
  note: WAITING_MESSAGE,
};

function isPressed(gamepad: Gamepad, buttonIndex: number): boolean {
  const button = gamepad.buttons[buttonIndex];
  return Boolean(button && (button.pressed || button.value > 0.5));
}

function applyRadialDeadzone(
  rawX: number,
  rawY: number,
  deadzone: number,
): BackboneStickState {
  const magnitude = Math.hypot(rawX, rawY);
  if (magnitude <= deadzone || magnitude === 0) return { x: 0, y: 0 };

  const clampedMagnitude = Math.min(1, magnitude);
  const scaledMagnitude = (clampedMagnitude - deadzone) / (1 - deadzone);
  const scale = scaledMagnitude / magnitude;

  return {
    x: rawX * scale,
    y: rawY * scale,
  };
}

function readConnectedGamepad(): GamepadReadResult {
  if (!("getGamepads" in navigator)) {
    return { gamepad: null, error: "This browser does not expose the Web Gamepad API." };
  }

  try {
    const gamepads = navigator.getGamepads();
    for (const gamepad of gamepads) {
      if (gamepad?.connected) return { gamepad, error: "" };
    }
    return { gamepad: null, error: "" };
  } catch (error) {
    return {
      gamepad: null,
      error:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : "The browser blocked access to connected gamepads.",
    };
  }
}

function getPressedButtons(gamepad: Gamepad): number[] {
  return gamepad.buttons.flatMap((button, index) =>
    button.pressed || button.value > 0.5 ? [index] : [],
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

export function BackboneGamepad() {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    const compactLandscape = window.matchMedia(
      "(orientation: landscape) and (max-height: 540px)",
    ).matches;
    return !(navigator.maxTouchPoints > 0 && compactLandscape);
  });
  const [deadzone, setDeadzone] = useState(backboneGamepadState.deadzone);
  const [lookSpeed, setLookSpeed] = useState(backboneGamepadState.lookSpeedX);
  const [invertLookX, setInvertLookX] = useState(
    backboneGamepadState.invertLookX,
  );
  const [invertLookY, setInvertLookY] = useState(
    backboneGamepadState.invertLookY,
  );
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot>(INITIAL_SNAPSHOT);
  const [copyLabel, setCopyLabel] = useState("Copy diagnostics");
  const previousStartPressed = useRef(false);
  const lastUiUpdate = useRef(0);
  const fullscreenError = useRef("");

  useEffect(() => {
    backboneGamepadState.deadzone = deadzone;
  }, [deadzone]);

  useEffect(() => {
    backboneGamepadState.lookSpeedX = lookSpeed;
    backboneGamepadState.lookSpeedY = lookSpeed * 0.75;
  }, [lookSpeed]);

  useEffect(() => {
    backboneGamepadState.invertLookX = invertLookX;
  }, [invertLookX]);

  useEffect(() => {
    backboneGamepadState.invertLookY = invertLookY;
  }, [invertLookY]);

  const toggleFullscreen = useCallback(async () => {
    fullscreenError.current = "";
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        throw new Error("Fullscreen is unavailable in this browser.");
      }
    } catch (error) {
      fullscreenError.current =
        error instanceof Error ? error.message : "Fullscreen request was blocked.";
      setSnapshot((current) => ({
        ...current,
        note:
          "Fullscreen was blocked by the browser. Tap the Fullscreen button in this panel instead.",
      }));
    }
  }, []);

  useEffect(() => {
    let animationFrame = 0;

    const updateSnapshot = (
      gamepad: Gamepad | null,
      now: number,
      note: string,
      apiError = "",
    ) => {
      if (now - lastUiUpdate.current < 100) return;
      lastUiUpdate.current = now;

      setSnapshot({
        connected: Boolean(gamepad),
        id: gamepad?.id ?? "",
        index: gamepad?.index ?? -1,
        mapping: gamepad?.mapping ?? "",
        axes: gamepad ? Array.from(gamepad.axes) : [],
        pressedButtons: gamepad ? getPressedButtons(gamepad) : [],
        fullscreen: Boolean(document.fullscreenElement),
        apiAvailable: "getGamepads" in navigator,
        apiError,
        note,
      });
    };

    const poll = (now: number) => {
      const { gamepad, error: gamepadApiError } = readConnectedGamepad();

      if (!gamepad) {
        if (backboneGamepadState.connected) resetBackboneGamepadState();
        document.documentElement.classList.remove("gamepad-connected");
        previousStartPressed.current = false;
        const note = gamepadApiError || WAITING_MESSAGE;
        updateSnapshot(null, now, note, gamepadApiError);
        animationFrame = requestAnimationFrame(poll);
        return;
      }

      const deadzoneValue = backboneGamepadState.deadzone;
      const left = applyRadialDeadzone(
        gamepad.axes[0] ?? 0,
        -(gamepad.axes[1] ?? 0),
        deadzoneValue,
      );
      const right = applyRadialDeadzone(
        gamepad.axes[2] ?? 0,
        gamepad.axes[3] ?? 0,
        deadzoneValue,
      );

      const dpadX = Number(isPressed(gamepad, 15)) - Number(isPressed(gamepad, 14));
      const dpadY = Number(isPressed(gamepad, 12)) - Number(isPressed(gamepad, 13));
      if (dpadX !== 0 || dpadY !== 0) {
        const magnitude = Math.hypot(dpadX, dpadY);
        left.x = dpadX / magnitude;
        left.y = dpadY / magnitude;
      }

      backboneGamepadState.connected = true;
      backboneGamepadState.id = gamepad.id;
      backboneGamepadState.index = gamepad.index;
      backboneGamepadState.mapping = gamepad.mapping;
      backboneGamepadState.left.x = left.x;
      backboneGamepadState.left.y = left.y;
      backboneGamepadState.right.x = right.x;
      backboneGamepadState.right.y = right.y;
      backboneGamepadState.jump = isPressed(gamepad, 0);
      backboneGamepadState.run = isPressed(gamepad, 10);
      backboneGamepadState.rawAxes = Array.from(gamepad.axes);
      backboneGamepadState.pressedButtons = getPressedButtons(gamepad);

      document.documentElement.classList.add("gamepad-connected");

      const startPressed = isPressed(gamepad, 9);
      if (startPressed && !previousStartPressed.current) {
        void toggleFullscreen();
      }
      previousStartPressed.current = startPressed;

      let note =
        "Controller connected. Left stick moves, right stick looks, A/Cross jumps, L3 runs.";
      if (gamepad.mapping !== "standard") {
        note =
          "Controller connected with a non-standard mapping. Test every control and copy the diagnostics if anything is wrong.";
      } else if (gamepad.axes.length < 4) {
        note =
          "Controller connected, but fewer than four axes were exposed. Copy diagnostics so the Backbone mapping can be adjusted.";
      } else if (fullscreenError.current) {
        note = `Controller connected. Fullscreen note: ${fullscreenError.current}`;
      }

      updateSnapshot(gamepad, now, note);
      animationFrame = requestAnimationFrame(poll);
    };

    const handleFullscreenChange = () => {
      setSnapshot((current) => ({
        ...current,
        fullscreen: Boolean(document.fullscreenElement),
      }));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    animationFrame = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(animationFrame);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.documentElement.classList.remove("gamepad-connected");
      resetBackboneGamepadState();
    };
  }, [toggleFullscreen]);

  const diagnosticText = useMemo(() => {
    const axisText = snapshot.axes.length
      ? snapshot.axes.map((value, index) => `${index}:${value.toFixed(3)}`).join(", ")
      : "none";
    const buttonText = snapshot.pressedButtons.length
      ? snapshot.pressedButtons.join(", ")
      : "none";

    return [
      "Ecctrl Backbone playtest diagnostics",
      `Connected: ${snapshot.connected}`,
      `Gamepad API available: ${snapshot.apiAvailable}`,
      `Gamepad API error: ${snapshot.apiError || "none"}`,
      `Gamepad index: ${snapshot.index}`,
      `Gamepad id: ${snapshot.id || "none"}`,
      `Mapping: ${snapshot.mapping || "none"}`,
      `Axes: ${axisText}`,
      `Pressed buttons: ${buttonText}`,
      `Deadzone: ${deadzone.toFixed(2)}`,
      `Look speed: ${lookSpeed.toFixed(2)}`,
      `Invert look X: ${invertLookX}`,
      `Invert look Y: ${invertLookY}`,
      `Fullscreen: ${snapshot.fullscreen}`,
      `User agent: ${navigator.userAgent}`,
      `Note: ${snapshot.note}`,
    ].join("\n");
  }, [deadzone, invertLookX, invertLookY, lookSpeed, snapshot]);

  const handleCopyDiagnostics = useCallback(async () => {
    const copied = await copyText(diagnosticText);
    setCopyLabel(copied ? "Copied" : "Copy failed");
    window.setTimeout(() => setCopyLabel("Copy diagnostics"), 1400);
  }, [diagnosticText]);

  const connectedLabel = snapshot.connected ? "Connected" : "Waiting";

  return (
    <aside className="backbone-hud" aria-label="Backbone controller test panel">
      <section className={`backbone-panel${expanded ? " is-expanded" : ""}`}>
        <button
          type="button"
          className="backbone-panel__summary"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          <span
            className={`backbone-panel__dot${snapshot.connected ? " is-connected" : ""}`}
            aria-hidden="true"
          />
          <span>Backbone: {connectedLabel}</span>
          <span className="backbone-panel__chevron" aria-hidden="true">
            {expanded ? "−" : "+"}
          </span>
        </button>

        {expanded && (
          <div className="backbone-panel__details">
            <p className="backbone-panel__note">{snapshot.note}</p>

            <dl className="backbone-panel__readout">
              <div>
                <dt>Device</dt>
                <dd>{snapshot.id || "Not exposed yet"}</dd>
              </div>
              <div>
                <dt>Mapping</dt>
                <dd>{snapshot.mapping || "unknown"}</dd>
              </div>
              <div>
                <dt>Axes</dt>
                <dd>
                  {snapshot.axes.length
                    ? snapshot.axes.map((axis) => axis.toFixed(2)).join(" · ")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Buttons</dt>
                <dd>
                  {snapshot.pressedButtons.length
                    ? snapshot.pressedButtons.join(", ")
                    : "—"}
                </dd>
              </div>
            </dl>

            <label className="backbone-panel__field">
              <span>Deadzone: {deadzone.toFixed(2)}</span>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.01"
                value={deadzone}
                onChange={(event) => setDeadzone(Number(event.currentTarget.value))}
              />
            </label>

            <label className="backbone-panel__field">
              <span>Look speed: {lookSpeed.toFixed(1)}</span>
              <input
                type="range"
                min="0.8"
                max="6"
                step="0.1"
                value={lookSpeed}
                onChange={(event) => setLookSpeed(Number(event.currentTarget.value))}
              />
            </label>

            <div className="backbone-panel__toggles">
              <label>
                <input
                  type="checkbox"
                  checked={invertLookX}
                  onChange={(event) => setInvertLookX(event.currentTarget.checked)}
                />
                Invert X
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={invertLookY}
                  onChange={(event) => setInvertLookY(event.currentTarget.checked)}
                />
                Invert Y
              </label>
            </div>

            <div className="backbone-panel__actions">
              <button type="button" onClick={() => void toggleFullscreen()}>
                {snapshot.fullscreen ? "Exit fullscreen" : "Fullscreen"}
              </button>
              <button type="button" onClick={() => void handleCopyDiagnostics()}>
                {copyLabel}
              </button>
            </div>

            <p className="backbone-panel__mapping">
              Left stick move · Right stick camera · A/Cross jump · L3 run · Start fullscreen
            </p>
          </div>
        )}
      </section>
    </aside>
  );
}
