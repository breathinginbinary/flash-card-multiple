import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CardService } from '../../core/cards/card-service';
import { CardSeries } from '../../core/cards/card.models';
import { CardEditor } from './card-editor';

describe('CardEditor (new series)', () => {
  const createSeries = vi.fn();

  beforeEach(() => {
    createSeries.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: CardService, useValue: { createSeries } }],
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
