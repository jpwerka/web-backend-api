import { Component, ViewChild, OnInit } from '@angular/core';
import { IOutboundDocument, IOutboundDocumentItems } from '../entities/outbound-document/outbound-document.interface';
import { OutboundDocumentService } from '../services/outbound-document/outbound-document.service';
import { ModalComponent, IModalAction } from '../modal/modal.component';
import { FormGroup, FormControl, Validators, FormBuilder, FormArray } from '@angular/forms';
import { nullSafeIsEquivalent } from '@angular/compiler/src/output/output_ast';

@Component({
  selector: 'app-outbound-document',
  templateUrl: './outbound-document.component.html',
  styleUrls: ['./outbound-document.component.css'],
  providers: [OutboundDocumentService]
})
export class OutboundDocumentComponent implements OnInit {

  outboundDocuments: IOutboundDocument[];

  modalTitle = '';
  confirmAction: IModalAction = {
    label: 'Confirm',
    action: () => this.confirmForm()
  };
  cancelFormAction: IModalAction = {
    label: 'Cancel',
    action: () => this.modalForm.close()
  };
  deleteAction: IModalAction = {
    label: 'Delete',
    action: () => this.deleteOutboundDocument()
  };
  cancelQuestionAction: IModalAction = {
    label: 'Cancel',
    action: () => this.modalQuestion.close()
  };

  @ViewChild('modalForm', { static: true }) modalForm: ModalComponent;
  @ViewChild('modalQuestion', { static: true }) modalQuestion: ModalComponent;

  outboundDocumentForm: FormGroup;

  get id() { return this.outboundDocumentForm.get('id'); }

  get identifier() { return this.outboundDocumentForm.get('identifier'); }

  constructor(
    private fb: FormBuilder,
    private outboundDocumentService: OutboundDocumentService
  ) {
  }

  ngOnInit() {
    this.outboundDocumentForm = new FormGroup({
      id: new FormControl(''),
      identifier: new FormControl('', [Validators.required]),
      customerId: new FormControl('', [Validators.required]),
      items: this.fb.array([])
    });

    this.outboundDocumentService.getAll().subscribe(outboundDocuments => this.outboundDocuments = outboundDocuments);
  }

  get items(): FormArray {
    return this.outboundDocumentForm.get('items') as FormArray;
  }

  newItem(item: IOutboundDocumentItems): FormGroup {
    return this.fb.group({
      productId: [item.productId, Validators.required],
      quantity: [item.quantity, Validators.required]
    });
  }

  addItem(event: Event) {
    event.preventDefault();
    this.items.push(this.newItem({productId: null, quantity: null}));
  }

  removeItem(event: Event, index: number) {
    event.preventDefault();
    this.items.removeAt(index);
  }

  add(event: Event) {
    event.preventDefault();
    this.outboundDocumentForm.reset();

    this.modalTitle = 'Add outbound document';
    this.modalForm.open();
  }

  edit(event: Event, outboundDocument: IOutboundDocument) {
    event.preventDefault();
    this.items.clear();
    outboundDocument.items.forEach(item => {
      this.items.push(this.newItem(item));
    });
    this.outboundDocumentForm.setValue({
      id: outboundDocument.id,
      identifier: outboundDocument.identifier,
      customerId: outboundDocument.customerId,
      items: outboundDocument.items
    });
    this.modalTitle = 'Edit outbound document';
    this.modalForm.open();
  }

  delete(event: Event, outboundDocument: IOutboundDocument) {
    event.preventDefault();
    this.outboundDocumentForm.setValue(outboundDocument);
    this.modalQuestion.open();
  }

  confirmForm() {
    // this.identifier.markAsDirty({ onlySelf: true });
    if (this.outboundDocumentForm.valid) {
      if (!this.id.value) {
        this.outboundDocumentService.create(this.outboundDocumentForm.value).subscribe(outboundDocument => {
          this.outboundDocuments.push(outboundDocument);
          this.modalForm.close();
        });
      } else {
        this.outboundDocumentService.update(this.outboundDocumentForm.value).subscribe(outboundDocument => {
          const index = this.outboundDocuments.findIndex(item => item.id === outboundDocument.id);
          if (index >= 0) {
            this.outboundDocuments[index] = outboundDocument;
          }
          this.modalForm.close();
        });
      }
    }
  }

  deleteOutboundDocument() {
    this.outboundDocumentService.delete(this.outboundDocumentForm.value).subscribe(() => {
      const index = this.outboundDocuments.findIndex(item => item.id === this.id.value);
      if (index >= 0) {
        this.outboundDocuments.splice(index, 1);
      }
      this.modalQuestion.close();
    });
  }
}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at http://angular.io/license
*/
