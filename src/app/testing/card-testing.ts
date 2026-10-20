import { CardSeries, CardSeriesSummary } from '../core/cards/card.models';

/** A series with one card per `[front, back]` pair, positions 0..n-1. */
export function makeSeries(
  id: string,
  topic: string,
  cards: [front: string, back: string][],
  overrides: Partial<CardSeries> = {},
): CardSeries {
  return {
    id,
    topic,
    imageUrl: undefined,
    cards: cards.map(([front, back], position) => ({
      id: `${id}-c${position}`,
      position,
      front,
      back,
    })),
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    concurrencyStamp: `${id}-stamp`,
    ...overrides,
  };
}

export function makeSummary(
  id: string,
  topic: string,
  firstCardFront = 'front',
  updatedAt = '2026-10-01T00:00:00Z',
): CardSeriesSummary {
  return { id, topic, firstCardFront, updatedAt };
}

/** The two sample series every new account starts with. */
export function sampleDeck(): CardSeries[] {
  return [
    makeSeries(
      'dog-series',
      'Dog',
      [
        ['German', 'Hund'],
        ['Spanish', 'perro'],
      ],
      { imageUrl: '/images/Dog.png' },
    ),
    makeSeries(
      'cat-series',
      'Cat',
      [
        ['German', 'Katze'],
        ['Spanish', 'gato'],
      ],
      { imageUrl: '/images/Cat.png' },
    ),
  ];
}
