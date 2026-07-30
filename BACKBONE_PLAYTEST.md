# Ecctrl Backbone playtest

This branch adds browser Gamepad API input to the existing Ecctrl example without changing the controller's movement, physics, or animation tuning.

## First-pass mapping

| Backbone / standard gamepad input | Action |
| --- | --- |
| Left stick | Analog character movement |
| D-pad | Digital character movement fallback |
| Right stick | Orbit camera |
| A / Cross | Jump |
| L3 / left-stick click | Run while held |
| L2 / left trigger | Run while held |
| X / Square | Enter or exit the nearby vehicle |
| Start / Menu | Attempt fullscreen |

A visible **Fullscreen** button is also included because mobile browsers may require a direct screen tap before allowing fullscreen.

## Phone test

1. Connect the Backbone before or after opening the page.
2. Keep the page focused and press a controller button once if the panel says **Waiting**.
3. Confirm the panel changes to **Connected**.
4. Test slow left-stick movement, full-speed movement, direction changes, jump, L3/L2 sprint, Square vehicle entry and exit, and right-stick camera.
5. Adjust deadzone, look speed, or camera inversion in the panel if needed.
6. Use **Copy diagnostics** and paste the result with any playtest notes.

## Deliberate limits of this pass

This pass maps the standard Ecctrl character plus vehicle entry and exit. It does not yet map vehicle driving, drone flight, or shooting. Touch controls remain available whenever no gamepad is detected.
