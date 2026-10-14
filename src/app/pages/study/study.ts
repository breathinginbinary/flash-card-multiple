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
import { ActivatedRoute, Router } from '@angular/router';
import { FlipCard } from '../../shared/flip-card/flip-card';

// TODO (milestone 5): load the user's series with CardService.listSeriesWithCards().
const PLACEHOLDER_SERIES = [
  {
    id: 'dog-series',
    topic: 'Dog',
    imageUrl: '/images/Dog.png',
    cards: [
      { position: 0, front: 'German', back: 'Hund' },
      { position: 1, front: 'Spanish', back: 'perro' },
    ],
  },
  {
    id: 'cat-series',
    topic: 'Cat',
    imageUrl: '/images/Cat.png',
    cards: [
      { position: 0, front: 'German', back: 'Katze' },
      { position: 1, front: 'Spanish', back: 'gato' },
    ],
  },
];

@Component({
  selector: 'app-study',
  imports: [FlipCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study.html',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class Study {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Bound from `?series=<id>`; the URL is the source of truth for the current series. */
  readonly series = input<string>();

  /** The series in study order; Shuffle reorders it for this session. */
  protected readonly deck = signal(PLACEHOLDER_SERIES);
  protected readonly current = computed(
    () => this.deck().find((s) => s.id === this.series()) ?? this.deck()[0],
  );
  protected readonly index = computed(() => this.deck().indexOf(this.current()));
  protected readonly hasPrevious = computed(() => this.index() > 0);
  protected readonly hasNext = computed(() => this.index() < this.deck().length - 1);
  protected readonly notice = signal<string | null>(null);

  /** Resets every card to its front whenever the current series changes (FR-STD-7). */
  protected readonly flipped = linkedSignal({
    source: this.current,
    computation: (s) => Array<boolean>(s.cards.length).fill(false),
  });

  constructor() {
    // Keep `?series=` pointing at the series on screen (FR-STD-8, FR-STD-10).
    effect(() => {
      const requested = this.series();
      const id = this.current().id;
      if (requested === id) return;
      if (requested) this.notice.set('That series was not found, so the first series is shown.');
      this.navigateTo(id);
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
    this.flipped.set(Array<boolean>(this.current().cards.length).fill(true));
  }

  protected reset(): void {
    this.flipped.set(Array<boolean>(this.current().cards.length).fill(false));
  }

  protected shuffle(): void {
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
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable=false])'))
      return;

    const card = ['1', '2', '3'].indexOf(event.key);
    if (card !== -1 && card < this.current().cards.length) {
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
