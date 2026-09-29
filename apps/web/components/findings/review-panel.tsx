'use client';

import {
  allowedTransitions,
  canComment,
  FINDING_STATUS_LABELS,
  ROLE_LABELS,
  SYSTEM_USER_ID,
  type Finding,
  type FindingStatus,
  type User,
} from '@dpat/shared';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { FindingStatusBadge } from '@/components/common/badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAddComment, useReview, useUpdateFindingStatus, useUsers } from '@/lib/data/hooks';
import { formatDateTime, formatRelative } from '@/lib/format';
import { useRole } from '@/lib/permissions';

/** Action wording for each transition, so buttons say what they do. */
function actionLabel(from: FindingStatus, to: FindingStatus): string {
  if (to === 'under_review') return from === 'detected' ? 'Start review' : 'Reopen for review';
  if (to === 'confirmed') return from === 'remediation_in_progress' ? 'Reject fix' : 'Confirm';
  if (to === 'dismissed') return 'Dismiss';
  if (to === 'remediation_in_progress') return 'Start remediation';
  if (to === 'closed') return 'Close as remediated';
  return FINDING_STATUS_LABELS[to];
}

function userName(users: User[] | undefined, id: string): string {
  if (id === SYSTEM_USER_ID) return 'Analysis engine';
  return users?.find((u) => u.id === id)?.name ?? id;
}

export function ReviewPanel({ finding }: { finding: Finding }) {
  const role = useRole();
  const update = useUpdateFindingStatus();
  const [note, setNote] = useState('');
  const transitions = role ? allowedTransitions(role, finding.status) : [];

  const apply = (to: FindingStatus) =>
    update.mutate(
      { ids: [finding.id], to, ...(note.trim() ? { note: note.trim() } : {}) },
      {
        onSuccess: (result) => {
          if (result.updated.length > 0) {
            toast.success(`${finding.reference} is now ${FINDING_STATUS_LABELS[to]}`);
            setNote('');
          } else {
            toast.error('Status not changed', { description: result.skipped[0]?.reason });
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-sm">Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Status</span>
          <FindingStatusBadge status={finding.status} />
        </div>
        {role === null ? (
          <Skeleton className="h-16 w-full" />
        ) : transitions.length === 0 ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {role === 'viewer'
              ? 'Viewers cannot change status.'
              : `No status changes are available to the ${ROLE_LABELS[role].toLowerCase()} role from ${FINDING_STATUS_LABELS[finding.status]}.`}
          </p>
        ) : (
          <>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for the audit trail (optional)"
              aria-label="Note for the audit trail"
              rows={2}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {transitions.map((to) => (
                <Button
                  key={to}
                  size="sm"
                  variant={to === 'dismissed' ? 'outline' : 'default'}
                  disabled={update.isPending}
                  onClick={() => apply(to)}
                >
                  {actionLabel(finding.status, to)}
                </Button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CommentsAndTrail({ finding }: { finding: Finding }) {
  const { data: review, isPending } = useReview(finding.id);
  const { data: users } = useUsers();
  const role = useRole();
  const addComment = useAddComment();
  const [body, setBody] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    addComment.mutate(
      { findingId: finding.id, body },
      {
        onSuccess: () => setBody(''),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (isPending || !review) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
            Comments ({review.comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {review.comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No comments yet.</p>
          ) : null}
          <ul className="space-y-3" aria-label="Comments">
            {review.comments.map((c) => (
              <li key={c.id} className="space-y-0.5">
                <p className="text-xs">
                  <span className="font-medium">{userName(users, c.by)}</span>{' '}
                  <time
                    dateTime={c.at}
                    title={formatDateTime(c.at)}
                    className="text-muted-foreground"
                  >
                    {formatRelative(c.at)}
                  </time>
                </p>
                <p className="text-sm whitespace-pre-line">{c.body}</p>
              </li>
            ))}
          </ul>
          {role && canComment(role) ? (
            <form onSubmit={submit} className="space-y-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add a comment"
                aria-label="Add a comment"
                rows={2}
                className="text-sm"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={!body.trim() || addComment.isPending}
              >
                Comment
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-sm">Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-4 border-l pl-4" aria-label="Audit trail">
            {[...review.history].reverse().map((h) => (
              <li key={h.id} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-border ring-2 ring-card"
                />
                <p className="flex flex-wrap items-center gap-1 text-xs">
                  {h.from ? (
                    <>
                      <span className="text-muted-foreground">{FINDING_STATUS_LABELS[h.from]}</span>
                      <ArrowRight className="size-3 text-muted-foreground" aria-label="to" />
                    </>
                  ) : null}
                  <span className="font-medium">{FINDING_STATUS_LABELS[h.to]}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {userName(users, h.by)} · <time dateTime={h.at}>{formatDateTime(h.at)}</time>
                </p>
                {h.note ? <p className="mt-0.5 text-sm">{h.note}</p> : null}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </>
  );
}
