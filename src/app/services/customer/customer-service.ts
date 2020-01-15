import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ICustomer } from '../../entities/customer/customer.interface';

@Injectable()
export class CustomerService {

  private url = 'http://localhost:8080/api/customers';

  constructor(private http: HttpClient) {}

  getAll(params?: HttpParams | { [param: string]: string | string[]; }): Observable<ICustomer[]> {
    return this.http.get<ICustomer[]>(this.url, { params });
  }

  getById(id: number): Observable<ICustomer> {
    return this.http.get<ICustomer>(`${this.url}/${id}`);
  }

  create(customer: ICustomer): Observable<ICustomer> {
    return this.http.post<ICustomer>(this.url, customer);
  }

  update(customer: ICustomer): Observable<ICustomer> {
    return this.http.put<ICustomer>(`${this.url}/${customer.id}`, customer);
  }

  active(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/active`, {});
  }

  inactive(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/inactive`, {});
  }

  delete(customer: ICustomer): Observable<ICustomer> {
    return this.http.delete<ICustomer>(`${this.url}/${customer.id}`);
  }

}
