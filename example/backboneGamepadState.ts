export type BackboneStickState = {
  x: number;
  y: number;
};

export type BackboneGamepadState = {
  connected: boolean;
  id: string;
  index: number;
  mapping: string;
  left: BackboneStickState;
  right: BackboneStickState;
  jump: boolean;
  run: boolean;
  deadzone: number;
  lookSpeedX: number;
  lookSpeedY: number;
  invertLookX: boolean;
  invertLookY: boolean;
  rawAxes: number[];
  pressedButtons: number[];
};

export const backboneGamepadState: BackboneGamepadState = {
  connected: false,
  id: "",
  index: -1,
  mapping: "",
  left: { x: 0, y: 0 },
  right: { x: 0, y: 0 },
  jump: false,
  run: false,
  deadzone: 0.14,
  lookSpeedX: 2.8,
  lookSpeedY: 2.1,
  invertLookX: false,
  invertLookY: false,
  rawAxes: [],
  pressedButtons: [],
};

export function resetBackboneGamepadState(): void {
  backboneGamepadState.connected = false;
  backboneGamepadState.id = "";
  backboneGamepadState.index = -1;
  backboneGamepadState.mapping = "";
  backboneGamepadState.left.x = 0;
  backboneGamepadState.left.y = 0;
  backboneGamepadState.right.x = 0;
  backboneGamepadState.right.y = 0;
  backboneGamepadState.jump = false;
  backboneGamepadState.run = false;
  backboneGamepadState.rawAxes = [];
  backboneGamepadState.pressedButtons = [];
}
