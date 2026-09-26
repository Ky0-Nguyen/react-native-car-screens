# Troubleshooting

### The app doesn't appear in CarPlay

- Check that the entitlement is in the **built** app. Look for `com.apple.developer.carplay-*` in the output of `codesign -d --entitlements - YourApp.app`.
- Check that `Info.plist` has `CPTemplateApplicationSceneSessionRoleApplication` with `RNCarScreensSceneDelegate`.
- On a real car or device, Apple must have granted the entitlement to your App ID.

### Black phone screen after adding CarPlay (React Native CLI)

The app now uses scenes, but React Native is never started. Make sure `CarScreensPhoneSceneDelegate.start` is set in `didFinishLaunchingWithOptions`, and that the phone scene in `Info.plist` uses `RNCarScreensPhoneSceneDelegate`. See [CarPlay setup](./carplay.md). Debug builds assert with a clear message when `start` is missing.

### Deep links stopped working

With scenes, URLs arrive at the scene delegate. `RNCarScreensPhoneSceneDelegate` forwards them to `application(_:open:options:)` and `application(_:continue:restorationHandler:)`. Keep those methods in your AppDelegate, calling `RCTLinkingManager` as usual.

### `Manifest merger failed ... no value for <carScreensCategory> is provided`

Add the placeholder to `android/app/build.gradle`. See [Android Auto setup](./android-auto.md).

### The app doesn't show up in Android Auto

- For the Desktop Head Unit and sideloaded installs, use a **debug** build. Release builds reject hosts that are not on Google's allowlist.
- Enable **Unknown sources** in Android Auto developer settings for apps not installed from Play.
- Confirm that the service is in the merged manifest: `aapt2 dump xmltree app.apk --file AndroidManifest.xml | grep CarAppService`.

### Updates are slow or skipped

Updates are coalesced natively: about 3 per second on CarPlay, at most one every 500 ms per screen on Android Auto. Hosts may throttle further. Send meaningful changes only; `useCarRootTemplate` already drops identical templates.

### `CarTemplateError`

Validation failed before anything reached native code. The message names the template and the rule, such as a missing id, a duplicate list item id, nested tabs or a limit. See [Limits](./templates.md#limits).

### It works in the Simulator but events never arrive

This happens when the native module isn't linked into the JS runtime you are running, for example in Expo Go, a stale dev client, or an old build. Check `isSupported`, then rebuild the native app.
