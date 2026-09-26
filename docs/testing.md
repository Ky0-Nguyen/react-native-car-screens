# Testing

## CarPlay simulator

1. Build and run the app in an iOS Simulator. The entitlement must be in the app's `.entitlements` file; the Simulator does not require Apple's approval.
2. In the Simulator menu choose **I/O › External Displays › CarPlay**.
3. Your app appears on the CarPlay home screen. Tap it to connect the CarPlay scene, and the `connect` event fires.

Test both a small and a wide CarPlay display; layouts differ between cars.

Apple also provides the **CarPlay Simulator** app (Additional Tools for Xcode), which connects a real iPhone over USB.

## Android Auto: Desktop Head Unit

1. Install **Android Auto Desktop Head Unit Emulator** from the Android SDK Manager (SDK Tools).
2. On the phone or emulator, open Android Auto settings, tap *Version and permission info* about ten times to enable developer mode, then from the overflow menu choose **Start head unit server**. Also enable **Unknown sources**.
3. Forward the port and start the DHU:

   ```sh
   adb forward tcp:5277 tcp:5277
   $ANDROID_HOME/extras/google/auto/desktop-head-unit
   ```

4. Run a **debug** build. Release builds only accept Google's hosts; see [Android Auto setup](./android-auto.md#host-validation).

## Unit tests

Jest runs without the native module, where every call is a no-op. Test your template-building logic with `validateTemplate`:

```ts
import { validateTemplate } from 'react-native-car-screens';
import { buildStatusTemplate } from './car';

test('status template is valid', () => {
  expect(() => validateTemplate(buildStatusTemplate({ speed: 42 }))).not.toThrow();
});
```

## Example app

The repository contains a React Native CLI example with a tab bar, a list that pushes a detail screen, and an alert button:

```sh
yarn
yarn example ios
yarn example android
```
