import { Component, OnInit, Input } from '@angular/core';

export interface IModalAction {
  label: string;
  action: () => void;
}

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html'
})
export class ModalComponent implements OnInit {
  // Controla se a modal fica oculto ou visível, por padrão é oculto
  isHidden = true;

  @Input() customClass = '';
  @Input() hideClose = false;
  @Input() clickOut = true;
  @Input() title = '';
  @Input() primaryAction: IModalAction;
  @Input() secondaryAction: IModalAction;

  ngOnInit() {
    this.validPrimaryAction();
  }

  /** Função para fechar a modal. */
  close(): void {
    this.isHidden = true;
  }

  /** Função para abrir a modal. */
  open(): void {
    this.isHidden = false;
  }

  validPrimaryAction(): void {
    if (!this.primaryAction) {
      this.primaryAction = {
        action: () => this.close(),
        label: 'Ok',
      };
    }

    if (!this.primaryAction['action']) {
      this.primaryAction['action'] = () => this.close();
    }
    if (!this.primaryAction['label']) {
      this.primaryAction['label'] = 'Ok';
    }
  }

  onClickOut(): void {
    if (this.clickOut) {
      this.close();
    }
  }

  primaryActionClick(): void {
    this.primaryAction.action.call(this);
  }

  secondaryActionClick(): void {
    this.secondaryAction.action.call(this);
  }

}
