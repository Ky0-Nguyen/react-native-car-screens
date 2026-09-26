/**
 * The subset of templates both CarPlay and Android Auto allow for non-media
 * apps. Neither platform lets third-party apps draw custom UI or video while
 * driving; everything here maps to a native system template.
 */

export type CarActionStyle = 'default' | 'primary' | 'destructive';

export type CarAction = {
  id: string;
  title: string;
  style?: CarActionStyle;
};

/** Shown as a tab when the template is inside a `tabs` template. */
export type CarTab = {
  title: string;
  /** SF Symbol name (iOS). Android Auto falls back to a text-only tab strip. */
  systemImage?: string;
};

export type InformationItem = { title: string; detail: string };

/** CarPlay CPInformationTemplate · Android Auto PaneTemplate. */
export type InformationTemplate = {
  type: 'information';
  id: string;
  title: string;
  items: InformationItem[];
  /** Up to 3 on CarPlay, 2 on Android Auto (extra ones are dropped). */
  actions?: CarAction[];
  tab?: CarTab;
};

export type ListItem = { id: string; text: string; detail?: string };
export type ListSection = { header?: string; items: ListItem[] };

/** CarPlay CPListTemplate · Android Auto ListTemplate. Tapping a row emits `select`. */
export type ListTemplate = {
  type: 'list';
  id: string;
  title: string;
  sections: ListSection[];
  emptyMessage?: string;
  tab?: CarTab;
};

/** CarPlay CPTabBarTemplate · Android Auto: first tab plus an action strip to switch. */
export type TabsTemplate = {
  type: 'tabs';
  id: string;
  tabs: (InformationTemplate | ListTemplate)[];
};

export type CarTemplate = InformationTemplate | ListTemplate | TabsTemplate;

/** CarPlay CPAlertTemplate · Android Auto Alert (car API 5+) or a toast. */
export type CarAlert = {
  id: string;
  title: string;
  subtitle?: string;
  /** Auto-dismiss after this long. Default 4000 ms. */
  durationMs?: number;
  /** Up to 2. Pressing one emits `alertAction` and dismisses the alert. */
  actions?: CarAction[];
};

export type CarEvent =
  | { type: 'connect'; platform: 'carplay' | 'androidauto' }
  | { type: 'disconnect' }
  | { type: 'action'; templateId: string; actionId: string }
  | { type: 'select'; templateId: string; itemId: string }
  | { type: 'alertAction'; alertId: string; actionId: string }
  | { type: 'alertDismissed'; alertId: string }
  | { type: 'pop'; templateId: string };
