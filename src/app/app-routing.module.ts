import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductComponent } from './product/product.component';
import { CustomerComponent } from './customer/customer.component';
import { OutboundDocumentComponent } from './outbound-document/outbound-document.component';
import { OutboundLoadComponent } from './outbound-load/outbound-load.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/',
    pathMatch: 'full'
  },
  {
    path: 'products',
    component: ProductComponent,
  },
  {
    path: 'customers',
    component: CustomerComponent,
  },
  {
    path: 'outbound-documents',
    component: OutboundDocumentComponent,
  },
  {
    path: 'outbound-loads',
    component: OutboundLoadComponent,
  },
  {
    path: '**',
    redirectTo: '/',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(
    routes, {
    enableTracing: false,
    relativeLinkResolution: 'corrected'
  }
  )],
  exports: [RouterModule]
})
export class AppRoutingModule { }
