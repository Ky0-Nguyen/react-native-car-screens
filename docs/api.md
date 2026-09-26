# API reference

```ts
import {
  CarScreens,
  isSupported,
  useCarRootTemplate,
  useCarEvents,
  useCarConnected,
  validateTemplate,
  validateAlert,
  CarTemplateError,
  LIMITS,
} from 'react-native-car-screens';
```

## `CarScreens`

### `setRoot(template: CarTemplate): void`

Sets the root template. Sending the same `id` and `type` again updates the screen in place and keeps pushed templates. A different `id` replaces the root and clears the stack. The template is stored natively and shown when a car connects. See [Identity and updates](./templates.md#identity-and-updates).

### `push(template: CarTemplate): void`

Pushes a template on top of the stack. If a template with the same `id` is already on the stack, that one is updated instead.

### `pop(): void`

Pops the top pushed template. The root cannot be popped. This does not emit a `pop` event, because that event is only for user navigation.

### `showAlert(alert: CarAlert): void`

Shows a short alert over the current screen and replaces any visible alert. See [Alerts](./templates.md#alerts).

### `dismissAlert(): void`

Dismisses the visible alert, if any.

### `isConnected(): boolean`

Returns whether a CarPlay or Android Auto screen is currently attached.

### `addListener(listener: (event: CarEvent) => void): () => void`

Subscribes to [events](./events.md) and returns an unsubscribe function.

## Hooks

### `useCarRootTemplate(template: CarTemplate | null): void`

Calls `setRoot` whenever the serialised template changes, and skips identical updates. Passing `null` leaves the current root untouched.

### `useCarEvents(handler: (event: CarEvent) => void): void`

Subscribes for the component's lifetime. The latest `handler` is always called, so you can use state inside it without extra memoisation.

### `useCarConnected(): boolean`

Tracks `connect` and `disconnect` events.

## Validation

### `validateTemplate(template)` / `validateAlert(alert)`

These run automatically before anything reaches native code. They throw `CarTemplateError` when ids are missing or duplicated, tabs are nested, or `LIMITS` are exceeded. They are exported for unit tests.

### `LIMITS`

```ts
{ informationItems: 10, informationActions: 3, listItems: 100, tabs: 5, alertActions: 2 }
```

## `isSupported: boolean`

This is `false` when the native module is not linked, for example on web, in Expo Go, or in Jest. All `CarScreens` calls are then no-ops and `isConnected()` returns `false`, so you don't need platform checks in shared code.

## Types

```ts
type CarTemplate = InformationTemplate | ListTemplate | TabsTemplate;

type InformationTemplate = {
  type: 'information';
  id: string;
  title: string;
  items: { title: string; detail: string }[];
  actions?: CarAction[];
  tab?: CarTab;
};

type ListTemplate = {
  type: 'list';
  id: string;
  title: string;
  sections: { header?: string; items: { id: string; text: string; detail?: string }[] }[];
  emptyMessage?: string;
  tab?: CarTab;
};

type TabsTemplate = { type: 'tabs'; id: string; tabs: (InformationTemplate | ListTemplate)[] };

type CarTab = { title: string; systemImage?: string };
type CarAction = { id: string; title: string; style?: 'default' | 'primary' | 'destructive' };
type CarAlert = { id: string; title: string; subtitle?: string; durationMs?: number; actions?: CarAction[] };
```

See [`src/types.ts`](../src/types.ts) for the `CarEvent` union.

## Native symbols

| Platform | Symbol | Purpose |
|---|---|---|
| iOS | `RNCarScreensSceneDelegate` | CarPlay scene delegate (Info.plist) |
| iOS | `RNCarScreensPhoneSceneDelegate`, `CarScreensPhoneSceneDelegate.start` | Phone scene for React Native CLI apps |
| Android | `com.carscreens.CarScreensService` | `CarAppService`, declared by the library |
| Android | `carScreensCategory` | Manifest placeholder for the app category |
