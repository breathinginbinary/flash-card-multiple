import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CardSeriesSummary } from '../../core/cards/card.models';
import { authTestProviders, TEST_API } from '../../testing/auth-testing';
import { makeSummary } from '../../testing/card-testing';
import { CardList } from './card-list';

const URL = `${TEST_API}/card-series`;

describe('CardList', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: authTestProviders() });
    // jsdom does not implement <dialog> modality.
    for (const method of ['showModal', 'close']) {
      Object.defineProperty(HTMLDialogElement.prototype, method, {
        value: vi.fn(),
        configurable: true,
        writable: true,
      });
    }
  });

  const http = () => TestBed.inject(HttpTestingController);

  /** Answers the load request; pass `null` to leave it pending. */
  async function render(list: CardSeriesSummary[] | null = []) {
    const fixture = TestBed.createComponent(CardList);
    const el = fixture.nativeElement as HTMLElement;
    const stable = () => fixture.whenStable();
    if (list) http().expectOne(URL).flush(list);
    await stable();

    const rows = () => Array.from(el.querySelectorAll('li.list-group-item'));
    const topics = () => rows().map((r) => r.querySelector('h2')?.textContent?.trim());
    const button = (label: string, within: ParentNode = el) =>
      Array.from(within.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim() === label,
      )!;
    const click = async (b: HTMLElement) => {
      b.click();
      await stable();
    };
    const dialog = () => el.querySelector('dialog')!;
    return { fixture, el, stable, rows, topics, button, click, dialog };
  }

  const three = () => [
    makeSummary('a', 'Apples', 'Pomme', '2026-10-01T00:00:00Z'),
    makeSummary('b', 'Bananas', 'Banane', '2026-10-03T00:00:00Z'),
    makeSummary('c', 'Cherries', 'Cerise', '2026-10-02T00:00:00Z'),
  ];

  it('requests the current user’s series from /card-series', async () => {
    TestBed.createComponent(CardList);
    const req = http().expectOne(URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('shows a loading indicator until the response arrives', async () => {
    const { el, stable } = await render(null);
    expect(el.querySelector('.spinner-border')).not.toBeNull();
    expect(el.querySelector('ul')).toBeNull();

    http().expectOne(URL).flush(three());
    await stable();
    expect(el.querySelector('.spinner-border')).toBeNull();
    expect(el.querySelector('ul')).not.toBeNull();
  });

  it('FR-LST-1: each row shows the topic, first card front and updated date', async () => {
    const { rows } = await render([makeSummary('a', 'Apples', 'Pomme', '2026-10-01T12:00:00Z')]);
    const row = rows()[0];
    expect(row.querySelector('h2')?.textContent?.trim()).toBe('Apples');
    expect(row.textContent).toContain('Pomme');
    expect(row.textContent).toMatch(/Updated .*2026/);
  });

  it('FR-LST-2: sorts newest-updated first', async () => {
    const { topics } = await render(three());
    expect(topics()).toEqual(['Bananas', 'Cherries', 'Apples']);
  });

  it('FR-LST-2: the text filter matches the topic, case-insensitively', async () => {
    const { el, fixture, stable, topics } = await render(three());
    const input = el.querySelector<HTMLInputElement>('#series-filter')!;

    input.value = 'AN';
    input.dispatchEvent(new Event('input'));
    await stable();
    expect(topics()).toEqual(['Bananas']);

    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    await stable();
    expect(topics()).toEqual([]);
    expect(el.querySelector('.alert-secondary')?.textContent).toContain('No series match');

    input.value = '';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(topics().length).toBe(3);
  });

  it('FR-LST-3: each row links to study and edit this series', async () => {
    const { rows } = await render([makeSummary('abc-123', 'Apples')]);
    const links = Array.from(rows()[0].querySelectorAll('a'));
    expect(links.find((a) => a.textContent === 'Study this')?.getAttribute('href')).toBe(
      '/study?series=abc-123',
    );
    expect(links.find((a) => a.textContent === 'Edit')?.getAttribute('href')).toBe(
      '/cards/abc-123/edit',
    );
  });

  it('FR-LST-6: the New series button goes to /cards/new', async () => {
    const { el } = await render(three());
    const link = Array.from(el.querySelectorAll('a')).find((a) => a.textContent === 'New series');
    expect(link?.getAttribute('href')).toBe('/cards/new');
  });

  it('FR-LST-5: an empty list shows "No card series yet" and a create button', async () => {
    const { el } = await render([]);
    expect(el.textContent).toContain('No card series yet');
    expect(el.querySelector('a[href="/cards/new"].btn-primary')).not.toBeNull();
    expect(el.querySelector('#series-filter')).toBeNull();
  });

  it('shows an error with Retry when loading fails, and Retry reloads', async () => {
    const { el, stable, click, button, topics } = await render(null);
    http().expectOne(URL).flush(null, { status: 500, statusText: 'Boom' });
    await stable();
    expect(el.querySelector('.alert-danger')?.textContent).toContain('could not be loaded');

    await click(button('Retry'));
    http().expectOne(URL).flush(three());
    await stable();
    expect(el.querySelector('.alert-danger')).toBeNull();
    expect(topics().length).toBe(3);
  });

  describe('FR-LST-4: delete', () => {
    it('asks for confirmation in the dialog and does not delete until confirmed', async () => {
      const { click, button, rows } = await render(three());
      const row = rows().find((r) => r.textContent?.includes('Bananas'))!;

      await click(button('Delete', row));

      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
      http().expectNone((r) => r.method === 'DELETE');
    });

    it('names the series in the dialog', async () => {
      const { click, button, rows, dialog } = await render(three());
      await click(button('Delete', rows()[0]));
      expect(dialog().textContent).toContain('Delete “Bananas”?');
    });

    it('Cancel closes the dialog and keeps the series', async () => {
      const { click, button, rows, dialog, topics } = await render(three());
      await click(button('Delete', rows()[0]));

      await click(button('Cancel', dialog()));

      expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
      http().expectNone((r) => r.method === 'DELETE');
      expect(topics().length).toBe(3);
    });

    it('Confirm sends DELETE, then removes the row and shows a success notice', async () => {
      const { click, button, rows, dialog, topics, stable, el } = await render(three());
      await click(button('Delete', rows()[0])); // Bananas (newest)

      await click(button('Delete', dialog()));
      const req = http().expectOne(`${URL}/b`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      await stable();

      expect(topics()).toEqual(['Cherries', 'Apples']);
      expect(el.querySelector('.alert-success')?.textContent).toContain('Deleted “Bananas”');
    });

    it('a failed delete keeps the row and shows an error notice', async () => {
      const { click, button, rows, dialog, topics, stable, el } = await render(three());
      await click(button('Delete', rows()[0]));

      await click(button('Delete', dialog()));
      http().expectOne(`${URL}/b`).flush(null, { status: 500, statusText: 'Boom' });
      await stable();

      expect(topics().length).toBe(3);
      expect(el.querySelector('.alert-danger')?.textContent).toContain('could not be deleted');
    });

    it('deleting the last series shows the empty state', async () => {
      const { click, button, rows, dialog, stable, el } = await render([makeSummary('a', 'Only')]);
      await click(button('Delete', rows()[0]));
      await click(button('Delete', dialog()));
      http().expectOne(`${URL}/a`).flush(null, { status: 204, statusText: 'No Content' });
      await stable();

      expect(el.textContent).toContain('No card series yet');
    });
  });
});
