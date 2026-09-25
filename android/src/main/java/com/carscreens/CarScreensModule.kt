package com.carscreens

import com.facebook.react.bridge.ReactApplicationContext

class CarScreensModule(reactContext: ReactApplicationContext) :
  NativeCarScreensSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeCarScreensSpec.NAME
  }
}
