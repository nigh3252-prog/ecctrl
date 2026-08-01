/*!
 * Ecctrl
 * https://github.com/pmndrs/ecctrl
 *
 * SPDX-FileCopyrightText: 2023-2026 Erdong Chen
 * SPDX-License-Identifier: MIT
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import BaseEcctrl, { type EcctrlHandle, type EcctrlProps } from "./Ecctrl";
import type { MovementInput } from "./types";

const DEFAULT_WALK_SPEED = 2;
const DEFAULT_RUN_SPEED = 5;
const ANALOG_WALK_POINT = 0.55;
const INPUT_EPSILON = 0.0001;
const SPEED_UPDATE_EPSILON = 0.002;
const MIN_CONFIGURED_SPEED = 0.001;

type MovementMode = "normal" | "analog" | "run-handoff";

type AnalogMovementState = {
  mode: MovementMode;
  targetSpeed: number;
  runAnimation: boolean;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Converts current stick travel into a continuous target speed.
 *
 * - 0% travel -> stopped
 * - 55% travel -> configured walking speed
 * - 100% travel -> configured running speed
 */
function getAnalogTargetSpeed(
  factor: number,
  maxWalkVel: number,
  maxRunVel: number,
): number {
  const clampedFactor = clamp01(factor);

  if (clampedFactor <= ANALOG_WALK_POINT) {
    return (clampedFactor / ANALOG_WALK_POINT) * maxWalkVel;
  }

  return (
    maxWalkVel +
    ((clampedFactor - ANALOG_WALK_POINT) / (1 - ANALOG_WALK_POINT)) *
      (maxRunVel - maxWalkVel)
  );
}

/**
 * Adapter around the original Ecctrl controller that preserves the public API
 * while making joystick locomotion truly analog.
 *
 * Ecctrl normally normalizes joystick direction and then chooses one of two
 * fixed speeds. This adapter preserves the direction behavior, but sets both
 * physical speed limits to a target derived from the current stick magnitude.
 * The existing run input then controls animation selection only.
 */
const EcctrlAnalog = forwardRef<EcctrlHandle, EcctrlProps>((props, forwardedRef) => {
  const innerRef = useRef<EcctrlHandle | null>(null);
  const movementStateRef = useRef<AnalogMovementState>({
    mode: "normal",
    targetSpeed: props.maxWalkVel ?? DEFAULT_WALK_SPEED,
    runAnimation: false,
  });
  const [movementState, setMovementState] = useState(movementStateRef.current);

  const maxWalkVel = props.maxWalkVel ?? DEFAULT_WALK_SPEED;
  const maxRunVel = props.maxRunVel ?? DEFAULT_RUN_SPEED;

  const syncMovementState = useCallback((next: AnalogMovementState) => {
    const current = movementStateRef.current;
    const changed =
      current.mode !== next.mode ||
      current.runAnimation !== next.runAnimation ||
      Math.abs(current.targetSpeed - next.targetSpeed) > SPEED_UPDATE_EPSILON;

    if (!changed) return;

    movementStateRef.current = next;
    setMovementState(next);
  }, []);

  const setMovement = useCallback(
    (movement: MovementInput) => {
      const inner = innerRef.current;
      if (!inner) return;

      const joystickX = movement.joystick?.x ?? 0;
      const joystickY = movement.joystick?.y ?? 0;
      const stickMagnitude = clamp01(Math.hypot(joystickX, joystickY));
      const hasDigitalMovement = Boolean(
        movement.forward ||
          movement.backward ||
          movement.leftward ||
          movement.rightward,
      );
      const currentMode = movementStateRef.current.mode;

      // Once analog movement has started, remain in analog mode at zero speed
      // after release. This clears run animation deterministically and prevents
      // any remembered/toggled sprint state from leaking into the next push.
      const useAnalogMovement =
        stickMagnitude > INPUT_EPSILON ||
        (currentMode === "analog" && !hasDigitalMovement);

      if (useAnalogMovement) {
        const targetSpeed = getAnalogTargetSpeed(
          stickMagnitude,
          maxWalkVel,
          maxRunVel,
        );
        const runAnimation =
          stickMagnitude > INPUT_EPSILON && Boolean(movement.run);

        syncMovementState({
          mode: "analog",
          targetSpeed,
          runAnimation,
        });

        inner.setMovement({
          ...movement,
          // Toggle-run is disabled while analog movement is active, so this is
          // a current-frame animation state rather than a sprint-toggle press.
          run: runAnimation,
        });
        return;
      }

      // When keyboard input begins immediately after analog movement, keep
      // toggle-run disabled until the current run-button press is released.
      // This avoids converting one held Shift press into an accidental toggle.
      if (currentMode === "analog" && movement.run) {
        syncMovementState({
          mode: "run-handoff",
          targetSpeed: maxWalkVel,
          runAnimation: true,
        });
        inner.setMovement(movement);
        return;
      }

      if (currentMode === "run-handoff" && movement.run) {
        inner.setMovement(movement);
        return;
      }

      syncMovementState({
        mode: "normal",
        targetSpeed: maxWalkVel,
        runAnimation: false,
      });
      inner.setMovement(movement);
    },
    [maxRunVel, maxWalkVel, syncMovementState],
  );

  useImperativeHandle(
    forwardedRef,
    () =>
      new Proxy({} as EcctrlHandle, {
        get(_target, property) {
          if (property === "setMovement") return setMovement;

          const inner = innerRef.current;
          if (!inner) return undefined;

          const value = Reflect.get(inner, property, inner);
          return typeof value === "function" ? value.bind(inner) : value;
        },
      }),
    [setMovement],
  );

  const analogMode = movementState.mode === "analog";
  const forceHoldRun =
    analogMode || movementState.mode === "run-handoff";
  // Ecctrl's debug velocity arrow divides by configured walk/run speed. Keep a
  // tiny nonzero denominator while the released stick itself supplies no move
  // direction, so physical movement remains fully stopped.
  const configuredAnalogSpeed = Math.max(
    movementState.targetSpeed,
    MIN_CONFIGURED_SPEED,
  );

  return (
    <BaseEcctrl
      ref={innerRef}
      {...props}
      maxWalkVel={analogMode ? configuredAnalogSpeed : props.maxWalkVel}
      maxRunVel={analogMode ? configuredAnalogSpeed : props.maxRunVel}
      enableToggleRun={forceHoldRun ? false : props.enableToggleRun}
    />
  );
});

EcctrlAnalog.displayName = "EcctrlAnalog";

export default React.memo(EcctrlAnalog);
