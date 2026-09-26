package com.carscreens

import android.os.Handler
import android.os.Looper
import org.json.JSONObject

/** What a connected car session implements; the store drives it. */
internal interface CarScreensPresenter {
  fun rootChanged()
  fun pushed(template: JSONObject)
  fun updated(template: JSONObject)
  fun popped()
  fun showAlert(alert: JSONObject)
  fun dismissAlert()
}

/**
 * Latest templates from JS, kept even when no car is connected so a car that
 * connects later shows the current state. All state lives on the main thread.
 */
object CarScreensStore {
  internal var root: JSONObject? = null
    private set
  internal val stack = mutableListOf<JSONObject>()
  internal var presenter: CarScreensPresenter? = null

  /** Set by the TurboModule; receives JSON-encoded events for JS. */
  @Volatile var eventSink: ((String) -> Unit)? = null
  @Volatile var isConnected = false
    private set

  private val main = Handler(Looper.getMainLooper())
  private fun onMain(work: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) work() else main.post(work)
  }

  private fun parse(json: String): JSONObject? = runCatching { JSONObject(json) }.getOrNull()

  fun setRoot(json: String) {
    val t = parse(json) ?: return
    onMain {
      val sameRoot = root?.optString("id") == t.optString("id")
      root = t
      if (!sameRoot) stack.clear()
      presenter?.rootChanged()
    }
  }

  fun push(json: String) {
    val t = parse(json) ?: return
    onMain {
      val i = stack.indexOfFirst { it.optString("id") == t.optString("id") }
      if (i >= 0) {
        // Pushing an id that is already on the stack updates it in place.
        stack[i] = t
        presenter?.updated(t)
      } else {
        stack.add(t)
        presenter?.pushed(t)
      }
    }
  }

  fun pop() = onMain {
    if (stack.isNotEmpty()) {
      stack.removeAt(stack.lastIndex)
      presenter?.popped()
    }
  }

  fun showAlert(json: String) {
    val a = parse(json) ?: return
    onMain { presenter?.showAlert(a) }
  }

  fun dismissAlert() = onMain { presenter?.dismissAlert() }

  internal fun template(id: String): JSONObject? =
    stack.lastOrNull { it.optString("id") == id } ?: root?.takeIf { it.optString("id") == id }

  /** The user went back on the car screen. */
  internal fun userPopped(templateId: String) {
    val i = stack.indexOfLast { it.optString("id") == templateId }
    if (i >= 0) stack.removeAt(i)
    emit(JSONObject().put("type", "pop").put("templateId", templateId))
  }

  internal fun setConnected(connected: Boolean) {
    isConnected = connected
    emit(
      if (connected) JSONObject().put("type", "connect").put("platform", "androidauto")
      else JSONObject().put("type", "disconnect"),
    )
  }

  internal fun emit(event: JSONObject) {
    eventSink?.invoke(event.toString())
  }
}
