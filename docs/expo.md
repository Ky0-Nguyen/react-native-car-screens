# Expo setup

The library ships an Expo config plugin that does all native setup. It works with **development builds** (`npx expo run:ios|android` or EAS Build), not with Expo Go.

## 1. Add the plugin

`app.json` / `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-car-screens",
        {
          "ios": { "entitlement": "driving-task" },
          "android": { "category": "iot" }
        }
      ]
    ]
  }
}
```

## 2. Rebuild the native projects

```sh
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```

## Options

| Option | Values | Default |
|---|---|---|
| `ios.entitlement` | `driving-task`, `audio`, `communication`, `charging`, `fueling`, `parking`, `quick-ordering`, `navigation`, `public-safety`, or `false` to skip | `driving-task` |
| `android.category` | `iot`, `poi`, `navigation`, `charging`, `parking`, `weather`, or a full `androidx.car.app.category.*` string | `iot` |

Choose the category that describes your app honestly. Both Apple and Google review car apps against it; see [Platform rules](./store-review.md).

## What the plugin changes

| File | Change |
|---|---|
| `ios/<App>/Info.plist` | Adds `UIApplicationSceneManifest` with Expo's phone scene (`EXExpoAppSceneDelegate`) and the CarPlay scene (`RNCarScreensSceneDelegate`) |
| `ios/<App>/AppDelegate.swift` | Conforms to `ExpoReactNativeFactoryProvider` and stops creating the window (Expo's scene delegate does it) |
| `ios/<App>/<App>.entitlements` | Adds the CarPlay entitlement for the chosen category |
| `android/app/build.gradle` | Sets `manifestPlaceholders["carScreensCategory"]` |

If your `AppDelegate.swift` was customised and doesn't match the Expo template, prebuild stops with an error instead of guessing. In that case, follow the manual steps in [CarPlay setup](./carplay.md#manual-setup-for-a-custom-appdelegate).

## Compatibility with other plugins

Another plugin may also define `UIApplicationSceneManifest`. This plugin keeps an existing phone scene configuration and only adds the CarPlay role. It is safest to list `react-native-car-screens` **after** such plugins.
