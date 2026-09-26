package com.carscreens

import com.facebook.react.bridge.ReactApplicationContext

/** TurboModule facade: forwards to the store that the Android Auto session renders. */
class CarScreensModule(reactContext: ReactApplicationContext) : NativeCarScreensSpec(reactContext) {
  init {
    CarScreensStore.eventSink = { json -> emitOnCarEvent(json) }
  }

  override fun setRoot(templateJson: String) = CarScreensStore.setRoot(templateJson)
  override fun push(templateJson: String) = CarScreensStore.push(templateJson)
  override fun pop() = CarScreensStore.pop()
  override fun showAlert(alertJson: String) = CarScreensStore.showAlert(alertJson)
  override fun dismissAlert() = CarScreensStore.dismissAlert()
  override fun isConnected(): Boolean = CarScreensStore.isConnected

  override fun invalidate() {
    CarScreensStore.eventSink = null
    super.invalidate()
  }

  companion object {
    const val NAME = NativeCarScreensSpec.NAME
  }
}
