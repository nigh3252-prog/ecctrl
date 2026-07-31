import { useFrame, useThree } from "@react-three/fiber";
import type { EcctrlCameraControlsHandle } from "../../src/camera";
import { backboneGamepadState } from "../backboneGamepadState";
import { useControlStore } from "../store/useControlStore";

type ThreeStateWithControls = {
  controls?: EcctrlCameraControlsHandle | null;
};

/**
 * The character already applies Backbone camera input inside EcctrlWrapper.
 * This adds the same right-stick camera orbit while driving either ground car.
 * The drone keeps the right stick exclusively for pitch and roll.
 */
export function BackboneVehicleCamera() {
  const activeController = useControlStore((state) => state.activeController);
  const cameraControls = useThree(
    (state) =>
      (state as typeof state & ThreeStateWithControls).controls ?? null,
  );

  useFrame((_, delta) => {
    const isGroundVehicle =
      activeController === "vehicle1" || activeController === "vehicle2";
    if (
      !isGroundVehicle ||
      !backboneGamepadState.connected ||
      !cameraControls
    ) {
      return;
    }

    const lookX = backboneGamepadState.invertLookX
      ? -backboneGamepadState.right.x
      : backboneGamepadState.right.x;
    const lookY = backboneGamepadState.invertLookY
      ? -backboneGamepadState.right.y
      : backboneGamepadState.right.y;

    if (Math.abs(lookX) <= 0.0001 && Math.abs(lookY) <= 0.0001) return;

    cameraControls.rotate(
      -lookX * backboneGamepadState.lookSpeedX * delta,
      lookY * backboneGamepadState.lookSpeedY * delta,
      false,
    );
  });

  return null;
}
