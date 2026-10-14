import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api-config';
import { CardService } from './card-service';
import { CreateCardSeriesRequest } from './card.models';

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

  it('createSeries POSTs the request to /card-series', () => {
    const req: CreateCardSeriesRequest = {
      topic: 'T',
      cards: [0, 1, 2].map((position) => ({ position, front: 'f', back: 'b' })),
    };
    TestBed.inject(CardService).createSeries(req).subscribe();

    const http = TestBed.inject(HttpTestingController);
    const call = http.expectOne('/api/card-series');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(req);
    http.verify();
  });
});
