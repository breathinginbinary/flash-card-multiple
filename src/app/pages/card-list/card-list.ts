import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardService } from '../../core/cards/card-service';
import { CardSeriesSummary } from '../../core/cards/card.models';

type LoadState = 'loading' | 'error' | 'loaded';

@Component({
  selector: 'app-card-list',
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-list.html',
})
export class CardList {
  private readonly cardService = inject(CardService);

  protected readonly state = signal<LoadState>('loading');
  protected readonly series = signal<CardSeriesSummary[]>([]);
  protected readonly filter = signal('');
  protected readonly pendingDelete = signal<CardSeriesSummary | null>(null);
  protected readonly deleting = signal(false);
  protected readonly notice = signal<{ kind: 'success' | 'danger'; text: string } | null>(null);

  /** Newest-updated first, narrowed by the topic filter (FR-LST-2). */
  protected readonly visible = computed(() => {
    const term = this.filter().trim().toLowerCase();
    return [...this.series()]
      .filter((s) => s.topic.toLowerCase().includes(term))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('deleteDialog');

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.cardService.listSeries().subscribe({
      next: (list) => {
        this.series.set(list);
        this.state.set('loaded');
      },
      error: () => this.state.set('error'),
    });
  }

  protected onFilter(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }

  protected askDelete(item: CardSeriesSummary): void {
    this.pendingDelete.set(item);
    this.dialog()?.nativeElement.showModal();
  }

  protected cancelDelete(): void {
    this.dialog()?.nativeElement.close();
    this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const item = this.pendingDelete();
    if (!item || this.deleting()) return;
    this.deleting.set(true);
    this.cardService.deleteSeries(item.id).subscribe({
      next: () => {
        this.series.update((list) => list.filter((s) => s.id !== item.id));
        this.notice.set({ kind: 'success', text: `Deleted “${item.topic}”.` });
        this.finishDelete();
      },
      error: () => {
        this.notice.set({ kind: 'danger', text: `“${item.topic}” could not be deleted.` });
        this.finishDelete();
      },
    });
  }

  private finishDelete(): void {
    this.deleting.set(false);
    this.cancelDelete();
  }
}
