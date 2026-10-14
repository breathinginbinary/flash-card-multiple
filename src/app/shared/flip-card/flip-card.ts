import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { CARDS_PER_SERIES } from '../../core/cards/card.models';

@Component({
  selector: 'app-flip-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flip-card.html',
  styleUrl: './flip-card.css',
})
export class FlipCard {
  readonly front = input.required<string>();
  readonly back = input.required<string>();
  readonly index = input.required<number>(); // 0-based, for labels
  readonly total = input(CARDS_PER_SERIES);
  readonly flipped = model(false); // two-way: parent can flip all/reset
}
