import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { CardService } from '../../core/cards/card-service';
import {
  CARDS_PER_SERIES,
  CardSeries,
  CreateCardSeriesRequest,
} from '../../core/cards/card.models';

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
type LoadState = 'loading' | 'loaded' | 'notFound' | 'error';

@Component({
  selector: 'app-card-editor',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-editor.html',
})
export class CardEditor {
  /** Bound from the `:id` route parameter; absent on `/cards/new`. */
  readonly id = input<string>();
  protected readonly isNew = computed(() => !this.id());

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly cardService = inject(CardService);

  protected readonly cardCountOptions = [1, 2, 3] as const;
  protected readonly cardCount = signal(CARDS_PER_SERIES);

  protected readonly form = this.fb.group({
    topic: ['', [Validators.required, Validators.maxLength(200)]],
    cards: this.fb.array(
      Array.from({ length: CARDS_PER_SERIES }, () =>
        this.fb.group({
          front: ['', [Validators.required, Validators.maxLength(500)]],
          back: ['', [Validators.required, Validators.maxLength(1000)]],
        }),
      ),
    ),
  });

  protected readonly saveState = signal<SaveState>('idle');
  protected readonly imagePreviewUrl = signal<string | null>(null);

  /** Edit mode only: how the series load went (FR-EDT-3). New series are always `loaded`. */
  private readonly loadState = signal<LoadState>('loading');
  /** What to show: the form, or a loading / not-found / error message. */
  protected readonly view = computed<LoadState>(() => (this.isNew() ? 'loaded' : this.loadState()));

  /** Token from the last load or save, sent back on PUT to detect lost updates (FR-EDT-7). */
  private concurrencyStamp = '';

  private readonly imageInputEl = viewChild<ElementRef<HTMLInputElement>>('imageInput');

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      const url = this.imagePreviewUrl();
      if (url) URL.revokeObjectURL(url);
    });

    effect(() => {
      const count = this.cardCount();
      for (let i = 0; i < CARDS_PER_SERIES; i++) {
        const group = this.form.controls.cards.at(i);
        if (i < count) {
          group.enable();
        } else {
          group.disable();
        }
      }
    });

    // Load when opened on `/cards/:id/edit` (and again if the id changes).
    effect(() => {
      const id = this.id();
      if (id) untracked(() => this.load(id));
    });
  }

  /** Fetches the series and replaces the form with it, discarding any edits. */
  protected load(id = this.id()): void {
    if (!id) return;
    this.loadState.set('loading');
    this.saveState.set('idle');
    this.cardService.getSeries(id).subscribe({
      next: (series) => {
        if (this.id() !== id) return; // navigated to another series meanwhile
        this.fill(series);
        this.loadState.set('loaded');
      },
      error: (err: unknown) => {
        if (this.id() !== id) return;
        this.loadState.set(isStatus(err, 404) ? 'notFound' : 'error');
      },
    });
  }

  protected onImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imagePreviewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  protected clearImage(): void {
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imagePreviewUrl.set(null);
    const el = this.imageInputEl();
    if (el) el.nativeElement.value = '';
  }

  protected save(): void {
    if (this.form.invalid || this.saveState() === 'saving') return;
    this.saveState.set('saving');

    const id = this.id();
    if (!id) {
      this.cardService.createSeries(this.buildRequest()).subscribe({
        next: () => {
          this.saveState.set('saved');
          this.form.reset();
          this.clearImage();
        },
        error: () => this.saveState.set('error'),
      });
      return;
    }

    this.cardService
      .updateSeries(id, { ...this.buildRequest(), concurrencyStamp: this.concurrencyStamp })
      .subscribe(this.afterUpdate());
  }

  /** FR-EDT-7 "Overwrite": take the latest stamp, then re-send the user's edits with it. */
  protected overwrite(): void {
    const id = this.id();
    if (!id || this.saveState() === 'saving') return;
    this.saveState.set('saving');
    this.cardService
      .getSeries(id)
      .pipe(
        switchMap((latest) =>
          this.cardService.updateSeries(id, {
            ...this.buildRequest(),
            concurrencyStamp: latest.concurrencyStamp,
          }),
        ),
      )
      .subscribe(this.afterUpdate());
  }

  private afterUpdate() {
    return {
      next: (series: CardSeries) => {
        this.fill(series); // fresh stamp and a clean form
        this.saveState.set('saved');
      },
      error: (err: unknown) => {
        if (isStatus(err, 404)) {
          this.loadState.set('notFound'); // deleted elsewhere
        } else {
          this.saveState.set(isStatus(err, 409) ? 'conflict' : 'error');
        }
      },
    };
  }

  /** The trimmed form, limited to the chosen number of cards, positions 0..n-1. */
  private buildRequest(): CreateCardSeriesRequest {
    const { topic, cards } = this.form.getRawValue();
    return {
      topic: topic.trim(),
      cards: cards.slice(0, this.cardCount()).map((c, position) => ({
        position,
        front: c.front.trim(),
        back: c.back.trim(),
      })),
    };
  }

  /** Puts a series into the form and remembers its concurrency stamp. */
  private fill(series: CardSeries): void {
    const cards = [...series.cards].sort((a, b) => a.position - b.position);
    this.concurrencyStamp = series.concurrencyStamp;
    this.cardCount.set(Math.min(Math.max(cards.length, 1), CARDS_PER_SERIES));
    this.form.reset({
      topic: series.topic,
      cards: Array.from({ length: CARDS_PER_SERIES }, (_, i) => ({
        front: cards[i]?.front ?? '',
        back: cards[i]?.back ?? '',
      })),
    });
  }
}

function isStatus(err: unknown, status: number): boolean {
  return err instanceof HttpErrorResponse && err.status === status;
}
