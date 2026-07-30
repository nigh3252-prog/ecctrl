import { useEffect } from "react";
import { useButtonStore } from "../../src/input";
import { useControlStore } from "../store/useControlStore";

function isPressed(gamepad: Gamepad, buttonIndex: number): boolean {
  const button = gamepad.buttons[buttonIndex];
  return Boolean(button && (button.pressed || button.value > 0.5));
}

function readConnectedGamepad(): Gamepad | null {
  if (!("getGamepads" in navigator)) return null;

  try {
    return Array.from(navigator.getGamepads()).find(
      (gamepad): gamepad is Gamepad => Boolean(gamepad?.connected),
    ) ?? null;
  } catch {
    return null;
  }
}

/**
 * Adds the two action bindings requested for the Backbone playtest while
 * reusing the example's existing virtual-button control path:
 *
 * - L2 / left trigger -> b1 (character sprint)
 * - X / Square       -> b4 (vehicle enter / exit)
 */
export function BackboneActionBindings() {
  const setButtonActive = useButtonStore((state) => state.setButtonActive);

  useEffect(() => {
    let animationFrame = 0;
    let hadGamepad = false;
    let previousSprint = false;
    let previousInteract = false;

    const releaseButtons = () => {
      if (hadGamepad || previousSprint) setButtonActive("b1", false);
      if (hadGamepad || previousInteract) setButtonActive("b4", false);
      hadGamepad = false;
      previousSprint = false;
      previousInteract = false;
    };

    const poll = () => {
      const gamepad = readConnectedGamepad();

      if (!gamepad) {
        if (hadGamepad) releaseButtons();
        animationFrame = requestAnimationFrame(poll);
        return;
      }

      const sprint =
        useControlStore.getState().activeController === "ecctrl" &&
        isPressed(gamepad, 6);
      const interact = isPressed(gamepad, 2);

      if (!hadGamepad || sprint !== previousSprint) {
        setButtonActive("b1", sprint);
      }
      if (!hadGamepad || interact !== previousInteract) {
        setButtonActive("b4", interact);
      }

      hadGamepad = true;
      previousSprint = sprint;
      previousInteract = interact;
      animationFrame = requestAnimationFrame(poll);
    };

    animationFrame = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(animationFrame);
      releaseButtons();
    };
  }, [setButtonActive]);

  return null;
}
