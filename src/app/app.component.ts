import { Component, OnInit } from '@angular/core';
import { ProductGetAllService } from './services/product/product-get-all.service';
import { OutboundDocumentService } from './services/outbound-document/outbound-document.service';
import { IOutboundDocument } from './entities/outbound-documents/outbound-document.interface';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ],
  providers: [
    ProductGetAllService,
    OutboundDocumentService
  ]
})
export class AppComponent implements OnInit  {

  constructor(
    private productGetAll: ProductGetAllService,
    private outboundDocument: OutboundDocumentService
  ) {
    this.productGetAll.getAll().subscribe(products => console.log(products));
  }

  ngOnInit(): void {
    this.outboundDocument.getIdentifier().subscribe(res1 => {
      console.log(res1);
      const document: IOutboundDocument = {
        identifier: res1.identifier,
        customerId: 2,
        items: [{ productId: 1, quantity: 2 }]
      };
      this.outboundDocument.create(document).subscribe(res2 => {
        console.log(res2);
        this.outboundDocument.getById(res2.id).subscribe(res3 => {
          console.log(res3);
          document.customerId = 3;
          this.outboundDocument.update(document).subscribe(res4 => {
            console.log(res4);
            document.items.push({ productId: 3, quantity: 9 });
            this.outboundDocument.updateWithPost(document).subscribe(res5 => {
              console.log(res5);
              document.items.push({ productId: 4, quantity: 6 });
              this.outboundDocument.updateWithPostUrl(document).subscribe(res6 => {
                console.log(res6);
              });
            });
          });
        });
      });
    });

    const params = {
      customerId: 3,
      createdAtStart: '2019-10-10T00:00:00'
    };
    this.outboundDocument.getAll(params).subscribe(documents => {
      console.log(documents);
    });
  }

}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at http://angular.io/license
*/
