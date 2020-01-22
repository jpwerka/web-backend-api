import { Component, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { IOutboundLoad } from '../entities/outbound-load/outbound-load.interface';
import { IModalAction, ModalComponent } from '../modal/modal.component';
import { OutboundLoadService } from '../services/outbound-load/outbound-load.service';
import { IOutboundDocument } from '../entities/outbound-document/outbound-document.interface';
import { from, of } from 'rxjs';
import { mergeMap, concatMap } from 'rxjs/operators';

@Component({
  selector: 'app-outbound-load',
  templateUrl: './outbound-load.component.html',
  styleUrls: ['./outbound-load.component.css'],
  providers: [OutboundLoadService]
})
export class OutboundLoadComponent implements OnInit {

  outboundLoad: IOutboundLoad;
  outboundLoads: IOutboundLoad[];
  outboundUnloadedDocuments: IOutboundDocument[];
  addDocSource: string;

  modalTitle = '';
  confirmFormAction: IModalAction = {
    label: 'Confirm',
    action: () => this.confirmForm()
  };
  cancelFormAction: IModalAction = {
    label: 'Cancel',
    action: () => this.modalForm.close()
  };
  deleteAction: IModalAction = {
    label: 'Delete',
    action: () => this.deleteOutboundLoad()
  };
  cancelQuestionAction: IModalAction = {
    label: 'Cancel',
    action: () => this.modalQuestion.close()
  };
  confirmDocsAction: IModalAction = {
    label: 'Confirm',
    action: () => this.confirmDocs()
  };
  cancelDocsAction: IModalAction = {
    label: 'Cancel',
    action: () => this.modalDocs.close()
  };

  @ViewChild('modalForm', { static: true }) modalForm: ModalComponent;
  @ViewChild('modalQuestion', { static: true }) modalQuestion: ModalComponent;
  @ViewChild('modalDocs', { static: true }) modalDocs: ModalComponent;

  outboundLoadForm: FormGroup;

  get id() { return this.outboundLoadForm.get('id'); }

  get identifier() { return this.outboundLoadForm.get('identifier'); }

  constructor(
    private fb: FormBuilder,
    private outboundLoadService: OutboundLoadService,
  ) {
  }

  ngOnInit() {
    this.outboundLoadForm = new FormGroup({
      id: new FormControl(''),
      identifier: new FormControl('', [Validators.required]),
      documents: this.fb.array([])
    });

    this.outboundLoadService.getAll().subscribe(outboundLoads => this.outboundLoads = outboundLoads);
  }

  get documents(): FormArray {
    return this.outboundLoadForm.get('documents') as FormArray;
  }

  document(index: number) {
    return this.documents.at(index).get('document');
  }

  newDocument(document: IOutboundDocument): FormGroup {
    return this.fb.group({
      document: [document, Validators.required],
    });
  }

  removeDocument(index: number) {
    this.documents.removeAt(index);
  }

  showDocuments(outboundLoad: IOutboundLoad) {
    if (outboundLoad.documents) {
      outboundLoad['showDocuments'] = true;
    } else {
      this.outboundLoadService.getDocuments(outboundLoad.id).subscribe(documents => {
        outboundLoad['documents'] = documents;
        outboundLoad['showDocuments'] = true;
      });
    }
  }

  hideDocuments(outboundLoad: IOutboundLoad) {
    outboundLoad['showDocuments'] = false;
  }

  add() {
    this.outboundLoadService.getIdentifier().subscribe(result => {
      this.documents.clear();
      this.outboundLoadForm.reset();
      this.identifier.setValue(result.identifier);
      this.modalTitle = 'Add outbound load';
      this.modalForm.open();
    });
  }

  delete(outboundLoad: IOutboundLoad) {
    this.outboundLoad = outboundLoad;
    this.modalQuestion.open();
  }

  confirmForm() {
    if (this.documents.controls.length > 0) {
      this.documents.controls.forEach((form: FormGroup) => {
        form.get('document').markAsDirty({ onlySelf: true });
       });
    } else {
      this.documents.setErrors({required: true});
      this.documents.markAsTouched();
    }
    if (this.outboundLoadForm.valid) {
      const postLoad: IOutboundLoad = {
        identifier: this.identifier.value,
        documentsId: this.documents.controls.map(ct => ct.value.document.id)
      };
      this.outboundLoadService.create(postLoad).subscribe(outboundLoad => {
        outboundLoad['documents'] = this.documents.controls.map(ct => ct.value.document);
        this.outboundLoads.push(outboundLoad);
        this.modalForm.close();
      });
    }
  }

  deleteOutboundLoad() {
    this.outboundLoadService.delete(this.outboundLoad.id).subscribe(() => {
      const index = this.outboundLoads.findIndex(item => item.id === this.outboundLoad.id);
      if (index >= 0) {
        this.outboundLoads.splice(index, 1);
      }
      this.modalQuestion.close();
    });
  }


  addDocument(source: string, outboundLoad?: IOutboundLoad) {
    this.addDocSource = source;
    this.outboundLoad = outboundLoad;
    this.outboundLoadService.getUnloadedDocuments().subscribe(docs => {
      this.outboundUnloadedDocuments = docs;
      this.modalDocs.open();
    });
  }

  deleteDocument(outboundLoad: IOutboundLoad, document: IOutboundDocument) {
    this.outboundLoad = outboundLoad;
    if (this.outboundLoad.documents.length === 1) {
      window.alert('Outbound load contais only one document, delete the load.');
    } else {
      this.outboundLoadService.removeDocument(this.outboundLoad.id, document.id).subscribe(() => {
        const index = this.outboundLoad.documents.findIndex(item => item.id ===  document.id);
        if (index >= 0) {
          this.outboundLoad.documents.splice(index, 1);
        }
      });
    }
  }

  confirmDocs() {
    const docsSelected = this.outboundUnloadedDocuments.filter(doc => doc['selected']);
    if (docsSelected.length > 0) {
      if (this.addDocSource === 'form') {
        this.documents.clear();
        docsSelected.forEach(doc => this.documents.push(this.newDocument(doc)));
        this.modalDocs.close();
      } else {
        from(docsSelected).pipe(
          concatMap(doc => this.outboundLoadService.addDocument(this.outboundLoad.id, doc.id).pipe(
            concatMap((res) => of(doc))
          ))
        ).subscribe(
          (doc) => this.outboundLoad.documents.push(doc),
          (error) => console.error(error),
          () => this.modalDocs.close()
        );
      }
    } else {
      window.alert('Select least one document.');
    }
  }
}
