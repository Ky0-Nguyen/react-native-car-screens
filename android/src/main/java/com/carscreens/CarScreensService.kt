package com.carscreens

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.Handler
import android.os.Looper
import androidx.car.app.AppManager
import androidx.car.app.CarAppService
import androidx.car.app.CarContext
import androidx.car.app.CarToast
import androidx.car.app.Screen
import androidx.car.app.Session
import androidx.car.app.model.Action
import androidx.car.app.model.Alert
import androidx.car.app.model.AlertCallback
import androidx.car.app.model.CarColor
import androidx.car.app.model.CarText
import androidx.car.app.model.Template
import androidx.car.app.validation.HostValidator
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import org.json.JSONObject

/** Android Auto entry point, declared in the library manifest. */
class CarScreensService : CarAppService() {
  override fun createHostValidator(): HostValidator {
    val debuggable = applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
    if (debuggable) return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR
    return HostValidator.Builder(applicationContext)
      .addAllowedHosts(androidx.car.app.R.array.hosts_allowlist_sample)
      .build()
  }

  override fun onCreateSession(): Session = CarScreensSession()
}

internal class CarScreensSession : Session(), CarScreensPresenter {
  private lateinit var root: TemplateScreen
  private val pushed = mutableListOf<TemplateScreen>()
  private var alertId: String? = null
  private val main = Handler(Looper.getMainLooper())

  override fun onCreateScreen(intent: Intent): Screen {
    root = TemplateScreen(carContext, CarScreensStore.root?.optString("id"), isRoot = true)
    CarScreensStore.presenter = this
    CarScreensStore.setConnected(true)
    lifecycle.addObserver(object : DefaultLifecycleObserver {
      override fun onDestroy(owner: LifecycleOwner) {
        if (CarScreensStore.presenter === this@CarScreensSession) CarScreensStore.presenter = null
        CarScreensStore.setConnected(false)
      }
    })
    // Restore anything JS pushed before the car connected.
    val existing = CarScreensStore.stack.toList()
    main.post { existing.forEach { pushed(it) } }
    return root
  }

  override fun rootChanged() {
    val id = CarScreensStore.root?.optString("id")
    if (id != root.templateId) {
      popAllPushed()
      root.templateId = id
    }
    root.refresh()
  }

  override fun pushed(template: JSONObject) {
    val screen = TemplateScreen(carContext, template.optString("id"), isRoot = false)
    pushed.add(screen)
    carContext.getCarService(androidx.car.app.ScreenManager::class.java).push(screen)
  }

  override fun updated(template: JSONObject) {
    pushed.lastOrNull { it.templateId == template.optString("id") }?.refresh()
  }

  override fun popped() {
    val screen = pushed.removeLastOrNull() ?: return
    screen.poppedByApp = true
    screen.finish()
  }

  private fun popAllPushed() {
    while (pushed.isNotEmpty()) popped()
  }

  /** Called by a pushed screen the user navigated back from. */
  fun userPopped(screen: TemplateScreen) {
    pushed.remove(screen)
    screen.templateId?.let { CarScreensStore.userPopped(it) }
  }

  override fun showAlert(alert: JSONObject) {
    val id = alert.optString("id")
    val title = alert.optString("title")
    val subtitle = alert.optString("subtitle").takeIf { it.isNotEmpty() }
    val duration = alert.optLong("durationMs", 4000)
    if (carContext.carAppApiLevel < 5) {
      CarToast.makeText(carContext, listOfNotNull(title, subtitle).joinToString(" · "), CarToast.LENGTH_LONG).show()
      return
    }
    dismissAlert()
    alertId = id
    val builder = Alert.Builder(id.hashCode(), CarText.create(title), duration)
    subtitle?.let { builder.setSubtitle(CarText.create(it)) }
    val actions = alert.optJSONArray("actions")
    for (i in 0 until minOf(2, actions?.length() ?: 0)) {
      val a = actions!!.getJSONObject(i)
      val actionId = a.optString("id")
      val action = Action.Builder()
        .setTitle(a.optString("title"))
        .setOnClickListener {
          CarScreensStore.emit(
            JSONObject().put("type", "alertAction").put("alertId", id).put("actionId", actionId),
          )
          dismissAlert()
        }
      if (a.optString("style") == "destructive") action.setBackgroundColor(CarColor.RED)
      builder.addAction(action.build())
    }
    builder.setCallback(object : AlertCallback {
      override fun onCancel(reason: Int) = finished(id)
      override fun onDismiss() = finished(id)
    })
    carContext.getCarService(AppManager::class.java).showAlert(builder.build())
  }

  private fun finished(id: String) {
    if (alertId != id) return
    alertId = null
    CarScreensStore.emit(JSONObject().put("type", "alertDismissed").put("alertId", id))
  }

  override fun dismissAlert() {
    val id = alertId ?: return
    if (carContext.carAppApiLevel >= 5) carContext.getCarService(AppManager::class.java).dismissAlert(id.hashCode())
    finished(id)
  }
}

/** One screen per template; the root screen swaps its template id when JS replaces the root. */
internal class TemplateScreen(carContext: CarContext, var templateId: String?, private val isRoot: Boolean) :
  Screen(carContext) {
  var poppedByApp = false
  private var selectedTab = 0
  private var lastRender = 0L
  private var refreshPending = false
  private val main = Handler(Looper.getMainLooper())

  init {
    lifecycle.addObserver(object : DefaultLifecycleObserver {
      override fun onDestroy(owner: LifecycleOwner) {
        // Destroyed without us popping it: the user went back.
        if (!isRoot && !poppedByApp) session()?.userPopped(this@TemplateScreen)
      }
    })
  }

  private fun session(): CarScreensSession? = CarScreensStore.presenter as? CarScreensSession

  /** Coalesces updates: hosts throttle template refreshes. */
  fun refresh() {
    val wait = 500 - (System.currentTimeMillis() - lastRender)
    if (wait <= 0) {
      invalidate()
    } else if (!refreshPending) {
      refreshPending = true
      main.postDelayed({
        refreshPending = false
        invalidate()
      }, wait)
    }
  }

  override fun onGetTemplate(): Template {
    lastRender = System.currentTimeMillis()
    val t = templateId?.let { CarScreensStore.template(it) }
    val renderer = TemplateRenderer(carContext, if (isRoot) Action.APP_ICON else Action.BACK)
    if (t == null) return renderer.placeholder()
    return renderer.render(t, selectedTab) { index ->
      selectedTab = index
      invalidate()
    }
  }
}
