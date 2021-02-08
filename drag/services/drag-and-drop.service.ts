import {Injectable} from '@angular/core';
import {IOptions} from '../interfaces/i-options';
import {IConfigure} from '../interfaces/i-configure';
import {filter} from 'rxjs/operators';
import {interval, Observable, Subject, Subscription} from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class DragAndDropService {
  private exchangeRes$: Subject<object>;
  private animationSubject$: Subject<void> = new Subject();
  private scrollSubscription: Subscription;
  private animationSubscription: Subscription;

  private currentElements: Array<HTMLElement>;
  private moveElements: Array<HTMLElement> = [];

  private events: Array<string> = ['mousedown', 'mousemove', 'mouseup', 'mouseleave', 'touchstart', 'touchmove', 'touchend', 'touchcancel'];
  private DOCUMENT: Document = window.document;

  private triggerForEvents: any;
  private dropTimeout: any;

  private options: IOptions;

  private parent: HTMLElement | any;
  private draggedElement: HTMLElement | any;
  private draggedClone: HTMLElement | any;
  private targetElement: HTMLElement | any;

  private dragAndDropTransition = 300;
  private parentScrollHeight = 0;
  private prevMoveY = 0;
  private prevMoveYScroll = 0;
  private touchPressDelay = 200;
  private initialIndex: number;
  private fetchedIndex: number;
  private startDragIndex: number;


  private foundDraggableElement = false;
  private animationActive = false;
  private canMove = true;
  private activeMove = false;
  private scrollActive = false;


  private targetElementClass = 'drag_and_drop_target';
  private draggedClass = 'drag_and_drop_transition';

  private static getPosition(el: HTMLElement): { top: number, left: number } {
    const positionReg = /(\-?[\d]+)px/;
    let styleTop = 0, styleLeft = 0;
    const styleTopMatch = el.style.top.match(positionReg),
      styleLeftMatch = el.style.left.match(positionReg);

    if (styleTopMatch) {
      styleTop = parseFloat(styleTopMatch[1]);
    }
    if (styleLeftMatch) {
      styleLeft = parseFloat(styleLeftMatch[1]);
    }

    return {top: styleTop, left: styleLeft};
  }

  constructor() {
  }

  public exchange(options: IOptions): Observable<object> {
    this.exchangeRes$ = new Subject<object>();
    this.options = options;
    this.parent = options.parent;
    this.parent.style.overflow = 'hidden';
    this.parentScrollHeight = this.parent.scrollHeight;
    this.attachEvents();

    return this.exchangeRes$;
  }

  public configure(configure: IConfigure): void {
    this.canMove = typeof configure.move !== 'undefined' ? configure.move : this.canMove;
    this.touchPressDelay = typeof configure.pressDelay !== 'undefined' ? configure.pressDelay : this.touchPressDelay;
  }

  public handleEvent(e: Event): void {
    switch (e.type) {
      case 'mousedown':
        if (this.canMove) {
          this.eventsOnStart(e);
        }
        break;
      case 'touchstart':
        try {
          this.prevMoveYScroll = (e as TouchEvent).touches[0].pageY;
        } catch (err) {
          this.prevMoveYScroll = (e as MouseEvent).pageY;
        }
        // if ((e as TouchEvent).changedTouches[0].identifier <= 0 && this.canMove) {
        if (this.canMove) {
          this.triggerForEvents = setTimeout(() => this.eventsOnStart(e), this.touchPressDelay);
        }

        break;
      case 'touchmove':
      case 'mousemove':
        this.eventsOnMove(e);
        break;
      case 'touchcancel':
      case 'touchend':
      case 'mouseleave':
      case 'mouseup':
        this.eventsOnEnd();
        break;
    }
  }

  public detachEvents(): void {
    this.events.forEach(event => this.parent.removeEventListener(event, this));
  }

  private attachEvents(): void {
    this.events.forEach(event => this.parent.addEventListener(event, this));
  }

  private eventsOnStart(e: Event): void {
    // problems with events happens on ios 12 (beta versions on this moments)

    if (!this.activeMove && this.canMove && this.getParentChildren().length > 1) {

      this.activeMove = true;
      this.toggleDefaultStylesForBody(true);

      this.attachDragScroll();

      this.currentElements = this.getParentChildren();

      this.getDraggedClone(e);


      // find current dragged element index
      this.currentElements.find((el: HTMLElement, index) => {
        if (el.isEqualNode(this.draggedElement)
          && el.offsetTop === this.draggedElement.offsetTop
          && el.offsetLeft === this.draggedElement.offsetLeft) {
          this.startDragIndex = index;

          return true;
        }
        return false;
      });

      try {
        this.prevMoveY = (e as TouchEvent).touches[0].pageY;
      } catch (err) {
        this.prevMoveY = (e as MouseEvent).pageY;
      }
    }
  }

  private detachDragScroll(): void {
    this.scrollSubscription.unsubscribe();
  }

  private attachDragScroll(): void {
    this.parentScrollHeight = this.parent.scrollHeight;

    this.scrollSubscription = interval(10).pipe(
      filter(() => this.activeMove && this.foundDraggableElement)
    ).subscribe(() => {
      if (this.draggedClone.offsetTop + this.draggedClone.clientHeight > this.parent.offsetTop + this.parent.clientHeight) {
        if (this.parent.scrollTop >= this.parentScrollHeight - this.parent.clientHeight) {
          this.parent.scrollTop = this.parentScrollHeight;
          this.scrollActive = false;
        } else {
          this.parent.scrollTop++;
          this.scrollActive = true;
        }
      } else if (this.draggedClone.offsetTop < this.parent.offsetTop) {
        if (this.parent.scrollTop <= 0) {
          this.parent.scrollTop = 0;
          this.scrollActive = false;
        } else {
          this.parent.scrollTop--;
          this.scrollActive = true;
        }
      } else {
        this.scrollActive = false;
      }
    });
  }

  private attachSwipeScroll(event: Event): void {
    let differenceY = 0;
    try {
      differenceY = this.prevMoveYScroll - (event as TouchEvent).touches[0].pageY;
      this.prevMoveYScroll = (event as TouchEvent).touches[0].pageY;
    } catch (err) {
      differenceY = this.prevMoveYScroll - (event as MouseEvent).pageY;
      this.prevMoveYScroll = (event as MouseEvent).pageY;
    }


    if (!this.foundDraggableElement && !this.activeMove) {
      if (this.parent.clientHeight < this.parent.scrollHeight) {
        const currentScroll = this.parent.scrollTop + this.parent.clientHeight + differenceY;

        if (currentScroll > this.parent.scrollHeight) {
          this.parent.scrollTop = this.parent.scrollHeight;
        } else if (currentScroll > this.parent.clientHeight) {
          this.parent.scrollTop += differenceY;
        } else {
          this.parent.scrollTop = 0;
        }
      }
    }
  }

  private eventsOnMove(e: Event): void {
    clearTimeout(this.triggerForEvents);

    this.attachSwipeScroll(e);

    if (this.activeMove && this.foundDraggableElement) {
      clearTimeout(this.dropTimeout);
      this.moveCenterOfElementToCursor(e);
      this.toggleDefaultStylesForDraggedElement(false);

      if (!this.animationActive && !this.scrollActive) {
        this.dropTimeout = setTimeout(() => {
          this.findElementUnderDraggedClone(e);
          this.replaceElements();

        }, 100);
      }
    }
  }

  private eventsOnEnd(): void {
    clearTimeout(this.triggerForEvents);

    clearTimeout(this.dropTimeout);
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe();
    }

    if (this.draggedClone) {
      this.parent.parentNode.removeChild(this.draggedClone);
      this.draggedClone = undefined;
    }

    if (this.activeMove) {

      if (this.animationActive) {
        this.animationSubscription = this.animationSubject$.subscribe(() => {
          this.sendResult();
          this.animationSubscription.unsubscribe();
        });
      } else {
        this.sendResult();
      }

    }
  }

  private resetItemsAnimation(): void {
    this.foundDraggableElement = false;

    if (this.draggedElement) {
      this.draggedElement.classList.remove(this.draggedClass);
      this.draggedElement.style.top = '0';
      this.draggedElement.style.left = '0';
    }

    for (const el of this.getParentChildren()) {
      el.classList.remove(this.draggedClass);
      el.style.top = '0';
      el.style.left = '0';
    }
  }

  private getDraggedClone(event: Event): void {
    const target: HTMLElement = this.getParentTarget(event.target);
    this.foundDraggableElement = this.getFocusElement(target, this.options.childClass);

    if (this.foundDraggableElement) {
      this.draggedElement = target;
      this.draggedClone = this.draggedElement.cloneNode(true);
      this.draggedClone.id = 'drag_and_drop_clone';

      this.draggedElement.classList.add('draggedElement');

      this.toggleDefaultStylesForDraggedElement(true);
      this.parent.parentNode.appendChild(this.draggedClone);
      this.moveToInitialElement();
      this.moveCenterOfElementToCursor(event);
    } else {
      this.foundDraggableElement = false;
    }
  }

  private findElementUnderDraggedClone(e: Event): void {
    let target: HTMLElement;

    if ((e as TouchEvent).changedTouches) {
      const myLocation: Touch = (e as TouchEvent).changedTouches[0];

      target = this.DOCUMENT.elementFromPoint(myLocation.clientX, myLocation.clientY) as HTMLElement;
      target = this.getParentTarget(target);
    } else {
      target = this.getParentTarget(e.target);
    }


    if (this.getFocusElement(target, this.options.childClass)) {
      this.targetElement = target;
      this.targetElement.classList.add(this.targetElementClass);
    } else {
      this.targetElement = undefined;
    }

    this.getParentChildren().filter((el: HTMLElement) => el !== this.draggedElement).map((el: HTMLElement) => el.classList.remove(this.targetElementClass));
  }

  private replaceElements(): void {
    if ((typeof this.draggedElement !== 'undefined' && typeof this.targetElement !== 'undefined') && !this.draggedElement.isEqualNode(this.targetElement)) {

      this.initialIndex = this.currentElements.indexOf(this.draggedElement);
      this.fetchedIndex = this.currentElements.indexOf(this.targetElement);

      this.animationActive = true;

      this.animate();

      setTimeout(() => {
        this.animationActive = false;

        const movedEl = this.currentElements.splice(this.initialIndex, 1).pop();
        this.currentElements.splice(this.fetchedIndex, 0, movedEl);


        this.animationSubject$.next();

      }, this.dragAndDropTransition);


    }
  }

  private animate(): void {
    this.draggedElement.classList.add(this.draggedClass);

    const offsetDiffTop = this.draggedElement.offsetTop - this.targetElement.offsetTop;
    const offsetDiffLeft = this.draggedElement.offsetLeft - this.targetElement.offsetLeft;
    let currentElement = this.targetElement;


    let index = this.fetchedIndex;

    while (currentElement !== this.draggedElement) {
      let nextElement;
      if (offsetDiffTop > 0 || (offsetDiffTop === 0 && offsetDiffLeft > 0)) {
        index++;
      } else {
        index--;
      }

      nextElement = this.currentElements[index];
      if (!nextElement) {
        break;
      }
      currentElement.classList.add(this.draggedClass);

      const elPosition = DragAndDropService.getPosition(currentElement);

      currentElement.style.top = (nextElement.offsetTop - currentElement.offsetTop + elPosition.top) + 'px';
      currentElement.style.left = (nextElement.offsetLeft - currentElement.offsetLeft + elPosition.left) + 'px';

      currentElement = nextElement;

    }

    const dragPosition = DragAndDropService.getPosition(this.draggedElement);
    this.draggedElement.style.top = (-offsetDiffTop + dragPosition.top) + 'px';
    this.draggedElement.style.left = (-offsetDiffLeft + dragPosition.left) + 'px';
  }

  private setDefaultState(): void {
    this.activeMove = false;
    this.toggleDefaultStylesForBody(false);


    if (this.draggedElement) {
      this.draggedElement.classList.remove('draggedElement');
    }


    this.removeAllTargetClasses();
  }

  private removeAllTargetClasses(): void {
    this.getParentChildren().forEach((el: HTMLElement) => {
      el.classList.remove('drag_and_drop_target');
    });
  }

  private moveToInitialElement(): void {
    if (this.draggedClone) {
      this.draggedClone.style.left = `${this.draggedElement.offsetLeft}px`;
      this.draggedClone.style.top = `${this.draggedElement.offsetTop}px`;
    }
  }

  private moveCenterOfElementToCursor(e: any): void {
    if (this.draggedClone) {
      const parentBox = this.parent.getBoundingClientRect();
      const target: any = e.changedTouches ? e.targetTouches[0] : e;
      const cloneStyle: CSSStyleDeclaration = this.draggedClone.style;

      cloneStyle.left = `${target.clientX - parentBox.left - this.draggedClone.offsetWidth / 2}px`;
      cloneStyle.top = `${target.clientY - parentBox.top - this.draggedClone.offsetHeight / 2}px`;
    }
  }


  private toggleDefaultStylesForDraggedElement(isActive: boolean): void {
    if (this.draggedClone) {
      const cloneStyle: CSSStyleDeclaration = this.draggedClone.style;

      cloneStyle.width = `${this.draggedElement.offsetWidth}px`;
      cloneStyle.height = `${this.draggedElement.offsetHeight}px`;
      cloneStyle.transition = isActive ? '.1s' : '';
    }
  }

  private toggleDefaultStylesForBody(setActive: boolean): void {
    const parentClass: DOMTokenList = this.parent.classList;
    const bodyStyle: CSSStyleDeclaration = this.DOCUMENT.body.style;

    if (setActive) {
      bodyStyle.userSelect = 'none';
      parentClass.add('active');
    } else {
      parentClass.remove('active');
      bodyStyle.userSelect = '';
    }
  }

  private getFocusElement(target: HTMLElement, classOfElement: string): boolean {
    return (classOfElement && this.getParentChildren().length > 1) ? target.classList.contains(classOfElement) : this.getParentChildren().some((el: HTMLElement) => el === target);
  }

  private sendResult(): void {
    this.detachDragScroll();
    this.resetItemsAnimation();
    this.setDefaultState();

    if (this.initialIndex !== undefined && this.fetchedIndex !== undefined) {
      this.exchangeRes$.next({
        initialIndex: this.startDragIndex,
        fetchedIndex: this.fetchedIndex
      });
    }

    this.clearIndexes();
  }

  private clearIndexes() {
    this.initialIndex = undefined;
    this.fetchedIndex = undefined;
  }

  private getParentChildren(): Array<HTMLElement> {
    return Array.from(this.parent.children as HTMLElement[]).filter((el: HTMLElement) => {
      return !el.hasAttribute('drag-disabled');
    });
  }

  private getParentTarget(target: HTMLElement | any): HTMLElement {
    if (typeof target !== 'undefined' && target !== this.parent && target.parentElement !== this.parent) {
      while (target && target.parentElement !== this.parent) {
        target = target.parentElement;
      }
    }

    return target;
  }
}
