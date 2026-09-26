// Expo config plugin for react-native-car-screens.
//
//   ["react-native-car-screens", { "ios": { "entitlement": "driving-task" }, "android": { "category": "iot" } }]
//
// iOS: adopts the scene life cycle (CarPlay requires it) using Expo's phone scene
// delegate, registers the CarPlay scene, and adds the CarPlay entitlement.
// Android: sets the Android Auto app category used by the library's CarAppService.
// Resolve Expo's config plugins from the app first: when this package is linked
// (monorepo, `npm link`, file: dependency) Node would otherwise look next to
// the library, where Expo isn't installed.
function loadConfigPlugins() {
  for (const id of ['expo/config-plugins', '@expo/config-plugins']) {
    for (const paths of [[process.cwd()], undefined]) {
      try {
        return require(paths ? require.resolve(id, { paths }) : id);
      } catch {}
    }
  }
  throw new Error(
    'react-native-car-screens: expo/config-plugins not found. The config plugin only runs in Expo projects.'
  );
}

const {
  withAppBuildGradle,
  withAppDelegate,
  withEntitlementsPlist,
  withInfoPlist,
} = loadConfigPlugins();

const IOS_ENTITLEMENTS = {
  'driving-task': 'com.apple.developer.carplay-driving-task',
  'audio': 'com.apple.developer.carplay-audio',
  'communication': 'com.apple.developer.carplay-communication',
  'charging': 'com.apple.developer.carplay-charging',
  'fueling': 'com.apple.developer.carplay-fueling',
  'parking': 'com.apple.developer.carplay-parking',
  'quick-ordering': 'com.apple.developer.carplay-quick-ordering',
  'navigation': 'com.apple.developer.carplay-maps',
  'public-safety': 'com.apple.developer.carplay-public-safety',
};

const ANDROID_CATEGORIES = {
  iot: 'androidx.car.app.category.IOT',
  poi: 'androidx.car.app.category.POI',
  navigation: 'androidx.car.app.category.NAVIGATION',
  charging: 'androidx.car.app.category.CHARGING',
  parking: 'androidx.car.app.category.PARKING',
  weather: 'androidx.car.app.category.WEATHER',
};

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    const manifest = cfg.modResults.UIApplicationSceneManifest ?? {};
    const scenes = manifest.UISceneConfigurations ?? {};
    scenes.UIWindowSceneSessionRoleApplication ??= [
      {
        UISceneConfigurationName: 'Phone',
        UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
      },
    ];
    scenes.CPTemplateApplicationSceneSessionRoleApplication = [
      {
        UISceneConfigurationName: 'CarPlay',
        UISceneDelegateClassName: 'RNCarScreensSceneDelegate',
      },
    ];
    cfg.modResults.UIApplicationSceneManifest = {
      ...manifest,
      UIApplicationSupportsMultipleScenes:
        manifest.UIApplicationSupportsMultipleScenes ?? false,
      UISceneConfigurations: scenes,
    };
    return cfg;
  });
}

// Expo's ExpoAppSceneDelegate creates the window and starts React Native into it,
// provided the AppDelegate exposes its factory and doesn't create a window itself.
function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error(
        'react-native-car-screens: expected a Swift AppDelegate (Expo SDK 55+).'
      );
    }
    let src = cfg.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace(
        /class AppDelegate: ExpoAppDelegate \{/,
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
      );
    }
    src = src.replace(
      /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?\)\s*#endif\n/,
      '// Window + React Native start: ExpoAppSceneDelegate (react-native-car-screens plugin).\n'
    );
    if (
      !src.includes('ExpoReactNativeFactoryProvider {') ||
      src.includes('UIWindow(frame: UIScreen.main.bounds)')
    ) {
      throw new Error(
        'react-native-car-screens: AppDelegate.swift does not match the Expo template; ' +
          'see the README for the manual scene setup.'
      );
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

function withEntitlement(config, key) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults[key] = true;
    return cfg;
  });
}

function withAndroidCategory(config, category) {
  return withAppBuildGradle(config, (cfg) => {
    const line = `manifestPlaceholders["carScreensCategory"] = "${category}"`;
    let src = cfg.modResults.contents.replace(
      /\n\s*manifestPlaceholders\["carScreensCategory"\] = "[^"]*"/,
      ''
    );
    src = src.replace(/defaultConfig \{/, `defaultConfig {\n        ${line}`);
    if (!src.includes(line))
      throw new Error(
        'react-native-car-screens: could not find defaultConfig in app/build.gradle'
      );
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withCarScreens(config, options = {}) {
  const entitlementName = options.ios?.entitlement ?? 'driving-task';
  const categoryName = options.android?.category ?? 'iot';
  const category = ANDROID_CATEGORIES[categoryName] ?? categoryName;

  config = withSceneManifest(config);
  config = withSceneAppDelegate(config);
  if (entitlementName !== false) {
    const key = IOS_ENTITLEMENTS[entitlementName];
    if (!key)
      throw new Error(
        `react-native-car-screens: unknown iOS entitlement "${entitlementName}"`
      );
    config = withEntitlement(config, key);
  }
  return withAndroidCategory(config, category);
};
