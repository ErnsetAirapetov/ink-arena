// Доменные типы грамматики «ядро и орбиты» (Р26). Парсер превращает штрихи
// композиции в один из трёх исходов: валидное заклинание, осечку (нарушение
// структуры, Р26 п.6 / Р29) или «не отправлено» (круг не сработал, Р27).

import type { Element, Verb } from '../recognition/glyphs.js';

// Форма действия заклинания (Р25). Без глагола — атака (дефолт). Глаголы с
// ролью primary (щит/хил) заменяют форму; augment (баф/дебаф) оставляют
// атаку и лишь модифицируют её — поэтому action остаётся 'attack'.
export type ActionForm = 'attack' | Verb;

// Роль глагола в композиции (числовая раскладка — в config.spellcraft.verbRoles).
export type VerbRole = 'primary' | 'augment';

// Модификатор-орбита: глагол, его роль, относительный вес (размер к ядру,
// Р26 п.5) и точность руки на этом глифе (Р4).
export interface Modifier {
  readonly verb: Verb;
  readonly role: VerbRole;
  readonly weight: number;
  readonly accuracy: number;
}

// Валидное заклинание: стихия ядра, форма действия, орбиты-модификаторы.
export interface Spell {
  readonly element: Element;
  readonly action: ActionForm;
  readonly modifiers: readonly Modifier[];
  // Точность руки на ядре и его размер (диагональ bbox) — входы формулы силы.
  readonly coreAccuracy: number;
  readonly coreSize: number;
}

// Причина осечки (Р26 п.6) — три различимых вида.
export type MisfireReason =
  // Две (и более) стихии в композиции: нет единственного ядра.
  | 'two-elements'
  // Глагол(ы) без стихии: модификатор без того, что он модифицирует.
  | 'verb-without-element'
  // Глиф пересекает замыкающий круг: нельзя решить, внутри он или снаружи.
  | 'glyph-on-boundary';

// Причина «не отправлено» (Р27) — каст не ушёл, чернила НЕ сгорают.
export type NotSentReason =
  // Замыкающего круга нет (композиция не подтверждена).
  | 'circle-not-closed'
  // Круг не охватил композицию (глиф целиком снаружи / зацепил лишнее).
  | 'circle-not-enclosing'
  // Внутри круга нет ни одного распознанного глифа — кастовать нечего.
  | 'empty-composition';

// Исход разбора композиции.
export type CastOutcome =
  // Валидное заклинание со стоимостью чернил и силой.
  | { readonly kind: 'spell'; readonly spell: Spell; readonly cost: number; readonly power: number }
  // Осечка: структура нарушена. Чернила за рисунок сгорают (Р29).
  | { readonly kind: 'misfire'; readonly reason: MisfireReason; readonly cost: number }
  // Не отправлено: круг не сработал. Ничего не сгорает (Р27).
  | { readonly kind: 'not-sent'; readonly reason: NotSentReason };
