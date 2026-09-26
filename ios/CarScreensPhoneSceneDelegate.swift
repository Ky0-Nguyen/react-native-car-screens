import UIKit

/// Phone window scene for React Native CLI apps. CarPlay requires the scene
/// life cycle, so the phone UI must come from a scene too. Register it in
/// Info.plist as `RNCarScreensPhoneSceneDelegate` and set `start` in your
/// AppDelegate instead of creating the window there (see README).
///
/// Expo apps don't need this: they use Expo's own scene delegate.
@objc(RNCarScreensPhoneSceneDelegate)
public final class CarScreensPhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
  /// Starts React Native into the scene's window. Called once per connected scene.
  @objc public static var start: ((UIWindow, [UIApplication.LaunchOptionsKey: Any]?) -> Void)?

  public var window: UIWindow?

  public func scene(
    _ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // Keep `UIApplication.shared.delegate?.window` working for libraries that read it.
    if let delegate = UIApplication.shared.delegate, delegate.responds(to: #selector(setter: UIApplicationDelegate.window)) {
      delegate.window??.resignKey()
      delegate.perform(#selector(setter: UIApplicationDelegate.window), with: window)
    }
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url { launchOptions[.url] = url }
    guard let start = Self.start else {
      assertionFailure("Set CarScreensPhoneSceneDelegate.start in application(_:didFinishLaunchingWithOptions:)")
      return
    }
    start(window, launchOptions.isEmpty ? nil : launchOptions)
    window.makeKeyAndVisible()
  }

  /// Under scenes UIKit delivers links here; hand them to the app delegate
  /// (where RCTLinkingManager usually lives).
  public func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    let app = UIApplication.shared
    for context in URLContexts {
      _ = app.delegate?.application?(app, open: context.url, options: [:])
    }
  }

  public func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    let app = UIApplication.shared
    _ = app.delegate?.application?(app, continue: userActivity, restorationHandler: { _ in })
  }
}
