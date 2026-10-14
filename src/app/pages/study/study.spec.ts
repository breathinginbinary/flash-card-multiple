import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Study } from './study';

describe('Study', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'study', component: Study }], withComponentInputBinding()),
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  async function render(startUrl = '/study') {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(startUrl, Study);
    await harness.fixture.whenStable();
    const el = harness.routeNativeElement!;
    const stable = () => harness.fixture.whenStable();
    const button = (label: string) =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.includes(label),
      )!;
    const click = async (label: string) => {
      button(label).click();
      await stable();
    };
    const press = async (key: string, target: EventTarget = document.body) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await stable();
    };
    const pressed = () =>
      Array.from(el.querySelectorAll('.flip-card')).map((b) => b.getAttribute('aria-pressed'));
    const topic = () => el.querySelector('h1')?.textContent;
    const position = () => el.querySelector('[aria-live]')?.textContent?.trim();
    const url = () => TestBed.inject(Router).url;
    return { el, stable, button, click, press, pressed, topic, position, url };
  }

  it('FR-STD-1: shows the topic heading and two cards for the dog series', async () => {
    const { el, topic } = await render();
    expect(topic()).toBe('Dog');
    expect(el.querySelectorAll('app-flip-card').length).toBe(2);
  });

  it('FR-STD-2: flipping one card leaves the other on its front', async () => {
    const { el, stable, pressed } = await render();
    el.querySelectorAll<HTMLButtonElement>('.flip-card')[1].click();
    await stable();
    expect(pressed()).toEqual(['false', 'true']);
  });

  it('FR-STD-5: Flip all shows every back and Reset returns them to the front', async () => {
    const { click, pressed } = await render();
    await click('Flip all');
    expect(pressed()).toEqual(['true', 'true']);
    await click('Reset');
    expect(pressed()).toEqual(['false', 'false']);
  });

  it('FR-STD-5: Next and Previous move between series and update the position', async () => {
    const { button, click, topic, position } = await render();
    expect(position()).toBe('Series 1 of 2');
    expect(button('Previous').disabled).toBe(true);

    await click('Next');
    expect(topic()).toBe('Cat');
    expect(position()).toBe('Series 2 of 2');

    await click('Previous');
    expect(topic()).toBe('Dog');
  });

  it('FR-STD-5: Next is disabled on the last series', async () => {
    const { button, click, position } = await render();
    await click('Next');
    expect(position()).toBe('Series 2 of 2');
    expect(button('Next').disabled).toBe(true);
  });

  it('FR-STD-7: moving to another series resets the cards to their fronts', async () => {
    const { click, pressed } = await render();
    await click('Flip all');
    await click('Next');
    expect(pressed()).toEqual(['false', 'false']);
  });

  it('FR-STD-5: Shuffle reorders the series, returns to the first and resets the cards', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // Fisher–Yates with 0 swaps the two series
    const { click, pressed, topic, position } = await render();
    await click('Next');
    await click('Flip all');
    await click('Shuffle');
    expect(topic()).toBe('Cat');
    expect(position()).toBe('Series 1 of 2');
    expect(pressed()).toEqual(['false', 'false']);
  });

  it('FR-STD-6: 1/2 flip those cards, F flips all and R resets', async () => {
    const { press, pressed } = await render();
    await press('2');
    expect(pressed()).toEqual(['false', 'true']);
    await press('2');
    expect(pressed()).toEqual(['false', 'false']);
    await press('f');
    expect(pressed()).toEqual(['true', 'true']);
    await press('R');
    expect(pressed()).toEqual(['false', 'false']);
  });

  it('FR-STD-6: pressing 3 does nothing when the series has only 2 cards', async () => {
    const { press, pressed } = await render();
    await press('3');
    expect(pressed()).toEqual(['false', 'false']);
  });

  it('FR-STD-6: arrow keys move to the next and previous series', async () => {
    const { press, topic } = await render();
    await press('ArrowRight');
    expect(topic()).toBe('Cat');
    await press('ArrowLeft');
    expect(topic()).toBe('Dog');
  });

  it('FR-STD-6: ignores shortcuts while typing in an input or with modifier keys', async () => {
    const { el, stable, press, pressed } = await render();
    const input = document.createElement('input');
    el.appendChild(input);
    await press('1', input);
    expect(pressed()).toEqual(['false', 'false']);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true }));
    await stable();
    expect(pressed()).toEqual(['false', 'false']);
  });

  it('FR-STD-10: keeps the current series in the URL', async () => {
    const { click, url } = await render();
    expect(url()).toBe('/study?series=dog-series');
    await click('Next');
    expect(url()).toBe('/study?series=cat-series');
  });

  it('FR-STD-8: ?series=<id> opens that series', async () => {
    const { topic, position } = await render('/study?series=cat-series');
    expect(topic()).toBe('Cat');
    expect(position()).toBe('Series 2 of 2');
  });

  it('FR-STD-8: an unknown id shows a notice and falls back to the first series', async () => {
    const { el, topic, url } = await render('/study?series=nope');
    expect(topic()).toBe('Dog');
    expect(el.querySelector('.alert-warning')?.textContent).toContain('not found');
    expect(url()).toBe('/study?series=dog-series');
  });
});
