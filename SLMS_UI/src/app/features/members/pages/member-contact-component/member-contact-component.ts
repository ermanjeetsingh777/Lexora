import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CreateMemberContactRequest, MemberContactResponse } from '@core/models/MemberRequest';
import { LucideMail, LucidePhone, LucidePlus, LucideShieldAlert, LucideUser } from '@lucide/angular';
import { GlassCardComponent, SectionHeaderComponent } from "@shared/components/page-header/page-header.component";
import { ButtonComponent } from "@shared/components/button/button.component";

import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ContactRelation } from '@core/enums/OnbardingSteps';
import { relationOptions } from '@core/constType';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-member-contact-component',
  templateUrl: './member-contact-component.html',
  styleUrl: './member-contact-component.css',
  imports: [GlassCardComponent, SectionHeaderComponent,
    LucideUser, LucideShieldAlert, ButtonComponent, LucidePlus,
    DialogModule, ButtonModule, InputTextModule, ReactiveFormsModule,
    FormsModule, SelectModule, ToggleSwitchModule, LucideMail, LucidePhone
  ],
})
export class MemberContactComponent {
  private fb = inject(FormBuilder);
  readonly contactData = input<MemberContactResponse[]>();
  addContact = output<CreateMemberContactRequest>();

  visible: boolean = false;
  isGuardian = signal<boolean>(true);

  name: string = 'Amanda Miller';

  email: string = 'amanda@example.com';
  relationOptions = relationOptions;
  readonly ContactRelation = ContactRelation;

  readonly guardianContact = computed(() =>
    this.contactData()?.find(x => x.isGuardian) ?? null
  );

  readonly emergencyContact = computed(() =>
    this.contactData()?.find(x => x.isEmergencyContact) ?? null
  );

  readonly primaryContact = computed(() =>
    this.contactData()?.find(x => x.isPrimary) ?? null
  );

  readonly contactForm = this.fb.nonNullable.group({
    id: [''],
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    relation: [null as ContactRelation | null, Validators.required],
  });

  save(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const value = this.contactForm.getRawValue();

    const request: CreateMemberContactRequest = {
      fullName: value.fullName,
      phoneNumber: value.phoneNumber,
      email: value.email,
      relation: value.relation,
      isGuardian: this.isGuardian(),
      isEmergencyContact: !this.isGuardian(),
      isPrimary: true,
      isActive: true,
    };

    console.log(request)

    this.addContact.emit(request);
  }

  openDialog(isGuardian: boolean) {
    this.visible = true;
    this.isGuardian.set(isGuardian);
  }

  closeDialog(): void {
    this.contactForm.reset({
      id: '',
      fullName: '',
      phoneNumber: '',
      email: '',
      relation: null,
    });

    this.contactForm.markAsPristine();
    this.contactForm.markAsUntouched();

    this.visible = false;
    this.isGuardian.set(true);
  }

  get f() {
    return this.contactForm.controls;
  }

}
