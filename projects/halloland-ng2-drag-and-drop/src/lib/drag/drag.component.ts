import {Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {DragAndDropService} from './services/drag-and-drop.service';
import {Subscription} from 'rxjs';
import {DragEventResponse} from './interfaces/i-drag-event-response';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'halloland-ng2-drag-and-drop',
  templateUrl: './drag.component.html',
  styleUrls: ['./drag.component.scss']
})
export class DragComponent implements OnInit, OnDestroy {

  @Output() change: EventEmitter<DragEventResponse> = new EventEmitter();

  private dragSubscription: Subscription;

  constructor(private dragAndDropService: DragAndDropService, private elementRef: ElementRef) {
  }

  public ngOnInit(): void {
    this.initDrag();
  }

  public ngOnDestroy(): void {
    this.dragSubscription.unsubscribe();
  }

  private initDrag(): void {
    this.dragAndDropService.configure({move: true});

    this.dragSubscription = this.dragAndDropService.exchange({parent: this.elementRef.nativeElement})
      .subscribe((response: DragEventResponse) => this.change.emit(response));
  }
}
