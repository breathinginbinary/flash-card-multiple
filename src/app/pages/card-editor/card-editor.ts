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
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardService } from '../../core/cards/card-service';
import { CARDS_PER_SERIES } from '../../core/cards/card.models';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-card-editor',
  imports: [ReactiveFormsModule],
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
    const { topic, cards } = this.form.getRawValue();
    const count = this.cardCount();
    this.saveState.set('saving');
    this.cardService
      .createSeries({
        topic: topic.trim(),
        cards: cards.slice(0, count).map((c, position) => ({
          position,
          front: c.front.trim(),
          back: c.back.trim(),
        })),
      })
      .subscribe({
        next: () => {
          this.saveState.set('saved');
          this.form.reset();
          this.clearImage();
        },
        error: () => this.saveState.set('error'),
      });
  }
}
