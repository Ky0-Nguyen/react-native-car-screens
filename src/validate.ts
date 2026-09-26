import type {
  CarAlert,
  CarTemplate,
  InformationTemplate,
  ListTemplate,
} from './types';

/** Platform limits, enforced in JS so both native sides receive the same data. */
export const LIMITS = {
  informationItems: 10,
  informationActions: 3,
  listItems: 100,
  tabs: 5,
  alertActions: 2,
} as const;

export class CarTemplateError extends Error {}

function requireId(kind: string, id: unknown): void {
  if (typeof id !== 'string' || id.length === 0)
    throw new CarTemplateError(`${kind} needs a non-empty string id`);
}

function checkLeaf(t: InformationTemplate | ListTemplate, where: string): void {
  requireId(where, t.id);
  if (typeof t.title !== 'string')
    throw new CarTemplateError(`${where} "${t.id}" needs a title`);
  if (t.type === 'information') {
    if (t.items.length > LIMITS.informationItems)
      throw new CarTemplateError(
        `information "${t.id}": at most ${LIMITS.informationItems} items`
      );
    if ((t.actions?.length ?? 0) > LIMITS.informationActions)
      throw new CarTemplateError(
        `information "${t.id}": at most ${LIMITS.informationActions} actions`
      );
    t.actions?.forEach((a) => requireId('action', a.id));
  } else if (t.type === 'list') {
    const ids = new Set<string>();
    let count = 0;
    for (const section of t.sections)
      for (const item of section.items) {
        requireId('list item', item.id);
        if (ids.has(item.id))
          throw new CarTemplateError(
            `list "${t.id}": duplicate item id "${item.id}"`
          );
        ids.add(item.id);
        count++;
      }
    if (count > LIMITS.listItems)
      throw new CarTemplateError(
        `list "${t.id}": at most ${LIMITS.listItems} items`
      );
  } else {
    throw new CarTemplateError(
      `unknown template type "${(t as { type: string }).type}"`
    );
  }
}

export function validateTemplate(t: CarTemplate): void {
  if (t.type === 'tabs') {
    requireId('tabs', t.id);
    if (t.tabs.length === 0 || t.tabs.length > LIMITS.tabs)
      throw new CarTemplateError(`tabs "${t.id}": 1 to ${LIMITS.tabs} tabs`);
    t.tabs.forEach((tab) => {
      if ((tab as { type: string }).type === 'tabs')
        throw new CarTemplateError('tabs cannot be nested');
      checkLeaf(tab, 'tab');
    });
    return;
  }
  checkLeaf(t, t.type);
}

export function validateAlert(a: CarAlert): void {
  requireId('alert', a.id);
  if (!a.title) throw new CarTemplateError(`alert "${a.id}" needs a title`);
  if ((a.actions?.length ?? 0) > LIMITS.alertActions)
    throw new CarTemplateError(
      `alert "${a.id}": at most ${LIMITS.alertActions} actions`
    );
  a.actions?.forEach((x) => requireId('alert action', x.id));
}
