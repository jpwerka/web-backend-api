import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IProduct } from '../../entities/product/product.interface';

@Injectable()
export class ProductService {

  private url = 'http://localhost:8080/api/products';

  constructor(private http: HttpClient) {}

  getAll(params?: HttpParams | { [param: string]: string | string[]; }): Observable<IProduct[]> {
    return this.http.get<IProduct[]>(this.url, { params });
  }

  getById(id: number): Observable<IProduct> {
    return this.http.get<IProduct>(`${this.url}/${id}`);
  }

  create(product: IProduct): Observable<IProduct> {
    return this.http.post<IProduct>(this.url, product);
  }

  update(product: IProduct): Observable<IProduct> {
    return this.http.put<IProduct>(`${this.url}/${product.id}`, product);
  }

  delete(product: IProduct): Observable<IProduct> {
    return this.http.delete<IProduct>(`${this.url}/${product.id}`);
  }

  active(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/active`, {});
  }

  inactive(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/inactive`, {});
  }
}
