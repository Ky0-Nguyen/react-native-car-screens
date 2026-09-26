# Templates

A template is a plain JSON-serialisable object. The library validates it in JS (see [Limits](#limits)) and renders it with each platform's system templates. You cannot draw custom views: both CarPlay and Android Auto forbid custom UI and video for non-media apps while driving.

- [Identity and updates](#identity-and-updates)
- [`information`](#information)
- [`list`](#list)
- [`tabs`](#tabs)
- [Alerts](#alerts)
- [Actions](#actions)
- [Limits](#limits)

## Identity and updates

Every template has an `id`. It decides what happens when you send a template again:

| You send | Result on the car |
|---|---|
| `setRoot` with the same `id` and `type` as the current root | Updated in place, no animation, pushed templates stay |
| `setRoot` with a different `id` | Root replaced, pushed templates cleared |
| `push` with an `id` already on the stack | That template is updated in place |
| `push` with a new `id` | Pushed on top |

This makes a render-driven style natural. Build the template from state and hand it to `useCarRootTemplate`, which also skips sending when nothing changed.

## `information`

A title, label/value rows, and buttons. Good for status screens.

```ts
{
  type: 'information',
  id: 'status',
  title: 'Parking sensor',
  items: [
    { title: 'Distance', detail: '1.2 m' },
    { title: 'Battery', detail: '82 %' },
  ],
  actions: [
    { id: 'pause', title: 'Pause', style: 'primary' },
    { id: 'stop', title: 'Stop', style: 'destructive' },
  ],
}
```

| Field | Type | Notes |
|---|---|---|
| `items` | `{ title, detail }[]` | Up to 10. Android Auto shows as many as the host allows (usually 4). |
| `actions` | [`CarAction`](#actions)`[]` | Up to 3 on CarPlay, 2 on Android Auto. |
| `tab` | `{ title, systemImage? }` | Used when inside `tabs`. |

| CarPlay | Android Auto |
|---|---|
| `CPInformationTemplate`, leading layout, `CPTextButton`s | `PaneTemplate`: one row per item (title + detail), pane actions |

## `list`

Tappable rows, optionally in sections. A tap emits a [`select`](./events.md#select) event.

```ts
{
  type: 'list',
  id: 'cameras',
  title: 'Cameras',
  emptyMessage: 'No cameras yet',
  sections: [
    { header: 'Online', items: [{ id: 'front', text: 'Front', detail: 'Recording' }] },
    { header: 'Offline', items: [{ id: 'rear', text: 'Rear' }] },
  ],
}
```

| Field | Type | Notes |
|---|---|---|
| `sections` | `{ header?, items: { id, text, detail? }[] }[]` | Item ids must be unique within the template. Up to 100 items. |
| `emptyMessage` | `string` | Shown when there are no items. |

| CarPlay | Android Auto |
|---|---|
| `CPListTemplate` with `CPListSection`s | `ListTemplate`: a single list, or sectioned lists when there are headers. Capped at the host's list limit. |

## `tabs`

Up to 5 `information` or `list` templates. Each needs a `tab`.

```ts
{
  type: 'tabs',
  id: 'root',
  tabs: [
    { type: 'information', id: 'status', title: 'Status', tab: { title: 'Status', systemImage: 'gauge' }, items: [] },
    { type: 'list', id: 'places', title: 'Places', tab: { title: 'Places', systemImage: 'map' }, sections: [] },
  ],
}
```

| CarPlay | Android Auto |
|---|---|
| `CPTabBarTemplate`; `systemImage` is an [SF Symbol](https://developer.apple.com/sf-symbols/) name | Shows the selected tab and puts buttons for up to 3 other tabs in the action strip |

Tabs cannot be nested. When a `tabs` root is re-sent with the same tab ids and types, each tab is updated in place.

## Alerts

Short, driver-facing messages shown over the current screen.

```ts
CarScreens.showAlert({
  id: 'low-battery',
  title: 'Battery low',
  subtitle: 'Camera will stop in 5 minutes',
  durationMs: 4000,
  actions: [{ id: 'ok', title: 'OK' }],
});
```

| Field | Notes |
|---|---|
| `durationMs` | Auto-dismiss, default 4000 ms. |
| `actions` | Up to 2. Pressing one emits `alertAction` and dismisses the alert. With no actions, CarPlay shows an "OK" button. |

| CarPlay | Android Auto |
|---|---|
| `CPAlertTemplate` (title and subtitle joined in the first title variant) | `Alert` with car API 5+; a long toast on older hosts |

Showing a new alert dismisses the current one. `dismissAlert()` closes it early. Both emit `alertDismissed`.

## Actions

```ts
type CarAction = { id: string; title: string; style?: 'default' | 'primary' | 'destructive' };
```

| `style` | CarPlay button | Android Auto action |
|---|---|---|
| `default` | `.normal` | plain |
| `primary` | `.confirm` | `FLAG_PRIMARY` (car API 4+), otherwise blue |
| `destructive` | `.cancel` | red background |

## Limits

`LIMITS` is exported, and validation throws `CarTemplateError` before anything reaches native code:

| Limit | Value |
|---|---|
| `informationItems` | 10 |
| `informationActions` | 3 |
| `listItems` | 100 |
| `tabs` | 5 |
| `alertActions` | 2 |

Hosts may show fewer. Android Auto head units in particular have smaller pane and list limits, and the library truncates to whatever the host reports through `ConstraintManager`.
