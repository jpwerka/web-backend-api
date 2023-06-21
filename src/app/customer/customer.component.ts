/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { IModalAction, ModalComponent } from '../components/modal/modal.component';
import { ICustomer } from '../entities/customer/customer.interface';
import { CustomerService } from '../services/customer/customer-service';

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
  providers: [CustomerService]
})
export class CustomerComponent implements OnInit {

  customers: ICustomer[];

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
    action: () => this.deleteCustomer()
  };
  cancelQuestionAction: IModalAction = {
    label: 'Cancel',
    action: () => this.modalQuestion.close()
  };

  @ViewChild('modalForm', { static: true }) modalForm: ModalComponent;
  @ViewChild('modalQuestion', { static: true }) modalQuestion: ModalComponent;

  customerForm: UntypedFormGroup;

  get id(): AbstractControl { return this.customerForm.get('id'); }

  get name(): AbstractControl { return this.customerForm.get('name'); }

  constructor(private customerService: CustomerService) {
  }

  ngOnInit() {
    this.customerForm = new UntypedFormGroup({
      id: new UntypedFormControl(''),
      name: new UntypedFormControl('', {
        validators: [
          Validators.required,
          Validators.minLength(4)
        ],
        updateOn: 'blur'
      }),
      active: new UntypedFormControl(true)
    });

    this.customerService.getAll().subscribe(customers => this.customers = customers);
  }

  add(event: Event): void {
    event.preventDefault();
    this.customerForm.reset();
    this.customerForm.get('active').setValue(true, { emitModelToViewChange: false });
    this.modalTitle = 'Add customer';
    this.modalForm.open();
  }

  edit(event: Event, customer: ICustomer): void {
    event.preventDefault();
    this.customerForm.setValue(customer);
    this.modalTitle = 'Edit customer';
    this.modalForm.open();
  }

  delete(event: Event, customer: ICustomer): void {
    event.preventDefault();
    this.customerForm.setValue(customer);
    this.modalQuestion.open();
  }

  active(event: Event, customer: ICustomer): void {
    event.preventDefault();
    this.customerService.active(customer.id).subscribe(() => {
      const index = this.customers.findIndex(item => item.id === customer.id);
      if (index >= 0) {
        this.customers[index].active = true;
      }
    });
  }

  inactive(event: Event, customer: ICustomer): void {
    event.preventDefault();
    this.customerService.inactive(customer.id).subscribe(() => {
      const index = this.customers.findIndex(item => item.id === customer.id);
      if (index >= 0) {
        this.customers[index].active = false;
      }
    });
  }

  confirmForm(): void {
    this.name.markAsDirty({ onlySelf: true });
    if (this.customerForm.valid) {
      if (!this.id.value) {
        this.customerService.create(this.customerForm.value).subscribe(customer => {
          this.customers.push(customer);
          this.modalForm.close();
        });
      } else {
        this.customerService.update(this.customerForm.value).subscribe(customer => {
          const index = this.customers.findIndex(item => item.id === customer.id);
          if (index >= 0) {
            this.customers[index] = customer;
          }
          this.modalForm.close();
        });
      }
    }
  }

  deleteCustomer(): void {
    this.customerService.delete(this.customerForm.value).subscribe(() => {
      const index = this.customers.findIndex(item => item.id === this.id.value);
      if (index >= 0) {
        this.customers.splice(index, 1);
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
