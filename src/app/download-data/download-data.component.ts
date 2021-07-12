import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { DownloadDataService, ITypescriptInfo } from 'web-backend-api/src';

@Component({
  selector: 'app-download-data',
  templateUrl: './download-data.component.html',
  styleUrls: ['./download-data.component.css']
})
export class DownloadDataComponent implements OnInit {

  collections: string[];

  downloadForm: FormGroup;

  constructor(private downloadService: DownloadDataService) {
    this.collections = this.downloadService.listCollections();
  }

  get collectionName(): AbstractControl { return this.downloadForm.get('collectionName'); }

  get downloadType(): AbstractControl { return this.downloadForm.get('downloadType'); }

  ngOnInit() {
    this.downloadForm = new FormGroup({
      collectionName: new FormControl('', {
        validators: [Validators.required],
        updateOn: 'blur'
      }),
      downloadType: new FormControl('json5')
    });
  }

  downloadData(): void {
    this.collectionName.markAsDirty({ onlySelf: true });
    if (this.downloadForm.valid) {
      const tsInfo: ITypescriptInfo = this.downloadType.value === 'typescript' ? { hasInterface: true, convertDate: true } : undefined;
      this.downloadService.downloadData(this.collectionName.value, this.downloadType.value, tsInfo).subscribe(() => {
        console.log('Download data successful.');
      });
    }
  }

}
