# Ecctrl Backbone playtest

This branch adds browser Gamepad API input to the existing Ecctrl example without changing the controller's movement, physics, animation, vehicle, or drone tuning.

## Character mapping

| Backbone / standard gamepad input | Action |
| --- | --- |
| Left stick, partial tilt | Walk |
| Left stick, strong tilt | Run |
| D-pad | Digital movement fallback |
| Right stick | Orbit camera |
| A / Cross | Jump |
| X / Square | Enter the nearby vehicle or drone |
| Start / Menu | Attempt fullscreen |

There is no dedicated controller sprint button. The default walk/run threshold is `0.72` after deadzone processing and can be adjusted in the Backbone panel.

## Ground vehicle mapping

| Backbone / standard gamepad input | Action |
| --- | --- |
| Left stick | Steer |
| R2 / right trigger | Gas |
| L2 / left trigger | Reverse |
| A / Cross | Brake |
| Right stick | Orbit camera |
| X / Square | Exit vehicle |
| Start / Menu | Attempt fullscreen |

## Drone mapping

| Backbone / standard gamepad input | Action |
| --- | --- |
| Left stick vertical | Throttle up/down |
| Left stick horizontal | Yaw left/right |
| Right stick vertical | Pitch forward/backward |
| Right stick horizontal | Roll left/right |
| X / Square | Exit drone |
| Start / Menu | Attempt fullscreen |

The drone uses both sticks for flight, so its right stick is intentionally not also used for camera orbit.

A visible **Fullscreen** button remains available because mobile browsers may require a direct screen tap before allowing fullscreen.

## Phone test

1. Connect the Backbone before or after opening the page.
2. Keep the page focused and press a controller button once if the panel says **Waiting**.
3. Confirm the panel changes to **Connected**.
4. On foot, verify small stick movement walks and stronger movement crosses cleanly into running.
5. Enter each ground vehicle and verify steering, gas, reverse, brake, camera orbit, and exit.
6. Enter the drone and verify throttle, yaw, pitch, roll, and exit.
7. Adjust deadzone, run threshold, look speed, or camera inversion in the panel if needed.
8. Use **Copy diagnostics** and paste the result with any playtest notes.

## Scope

This pass maps every gameplay action exposed by the example's character, ground-vehicle, and drone control paths. Existing keyboard and touch controls remain available whenever no gamepad is connected.
