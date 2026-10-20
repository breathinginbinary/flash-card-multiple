import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardService } from '../../core/cards/card-service';
import { CardSeries } from '../../core/cards/card.models';
import { FlipCard } from '../../shared/flip-card/flip-card';

type LoadState = 'loading' | 'error' | 'loaded';

@Component({
  selector: 'app-study',
  imports: [FlipCard, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study.html',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class Study {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cardService = inject(CardService);

  /** Bound from `?series=<id>`; the URL is the source of truth for the current series. */
  readonly series = input<string>();

  protected readonly state = signal<LoadState>('loading');

  /** The series in study order; Shuffle reorders it for this session. */
  protected readonly deck = signal<CardSeries[]>([]);
  /** The series on screen; `undefined` until loaded, and when the user has none (FR-STD-9). */
  protected readonly current = computed<CardSeries | undefined>(
    () => this.deck().find((s) => s.id === this.series()) ?? this.deck()[0],
  );
  protected readonly index = computed(() => {
    const current = this.current();
    return current ? this.deck().indexOf(current) : -1;
  });
  protected readonly hasPrevious = computed(() => this.index() > 0);
  protected readonly hasNext = computed(() => this.index() < this.deck().length - 1);
  protected readonly notice = signal<string | null>(null);

  /** Resets every card to its front whenever the current series changes (FR-STD-7). */
  protected readonly flipped = linkedSignal({
    source: this.current,
    computation: (s) => Array<boolean>(s?.cards.length ?? 0).fill(false),
  });

  /** Set when the series image fails to load, so no broken-image icon shows; clears on series change. */
  protected readonly imageFailed = linkedSignal({ source: this.current, computation: () => false });

  constructor() {
    this.load();

    // Keep `?series=` pointing at the series on screen (FR-STD-8, FR-STD-10).
    effect(() => {
      const current = this.current();
      if (!current) return;
      const requested = this.series();
      if (requested === current.id) return;
      if (requested) this.notice.set('That series was not found, so the first series is shown.');
      this.navigateTo(current.id);
    });
  }

  protected load(): void {
    this.state.set('loading');
    this.cardService.listSeriesWithCards().subscribe({
      next: (list) => {
        this.deck.set(list);
        this.state.set('loaded');
      },
      error: () => this.state.set('error'),
    });
  }

  protected setFlipped(index: number, value: boolean): void {
    this.flipped.update((f) => f.map((v, i) => (i === index ? value : v)));
  }

  protected previous(): void {
    if (this.hasPrevious()) this.goTo(this.index() - 1);
  }

  protected next(): void {
    if (this.hasNext()) this.goTo(this.index() + 1);
  }

  protected flipAll(): void {
    this.flipped.update((f) => f.map(() => true));
  }

  protected reset(): void {
    this.flipped.update((f) => f.map(() => false));
  }

  protected shuffle(): void {
    if (this.deck().length === 0) return;
    const deck = [...this.deck()];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    this.deck.set(deck);
    this.goTo(0);
    this.reset();
  }

  /** Keyboard shortcuts (FR-STD-6), ignored while typing or with modifier keys held. */
  protected onKeydown(event: KeyboardEvent): void {
    const current = this.current();
    if (!current || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey)
      return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable=false])'))
      return;

    const card = ['1', '2', '3'].indexOf(event.key);
    if (card !== -1 && card < current.cards.length) {
      this.setFlipped(card, !this.flipped()[card]);
    } else if (event.key === 'ArrowLeft') {
      this.previous();
    } else if (event.key === 'ArrowRight') {
      this.next();
    } else if (event.key === 'f' || event.key === 'F') {
      this.flipAll();
    } else if (event.key === 'r' || event.key === 'R') {
      this.reset();
    } else {
      return;
    }
    event.preventDefault();
  }

  private goTo(index: number): void {
    this.notice.set(null);
    this.navigateTo(this.deck()[index].id);
  }

  private navigateTo(id: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { series: id },
      replaceUrl: true,
    });
  }
}
