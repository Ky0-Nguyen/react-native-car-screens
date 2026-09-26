import Foundation

/// What a connected car screen implements; the store drives it.
protocol CarScreensPresenter: AnyObject {
  func rootChanged()
  func pushed(_ template: [String: Any])
  func updated(_ template: [String: Any])
  func popped()
  func showAlert(_ alert: [String: Any])
  func dismissAlert()
}

/// Latest templates from JS, kept even when no car is connected so a car that
/// connects later shows the current state. All state lives on the main thread.
@objc(RNCarScreensStore)
public final class CarScreensStore: NSObject {
  @objc public static let shared = CarScreensStore()

  private(set) var root: [String: Any]?
  private(set) var stack: [[String: Any]] = []
  weak var presenter: CarScreensPresenter?

  /// Set by the TurboModule; receives JSON-encoded events for JS.
  @objc public var eventSink: ((String) -> Void)?
  @objc public private(set) var isConnected = false

  private static func parse(_ json: String) -> [String: Any]? {
    (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any]
  }

  private func onMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread { work() } else { DispatchQueue.main.async(execute: work) }
  }

  @objc public func setRoot(json: String) {
    guard let t = Self.parse(json) else { return }
    onMain {
      let sameRoot = (self.root?["id"] as? String) == (t["id"] as? String)
      self.root = t
      if !sameRoot { self.stack.removeAll() }
      self.presenter?.rootChanged()
    }
  }

  @objc public func push(json: String) {
    guard let t = Self.parse(json), let id = t["id"] as? String else { return }
    onMain {
      // Pushing an id that is already on the stack updates it in place.
      if let i = self.stack.firstIndex(where: { ($0["id"] as? String) == id }) {
        self.stack[i] = t
        self.presenter?.updated(t)
      } else {
        self.stack.append(t)
        self.presenter?.pushed(t)
      }
    }
  }

  @objc public func pop() {
    onMain {
      guard !self.stack.isEmpty else { return }
      self.stack.removeLast()
      self.presenter?.popped()
    }
  }

  @objc public func showAlert(json: String) {
    guard let a = Self.parse(json) else { return }
    onMain { self.presenter?.showAlert(a) }
  }

  @objc public func dismissAlert() {
    onMain { self.presenter?.dismissAlert() }
  }

  /// The user went back on the car screen.
  func userPopped(templateId: String) {
    if let i = stack.lastIndex(where: { ($0["id"] as? String) == templateId }) { stack.remove(at: i) }
    emit(["type": "pop", "templateId": templateId])
  }

  func setConnected(_ connected: Bool, platform: String) {
    isConnected = connected
    emit(connected ? ["type": "connect", "platform": platform] : ["type": "disconnect"])
  }

  func emit(_ event: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: event) else { return }
    eventSink?(String(decoding: data, as: UTF8.self))
  }
}
