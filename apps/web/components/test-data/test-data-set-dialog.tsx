'use client';

import {
  CustomerTestDataSchema,
  PaymentSandboxDataSchema,
  type CustomerTestData,
  type PaymentSandboxData,
  type TestDataSet,
} from '@dpat/shared';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Field } from '@/components/wizard/field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSaveTestDataSet } from '@/lib/data/hooks';

type Kind = TestDataSet['kind'];

const EMPTY_CUSTOMER: CustomerTestData = {
  fullName: '',
  dateOfBirth: '',
  gender: 'female',
  mobile: '',
  email: '',
  pan: '',
  pincode: '',
  city: '',
};

const EMPTY_PAYMENT: PaymentSandboxData = {
  gateway: '',
  cardNumber: '',
  cardExpiry: '',
  upiId: '',
  netbankingBank: '',
};

const CUSTOMER_FIELDS: {
  key: keyof CustomerTestData;
  label: string;
  placeholder?: string;
  type?: string;
}[] = [
  { key: 'fullName', label: 'Full name', placeholder: 'Test Proposer One' },
  { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
  { key: 'mobile', label: 'Mobile', placeholder: '9000000001' },
  { key: 'email', label: 'Email', placeholder: 'qa.customer@example.com', type: 'email' },
  { key: 'pan', label: 'PAN (dummy)', placeholder: 'ABCDE1234F' },
  { key: 'pincode', label: 'PIN code', placeholder: '400001' },
  { key: 'city', label: 'City', placeholder: 'Mumbai' },
];

const PAYMENT_FIELDS: { key: keyof PaymentSandboxData; label: string; placeholder?: string }[] = [
  { key: 'gateway', label: 'Gateway (test mode)', placeholder: 'Payment gateway sandbox' },
  { key: 'cardNumber', label: 'Sandbox card number', placeholder: '4111111111111111' },
  { key: 'cardExpiry', label: 'Card expiry', placeholder: '12/30' },
  { key: 'upiId', label: 'Sandbox UPI ID', placeholder: 'success@razorpay' },
  { key: 'netbankingBank', label: 'Netbanking bank', placeholder: 'Test Bank' },
];

/** Create or edit a reusable test data set. Validation matches the repository schema. */
export function TestDataSetDialog({
  existing,
  defaultKind = 'customer',
  trigger,
  onSaved,
}: {
  existing?: TestDataSet;
  defaultKind?: Kind;
  trigger: ReactNode;
  onSaved?: (set: TestDataSet) => void;
}) {
  const save = useSaveTestDataSet();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>(existing?.kind ?? defaultKind);
  const [name, setName] = useState(existing?.name ?? '');
  const [customer, setCustomer] = useState<CustomerTestData>(
    existing?.kind === 'customer' ? existing.fields : EMPTY_CUSTOMER,
  );
  const [payment, setPayment] = useState<PaymentSandboxData>(
    existing?.kind === 'payment_sandbox' ? existing.fields : EMPTY_PAYMENT,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed =
      kind === 'customer'
        ? CustomerTestDataSchema.safeParse(customer)
        : PaymentSandboxDataSchema.safeParse(payment);
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Name the data set.';
    if (!parsed.success)
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
    setErrors(next);
    if (Object.keys(next).length > 0 || !parsed.success) return;

    const input =
      kind === 'customer'
        ? { kind: 'customer' as const, name: name.trim(), fields: customer }
        : { kind: 'payment_sandbox' as const, name: name.trim(), fields: payment };
    save.mutate(existing ? { ...input, id: existing.id } : input, {
      onSuccess: (set) => {
        toast.success(existing ? 'Test data set updated' : 'Test data set saved');
        setOpen(false);
        onSaved?.(set);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{existing ? 'Edit test data set' : 'New test data set'}</DialogTitle>
            <DialogDescription>
              Dummy details only. Journeys refer to these values with tokens such as{' '}
              <code className="font-mono">{'{{customer.mobile}}'}</code>.
            </DialogDescription>
          </DialogHeader>
          {!existing ? (
            <Field id="tds-kind" label="Type">
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger id="tds-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Dummy customer</SelectItem>
                  <SelectItem value="payment_sandbox">Payment sandbox</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field id="tds-name" label="Name" error={errors.name}>
            <Input
              id="tds-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-describedby="tds-name-message"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {kind === 'customer' ? (
              <>
                {CUSTOMER_FIELDS.map((f) => (
                  <Field key={f.key} id={`tds-${f.key}`} label={f.label} error={errors[f.key]}>
                    <Input
                      id={`tds-${f.key}`}
                      type={f.type ?? 'text'}
                      value={customer[f.key]}
                      placeholder={f.placeholder}
                      onChange={(e) => setCustomer({ ...customer, [f.key]: e.target.value })}
                      aria-invalid={errors[f.key] ? true : undefined}
                      aria-describedby={`tds-${f.key}-message`}
                    />
                  </Field>
                ))}
                <Field id="tds-gender" label="Gender">
                  <Select
                    value={customer.gender}
                    onValueChange={(v) =>
                      setCustomer({ ...customer, gender: v as CustomerTestData['gender'] })
                    }
                  >
                    <SelectTrigger id="tds-gender" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </>
            ) : (
              PAYMENT_FIELDS.map((f) => (
                <Field key={f.key} id={`tds-${f.key}`} label={f.label} error={errors[f.key]}>
                  <Input
                    id={`tds-${f.key}`}
                    value={payment[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => setPayment({ ...payment, [f.key]: e.target.value })}
                    aria-invalid={errors[f.key] ? true : undefined}
                    aria-describedby={`tds-${f.key}-message`}
                  />
                </Field>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save test data set'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
