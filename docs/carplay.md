# CarPlay setup (React Native CLI)

CarPlay apps must use the **UIScene life cycle**. The default React Native CLI template creates its window in the app delegate, so three small changes are needed. Expo users can skip this page; the [config plugin](./expo.md) does it for you.

## 1. Declare the scenes in `Info.plist`

```xml
<key>UIApplicationSceneManifest</key>
<dict>
  <key>UIApplicationSupportsMultipleScenes</key>
  <false/>
  <key>UISceneConfigurations</key>
  <dict>
    <!-- The phone UI -->
    <key>UIWindowSceneSessionRoleApplication</key>
    <array>
      <dict>
        <key>UISceneConfigurationName</key>
        <string>Phone</string>
        <key>UISceneDelegateClassName</key>
        <string>RNCarScreensPhoneSceneDelegate</string>
      </dict>
    </array>
    <!-- The car screen -->
    <key>CPTemplateApplicationSceneSessionRoleApplication</key>
    <array>
      <dict>
        <key>UISceneConfigurationName</key>
        <string>CarPlay</string>
        <key>UISceneDelegateClassName</key>
        <string>RNCarScreensSceneDelegate</string>
      </dict>
    </array>
  </dict>
</dict>
```

## 2. Start React Native from the phone scene

In `AppDelegate.swift`, keep creating the factory but let the scene create the window:

```swift
import CarScreens

func application(
  _ application: UIApplication,
  didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
) -> Bool {
  let delegate = ReactNativeDelegate()
  let factory = RCTReactNativeFactory(delegate: delegate)
  delegate.dependencyProvider = RCTAppDependencyProvider()
  reactNativeDelegate = delegate
  reactNativeFactory = factory

  // Remove:
  //   window = UIWindow(frame: UIScreen.main.bounds)
  //   factory.startReactNative(withModuleName: "YourApp", in: window, launchOptions: launchOptions)
  // Add:
  CarScreensPhoneSceneDelegate.start = { window, options in
    factory.startReactNative(withModuleName: "YourApp", in: window, launchOptions: options ?? launchOptions)
  }
  return true
}
```

`RNCarScreensPhoneSceneDelegate` does the following:
- creates the window for the phone scene and calls your `start` closure;
- mirrors the window onto `AppDelegate.window` for libraries that read it;
- forwards `openURL` and universal links to your app delegate, so `RCTLinkingManager` keeps working. That includes a link that cold-starts the app, which arrives as `launchOptions[.url]`.

## 3. Add the entitlement

Create or extend `YourApp.entitlements` and make sure the target's **Code Signing Entitlements** build setting points to it:

```xml
<key>com.apple.developer.carplay-driving-task</key>
<true/>
```

Use the key for your category:

| Category | Entitlement key |
|---|---|
| Driving task | `com.apple.developer.carplay-driving-task` |
| Audio | `com.apple.developer.carplay-audio` |
| Communication | `com.apple.developer.carplay-communication` |
| EV charging | `com.apple.developer.carplay-charging` |
| Fueling | `com.apple.developer.carplay-fueling` |
| Parking | `com.apple.developer.carplay-parking` |
| Quick food ordering | `com.apple.developer.carplay-quick-ordering` |
| Navigation | `com.apple.developer.carplay-maps` |
| Public safety | `com.apple.developer.carplay-public-safety` |

The Simulator accepts the entitlement without approval. Real devices need Apple to grant it to your App ID first; see [Platform rules](./store-review.md).

## 4. Rebuild

```sh
cd ios && pod install && cd ..
npx react-native run-ios
```

Then open **I/O › External Displays › CarPlay** in the Simulator.

## How it behaves

- **Before JS runs:** until JavaScript calls `setRoot`, the car shows a placeholder with your app name and "Open the app on your phone."
- **Phone locked:** while CarPlay shows your app, iOS keeps the process in the foreground, so JavaScript keeps running even if the phone is locked. Work done in JS, such as timers, network and TFLite, continues. The phone *camera* does not work while locked.
- **Refresh rate:** root updates are coalesced to about 3 per second. Templates are updated in place when the `id` and `type` stay the same.

## Manual setup for a custom AppDelegate

If you use Expo but your `AppDelegate.swift` is customised, do the equivalent of the plugin by hand:

1. Add `ExpoReactNativeFactoryProvider` conformance to `AppDelegate`.
2. Delete the `window = UIWindow(...)` and `factory.startReactNative(...)` lines.
3. Use `EXExpoAppSceneDelegate` as the phone scene delegate in the `Info.plist` above.
4. Add the entitlement.
