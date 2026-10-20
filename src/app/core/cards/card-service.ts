import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api-config';
import {
  CardSeries,
  CardSeriesSummary,
  CreateCardSeriesRequest,
  UpdateCardSeriesRequest,
} from './card.models';

// TODO: add clearCache() once CardService caches lists (SPEC §6.3).
@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/card-series`;

  listSeries(): Observable<CardSeriesSummary[]> {
    return this.http.get<CardSeriesSummary[]>(this.baseUrl);
  }

  /** Every series with its cards in one request; used by the study page. */
  listSeriesWithCards(): Observable<CardSeries[]> {
    return this.http.get<CardSeries[]>(this.baseUrl, { params: { include: 'cards' } });
  }

  getSeries(id: string): Observable<CardSeries> {
    return this.http.get<CardSeries>(`${this.baseUrl}/${id}`);
  }

  createSeries(req: CreateCardSeriesRequest): Observable<CardSeries> {
    return this.http.post<CardSeries>(this.baseUrl, req);
  }

  /** Fails with `409` if `req.concurrencyStamp` is stale (the series changed elsewhere). */
  updateSeries(id: string, req: UpdateCardSeriesRequest): Observable<CardSeries> {
    return this.http.put<CardSeries>(`${this.baseUrl}/${id}`, req);
  }

  deleteSeries(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
