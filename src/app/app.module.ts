import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { ProductListComponent } from './product-list/product-list.component';
import { AppWebBackendApiModule } from './backend/app-web-backend-api.module';
import { AppRoutingModule } from './app-routing.module';
import { CustomerListComponent } from './customer-list/customer-list.component';
import { ModalComponent } from './modal/modal.component';


@NgModule({
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    AppRoutingModule,
    AppWebBackendApiModule.forRoot(),
  ],
  declarations: [
    AppComponent,
    ModalComponent,
    ProductListComponent,
    CustomerListComponent
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at http://angular.io/license
*/
