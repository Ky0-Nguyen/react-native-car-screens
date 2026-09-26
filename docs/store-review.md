# Platform rules and store review

Car platforms are restrictive by design. The library only exposes what both platforms allow for non-media apps, but getting approved still depends on your app.

## Apple CarPlay

- **The entitlement is granted per category.** Request it on the [CarPlay page](https://developer.apple.com/carplay/) for your App ID and state the category (driving task, EV charging, parking…). Without it, CarPlay works in the Simulator but your app won't appear on real cars.
- **Only templates.** CarPlay offers no custom drawing and no video (navigation apps may draw a map base view, which this library does not cover).
- **Driving-task apps** must help with a task related to driving. They must not be a generic dashboard, and they should need minimal interaction.
- Read the [CarPlay Developer Guide](https://developer.apple.com/carplay/documentation/CarPlay-Developer-Guide.pdf) for the template depth, list sizes and the rules for each category.

## Android Auto

- **Category** is the intent-filter category you set with `carScreensCategory`. Google Play reviews the app against the [car app quality guidelines](https://developer.android.com/docs/quality-guidelines/car-app-quality) for that category.
- **Templates only**, with a step limit per task. Refreshing the same template with the same title does not count as a step, which is why in-place updates keep the same `id`.
- **Distraction:** keep text short, avoid rapid updates and do not ask for typing while driving.
- **Release host validation:** only Google's hosts are accepted. Distribute through Play, including internal testing tracks, to test release builds in a car.

## Good practice

- Driver-facing alerts should be rare and short, and they should repeat only when something changes.
- Sound and voice produced by the phone app play through the car speakers when the phone is connected. Use them for urgent information instead of relying on the screen.
- Don't make the car screen the only way to do something important. Drivers often keep their phone in a pocket.
