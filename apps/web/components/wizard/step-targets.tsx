'use client';

import {
  CONFIG_TYPE_LABELS,
  ConfigTypeSchema,
  REPOSITORY_PROVIDER_LABELS,
  RepositoryProviderSchema,
  type ConfigType,
  type RepositoryProvider,
} from '@dpat/shared';
import {
  Code2,
  Globe,
  KeyRound,
  Plus,
  Server,
  Smartphone,
  TabletSmartphone,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { TestDataSetDialog } from '@/components/test-data/test-data-set-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StoredUploadRow } from '@/components/uploads/stored-upload';
import { UploadDropzone } from '@/components/uploads/upload-dropzone';
import { useStoreSecret, useUsers } from '@/lib/data/hooks';
import { readApkManifest } from '@/lib/uploads/apk-manifest';

import { Field, FieldError } from './field';
import { useWizard } from './wizard-context';

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 className="flex items-center gap-2 text-base">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            {title}
          </h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  );
}

function SubSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-t pt-4">
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function EnvironmentSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: 'production' | 'uat';
  onChange: (v: 'production' | 'uat') => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as 'production' | 'uat')}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="production">Production</SelectItem>
        <SelectItem value="uat">UAT</SelectItem>
      </SelectContent>
    </Select>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  mono,
  className,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  hint?: ReactNode;
  placeholder?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <Field id={id} label={label} error={error} hint={hint} {...(className ? { className } : {})}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-message`}
        className={mono ? 'font-mono text-xs' : undefined}
      />
    </Field>
  );
}

export function StepTargets() {
  const { draft } = useWizard();
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Secrets (passwords, OTPs, tokens) go straight to the vault; only a masked reference is kept.
        In sample mode secrets are not stored at all, and uploads record file name, size, type and
        SHA-256 only.
      </p>
      {draft.targetKinds.includes('website') ? <WebsitePanel /> : null}
      {draft.targetKinds.includes('android') ? <AndroidPanel /> : null}
      {draft.targetKinds.includes('ios') ? <IosPanel /> : null}
      {draft.targetKinds.includes('source') ? <SourcePanel /> : null}
      {draft.targetKinds.includes('backend_config') ? <BackendConfigPanel /> : null}
    </div>
  );
}

// ------------------------------------------------------------------ website

function WebsitePanel() {
  const { draft, update, errors, testDataSets } = useWizard();
  const w = draft.website;
  const set = (patch: Partial<typeof w>) =>
    update((d) => ({ ...d, website: { ...d.website, ...patch } }));

  return (
    <Section icon={Globe} title="Website">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id="wizard-website-name"
          label="Name"
          value={w.name}
          onChange={(name) => set({ name })}
          error={errors['website.name']}
        />
        <TextField
          id="wizard-website-baseUrl"
          label="Base URL"
          value={w.baseUrl}
          onChange={(baseUrl) => set({ baseUrl })}
          error={errors['website.baseUrl']}
          placeholder="https://uat.example.com"
        />
        <Field id="wizard-website-env" label="Environment">
          <EnvironmentSelect
            id="wizard-website-env"
            value={w.environment}
            onChange={(environment) => set({ environment })}
          />
        </Field>
        <TextField
          id="wizard-website-envLabel"
          label="Environment label"
          value={w.environmentLabel}
          onChange={(environmentLabel) => set({ environmentLabel })}
          hint="Optional, as the client names it, e.g. UAT-2."
        />
      </div>

      <SubSection
        title="Test credentials"
        description="Accounts the journeys sign in with. Stored in the vault; shown here masked."
      >
        <CredentialsEditor />
      </SubSection>

      <SubSection
        title="Test data sets"
        description="Reusable dummy customer and payment sandbox details. Fill steps can use tokens such as {{customer.mobile}}."
      >
        {testDataSets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No test data sets yet.</p>
        ) : null}
        <div className="grid gap-2 md:grid-cols-2">
          {testDataSets.map((t) => (
            <label
              key={t.id}
              className="flex items-start gap-3 rounded-md border p-3 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
            >
              <Checkbox
                checked={w.testDataSetIds.includes(t.id)}
                onCheckedChange={(v) =>
                  set({
                    testDataSetIds:
                      v === true
                        ? [...w.testDataSetIds, t.id]
                        : w.testDataSetIds.filter((id) => id !== t.id),
                  })
                }
                aria-label={`Use ${t.name}`}
              />
              <span className="min-w-0">
                <span className="block font-medium">{t.name}</span>
                <Badge variant="secondary" className="mt-1 text-[11px]">
                  {t.kind === 'customer' ? 'Dummy customer' : 'Payment sandbox'}
                </Badge>
              </span>
            </label>
          ))}
        </div>
        <div>
          <TestDataSetDialog
            trigger={
              <Button type="button" variant="outline" size="sm">
                <Plus />
                New test data set
              </Button>
            }
            onSaved={(saved) => set({ testDataSetIds: [...w.testDataSetIds, saved.id] })}
          />
        </div>
      </SubSection>

      <SubSection title="OTP handling" description="How journeys get past one-time passwords.">
        <OtpEditor />
        <FieldError message={errors['website.otp']} />
      </SubSection>
    </Section>
  );
}

function CredentialsEditor() {
  const { draft, update } = useWizard();
  const store = useStoreSecret();
  const [label, setLabel] = useState('');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const credentials = draft.website.credentials;

  const add = () => {
    if (!label.trim() || !username.trim() || !secret) {
      toast.error('Enter a label, username and password');
      return;
    }
    store.mutate(
      { label, username, secret },
      {
        onSuccess: (ref) => {
          update((d) => ({
            ...d,
            website: { ...d.website, credentials: [...d.website.credentials, ref] },
          }));
          setLabel('');
          setUsername('');
          setSecret('');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="grid gap-3">
      {credentials.length > 0 ? (
        <ul className="grid gap-2" aria-label="Stored credentials">
          {credentials.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <KeyRound className="size-4 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{c.label}</span> · {c.username} ·{' '}
                <span className="font-mono">{c.maskedHint}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {c.storage === 'vault' ? 'In vault' : 'Not stored (sample mode)'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Remove ${c.label}`}
                onClick={() =>
                  update((d) => ({
                    ...d,
                    website: {
                      ...d.website,
                      credentials: d.website.credentials.filter((x) => x.id !== c.id),
                    },
                  }))
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <TextField
          id="cred-label"
          label="Label"
          value={label}
          onChange={setLabel}
          placeholder="Test customer login"
        />
        <TextField
          id="cred-username"
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="qa.customer01"
        />
        <Field id="cred-secret" label="Password">
          <Input
            id="cred-secret"
            type="password"
            autoComplete="new-password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </Field>
        <Button type="button" variant="outline" onClick={add} disabled={store.isPending}>
          <Plus />
          Add credential
        </Button>
      </div>
    </div>
  );
}

function OtpEditor() {
  const { draft, update } = useWizard();
  const { data: users } = useUsers();
  const store = useStoreSecret();
  const [otp, setOtp] = useState('');
  const current = draft.website.otp;
  const setOtpHandling = (next: typeof current) =>
    update((d) => ({ ...d, website: { ...d.website, otp: next } }));
  const assessors = (users ?? []).filter(
    (u) => u.active && (u.role === 'assessor' || u.role === 'admin'),
  );

  const saveFixed = () => {
    if (!/^\d{4,8}$/.test(otp)) {
      toast.error('A test OTP has 4 to 8 digits');
      return;
    }
    store.mutate(
      { label: 'Fixed test OTP', username: 'otp', secret: otp },
      {
        onSuccess: (ref) => {
          setOtpHandling({
            mode: 'fixed_test_otp',
            otpLength: otp.length,
            secretRef: ref.secretRef,
            maskedHint: ref.maskedHint,
          });
          setOtp('');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="grid gap-3">
      <div role="radiogroup" aria-label="OTP handling" className="grid gap-2 md:grid-cols-3">
        {(
          [
            ['not_required', 'No OTP', 'Journeys do not hit OTP screens.'],
            ['fixed_test_otp', 'Fixed test OTP', 'The UAT environment accepts a fixed OTP.'],
            [
              'live_assessor_entry',
              'Live assessor entry',
              'An assessor types the OTP during the run.',
            ],
          ] as const
        ).map(([mode, title, description]) => (
          <label
            key={mode}
            className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
          >
            <input
              type="radio"
              name="otp-mode"
              className="mt-1 accent-[var(--brand)]"
              checked={current.mode === mode}
              onChange={() =>
                setOtpHandling(
                  mode === 'not_required'
                    ? { mode }
                    : mode === 'live_assessor_entry'
                      ? { mode, assessorUserId: assessors[0]?.id ?? '', timeoutSeconds: 180 }
                      : current.mode === 'fixed_test_otp'
                        ? current
                        : { mode: 'fixed_test_otp', otpLength: 6, secretRef: '', maskedHint: '' },
                )
              }
            />
            <span>
              <span className="block font-medium">{title}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </span>
          </label>
        ))}
      </div>
      {current.mode === 'fixed_test_otp' ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field
            id="otp-value"
            label="Test OTP"
            hint={
              current.secretRef
                ? `Saved ${current.maskedHint}`
                : 'Stored in the vault, never shown again.'
            }
          >
            <Input
              id="otp-value"
              type="password"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-40"
              aria-describedby="otp-value-message"
            />
          </Field>
          <Button type="button" variant="outline" onClick={saveFixed} disabled={store.isPending}>
            {current.secretRef ? 'Replace OTP' : 'Save OTP'}
          </Button>
        </div>
      ) : null}
      {current.mode === 'live_assessor_entry' ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Field id="otp-assessor" label="Assessor entering OTPs">
            <Select
              value={current.assessorUserId}
              onValueChange={(assessorUserId) => setOtpHandling({ ...current, assessorUserId })}
            >
              <SelectTrigger id="otp-assessor" className="w-full">
                <SelectValue placeholder="Choose an assessor" />
              </SelectTrigger>
              <SelectContent>
                {assessors.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="otp-timeout" label="Wait for OTP (seconds)">
            <Input
              id="otp-timeout"
              inputMode="numeric"
              value={String(current.timeoutSeconds)}
              onChange={(e) =>
                setOtpHandling({
                  ...current,
                  timeoutSeconds: Math.min(900, Math.max(30, Number(e.target.value) || 30)),
                })
              }
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ mobile

function AndroidPanel() {
  const { draft, update, errors } = useWizard();
  const a = draft.android;
  const set = (patch: Partial<typeof a>) =>
    update((d) => ({ ...d, android: { ...d.android, ...patch } }));

  return (
    <Section icon={Smartphone} title="Android app">
      {a.build ? (
        <StoredUploadRow
          upload={a.build}
          onRemove={() => set({ build: null, appIdSource: 'entered' })}
        >
          {a.appIdSource === 'read_from_file' ? (
            <Badge variant="secondary">Package name read from the file</Badge>
          ) : null}
        </StoredUploadRow>
      ) : (
        <UploadDropzone
          purpose="android_build"
          label="Upload the Android build"
          onUploaded={async (build, file) => {
            const manifest = build.kind === 'apk' ? await readApkManifest(file) : null;
            set({
              build,
              ...(manifest
                ? {
                    appId: manifest.packageName,
                    version: manifest.versionName ?? a.version,
                    appIdSource: 'read_from_file' as const,
                  }
                : { appIdSource: 'entered' as const }),
            });
            toast.success(
              manifest
                ? `Read ${manifest.packageName} from the APK`
                : 'Build uploaded; enter the package name and version',
            );
          }}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id="wizard-android-name"
          label="Name"
          value={a.name}
          onChange={(name) => set({ name })}
          error={errors['android.name']}
        />
        <TextField
          id="wizard-android-appId"
          label="Package name"
          value={a.appId}
          onChange={(appId) => set({ appId, appIdSource: 'entered' })}
          error={errors['android.appId']}
          placeholder="com.example.app"
          mono
        />
        <TextField
          id="wizard-android-version"
          label="Version"
          value={a.version}
          onChange={(version) => set({ version })}
          error={errors['android.version']}
          placeholder="5.0.0"
        />
        <Field id="wizard-android-env" label="Environment">
          <EnvironmentSelect
            id="wizard-android-env"
            value={a.environment}
            onChange={(environment) => set({ environment })}
          />
        </Field>
      </div>
    </Section>
  );
}

function IosPanel() {
  const { draft, update, errors } = useWizard();
  const i = draft.ios;
  const set = (patch: Partial<typeof i>) => update((d) => ({ ...d, ios: { ...d.ios, ...patch } }));

  return (
    <Section icon={TabletSmartphone} title="iOS app">
      {i.build ? (
        <StoredUploadRow
          upload={i.build}
          onRemove={() => set({ build: null, decryptedConfirmed: false })}
        />
      ) : (
        <UploadDropzone
          purpose="ios_build"
          label="Upload the decrypted iOS build"
          onUploaded={(build) => set({ build })}
        />
      )}
      <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
        <Checkbox
          checked={i.decryptedConfirmed}
          onCheckedChange={(v) => set({ decryptedConfirmed: v === true })}
          aria-label="This IPA is a decrypted build supplied by the client"
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">This IPA is a decrypted build supplied by the client.</span>{' '}
          <span className="text-muted-foreground">
            App Store builds are encrypted and cannot be analysed.
          </span>
        </span>
      </label>
      <FieldError message={errors['ios.decrypted']} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id="wizard-ios-name"
          label="Name"
          value={i.name}
          onChange={(name) => set({ name })}
          error={errors['ios.name']}
        />
        <TextField
          id="wizard-ios-appId"
          label="Bundle ID"
          value={i.appId}
          onChange={(appId) => set({ appId })}
          error={errors['ios.appId']}
          placeholder="com.example.app"
          mono
        />
        <TextField
          id="wizard-ios-version"
          label="Version"
          value={i.version}
          onChange={(version) => set({ version })}
          error={errors['ios.version']}
          placeholder="5.0.0"
        />
        <Field id="wizard-ios-env" label="Environment">
          <EnvironmentSelect
            id="wizard-ios-env"
            value={i.environment}
            onChange={(environment) => set({ environment })}
          />
        </Field>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ source

function SourcePanel() {
  const { draft, update, errors } = useWizard();
  const store = useStoreSecret();
  const [token, setToken] = useState('');
  const s = draft.source;
  const set = (patch: Partial<typeof s>) =>
    update((d) => ({ ...d, source: { ...d.source, ...patch } }));

  const saveToken = () => {
    if (token.length < 8) {
      toast.error('Paste the read-only access token');
      return;
    }
    store.mutate(
      {
        label: `${REPOSITORY_PROVIDER_LABELS[s.provider]} read-only token`,
        username: 'read-only',
        secret: token,
      },
      {
        onSuccess: (ref) => {
          set({ token: ref });
          setToken('');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <Section icon={Code2} title="Source code">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id="wizard-source-name"
          label="Name"
          value={s.name}
          onChange={(name) => set({ name })}
          error={errors['source.name']}
          placeholder="Policy administration platform"
        />
        <TextField
          id="wizard-source-languages"
          label="Languages"
          value={s.languages}
          onChange={(languages) => set({ languages })}
          error={errors['source.languages']}
          hint="Comma separated."
        />
      </div>
      <div
        role="radiogroup"
        aria-label="How the source is provided"
        className="grid gap-2 md:grid-cols-2"
      >
        {(
          [
            ['repository', 'Repository connection', 'Read-only access, pinned to a commit.'],
            ['archive', 'ZIP upload', 'A snapshot of the source supplied by the client.'],
          ] as const
        ).map(([mode, title, description]) => (
          <label
            key={mode}
            className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
          >
            <input
              type="radio"
              name="source-mode"
              className="mt-1 accent-[var(--brand)]"
              checked={s.mode === mode}
              onChange={() => set({ mode })}
            />
            <span>
              <span className="block font-medium">{title}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </span>
          </label>
        ))}
      </div>
      {s.mode === 'repository' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="wizard-source-provider" label="Provider">
            <Select
              value={s.provider}
              onValueChange={(v) => set({ provider: v as RepositoryProvider })}
            >
              <SelectTrigger id="wizard-source-provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RepositoryProviderSchema.options.map((p) => (
                  <SelectItem key={p} value={p}>
                    {REPOSITORY_PROVIDER_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <TextField
            id="wizard-source-repoUrl"
            label="Repository URL"
            value={s.repoUrl}
            onChange={(repoUrl) => set({ repoUrl })}
            error={errors['source.repoUrl']}
            placeholder="https://github.com/org/repo"
          />
          <TextField
            id="wizard-source-branch"
            label="Branch"
            value={s.branch}
            onChange={(branch) => set({ branch })}
            error={errors['source.branch']}
          />
          <TextField
            id="wizard-source-commitSha"
            label="Pinned commit SHA"
            value={s.commitSha}
            onChange={(commitSha) => set({ commitSha: commitSha.trim().toLowerCase() })}
            error={errors['source.commitSha']}
            hint="Full 40-character SHA; findings cite this exact commit."
            mono
          />
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="wizard-source-token">Read-only access token</Label>
            {s.token ? (
              <p className="flex items-center gap-2 text-sm">
                <KeyRound className="size-4 text-muted-foreground" aria-hidden />
                {s.token.label} <span className="font-mono">{s.token.maskedHint}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => set({ token: null, readOnlyConfirmed: false })}
                >
                  Remove
                </Button>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Input
                  id="wizard-source-token"
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="max-w-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveToken}
                  disabled={store.isPending}
                >
                  Store token
                </Button>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={s.readOnlyConfirmed}
                onCheckedChange={(v) => set({ readOnlyConfirmed: v === true })}
                aria-label="The token has read-only scope"
              />
              The token has read-only scope (no write or admin permissions).
            </label>
          </div>
        </div>
      ) : s.archive ? (
        <StoredUploadRow upload={s.archive} onRemove={() => set({ archive: null })} />
      ) : (
        <>
          <UploadDropzone
            purpose="source_archive"
            label="Upload the source archive"
            onUploaded={(archive) => set({ archive })}
          />
          <FieldError message={errors['source.archive']} />
        </>
      )}
    </Section>
  );
}

// ------------------------------------------------------------------ backend configuration

function BackendConfigPanel() {
  const { draft, update, errors } = useWizard();
  const c = draft.backendConfig;
  const set = (patch: Partial<typeof c>) =>
    update((d) => ({ ...d, backendConfig: { ...d.backendConfig, ...patch } }));
  const missing = ConfigTypeSchema.options.filter((t) => !c.files.some((f) => f.configType === t));

  return (
    <Section icon={Server} title="Backend configuration">
      <TextField
        id="wizard-backend-name"
        label="Name"
        value={c.name}
        onChange={(name) => set({ name })}
        error={errors['backend.name']}
      />
      <UploadDropzone
        purpose="config_file"
        multiple
        label="Upload configuration files"
        onUploaded={(upload) =>
          update((d) => ({
            ...d,
            backendConfig: {
              ...d.backendConfig,
              files: [...d.backendConfig.files, { upload, configType: '' }],
            },
          }))
        }
      />
      {c.files.length > 0 ? (
        <ul className="grid gap-2" aria-label="Configuration files">
          {c.files.map((f, index) => (
            <li key={f.upload.uploadId}>
              <StoredUploadRow
                upload={f.upload}
                onRemove={() => set({ files: c.files.filter((_, i) => i !== index) })}
              >
                <Select
                  value={f.configType}
                  onValueChange={(v) =>
                    set({
                      files: c.files.map((x, i) =>
                        i === index ? { ...x, configType: v as ConfigType } : x,
                      ),
                    })
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="w-56"
                    aria-label={`Type of ${f.upload.fileName}`}
                  >
                    <SelectValue placeholder="Choose a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ConfigTypeSchema.options.map((t) => (
                      <SelectItem key={t} value={t}>
                        {CONFIG_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </StoredUploadRow>
            </li>
          ))}
        </ul>
      ) : null}
      <FieldError message={errors['backend.files'] ?? errors['backend.types']} />
      {missing.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Not yet provided: {missing.map((t) => CONFIG_TYPE_LABELS[t]).join(', ')}. Missing types
          appear as outstanding on the client access checklist.
        </p>
      ) : null}
    </Section>
  );
}
