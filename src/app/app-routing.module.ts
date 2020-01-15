import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductListComponent } from './product-list/product-list.component';
import { CustomerListComponent } from './customer-list/customer-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/',
    pathMatch: 'full'
  },
  {
    path: 'products',
    component: ProductListComponent,
  },
  {
    path: 'customers',
    component: CustomerListComponent,
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
