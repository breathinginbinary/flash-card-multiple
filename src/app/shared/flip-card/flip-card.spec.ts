import { TestBed } from '@angular/core/testing';
import { FlipCard } from './flip-card';

describe('FlipCard', () => {
  async function render() {
    const fixture = TestBed.createComponent(FlipCard);
    fixture.componentRef.setInput('front', 'Q');
    fixture.componentRef.setInput('back', 'A');
    fixture.componentRef.setInput('index', 1);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    return { fixture, button };
  }

  it('FR-STD-2: starts on the front and flips on click', async () => {
    const { fixture, button } = await render();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.flipped()).toBe(true);
  });

  it('FR-STD-4: labels the card and hides the face that is not showing', async () => {
    const { fixture, button } = await render();
    const [front, back] = Array.from(button.querySelectorAll('.face'));
    expect(button.querySelector('.visually-hidden')?.textContent).toContain(
      'Card 2 of 3, showing front',
    );
    expect(front.hasAttribute('aria-hidden')).toBe(false);
    expect(back.getAttribute('aria-hidden')).toBe('true');
    expect(back.hasAttribute('inert')).toBe(true);

    button.click();
    await fixture.whenStable();
    expect(button.querySelector('.visually-hidden')?.textContent).toContain('showing back');
    expect(front.getAttribute('aria-hidden')).toBe('true');
    expect(back.hasAttribute('aria-hidden')).toBe(false);
  });
});
