import { NgModule } from '@angular/core';
import {DragComponent} from './drag/drag.component';
import {DragAndDropService} from './drag/services/drag-and-drop.service';



@NgModule({
  declarations: [DragComponent],
  imports: [
  ],
  exports: [DragComponent],
  providers: [DragAndDropService]
})
export class HallolandNg2DragAndDropModule { }
