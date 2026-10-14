export const CARDS_PER_SERIES = 3;

export interface Card {
  id: string; // GUID, assigned by the server
  position: number; // 0..CARDS_PER_SERIES-1
  front: string;
  back: string;
}

export interface CardSeries {
  id: string;
  topic: string;
  imageUrl?: string;
  cards: Card[]; // 1–CARDS_PER_SERIES items, ordered by position
  createdAt: string; // ISO-8601 UTC
  updatedAt: string;
  concurrencyStamp: string; // opaque; sent back on PUT to detect lost updates
}

export interface CardSeriesSummary {
  id: string;
  topic: string;
  firstCardFront: string;
  updatedAt: string;
}

export interface CardInput {
  position: number;
  front: string;
  back: string;
}

export interface CreateCardSeriesRequest {
  topic: string;
  cards: CardInput[];
}

export interface UpdateCardSeriesRequest extends CreateCardSeriesRequest {
  concurrencyStamp: string;
}
