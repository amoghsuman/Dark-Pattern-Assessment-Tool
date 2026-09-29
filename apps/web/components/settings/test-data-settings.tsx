'use client';

import { CreditCard, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/page-states';
import { TestDataSetDialog } from '@/components/test-data/test-data-set-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteTestDataSet, useTestDataSets } from '@/lib/data/hooks';
import { useRole } from '@/lib/permissions';

/** Organisation-wide reusable test data: dummy customers and payment sandbox details. */
export function TestDataSettings() {
  const { data: sets, isPending, error } = useTestDataSets();
  const remove = useDeleteTestDataSet();
  const role = useRole();
  const editable = role === 'admin' || role === 'assessor';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>
            <h2 className="text-base">Test data sets</h2>
          </CardTitle>
          <CardDescription>
            Dummy customer and payment sandbox details reused across assessments. Never enter real
            customer data.
          </CardDescription>
        </div>
        {editable ? (
          <TestDataSetDialog
            trigger={
              <Button size="sm">
                <Plus />
                New test data set
              </Button>
            }
          />
        ) : null}
      </CardHeader>
      <CardContent>
        {!editable ? (
          <p className="mb-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Only admins and assessors can change test data.
          </p>
        ) : null}
        {error ? (
          <ErrorState error={error} />
        ) : isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : sets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No test data sets yet.</p>
        ) : (
          <ul className="divide-y rounded-md border" aria-label="Test data sets">
            {sets.map((t) => {
              const Icon = t.kind === 'customer' ? UserRound : CreditCard;
              const summary =
                t.kind === 'customer'
                  ? `${t.fields.fullName} · ${t.fields.city} · ${t.fields.mobile}`
                  : `${t.fields.gateway} · card ending ${t.fields.cardNumber.slice(-4)} · ${t.fields.upiId}`;
              return (
                <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.kind === 'customer' ? 'Dummy customer' : 'Payment sandbox'} · {summary}
                    </p>
                  </div>
                  {editable ? (
                    <>
                      <TestDataSetDialog
                        existing={t}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Edit ${t.name}`}
                          >
                            <Pencil />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${t.name}`}
                        onClick={() =>
                          remove.mutate(t.id, {
                            onSuccess: () => toast.success(`Deleted ${t.name}`),
                            onError: (err) => toast.error(err.message),
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
