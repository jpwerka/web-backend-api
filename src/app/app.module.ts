import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { ProductComponent } from './product/product.component';
import { AppWebBackendApiModule } from './backend/app-web-backend-api.module';
import { AppRoutingModule } from './app-routing.module';
import { CustomerComponent } from './customer/customer.component';
import { ModalComponent } from './components/modal/modal.component';
import { OutboundDocumentComponent } from './outbound-document/outbound-document.component';
import { OutboundLoadComponent } from './outbound-load/outbound-load.component';
import { DownloadDataComponent } from './download-data/download-data.component';

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
    ProductComponent,
    CustomerComponent,
    OutboundDocumentComponent,
    OutboundLoadComponent,
    DownloadDataComponent,
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at http://angular.io/license
*/
