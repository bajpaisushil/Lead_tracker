'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { ApiError } from '@/lib/api-client';
import { useCreateLead } from '../hooks/use-leads';
import {
  EMPTY_LEAD_FORM,
  type LeadFormErrors,
  type LeadFormValues,
  validateLeadForm,
} from '../validation';

interface CreateLeadDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateLeadDialog({ open, onClose }: CreateLeadDialogProps) {
  const [values, setValues] = useState<LeadFormValues>(EMPTY_LEAD_FORM);
  const [errors, setErrors] = useState<LeadFormErrors>({});

  function close() {
    setValues(EMPTY_LEAD_FORM);
    setErrors({});
    onClose();
  }

  const mutation = useCreateLead(close);

  function update(field: keyof LeadFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validateLeadForm(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    mutation.mutate(
      {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        status: 'NEW',
      },
      {
        onError: (error: unknown) => {
          if (error instanceof ApiError && error.code === 'DUPLICATE_EMAIL') {
            setErrors({ email: 'A lead with this email already exists' });
            return;
          }

          // Field-level messages from the API win over the generic toast.
          if (error instanceof ApiError) {
            const issues = error.fieldIssues;
            if (issues.length > 0) {
              setErrors(
                issues.reduce<LeadFormErrors>(
                  (accumulator, issue) => ({
                    ...accumulator,
                    [issue.field as keyof LeadFormValues]: issue.message,
                  }),
                  {},
                ),
              );
            }
          }
        },
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a lead"
      description="New leads enter the pipeline as New."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          label="Full name"
          name="name"
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          error={errors.name}
          placeholder="Ananya Rao"
          autoComplete="name"
        />

        <Field
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={(event) => update('email', event.target.value)}
          error={errors.email}
          placeholder="ananya@northwind.co"
          autoComplete="email"
        />

        <Field
          label="Phone"
          name="phone"
          type="tel"
          value={values.phone}
          onChange={(event) => update('phone', event.target.value)}
          error={errors.phone}
          placeholder="+91 98200 11223"
          autoComplete="tel"
          hint="Digits, spaces and + - ( ) only"
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={close} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Add lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}
