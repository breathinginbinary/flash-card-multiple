import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api-config';
import { CardSeries, CardSeriesSummary, CreateCardSeriesRequest } from './card.models';

// TODO (milestone 3): add getSeries, listSeriesWithCards, updateSeries and clearCache() (SPEC §6.3).
@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/card-series`;

  listSeries(): Observable<CardSeriesSummary[]> {
    return this.http.get<CardSeriesSummary[]>(this.baseUrl);
  }

  createSeries(req: CreateCardSeriesRequest): Observable<CardSeries> {
    return this.http.post<CardSeries>(this.baseUrl, req);
  }

  deleteSeries(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
