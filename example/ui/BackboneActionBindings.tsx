import { useEffect, useRef } from "react";
import { useButtonStore, useJoystickStore } from "../../src/input";
import { backboneGamepadState } from "../backboneGamepadState";
import { useControlStore } from "../store/useControlStore";

type ButtonSnapshot = {
  b1: boolean;
  b2: boolean;
  b3: boolean;
};

type StickSnapshot = {
  x: number;
  y: number;
};

const EPSILON = 0.0001;

function stickChanged(
  previous: StickSnapshot,
  nextX: number,
  nextY: number,
): boolean {
  return (
    Math.abs(previous.x - nextX) > EPSILON ||
    Math.abs(previous.y - nextY) > EPSILON
  );
}

/**
 * Bridges the mutable Backbone state into the example's existing touch-input
 * stores so every controller mode continues through its original control path.
 *
 * Character:
 * - Movement, analog walk/run, jump, and camera are read directly by Ecctrl.
 * - X / Square pulses b4 for vehicle entry.
 *
 * Ground vehicles:
 * - Left stick -> steering
 * - R2 -> gas (b3)
 * - L2 -> reverse (b1)
 * - A / Cross -> brake (b2)
 * - X / Square -> exit (b4)
 *
 * Drone:
 * - Left stick -> throttle / yaw
 * - Right stick -> pitch / roll
 * - X / Square -> exit (b4)
 */
export function BackboneActionBindings() {
  const activeController = useControlStore((state) => state.activeController);
  const activeControllerRef = useRef(activeController);
  const setButtonActive = useButtonStore((state) => state.setButtonActive);
  const setJoystick = useJoystickStore((state) => state.setJoystick);
  const resetJoystick = useJoystickStore((state) => state.resetJoystick);

  useEffect(() => {
    activeControllerRef.current = activeController;
  }, [activeController]);

  useEffect(() => {
    let animationFrame = 0;
    let hadGamepad = false;
    let previousInteract = false;
    const previousButtons: ButtonSnapshot = { b1: false, b2: false, b3: false };
    const previousLeft: StickSnapshot = { x: 0, y: 0 };
    const previousRight: StickSnapshot = { x: 0, y: 0 };

    const syncButton = (id: keyof ButtonSnapshot, next: boolean) => {
      if (!hadGamepad || previousButtons[id] !== next) {
        setButtonActive(id, next);
        previousButtons[id] = next;
      }
    };

    const syncJoystick = (
      id: "left" | "right",
      previous: StickSnapshot,
      nextX: number,
      nextY: number,
    ) => {
      if (!hadGamepad || stickChanged(previous, nextX, nextY)) {
        setJoystick(nextX, nextY, id);
        previous.x = nextX;
        previous.y = nextY;
      }
    };

    const clearJoystick = (id: "left" | "right", previous: StickSnapshot) => {
      if (!hadGamepad || previous.x !== 0 || previous.y !== 0) {
        resetJoystick(id);
        previous.x = 0;
        previous.y = 0;
      }
    };

    const releaseControls = () => {
      setButtonActive("b1", false);
      setButtonActive("b2", false);
      setButtonActive("b3", false);
      setButtonActive("b4", false);
      resetJoystick("left");
      resetJoystick("right");
      previousButtons.b1 = false;
      previousButtons.b2 = false;
      previousButtons.b3 = false;
      previousLeft.x = 0;
      previousLeft.y = 0;
      previousRight.x = 0;
      previousRight.y = 0;
      previousInteract = false;
      hadGamepad = false;
    };

    const poll = () => {
      if (!backboneGamepadState.connected) {
        if (hadGamepad) releaseControls();
        animationFrame = requestAnimationFrame(poll);
        return;
      }

      const currentController = activeControllerRef.current;
      const isGroundVehicle =
        currentController === "vehicle1" || currentController === "vehicle2";
      const isDrone = currentController === "vehicle3";

      if (isGroundVehicle) {
        syncJoystick(
          "left",
          previousLeft,
          backboneGamepadState.left.x,
          backboneGamepadState.left.y,
        );
        clearJoystick("right", previousRight);
        syncButton("b1", backboneGamepadState.reverse);
        syncButton("b2", backboneGamepadState.jump);
        syncButton("b3", backboneGamepadState.accelerate);
      } else if (isDrone) {
        syncJoystick(
          "left",
          previousLeft,
          backboneGamepadState.left.x,
          backboneGamepadState.left.y,
        );
        syncJoystick(
          "right",
          previousRight,
          backboneGamepadState.right.x,
          -backboneGamepadState.right.y,
        );
        syncButton("b1", false);
        syncButton("b2", false);
        syncButton("b3", false);
      } else {
        clearJoystick("left", previousLeft);
        clearJoystick("right", previousRight);
        syncButton("b1", false);
        syncButton("b2", false);
        syncButton("b3", false);
      }

      // Pulse the existing enter/exit action once per X/Square press. Keeping
      // this effect alive across controller changes prevents one held press
      // from immediately entering and then exiting again.
      if (backboneGamepadState.interact && !previousInteract) {
        setButtonActive("b4", true);
        setButtonActive("b4", false);
      }

      hadGamepad = true;
      previousInteract = backboneGamepadState.interact;
      animationFrame = requestAnimationFrame(poll);
    };

    animationFrame = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(animationFrame);
      releaseControls();
    };
  }, [resetJoystick, setButtonActive, setJoystick]);

  return null;
}
