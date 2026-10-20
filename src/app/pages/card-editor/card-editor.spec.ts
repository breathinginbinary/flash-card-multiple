import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CardService } from '../../core/cards/card-service';
import { CardSeries } from '../../core/cards/card.models';
import { makeSeries } from '../../testing/card-testing';
import { CardEditor } from './card-editor';

describe('CardEditor (new series)', () => {
  const createSeries = vi.fn();

  beforeEach(() => {
    createSeries.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CardService, useValue: { createSeries } }],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(CardEditor);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const set = (selector: string, value: string) => {
      const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const fillAll = async () => {
      set('#topic', ' Photosynthesis ');
      for (const i of [0, 1, 2]) {
        set(`#front-${i}`, `Front ${i}`);
        set(`#back-${i}`, `Back ${i}`);
      }
      await fixture.whenStable();
    };
    const saveButton = () => el.querySelector<HTMLButtonElement>('button[type=submit]')!;
    return { fixture, el, fillAll, saveButton };
  }

  it('FR-EDT-1: shows a topic field and three card panels with front and back', async () => {
    const { el } = await render();
    expect(el.querySelector('#topic')).not.toBeNull();
    expect(el.querySelectorAll('fieldset').length).toBe(3);
    for (const i of [0, 1, 2]) {
      expect(el.querySelector(`#front-${i}`)).not.toBeNull();
      expect(el.querySelector(`#back-${i}`)).not.toBeNull();
    }
  });

  it('FR-EDT-1: disables Save until every field is filled', async () => {
    const { fillAll, saveButton } = await render();
    expect(saveButton().disabled).toBe(true);
    await fillAll();
    expect(saveButton().disabled).toBe(false);
  });

  it('FR-EDT-4: saves the trimmed series with positions 0-2 and shows success', async () => {
    createSeries.mockReturnValue(of({} as CardSeries));
    const { fixture, el, fillAll, saveButton } = await render();
    await fillAll();
    saveButton().click();
    await fixture.whenStable();

    expect(createSeries).toHaveBeenCalledWith({
      topic: 'Photosynthesis',
      cards: [0, 1, 2].map((position) => ({
        position,
        front: `Front ${position}`,
        back: `Back ${position}`,
      })),
    });
    expect(el.querySelector('.alert-success')?.textContent).toContain('Saved');
    expect(el.querySelector<HTMLInputElement>('#topic')!.value).toBe('');
  });

  it('shows an error when the save fails', async () => {
    createSeries.mockReturnValue(throwError(() => new Error('boom')));
    const { fixture, el, fillAll, saveButton } = await render();
    await fillAll();
    saveButton().click();
    await fixture.whenStable();
    expect(el.querySelector('.alert-danger')).not.toBeNull();
  });
});

describe('CardEditor (edit series)', () => {
  const getSeries = vi.fn();
  const updateSeries = vi.fn();
  const createSeries = vi.fn();

  const http = (status: number) => new HttpErrorResponse({ status, statusText: String(status) });
  const series = (overrides: Partial<CardSeries> = {}) =>
    makeSeries(
      'abc',
      'Dog',
      [
        ['German', 'Hund'],
        ['Spanish', 'perro'],
      ],
      { concurrencyStamp: 'stamp-1', ...overrides },
    );

  beforeEach(() => {
    getSeries.mockReset();
    updateSeries.mockReset();
    createSeries.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CardService, useValue: { getSeries, updateSeries, createSeries } },
      ],
    });
  });

  async function render(id = 'abc') {
    const fixture = TestBed.createComponent(CardEditor);
    fixture.componentRef.setInput('id', id);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const stable = () => fixture.whenStable();
    const value = (selector: string) =>
      el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!.value;
    const set = async (selector: string, text: string) => {
      const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await stable();
    };
    const button = (label: string) =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim() === label,
      )!;
    const click = async (label: string) => {
      button(label).click();
      await stable();
    };
    const save = () => click('Save');
    return { fixture, el, stable, value, set, button, click, save };
  }

  it('FR-EDT-3: loads the series by id and fills the form', async () => {
    getSeries.mockReturnValue(of(series()));
    const { el, value } = await render();

    expect(getSeries).toHaveBeenCalledWith('abc');
    expect(value('#topic')).toBe('Dog');
    expect(value('#front-0')).toBe('German');
    expect(value('#back-0')).toBe('Hund');
    expect(value('#front-1')).toBe('Spanish');
    expect(value('#back-1')).toBe('perro');
    expect(el.querySelectorAll('fieldset').length).toBe(2); // the series has two cards
    expect(el.querySelector('h1')?.textContent).toBe('Edit series');
  });

  it('puts the cards in position order even if the API sends them shuffled', async () => {
    const s = series();
    s.cards.reverse();
    getSeries.mockReturnValue(of(s));
    const { value } = await render();
    expect(value('#front-0')).toBe('German');
    expect(value('#front-1')).toBe('Spanish');
  });

  it('shows a loading indicator and no form until the series arrives', async () => {
    const pending = new Subject<CardSeries>();
    getSeries.mockReturnValue(pending);
    const { el, stable } = await render();
    expect(el.querySelector('.spinner-border')).not.toBeNull();
    expect(el.querySelector('form')).toBeNull();

    pending.next(series());
    await stable();
    expect(el.querySelector('.spinner-border')).toBeNull();
    expect(el.querySelector('form')).not.toBeNull();
  });

  it('FR-EDT-3: a 404 shows "Series not found" with a link back to /cards', async () => {
    getSeries.mockReturnValue(throwError(() => http(404)));
    const { el } = await render();
    expect(el.textContent).toContain('Series not found');
    expect(el.querySelector('a[href="/cards"]')).not.toBeNull();
    expect(el.querySelector('form')).toBeNull();
  });

  it('shows an error with Retry for other load failures, and Retry loads the series', async () => {
    getSeries.mockReturnValueOnce(throwError(() => http(500))).mockReturnValue(of(series()));
    const { el, click, value } = await render();
    expect(el.querySelector('.alert-danger')?.textContent).toContain('could not be loaded');
    expect(el.querySelector('form')).toBeNull();

    await click('Retry');
    expect(value('#topic')).toBe('Dog');
  });

  it('FR-EDT-4: Save is disabled until something valid is entered, and enabled for a loaded series', async () => {
    getSeries.mockReturnValue(of(series()));
    const { button, set } = await render();
    expect(button('Save').disabled).toBe(false);
    await set('#topic', '');
    expect(button('Save').disabled).toBe(true);
  });

  it('FR-EDT-4: saves with PUT, the trimmed edits and the concurrency stamp', async () => {
    getSeries.mockReturnValue(of(series()));
    updateSeries.mockReturnValue(of(series({ topic: 'Dogs', concurrencyStamp: 'stamp-2' })));
    const { el, set, save } = await render();

    await set('#topic', '  Dogs ');
    await set('#back-1', ' el perro ');
    await save();

    expect(updateSeries).toHaveBeenCalledWith('abc', {
      topic: 'Dogs',
      cards: [
        { position: 0, front: 'German', back: 'Hund' },
        { position: 1, front: 'Spanish', back: 'el perro' },
      ],
      concurrencyStamp: 'stamp-1',
    });
    expect(createSeries).not.toHaveBeenCalled();
    expect(el.querySelector('.alert-success')?.textContent).toContain('Saved');
  });

  it('keeps the saved values in the form, and the next save uses the new stamp', async () => {
    getSeries.mockReturnValue(of(series()));
    updateSeries
      .mockReturnValueOnce(of(series({ topic: 'Dogs', concurrencyStamp: 'stamp-2' })))
      .mockReturnValue(of(series({ topic: 'Dogs!', concurrencyStamp: 'stamp-3' })));
    const { value, set, save } = await render();

    await set('#topic', 'Dogs');
    await save();
    expect(value('#topic')).toBe('Dogs'); // not cleared, unlike creating a series

    await set('#topic', 'Dogs!');
    await save();
    expect(updateSeries.mock.calls[1][1].concurrencyStamp).toBe('stamp-2');
  });

  it('can reduce the number of cards: only the chosen cards are sent', async () => {
    getSeries.mockReturnValue(of(series()));
    updateSeries.mockReturnValue(of(series()));
    const { click, save } = await render();

    await click('1');
    await save();

    expect(updateSeries.mock.calls[0][1].cards).toEqual([
      { position: 0, front: 'German', back: 'Hund' },
    ]);
  });

  it('can add a card, which must be filled in before saving', async () => {
    getSeries.mockReturnValue(of(series()));
    updateSeries.mockReturnValue(of(series()));
    const { el, button, click, set, save } = await render();
    expect(el.querySelectorAll('fieldset').length).toBe(2);

    await click('3');
    expect(el.querySelectorAll('fieldset').length).toBe(3);
    expect(button('Save').disabled).toBe(true); // card 3 is empty

    await set('#front-2', 'French');
    await set('#back-2', 'chien');
    await save();
    expect(updateSeries.mock.calls[0][1].cards[2]).toEqual({
      position: 2,
      front: 'French',
      back: 'chien',
    });
  });

  it('shows an error when the update fails', async () => {
    getSeries.mockReturnValue(of(series()));
    updateSeries.mockReturnValue(throwError(() => http(500)));
    const { el, save } = await render();
    await save();
    expect(el.querySelector('.alert-danger')?.textContent).toContain('could not be saved');
    expect(el.querySelector('form')).not.toBeNull();
  });

  describe('FR-EDT-7: conflicts', () => {
    it('a 409 explains the series changed elsewhere and offers Reload and Overwrite', async () => {
      getSeries.mockReturnValue(of(series()));
      updateSeries.mockReturnValue(throwError(() => http(409)));
      const { el, button, save, set, value } = await render();
      await set('#topic', 'My edit');

      await save();

      expect(el.querySelector('.alert-warning')?.textContent).toContain(
        'This series was changed elsewhere',
      );
      expect(button('Reload')).toBeTruthy();
      expect(button('Overwrite')).toBeTruthy();
      expect(value('#topic')).toBe('My edit'); // edits are not lost
    });

    it('Reload fetches the latest version and discards the edits', async () => {
      getSeries.mockReturnValueOnce(of(series()));
      updateSeries.mockReturnValue(throwError(() => http(409)));
      const { el, click, save, set, value } = await render();
      await set('#topic', 'My edit');
      await save();

      getSeries.mockReturnValue(of(series({ topic: 'Their edit', concurrencyStamp: 'stamp-9' })));
      await click('Reload');

      expect(value('#topic')).toBe('Their edit');
      expect(el.querySelector('.alert-warning')).toBeNull();
    });

    it('Overwrite re-sends the user’s edits with the latest stamp', async () => {
      getSeries.mockReturnValueOnce(of(series()));
      updateSeries.mockReturnValueOnce(throwError(() => http(409)));
      const { el, click, save, set, value } = await render();
      await set('#topic', 'My edit');
      await save();

      getSeries.mockReturnValue(of(series({ topic: 'Their edit', concurrencyStamp: 'stamp-9' })));
      updateSeries.mockReturnValue(of(series({ topic: 'My edit', concurrencyStamp: 'stamp-10' })));
      await click('Overwrite');

      expect(updateSeries).toHaveBeenLastCalledWith('abc', {
        topic: 'My edit',
        cards: [
          { position: 0, front: 'German', back: 'Hund' },
          { position: 1, front: 'Spanish', back: 'perro' },
        ],
        concurrencyStamp: 'stamp-9',
      });
      expect(value('#topic')).toBe('My edit');
      expect(el.querySelector('.alert-success')?.textContent).toContain('Saved');
      expect(el.querySelector('.alert-warning')).toBeNull();
    });

    it('Overwrite on a series deleted in the meantime shows "Series not found"', async () => {
      getSeries.mockReturnValueOnce(of(series()));
      updateSeries.mockReturnValue(throwError(() => http(409)));
      const { el, click, save } = await render();
      await save();

      getSeries.mockReturnValue(throwError(() => http(404)));
      await click('Overwrite');

      expect(el.textContent).toContain('Series not found');
    });

    it('Overwrite that conflicts again stays on the conflict message', async () => {
      getSeries.mockReturnValue(of(series()));
      updateSeries.mockReturnValue(throwError(() => http(409)));
      const { el, click, save } = await render();
      await save();

      await click('Overwrite');

      expect(el.querySelector('.alert-warning')?.textContent).toContain('changed elsewhere');
    });
  });

  it('ignores a slow response for a series the user has already left', async () => {
    const first = new Subject<CardSeries>();
    getSeries.mockReturnValueOnce(first).mockReturnValueOnce(of(series({ topic: 'Second' })));
    const { fixture, stable, value } = await render('one');

    fixture.componentRef.setInput('id', 'two');
    await stable();
    expect(value('#topic')).toBe('Second');

    first.next(series({ topic: 'First (stale)' }));
    await stable();
    expect(value('#topic')).toBe('Second');
  });
});
