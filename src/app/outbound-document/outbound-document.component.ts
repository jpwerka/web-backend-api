/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { IModalAction, ModalComponent } from '../components/modal/modal.component';
import { ICustomer } from '../entities/customer/customer.interface';
import { IOutboundDocument, IOutboundDocumentItems } from '../entities/outbound-document/outbound-document.interface';
import { IProduct } from '../entities/product/product.interface';
import { CustomerService } from '../services/customer/customer-service';
import { OutboundDocumentService } from '../services/outbound-document/outbound-document.service';
import { ProductService } from '../services/product/product-service';

function nonZero(control: AbstractControl): { [key: string]: unknown; } {
  if (Number(control.value) <= 0) {
    return { nonZero: true };
  } else {
    return null;
  }
}

@Component({
  selector: 'app-outbound-document',
  templateUrl: './outbound-document.component.html',
  styleUrls: ['./outbound-document.component.css'],
  providers: [
    OutboundDocumentService,
    CustomerService,
    ProductService,
  ]
})
export class OutboundDocumentComponent implements OnInit {

  outboundDocumentId: number;
  outboundDocuments: IOutboundDocument[];
  customers: ICustomer[];
  products: IProduct[];

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

  outboundDocumentForm: UntypedFormGroup;

  get id(): AbstractControl { return this.outboundDocumentForm.get('id'); }

  get identifier(): AbstractControl { return this.outboundDocumentForm.get('identifier'); }

  get customerId(): AbstractControl { return this.outboundDocumentForm.get('customerId'); }

  constructor(
    private fb: UntypedFormBuilder,
    private outboundDocumentService: OutboundDocumentService,
    private customerService: CustomerService,
    private productService: ProductService,
  ) {
  }

  ngOnInit() {
    this.outboundDocumentForm = new UntypedFormGroup({
      id: new UntypedFormControl(''),
      identifier: new UntypedFormControl('', [Validators.required]),
      customerId: new UntypedFormControl('', [Validators.required]),
      items: this.fb.array([])
    });

    this.outboundDocumentService.getAll().subscribe(outboundDocuments => this.outboundDocuments = outboundDocuments);
    this.customerService.getAll({ active: 'true' }).subscribe(customers => this.customers = customers);
    this.productService.getAll({ active: 'true' }).subscribe(products => this.products = products);
  }

  get items(): UntypedFormArray {
    return this.outboundDocumentForm.get('items') as UntypedFormArray;
  }

  productId(index: number): AbstractControl {
    return this.items.at(index).get('productId');
  }

  quantity(index: number): AbstractControl {
    return this.items.at(index).get('quantity');
  }

  newItem(item: IOutboundDocumentItems): UntypedFormGroup {
    return this.fb.group({
      productId: [item.productId, Validators.required],
      quantity: [item.quantity, Validators.compose([Validators.required, nonZero])],
    });
  }

  addItem(event: Event): void {
    event.preventDefault();
    this.items.push(this.newItem({ productId: null, quantity: null }));
  }

  removeItem(event: Event, index: number): void {
    event.preventDefault();
    this.items.removeAt(index);
  }

  add(event: Event): void {
    event.preventDefault();
    this.outboundDocumentService.getIdentifier().subscribe(result => {
      this.items.clear();
      this.outboundDocumentForm.reset();
      this.identifier.setValue(result.identifier);
      this.modalTitle = 'Add outbound document';
      this.modalForm.open();
    });
  }

  alert(): void {
    window.alert('This document is loaded. To modify remove it from load.');
  }

  edit(event: Event, outboundDocument: IOutboundDocument): void {
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

  delete(event: Event, outboundDocument: IOutboundDocument): void {
    event.preventDefault();
    this.outboundDocumentId = outboundDocument.id;
    this.modalQuestion.open();
  }

  confirmForm(): void {
    this.customerId.markAsDirty({ onlySelf: true });
    if (this.items.controls.length > 0) {
      this.items.controls.forEach((form: UntypedFormGroup) => {
        form.get('productId').markAsDirty({ onlySelf: true });
        form.get('quantity').markAsDirty({ onlySelf: true });
      });
    } else {
      this.items.setErrors({ required: true });
      this.items.markAsTouched();
    }
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

  deleteOutboundDocument(): void {
    this.outboundDocumentService.delete(this.outboundDocumentId).subscribe(() => {
      const index = this.outboundDocuments.findIndex(item => item.id === this.outboundDocumentId);
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
