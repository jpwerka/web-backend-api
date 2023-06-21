/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { IModalAction, ModalComponent } from '../components/modal/modal.component';
import { IProduct } from '../entities/product/product.interface';
import { ProductService } from '../services/product/product-service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  providers: [ProductService]
})
export class ProductComponent implements OnInit {

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
    action: () => this.deleteProduct()
  };
  cancelQuestionAction: IModalAction = {
    label: 'Cancel',
    action: () => this.modalQuestion.close()
  };

  @ViewChild('modalForm', { static: true }) modalForm: ModalComponent;
  @ViewChild('modalQuestion', { static: true }) modalQuestion: ModalComponent;

  productForm: UntypedFormGroup;

  get id(): AbstractControl { return this.productForm.get('id'); }

  get code(): AbstractControl { return this.productForm.get('code'); }

  get description(): AbstractControl { return this.productForm.get('description'); }

  get codebar(): AbstractControl { return this.productForm.get('codebar'); }

  constructor(private productService: ProductService) {
  }

  ngOnInit() {
    this.productForm = new UntypedFormGroup({
      id: new UntypedFormControl(''),
      code: new UntypedFormControl('', {
        validators: [
          Validators.required
        ],
        updateOn: 'blur'
      }),
      description: new UntypedFormControl('', {
        validators: [
          Validators.required,
          Validators.minLength(4)
        ],
        updateOn: 'blur'
      }),
      codBar: new UntypedFormControl(''),
      active: new UntypedFormControl(true)
    });

    this.productService.getAll().subscribe(products => this.products = products);
  }

  add(event: Event): void {
    event.preventDefault();
    this.productForm.reset();
    this.productForm.get('active').setValue(true, { emitModelToViewChange: false });
    this.modalTitle = 'Add product';
    this.modalForm.open();
  }

  edit(event: Event, product: IProduct): void {
    event.preventDefault();
    this.productForm.setValue(product);
    this.modalTitle = 'Edit product';
    this.modalForm.open();
  }

  delete(event: Event, product: IProduct): void {
    event.preventDefault();
    this.productForm.setValue(product);
    this.modalQuestion.open();
  }

  active(event: Event, product: IProduct): void {
    event.preventDefault();
    this.productService.active(product.id).subscribe(() => {
      const index = this.products.findIndex(item => item.id === product.id);
      if (index >= 0) {
        this.products[index].active = true;
      }
    });
  }

  inactive(event: Event, product: IProduct): void {
    event.preventDefault();
    this.productService.inactive(product.id).subscribe(() => {
      const index = this.products.findIndex(item => item.id === product.id);
      if (index >= 0) {
        this.products[index].active = false;
      }
    });
  }

  confirmForm(): void {
    this.code.markAsDirty({ onlySelf: true });
    this.description.markAsDirty({ onlySelf: true });
    if (this.productForm.valid) {
      if (!this.id.value) {
        this.productService.create(this.productForm.value).subscribe(product => {
          this.products.push(product);
          this.modalForm.close();
        });
      } else {
        this.productService.update(this.productForm.value).subscribe(product => {
          const index = this.products.findIndex(item => item.id === product.id);
          if (index >= 0) {
            this.products[index] = product;
          }
          this.modalForm.close();
        });
      }
    }
  }

  deleteProduct(): void {
    this.productService.delete(this.productForm.value).subscribe(() => {
      const index = this.products.findIndex(item => item.id === this.id.value);
      if (index >= 0) {
        this.products.splice(index, 1);
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
