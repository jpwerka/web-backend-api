import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IProduct } from '../../entities/product/product.interface';

@Injectable()
export class ProductGetAllService {

  private url = 'http://localhost:8080/api/products';

  constructor(private http: HttpClient) {}

  getAll(): Observable<IProduct[]> {
    return this.http.get<IProduct[]>(this.url);
  }
}
