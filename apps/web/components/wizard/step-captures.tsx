'use client';

import { Film, ImageIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StoredUploadRow } from '@/components/uploads/stored-upload';
import { UploadDropzone } from '@/components/uploads/upload-dropzone';
import { draftId } from '@/lib/wizard/draft';

import { Field } from './field';
import { useWizard } from './wizard-context';

const NO_JOURNEY = 'none';

/** Screens the engines cannot reach on their own (OTP gates, device-only flows) captured by hand. */
export function StepCaptures() {
  const { draft, update, errors, stages } = useWizard();
  const setCapture = (id: string, patch: Partial<(typeof draft.captures)[number]>) =>
    update((d) => ({
      ...d,
      captures: d.captures.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Optional. Add screenshots or screen recordings captured manually, for example OTP-gated or
        device-only screens. Each one is tagged to a journey stage and explained with a note; they
        are analysed alongside automated captures.
      </p>
      <UploadDropzone
        purpose="manual_capture"
        multiple
        label="Upload manual screenshots or recordings"
        onUploaded={(upload) =>
          update((d) => ({
            ...d,
            captures: [
              ...d.captures,
              { id: draftId('cap'), upload, journeyId: '', stageId: '', note: '' },
            ],
          }))
        }
      />
      {draft.captures.length > 0 ? (
        <ul className="grid gap-3" aria-label="Manual captures">
          {draft.captures.map((c, index) => {
            const Icon = c.upload.kind === 'screen_recording' ? Film : ImageIcon;
            const stageError = errors[`capture.${c.id}.stageId`];
            const noteError = errors[`capture.${c.id}.note`];
            return (
              <li key={c.id} className="grid gap-3 rounded-lg border p-3">
                <StoredUploadRow
                  upload={c.upload}
                  onRemove={() =>
                    update((d) => ({ ...d, captures: d.captures.filter((x) => x.id !== c.id) }))
                  }
                >
                  <Icon
                    className="size-4 text-muted-foreground"
                    aria-label={c.upload.kind === 'screen_recording' ? 'Recording' : 'Screenshot'}
                  />
                </StoredUploadRow>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
                  <Field id={`capture-${c.id}-journey`} label="Journey">
                    <Select
                      value={c.journeyId || NO_JOURNEY}
                      onValueChange={(v) =>
                        setCapture(c.id, { journeyId: v === NO_JOURNEY ? '' : v })
                      }
                    >
                      <SelectTrigger
                        id={`capture-${c.id}-journey`}
                        className="w-full"
                        aria-label={`Journey for capture ${index + 1}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_JOURNEY}>Not part of a journey</SelectItem>
                        {draft.journeys.map((j) => (
                          <SelectItem key={j.id} value={j.id}>
                            {j.name || 'Untitled journey'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id={`capture-${c.id}-stage`} label="Journey stage" error={stageError}>
                    <Select
                      value={c.stageId}
                      onValueChange={(stageId) => setCapture(c.id, { stageId })}
                    >
                      <SelectTrigger
                        id={`capture-${c.id}-stage`}
                        className="w-full"
                        aria-label={`Stage for capture ${index + 1}`}
                        aria-invalid={stageError ? true : undefined}
                      >
                        <SelectValue placeholder="Choose a stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id={`capture-${c.id}-note`} label="Note" error={noteError}>
                    <Input
                      id={`capture-${c.id}-note`}
                      value={c.note}
                      onChange={(e) => setCapture(c.id, { note: e.target.value })}
                      placeholder="Captured manually: OTP-gated screen"
                      aria-label={`Note for capture ${index + 1}`}
                      aria-invalid={noteError ? true : undefined}
                      aria-describedby={`capture-${c.id}-note-message`}
                    />
                  </Field>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
