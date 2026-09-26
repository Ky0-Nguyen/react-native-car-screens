package com.carscreens

import androidx.car.app.CarContext
import androidx.car.app.constraints.ConstraintManager
import androidx.car.app.model.Action
import androidx.car.app.model.ActionStrip
import androidx.car.app.model.CarColor
import androidx.car.app.model.ItemList
import androidx.car.app.model.ListTemplate
import androidx.car.app.model.Pane
import androidx.car.app.model.PaneTemplate
import androidx.car.app.model.Row
import androidx.car.app.model.SectionedItemList
import androidx.car.app.model.Template
import org.json.JSONObject

/** JSON template (see src/types.ts) -> Android Auto template. */
internal class TemplateRenderer(private val carContext: CarContext, private val headerAction: Action) {
  private val constraints by lazy { carContext.getCarService(ConstraintManager::class.java) }

  private fun limit(type: Int, fallback: Int): Int =
    runCatching { constraints.getContentLimit(type) }.getOrDefault(fallback)

  fun placeholder(): Template =
    PaneTemplate.Builder(Pane.Builder().setLoading(true).build())
      .setTitle(carContext.applicationInfo.loadLabel(carContext.packageManager).toString())
      .setHeaderAction(headerAction)
      .build()

  fun render(t: JSONObject, selectedTab: Int, onTab: (Int) -> Unit): Template {
    if (t.optString("type") != "tabs") return leaf(t, null)
    // No TabTemplate below car API 6 and it needs icons: render the selected tab
    // and switch between tabs from the action strip instead.
    val tabs = t.optJSONArray("tabs") ?: return placeholder()
    if (tabs.length() == 0) return placeholder()
    val index = selectedTab.coerceIn(0, tabs.length() - 1)
    val strip = ActionStrip.Builder()
    var added = 0
    for (i in 0 until tabs.length()) {
      if (i == index || added >= 3) continue
      val title = tabs.getJSONObject(i).optJSONObject("tab")?.optString("title")
        ?: tabs.getJSONObject(i).optString("title")
      strip.addAction(Action.Builder().setTitle(title).setOnClickListener { onTab(i) }.build())
      added++
    }
    return leaf(tabs.getJSONObject(index), if (added > 0) strip.build() else null)
  }

  private fun leaf(t: JSONObject, strip: ActionStrip?): Template =
    if (t.optString("type") == "list") list(t, strip) else information(t, strip)

  private fun information(t: JSONObject, strip: ActionStrip?): Template {
    val templateId = t.optString("id")
    val pane = Pane.Builder()
    val items = t.optJSONArray("items")
    val maxRows = limit(ConstraintManager.CONTENT_LIMIT_TYPE_PANE, 4)
    var rows = 0
    for (i in 0 until (items?.length() ?: 0)) {
      if (rows >= maxRows) break
      val item = items!!.getJSONObject(i)
      val title = item.optString("title").ifEmpty { item.optString("detail") }
      if (title.isEmpty()) continue
      val row = Row.Builder().setTitle(title)
      val detail = item.optString("detail")
      if (item.optString("title").isNotEmpty() && detail.isNotEmpty()) row.addText(detail)
      pane.addRow(row.build())
      rows++
    }
    if (rows == 0) pane.setLoading(true)

    val actions = t.optJSONArray("actions")
    for (i in 0 until minOf(2, actions?.length() ?: 0)) {
      val a = actions!!.getJSONObject(i)
      pane.addAction(action(a, templateId))
    }
    val builder = PaneTemplate.Builder(pane.build())
      .setTitle(t.optString("title"))
      .setHeaderAction(headerAction)
    strip?.let { builder.setActionStrip(it) }
    return builder.build()
  }

  private fun action(a: JSONObject, templateId: String): Action {
    val actionId = a.optString("id")
    val b = Action.Builder()
      .setTitle(a.optString("title"))
      .setOnClickListener {
        CarScreensStore.emit(
          JSONObject().put("type", "action").put("templateId", templateId).put("actionId", actionId),
        )
      }
    when (a.optString("style")) {
      "primary" -> if (carContext.carAppApiLevel >= 4) b.setFlags(Action.FLAG_PRIMARY) else b.setBackgroundColor(CarColor.BLUE)
      "destructive" -> b.setBackgroundColor(CarColor.RED)
    }
    return b.build()
  }

  private fun list(t: JSONObject, strip: ActionStrip?): Template {
    val templateId = t.optString("id")
    val maxItems = limit(ConstraintManager.CONTENT_LIMIT_TYPE_LIST, 6)
    val sections = t.optJSONArray("sections")
    val builder = ListTemplate.Builder().setTitle(t.optString("title")).setHeaderAction(headerAction)
    var used = 0

    fun itemList(section: JSONObject): ItemList {
      val list = ItemList.Builder()
      val items = section.optJSONArray("items")
      for (i in 0 until (items?.length() ?: 0)) {
        if (used >= maxItems) break
        val item = items!!.getJSONObject(i)
        val itemId = item.optString("id")
        val row = Row.Builder()
          .setTitle(item.optString("text").ifEmpty { " " })
          .setOnClickListener {
            CarScreensStore.emit(
              JSONObject().put("type", "select").put("templateId", templateId).put("itemId", itemId),
            )
          }
        item.optString("detail").takeIf { it.isNotEmpty() }?.let { row.addText(it) }
        list.addItem(row.build())
        used++
      }
      return list.build()
    }

    val count = sections?.length() ?: 0
    val single = count <= 1 && sections?.optJSONObject(0)?.optString("header").isNullOrEmpty()
    if (single) {
      val section = sections?.optJSONObject(0) ?: JSONObject()
      val list = itemList(section)
      builder.setSingleList(
        if (list.items.isEmpty()) {
          ItemList.Builder().setNoItemsMessage(t.optString("emptyMessage").ifEmpty { " " }).build()
        } else {
          list
        },
      )
    } else {
      var added = 0
      for (i in 0 until count) {
        val section = sections!!.getJSONObject(i)
        val list = itemList(section)
        if (list.items.isNotEmpty()) {
          builder.addSectionedList(SectionedItemList.create(list, section.optString("header").ifEmpty { " " }))
          added++
        }
      }
      // A ListTemplate needs content: fall back to the empty message.
      if (added == 0)
        builder.setSingleList(ItemList.Builder().setNoItemsMessage(t.optString("emptyMessage").ifEmpty { " " }).build())
    }
    strip?.let { builder.setActionStrip(it) }
    return builder.build()
  }
}
