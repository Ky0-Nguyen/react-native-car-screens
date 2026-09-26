import CarPlay
import UIKit

/// CarPlay scene: renders the templates held by `CarScreensStore`.
/// Register it in Info.plist under `CPTemplateApplicationSceneSessionRoleApplication`
/// with the class name `RNCarScreensSceneDelegate` (the Expo plugin does this).
@objc(RNCarScreensSceneDelegate)
public final class CarScreensSceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate, CPInterfaceControllerDelegate,
  CarScreensPresenter
{
  private var interfaceController: CPInterfaceController?
  /// Live CarPlay templates by our template id, for in-place updates.
  private var built: [String: (type: String, template: CPTemplate)] = [:]
  private var pushedIds: [String] = []
  private var alertId: String?
  private var alertTimer: Timer?
  private var rootUpdateScheduled = false
  private var lastRootUpdate = Date.distantPast
  private var programmaticPops = 0

  private var store: CarScreensStore { .shared }

  // MARK: Scene

  public func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene, didConnect interfaceController: CPInterfaceController
  ) {
    self.interfaceController = interfaceController
    interfaceController.delegate = self
    store.presenter = self
    interfaceController.setRootTemplate(makeRoot(), animated: false, completion: nil)
    for t in store.stack { pushed(t) }
    store.setConnected(true, platform: "carplay")
  }

  public func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didDisconnectInterfaceController interfaceController: CPInterfaceController
  ) {
    if store.presenter === self { store.presenter = nil }
    self.interfaceController = nil
    built.removeAll()
    pushedIds.removeAll()
    store.setConnected(false, platform: "carplay")
  }

  // MARK: Presenter

  func rootChanged() {
    // Coalesce bursts of updates: at most ~3 root refreshes per second.
    let wait = 0.33 - Date().timeIntervalSince(lastRootUpdate)
    if wait <= 0 { applyRoot() } else if !rootUpdateScheduled {
      rootUpdateScheduled = true
      DispatchQueue.main.asyncAfter(deadline: .now() + wait) { [weak self] in
        self?.rootUpdateScheduled = false
        self?.applyRoot()
      }
    }
  }

  private func applyRoot() {
    lastRootUpdate = Date()
    guard let ic = interfaceController else { return }
    if let root = store.root, update(existing: root) { return }
    // Different root: replace it and drop anything pushed on top.
    pushedIds.removeAll()
    ic.setRootTemplate(makeRoot(), animated: false, completion: nil)
  }

  func pushed(_ template: [String: Any]) {
    guard let ic = interfaceController, let id = template["id"] as? String else { return }
    let cp = build(template)
    pushedIds.append(id)
    ic.pushTemplate(cp, animated: true, completion: nil)
  }

  func updated(_ template: [String: Any]) {
    if !update(existing: template), let id = template["id"] as? String, pushedIds.contains(id) {
      // Type changed: replace it by popping to it and pushing again.
      popped()
      pushed(template)
    }
  }

  func popped() {
    guard let ic = interfaceController, !pushedIds.isEmpty else { return }
    pushedIds.removeLast()
    programmaticPops += 1
    ic.popTemplate(animated: true, completion: nil)
  }

  func showAlert(_ alert: [String: Any]) {
    guard let ic = interfaceController, let id = alert["id"] as? String else { return }
    dismissAlert()
    let title = alert["title"] as? String ?? ""
    let subtitle = alert["subtitle"] as? String
    let variants = subtitle.map { ["\(title)\n\($0)", title] } ?? [title]
    var actions = (alert["actions"] as? [[String: Any]] ?? []).prefix(2).map { a -> CPAlertAction in
      let actionId = a["id"] as? String ?? ""
      let style: CPAlertAction.Style = (a["style"] as? String) == "destructive" ? .destructive : .default
      return CPAlertAction(title: a["title"] as? String ?? "", style: style) { [weak self] _ in
        self?.store.emit(["type": "alertAction", "alertId": id, "actionId": actionId])
        self?.dismissAlert()
      }
    }
    if actions.isEmpty {
      actions = [CPAlertAction(title: "OK", style: .cancel) { [weak self] _ in self?.dismissAlert() }]
    }
    alertId = id
    ic.presentTemplate(CPAlertTemplate(titleVariants: variants, actions: actions), animated: true, completion: nil)
    let duration = (alert["durationMs"] as? Double ?? 4000) / 1000
    alertTimer = Timer.scheduledTimer(withTimeInterval: duration, repeats: false) { [weak self] _ in
      self?.dismissAlert()
    }
  }

  func dismissAlert() {
    alertTimer?.invalidate()
    alertTimer = nil
    guard let id = alertId else { return }
    alertId = nil
    interfaceController?.dismissTemplate(animated: true, completion: nil)
    store.emit(["type": "alertDismissed", "alertId": id])
  }

  // MARK: CPInterfaceControllerDelegate

  public func templateDidDisappear(_ aTemplate: CPTemplate, animated: Bool) {
    // A pushed template left the stack without us popping it: the user went back.
    guard let ic = interfaceController,
          let entry = built.first(where: { $0.value.template === aTemplate }),
          pushedIds.last == entry.key,
          !ic.templates.contains(where: { $0 === aTemplate })
    else { return }
    if programmaticPops > 0 {
      programmaticPops -= 1
      return
    }
    pushedIds.removeLast()
    store.userPopped(templateId: entry.key)
  }

  // MARK: Building

  private func makeRoot() -> CPTemplate {
    guard let root = store.root else {
      let placeholder = CPInformationTemplate(
        title: Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String ?? "App",
        layout: .leading,
        items: [CPInformationItem(title: nil, detail: "Open the app on your phone.")],
        actions: [])
      return placeholder
    }
    return build(root)
  }

  private func build(_ t: [String: Any]) -> CPTemplate {
    let id = t["id"] as? String ?? UUID().uuidString
    let type = t["type"] as? String ?? ""
    let template: CPTemplate
    switch type {
    case "tabs":
      let tabs = (t["tabs"] as? [[String: Any]] ?? []).map(build)
      template = CPTabBarTemplate(templates: tabs)
    case "list":
      let list = CPListTemplate(title: t["title"] as? String, sections: sections(t, templateId: id))
      if let empty = t["emptyMessage"] as? String { list.emptyViewSubtitleVariants = [empty] }
      template = list
    default:
      template = CPInformationTemplate(
        title: t["title"] as? String ?? "", layout: .leading, items: infoItems(t), actions: buttons(t, templateId: id))
    }
    if let tab = t["tab"] as? [String: Any] {
      template.tabTitle = tab["title"] as? String
      template.tabImage = (tab["systemImage"] as? String).flatMap { UIImage(systemName: $0) }
        ?? UIImage(systemName: "square.grid.2x2")
    }
    built[id] = (type, template)
    return template
  }

  /// Updates a live template in place. Returns false when it has to be rebuilt.
  private func update(existing t: [String: Any]) -> Bool {
    guard let id = t["id"] as? String, let type = t["type"] as? String, let live = built[id], live.type == type
    else { return false }
    switch (type, live.template) {
    case ("information", let info as CPInformationTemplate):
      info.items = infoItems(t)
      info.actions = buttons(t, templateId: id)
      return true
    case ("list", let list as CPListTemplate):
      list.updateSections(sections(t, templateId: id))
      return true
    case ("tabs", let bar as CPTabBarTemplate):
      let tabs = t["tabs"] as? [[String: Any]] ?? []
      let sameShape = tabs.map { "\($0["id"] ?? ""):\($0["type"] ?? "")" }
        == bar.templates.compactMap { cp in built.first { $0.value.template === cp }.map { "\($0.key):\($0.value.type)" } }
      if sameShape {
        tabs.forEach { _ = update(existing: $0) }
      } else {
        bar.updateTemplates(tabs.map(build))
      }
      return true
    default:
      return false
    }
  }

  private func infoItems(_ t: [String: Any]) -> [CPInformationItem] {
    (t["items"] as? [[String: Any]] ?? []).prefix(10).map {
      CPInformationItem(title: $0["title"] as? String, detail: $0["detail"] as? String)
    }
  }

  private func buttons(_ t: [String: Any], templateId: String) -> [CPTextButton] {
    (t["actions"] as? [[String: Any]] ?? []).prefix(3).map { a in
      let actionId = a["id"] as? String ?? ""
      let style: CPTextButtonStyle
      switch a["style"] as? String {
      case "primary": style = .confirm
      case "destructive": style = .cancel
      default: style = .normal
      }
      return CPTextButton(title: a["title"] as? String ?? "", textStyle: style) { [weak self] _ in
        self?.store.emit(["type": "action", "templateId": templateId, "actionId": actionId])
      }
    }
  }

  private func sections(_ t: [String: Any], templateId: String) -> [CPListSection] {
    (t["sections"] as? [[String: Any]] ?? []).map { s in
      let items = (s["items"] as? [[String: Any]] ?? []).map { i -> CPListItem in
        let itemId = i["id"] as? String ?? ""
        let item = CPListItem(text: i["text"] as? String, detailText: i["detail"] as? String)
        item.handler = { [weak self] _, done in
          self?.store.emit(["type": "select", "templateId": templateId, "itemId": itemId])
          done()
        }
        return item
      }
      return CPListSection(items: items, header: s["header"] as? String, sectionIndexTitle: nil)
    }
  }
}
