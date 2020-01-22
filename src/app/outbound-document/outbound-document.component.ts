import { Component, ViewChild, OnInit } from '@angular/core';
import { IOutboundDocument, IOutboundDocumentItems } from '../entities/outbound-document/outbound-document.interface';
import { OutboundDocumentService } from '../services/outbound-document/outbound-document.service';
import { ModalComponent, IModalAction } from '../modal/modal.component';
import { FormGroup, FormControl, Validators, FormBuilder, FormArray, AbstractControl } from '@angular/forms';
import { CustomerService } from '../services/customer/customer-service';
import { ICustomer } from '../entities/customer/customer.interface';
import { ProductService } from '../services/product/product-service';
import { IProduct } from '../entities/product/product.interface';

function nonZero(control: AbstractControl): { [key: string]: any; } {
  if (Number(control.value) <= 0) {
    return {nonZero: true};
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

  outboundDocumentForm: FormGroup;

  get id() { return this.outboundDocumentForm.get('id'); }

  get identifier() { return this.outboundDocumentForm.get('identifier'); }

  get customerId() { return this.outboundDocumentForm.get('customerId'); }

  constructor(
    private fb: FormBuilder,
    private outboundDocumentService: OutboundDocumentService,
    private customerService: CustomerService,
    private productService: ProductService,
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
    this.customerService.getAll({active: 'true'}).subscribe(customers => this.customers = customers);
    this.productService.getAll({active: 'true'}).subscribe(products => this.products = products);
  }

  get items(): FormArray {
    return this.outboundDocumentForm.get('items') as FormArray;
  }

  productId(index: number) {
    return this.items.at(index).get('productId');
  }

  quantity(index: number) {
    return this.items.at(index).get('quantity');
  }

  newItem(item: IOutboundDocumentItems): FormGroup {
    return this.fb.group({
      productId: [item.productId, Validators.required],
      quantity: [item.quantity, Validators.compose([ Validators.required, nonZero ])],
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
    this.outboundDocumentService.getIdentifier().subscribe(result => {
      this.items.clear();
      this.outboundDocumentForm.reset();
      this.identifier.setValue(result.identifier);
      this.modalTitle = 'Add outbound document';
      this.modalForm.open();
    });
  }

  alert() {
    window.alert('This document is loaded. To modify remove it from load.');
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
    this.outboundDocumentId = outboundDocument.id;
    this.modalQuestion.open();
  }

  confirmForm() {
    this.customerId.markAsDirty({ onlySelf: true });
    if (this.items.controls.length > 0) {
      this.items.controls.forEach((form: FormGroup) => {
        form.get('productId').markAsDirty({ onlySelf: true });
        form.get('quantity').markAsDirty({ onlySelf: true });
       });
    } else {
      this.items.setErrors({required: true});
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

  deleteOutboundDocument() {
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
