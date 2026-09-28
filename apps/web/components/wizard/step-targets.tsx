'use client';

import { Code2, Globe, Smartphone, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Field } from './field';
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
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">{children}</CardContent>
    </Card>
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

export function StepTargets() {
  const { draft, update, errors } = useWizard();
  const { website, mobile, code } = draft;
  const text = (id: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={errors[id.replace('wizard-', '').replace('-', '.')] ? true : undefined}
      aria-describedby={`${id}-message`}
    />
  );

  return (
    <div className="grid gap-4">
      {draft.targetTypes.includes('website') ? (
        <Section icon={Globe} title="Website">
          <Field id="wizard-website-name" label="Name" error={errors['website.name']}>
            {text('wizard-website-name', website.name, (v) =>
              update({ website: { ...website, name: v } }),
            )}
          </Field>
          <Field id="wizard-website-baseUrl" label="Base URL" error={errors['website.baseUrl']}>
            {text(
              'wizard-website-baseUrl',
              website.baseUrl,
              (v) => update({ website: { ...website, baseUrl: v } }),
              'https://www.example.com',
            )}
          </Field>
          <Field id="wizard-website-env" label="Environment">
            <EnvironmentSelect
              id="wizard-website-env"
              value={website.environment}
              onChange={(environment) => update({ website: { ...website, environment } })}
            />
          </Field>
        </Section>
      ) : null}

      {draft.targetTypes.includes('mobile_app') ? (
        <Section icon={Smartphone} title="Mobile app">
          <Field id="wizard-mobile-name" label="Name" error={errors['mobile.name']}>
            {text('wizard-mobile-name', mobile.name, (v) =>
              update({ mobile: { ...mobile, name: v } }),
            )}
          </Field>
          <Field id="wizard-mobile-platform" label="Platform">
            <Select
              value={mobile.platform}
              onValueChange={(v) =>
                update({ mobile: { ...mobile, platform: v as 'android' | 'ios' } })
              }
            >
              <SelectTrigger id="wizard-mobile-platform" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="ios">iOS</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            id="wizard-mobile-appId"
            label={mobile.platform === 'android' ? 'Package name' : 'Bundle ID'}
            error={errors['mobile.appId']}
          >
            {text(
              'wizard-mobile-appId',
              mobile.appId,
              (v) => update({ mobile: { ...mobile, appId: v } }),
              'com.example.app',
            )}
          </Field>
          <Field id="wizard-mobile-version" label="Version" error={errors['mobile.version']}>
            {text(
              'wizard-mobile-version',
              mobile.version,
              (v) => update({ mobile: { ...mobile, version: v } }),
              '5.0.0',
            )}
          </Field>
          <Field id="wizard-mobile-env" label="Environment">
            <EnvironmentSelect
              id="wizard-mobile-env"
              value={mobile.environment}
              onChange={(environment) => update({ mobile: { ...mobile, environment } })}
            />
          </Field>
        </Section>
      ) : null}

      {draft.targetTypes.includes('code_repository') ? (
        <Section icon={Code2} title="Code repository">
          <Field id="wizard-code-name" label="Name" error={errors['code.name']}>
            {text(
              'wizard-code-name',
              code.name,
              (v) => update({ code: { ...code, name: v } }),
              'Policy administration platform',
            )}
          </Field>
          <Field
            id="wizard-code-repoUrl"
            label="Repository URL"
            hint="Optional if you upload a source archive."
            error={errors['code.repoUrl']}
          >
            {text(
              'wizard-code-repoUrl',
              code.repoUrl,
              (v) => update({ code: { ...code, repoUrl: v } }),
              'https://git.example.com/team/repo',
            )}
          </Field>
          <Field id="wizard-code-branch" label="Branch">
            {text('wizard-code-branch', code.branch, (v) =>
              update({ code: { ...code, branch: v } }),
            )}
          </Field>
          <Field
            id="wizard-code-commitSha"
            label="Commit"
            hint="Optional."
            error={errors['code.commitSha']}
          >
            {text(
              'wizard-code-commitSha',
              code.commitSha,
              (v) => update({ code: { ...code, commitSha: v } }),
              'a3f9c21',
            )}
          </Field>
          <Field
            id="wizard-code-languages"
            label="Languages"
            hint="Comma separated."
            error={errors['code.languages']}
            className="md:col-span-2"
          >
            {text('wizard-code-languages', code.languages, (v) =>
              update({ code: { ...code, languages: v } }),
            )}
          </Field>
        </Section>
      ) : null}
    </div>
  );
}
