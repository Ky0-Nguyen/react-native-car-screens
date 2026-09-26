# Events

Everything the car sends back arrives as a `CarEvent`:

```ts
import { useCarEvents, CarScreens } from 'react-native-car-screens';

// In a component: the latest handler is always used.
useCarEvents((event) => { /* ... */ });

// Anywhere else: returns an unsubscribe function.
const off = CarScreens.addListener((event) => { /* ... */ });
off();
```

## `connect` / `disconnect`

```ts
{ type: 'connect'; platform: 'carplay' | 'androidauto' }
{ type: 'disconnect' }
```

These fire when a car screen attaches or detaches. `useCarConnected()` gives you the same state as a boolean. You don't need to wait for `connect` before calling `setRoot`, because templates are stored and shown when the car connects.

## `action`

```ts
{ type: 'action'; templateId: string; actionId: string }
```

This fires when a button of an `information` template is pressed. `templateId` is the template the button belongs to, which is the tab's id inside `tabs`.

## `select`

```ts
{ type: 'select'; templateId: string; itemId: string }
```

This fires when a list row is tapped. It is common to respond by pushing a detail template:

```ts
useCarEvents((e) => {
  if (e.type === 'select' && e.templateId === 'cameras') {
    CarScreens.push({
      type: 'information',
      id: `camera-${e.itemId}`,
      title: 'Camera',
      items: [{ title: 'Status', detail: 'Recording' }],
    });
  }
});
```

On CarPlay the row's loading spinner stops as soon as the event is emitted.

## `pop`

```ts
{ type: 'pop'; templateId: string }
```

This fires when the **user** navigates back from a pushed template, through the back button or a system gesture. The library has already removed the template from its stack. It does not fire for `CarScreens.pop()` calls.

## `alertAction` / `alertDismissed`

```ts
{ type: 'alertAction'; alertId: string; actionId: string }
{ type: 'alertDismissed'; alertId: string }
```

`alertAction` fires when an alert button is pressed. `alertDismissed` fires whenever the alert goes away: after an action, on timeout, when replaced by another alert, or through `dismissAlert()`.

## Threading

Events are delivered on the JS thread through the TurboModule event emitter. Native code emits them from the main thread.
