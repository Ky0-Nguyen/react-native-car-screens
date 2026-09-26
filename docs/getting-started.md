# Getting started

This guide takes you from install to a working screen on CarPlay and Android Auto.

- [Requirements](#requirements)
- [1. Install](#1-install)
- [2. Native setup](#2-native-setup)
- [3. Show your first screen](#3-show-your-first-screen)
- [4. Run it in a simulator](#4-run-it-in-a-simulator)
- [Next steps](#next-steps)

## Requirements

| | Minimum |
|---|---|
| React Native | 0.76, New Architecture enabled (the default since 0.76) |
| Expo (optional) | SDK 55, development build (not Expo Go) |
| iOS | 14.0 (CarPlay templates used by this library) |
| Android | 8.0 / API 26 on the phone; car API level 1+ on the head unit |
| Xcode | 16+ |

## 1. Install

```sh
npm install react-native-car-screens
# or
yarn add react-native-car-screens
```

## 2. Native setup

Both car platforms need a few native declarations that JavaScript cannot add at runtime:

| Platform | What is needed | Why |
|---|---|---|
| iOS | Scene manifest in `Info.plist` | CarPlay only works with the UIScene life cycle |
| iOS | App delegate change | With scenes, the phone window must come from a scene delegate |
| iOS | CarPlay entitlement | Apple only shows entitled apps on CarPlay |
| Android | App category placeholder | Android Auto groups apps by category and reviews them against it |

Pick your setup guide:

- **Expo:** add the config plugin. See [Expo setup](./expo.md). This takes about one minute.
- **React Native CLI, iOS:** see [CarPlay setup](./carplay.md).
- **React Native CLI, Android:** see [Android Auto setup](./android-auto.md).

## 3. Show your first screen

```tsx
import { useState } from 'react';
import { useCarEvents, useCarRootTemplate } from 'react-native-car-screens';

export function CarStatus() {
  const [count, setCount] = useState(0);

  // Re-sent on every change. Same id + type = updated in place on the car.
  useCarRootTemplate({
    type: 'information',
    id: 'status',
    title: 'My app',
    items: [{ title: 'Counter', detail: String(count) }],
    actions: [{ id: 'increment', title: '+1', style: 'primary' }],
  });

  useCarEvents((event) => {
    if (event.type === 'action' && event.actionId === 'increment') {
      setCount((c) => c + 1);
    }
  });

  return null;
}
```

Mount `<CarStatus />` anywhere that stays mounted, such as your root component. The car shows whatever root template was set last, even if it connects later.

## 4. Run it in a simulator

- **CarPlay:** run the iOS app in the Simulator, then choose **I/O › External Displays › CarPlay**. Your app appears on the CarPlay home screen.
- **Android Auto:** install the Desktop Head Unit and connect a phone or emulator. See [Testing](./testing.md).

## Next steps

- [Templates](./templates.md): every template, its fields and how it maps to each platform
- [Events](./events.md): buttons, list taps, back navigation, connection
- [API reference](./api.md)
- [Platform rules and store review](./store-review.md)
- [Troubleshooting](./troubleshooting.md)
