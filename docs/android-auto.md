# Android Auto setup (React Native CLI)

The library's manifest already declares the `CarAppService`, the car app metadata and the template usage descriptor. You only choose your **app category**. Expo users: the [config plugin](./expo.md) sets it.

## 1. Set the category

`android/app/build.gradle`:

```groovy
android {
  defaultConfig {
    manifestPlaceholders["carScreensCategory"] = "androidx.car.app.category.IOT"
  }
}
```

| Category | Value |
|---|---|
| Internet of things (connected devices) | `androidx.car.app.category.IOT` |
| Points of interest | `androidx.car.app.category.POI` |
| Navigation | `androidx.car.app.category.NAVIGATION` |
| EV charging | `androidx.car.app.category.CHARGING` |
| Parking | `androidx.car.app.category.PARKING` |
| Weather | `androidx.car.app.category.WEATHER` |

If the placeholder is missing, the build stops with `Manifest merger failed : ... requires a placeholder substitution but no value for <carScreensCategory> is provided`. That is deliberate: a wrong default category would get the app rejected.

## 2. Minimum SDK

The car app library requires `minSdkVersion` 23 or higher; React Native 0.76+ already requires 24.

## 3. Rebuild

```sh
npx react-native run-android
```

## What gets merged into your manifest

```xml
<meta-data android:name="com.google.android.gms.car.application"
           android:resource="@xml/car_screens_app_desc" />
<meta-data android:name="androidx.car.app.minCarApiLevel" android:value="1" />
<service android:name="com.carscreens.CarScreensService" android:exported="true">
  <intent-filter>
    <action android:name="androidx.car.app.CarAppService" />
    <category android:name="${carScreensCategory}" />
  </intent-filter>
</service>
```

## Host validation

The service accepts any Android Auto host in **debug** builds, which you need for the Desktop Head Unit. **Release** builds only accept Google's host allowlist. Sideloaded release builds therefore don't show up in cars. Install from Play (internal testing works) or test with a debug build.

## How it behaves

- **Before JS runs:** until JavaScript calls `setRoot`, the car shows a loading screen titled with your app label.
- **Content limits:** `information` renders as a `PaneTemplate`. Hosts show at most a few rows (usually 4) and 2 actions, and extra ones are dropped. Lists are capped at the host's list limit (usually 6 to 100 rows, depending on the car).
- **Tabs:** `tabs` renders the selected tab and puts up to 3 other tabs in the action strip. The native `TabTemplate` requires car API 6 and an icon per tab, so this library does not use it yet.
- **Alerts:** these need car API 5 or later. On older hosts the title and subtitle show as a toast, and alert actions are not available.
- **Refresh rate:** updates to a screen are coalesced to at most one every 500 ms. Hosts can also throttle refreshes, so avoid sending more than a few per second.
