# Ecctrl Backbone playtest

This branch adds standard browser Gamepad API input across the Ecctrl example while preserving the existing character, vehicle, drone, physics, animation, and custom-gravity systems.

## Character mapping

| Backbone / standard gamepad input | Action |
| --- | --- |
| Left stick | Continuous analog movement: slight tilt moves slowly; full tilt reaches full run speed |
| D-pad | Full-speed digital movement fallback |
| Right stick | Orbit camera |
| A / Cross | Jump |
| X / Square | Enter the nearby vehicle or drone |
| Start / Menu | Attempt fullscreen |

There is no controller sprint button and no remembered sprint state. Character speed is recalculated from the current left-stick magnitude every frame:

- `0%` stick travel: stopped
- roughly `55%` stick travel: configured walking speed
- `100%` stick travel: configured running speed

The existing run-threshold setting now affects only the walk/run animation crossover. It does not switch physical movement between two fixed speeds. Releasing and pushing the stick again always produces the same speed for the same stick position.

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
4. On foot, hold the stick steadily at slight, quarter, half, three-quarter, and full tilt. Speed should remain stable at each position and increase continuously with additional travel.
5. Release the stick and repeat. The same stick position must produce the same speed; it must never alternate between walk and run.
6. Test jump, camera, Square entry/exit, both cars, and the drone to confirm the existing mappings remain intact.
7. Adjust deadzone, animation run threshold, look speed, or camera inversion in the panel if needed.
8. Use **Copy diagnostics** and paste the result with any playtest notes.

## Scope

Every gameplay action exposed by the example's character, ground-vehicle, and drone control paths has a gamepad mapping. Existing keyboard and touch control paths remain available when used.
