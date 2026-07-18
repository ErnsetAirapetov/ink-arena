// Подача исхода каста игроку (docs/game/ux.md «Обратная связь», «Осечка»).
// Клиент не решает правила — берёт готовый CastOutcome из parseComposition и
// переводит его в короткий человеческий сигнал БЕЗ цифр:
//   • успех — нейтрально (сам каст виден на арене, Р31);
//   • осечка — «я криво нарисовал», ошибка читается как своя (Р12/Р29);
//   • не отправлено — мягкая подсказка про замыкающий круг (Р27).
import type { CastOutcome, NotSentReason } from '@inkarena/core';

export type FeedbackTone = 'success' | 'misfire' | 'hint';

export interface CastFeedback {
  tone: FeedbackTone;
  message: string;
}

export function castFeedback(outcome: CastOutcome): CastFeedback {
  switch (outcome.kind) {
    case 'spell':
      // Нейтрально и без чисел/имени стихии — разбор с цифрами вне скоупа (Р31).
      return { tone: 'success', message: 'Заклинание ушло' };
    case 'misfire':
      // Единая формулировка «своей» ошибки — без обвинения системы (Р12/Р29).
      return { tone: 'misfire', message: 'Я криво нарисовал' };
    case 'not-sent':
      return { tone: 'hint', message: notSentHint(outcome.reason) };
  }
}

function notSentHint(reason: NotSentReason): string {
  switch (reason) {
    case 'circle-not-closed':
      return 'Замкни круг вокруг заклинания';
    case 'circle-not-enclosing':
      return 'Круг не охватил рисунок — обведи глиф целиком';
    case 'empty-composition':
      return 'Нарисуй глиф внутри круга';
  }
}
