# react-native-car-screens

Declarative **Apple CarPlay** and **Android Auto** screens for React Native: one JSON template API for both cars, from **React Native CLI** or **Expo**.

```tsx
import { CarScreens, useCarRootTemplate, useCarEvents } from 'react-native-car-screens';

useCarRootTemplate({
  type: 'information',
  id: 'status',
  title: 'Parking sensor',
  items: [{ title: 'Distance', detail: `${meters} m` }],
  actions: [{ id: 'stop', title: 'Stop', style: 'destructive' }],
});

useCarEvents((e) => {
  if (e.type === 'action' && e.actionId === 'stop') stop();
});
```

- **TurboModule** (New Architecture). It needs no Expo dependency; an optional Expo config plugin does the native setup for Expo users.
- The **same templates on both platforms**, mapped to each car's system templates. Neither platform lets third-party apps draw custom UI or video while driving, so this library doesn't pretend otherwise.
- **State survives connects.** The latest templates are kept natively, so a car that connects after your JS ran shows the current screen right away.
- **In-place updates.** Re-send a template with the same `id` and the car screen updates without a transition. Updates are coalesced natively, which matters because hosts throttle refreshes.

## Documentation

| | |
|---|---|
| [Getting started](docs/getting-started.md) | Install and show a first screen |
| [Expo setup](docs/expo.md) | Config plugin and its options |
| [CarPlay setup (React Native CLI)](docs/carplay.md) | Scenes, AppDelegate, entitlement |
| [Android Auto setup (React Native CLI)](docs/android-auto.md) | Category, manifest, host validation |
| [Templates](docs/templates.md) | Every template and how it maps to each platform |
| [Events](docs/events.md) | Buttons, list taps, back, alerts, connection |
| [API reference](docs/api.md) | Functions, hooks, types |
| [Testing](docs/testing.md) | CarPlay Simulator, Desktop Head Unit, Jest |
| [Platform rules and store review](docs/store-review.md) | Entitlements, categories, guidelines |
| [Troubleshooting](docs/troubleshooting.md) | Common problems |

## Templates

| Template | CarPlay | Android Auto |
|---|---|---|
| `information`: title, up to 10 `{title, detail}` items, up to 3 actions | `CPInformationTemplate` | `PaneTemplate` (host row limit, 2 actions) |
| `list`: sections of `{id, text, detail}` rows, tap emits `select` | `CPListTemplate` | `ListTemplate` (single or sectioned) |
| `tabs`: up to 5 `information` / `list` tabs | `CPTabBarTemplate` (SF Symbol icons) | selected tab + action strip to switch |
| `showAlert({ id, title, subtitle, durationMs, actions })` | `CPAlertTemplate` | `Alert` (car API 5+), toast before that |
| `push` / `pop` | template stack | screen stack |

Events (`useCarEvents` / `CarScreens.addListener`):

```ts
type CarEvent =
  | { type: 'connect'; platform: 'carplay' | 'androidauto' }
  | { type: 'disconnect' }
  | { type: 'action'; templateId: string; actionId: string }
  | { type: 'select'; templateId: string; itemId: string }
  | { type: 'alertAction'; alertId: string; actionId: string }
  | { type: 'alertDismissed'; alertId: string }
  | { type: 'pop'; templateId: string }; // the user went back
```

## API

| | |
|---|---|
| `CarScreens.setRoot(template)` | Replace the root; same `id` means an in-place update |
| `CarScreens.push(template)` / `pop()` | Stack navigation; pushing an id already on the stack updates it |
| `CarScreens.showAlert(alert)` / `dismissAlert()` | Short driver alerts |
| `CarScreens.isConnected()` | A car screen is attached |
| `CarScreens.addListener(fn)` | Returns an unsubscribe function |
| `useCarRootTemplate(template)` | Keeps the root in sync with render output, skipping identical updates |
| `useCarEvents(handler)` / `useCarConnected()` | Hooks |
| `validateTemplate` / `validateAlert` / `LIMITS` | Called for you; throws `CarTemplateError` |

Without the native module (web, Expo Go, tests), every call is a safe no-op and `isSupported` is `false`.

## Install

```sh
npm install react-native-car-screens
```

React Native 0.76+ with the New Architecture. iOS 14+, Android 8.0+ (car-app library 1.7).

### Expo (SDK 55+, development build)

```json
{
  "expo": {
    "plugins": [["react-native-car-screens", { "ios": { "entitlement": "driving-task" }, "android": { "category": "iot" } }]]
  }
}
```

The plugin switches the app to the scene life cycle using Expo's own `ExpoAppSceneDelegate`, registers the CarPlay scene, adds the entitlement and sets the Android Auto category. Then run `npx expo prebuild`.

- `ios.entitlement`: one of `driving-task` (default), `audio`, `communication`, `charging`, `fueling`, `parking`, `quick-ordering`, `navigation`, `public-safety`, or `false`.
- `android.category`: one of `iot` (default), `poi`, `navigation`, `charging`, `parking`, `weather`, or a full `androidx.car.app.category.*` string.

### React Native CLI: iOS

CarPlay requires the scene life cycle, and the library ships a phone scene delegate for it.

**1. `Info.plist`: declare both scenes**

```xml
<key>UIApplicationSceneManifest</key>
<dict>
  <key>UIApplicationSupportsMultipleScenes</key><false/>
  <key>UISceneConfigurations</key>
  <dict>
    <key>UIWindowSceneSessionRoleApplication</key>
    <array><dict>
      <key>UISceneConfigurationName</key><string>Phone</string>
      <key>UISceneDelegateClassName</key><string>RNCarScreensPhoneSceneDelegate</string>
    </dict></array>
    <key>CPTemplateApplicationSceneSessionRoleApplication</key>
    <array><dict>
      <key>UISceneConfigurationName</key><string>CarPlay</string>
      <key>UISceneDelegateClassName</key><string>RNCarScreensSceneDelegate</string>
    </dict></array>
  </dict>
</dict>
```

**2. `AppDelegate.swift`: let the scene create the window**

```swift
import CarScreens

// in application(_:didFinishLaunchingWithOptions:), replace
//   window = UIWindow(frame: UIScreen.main.bounds)
//   factory.startReactNative(withModuleName: "App", in: window, launchOptions: launchOptions)
// with:
CarScreensPhoneSceneDelegate.start = { window, options in
  factory.startReactNative(withModuleName: "App", in: window, launchOptions: options ?? launchOptions)
}
```

Deep links and universal links received by the scene are forwarded to your AppDelegate's `application(_:open:options:)` and `application(_:continue:restorationHandler:)`, so `RCTLinkingManager` keeps working.

**3. Entitlement:** add `com.apple.developer.carplay-driving-task` (or your category's key) to your `.entitlements` file. See [`example/ios`](example/ios).

### React Native CLI: Android

The library declares its `CarAppService`. Tell it your app category in `android/app/build.gradle`:

```groovy
android {
  defaultConfig {
    manifestPlaceholders["carScreensCategory"] = "androidx.car.app.category.IOT"
  }
}
```

## Getting on the stores

- **CarPlay:** request the entitlement for your category from Apple ([CarPlay developer portal](https://developer.apple.com/carplay/)). Without it, CarPlay still works in the simulator but not on devices.
- **Android Auto:** Google Play reviews car apps against the [car app quality guidelines](https://developer.android.com/docs/quality-guidelines/car-app-quality). To sideload during development, enable developer mode and *Unknown sources* in Android Auto settings. Release builds only accept Google's hosts (debug builds accept any).

## Testing

- **CarPlay:** in the iOS Simulator, choose *I/O › External Displays › CarPlay*.
- **Android Auto:** use the [Desktop Head Unit](https://developer.android.com/training/cars/testing/dhu), or a phone connected to a car / head unit.

## Develop

```sh
yarn
yarn test && yarn typecheck && yarn lint
yarn example ios      # React Native CLI example app
yarn example android
```

## License

MIT
