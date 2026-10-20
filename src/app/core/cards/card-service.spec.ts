import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api-config';
import { CardService } from './card-service';
import { CreateCardSeriesRequest, UpdateCardSeriesRequest } from './card.models';

describe('CardService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('listSeries GETs /card-series', () => {
    let result: unknown;
    TestBed.inject(CardService)
      .listSeries()
      .subscribe((r) => (result = r));

    const call = TestBed.inject(HttpTestingController).expectOne('/api/card-series');
    expect(call.request.method).toBe('GET');
    expect(call.request.params.keys()).toEqual([]);
    call.flush([{ id: 'a', topic: 'T', firstCardFront: 'f', updatedAt: '2026-10-01T00:00:00Z' }]);
    expect(result).toEqual([
      { id: 'a', topic: 'T', firstCardFront: 'f', updatedAt: '2026-10-01T00:00:00Z' },
    ]);
  });

  it('listSeriesWithCards GETs /card-series?include=cards', () => {
    TestBed.inject(CardService).listSeriesWithCards().subscribe();

    const call = TestBed.inject(HttpTestingController).expectOne(
      (r) => r.url === '/api/card-series',
    );
    expect(call.request.method).toBe('GET');
    expect(call.request.params.get('include')).toBe('cards');
    call.flush([]);
  });

  it('getSeries GETs /card-series/{id}', () => {
    let result: unknown;
    TestBed.inject(CardService)
      .getSeries('abc')
      .subscribe((r) => (result = r));

    const call = TestBed.inject(HttpTestingController).expectOne('/api/card-series/abc');
    expect(call.request.method).toBe('GET');
    call.flush({ id: 'abc', topic: 'T' });
    expect(result).toEqual({ id: 'abc', topic: 'T' });
  });

  it('updateSeries PUTs the request, including the concurrency stamp, to /card-series/{id}', () => {
    const req: UpdateCardSeriesRequest = {
      topic: 'T',
      cards: [{ position: 0, front: 'f', back: 'b' }],
      concurrencyStamp: 'stamp-1',
    };
    TestBed.inject(CardService).updateSeries('abc', req).subscribe();

    const call = TestBed.inject(HttpTestingController).expectOne('/api/card-series/abc');
    expect(call.request.method).toBe('PUT');
    expect(call.request.body).toEqual(req);
  });

  it('updateSeries surfaces a 409 to the caller', () => {
    let status = 0;
    TestBed.inject(CardService)
      .updateSeries('abc', { topic: 'T', cards: [], concurrencyStamp: 'old' })
      .subscribe({ error: (e) => (status = e.status) });

    TestBed.inject(HttpTestingController)
      .expectOne('/api/card-series/abc')
      .flush(null, { status: 409, statusText: 'Conflict' });
    expect(status).toBe(409);
  });

  it('createSeries POSTs the request to /card-series', () => {
    const req: CreateCardSeriesRequest = {
      topic: 'T',
      cards: [0, 1, 2].map((position) => ({ position, front: 'f', back: 'b' })),
    };
    TestBed.inject(CardService).createSeries(req).subscribe();

    const call = TestBed.inject(HttpTestingController).expectOne('/api/card-series');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(req);
  });

  it('deleteSeries DELETEs /card-series/{id}', () => {
    TestBed.inject(CardService).deleteSeries('abc').subscribe();

    const call = TestBed.inject(HttpTestingController).expectOne('/api/card-series/abc');
    expect(call.request.method).toBe('DELETE');
  });
});
