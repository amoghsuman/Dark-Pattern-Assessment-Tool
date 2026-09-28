'use client';

import { ROLE_LABELS, type Role, type User } from '@dpat/shared';
import { UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/page-states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUpsertUser, useUsers } from '@/lib/data/hooks';
import { can, useRole } from '@/lib/permissions';

import { ReadOnlyNote } from './read-only-note';

const ROLES: Role[] = ['admin', 'assessor', 'reviewer', 'viewer'];

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Everything, including settings, users and journey stages.',
  assessor:
    'Create assessments, triage findings (Detected → Under Review), start remediation and comment.',
  reviewer: 'Confirm, dismiss, reopen and close findings, and comment.',
  viewer: 'Read-only access to assessments, findings, rules and reports.',
};

export function UserSettings() {
  const { data: users, isPending, error } = useUsers();
  const role = useRole();
  const editable = role !== null && can.manageSettings(role);
  const upsert = useUpsertUser();

  const changeRole = (user: User, next: Role) => {
    upsert.mutate(
      { ...user, role: next },
      {
        onSuccess: () => toast.success(`${user.name} is now ${ROLE_LABELS[next].toLowerCase()}`),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Users</CardTitle>
            <CardDescription>
              People who can access this organisation&apos;s assessments.
            </CardDescription>
          </div>
          {editable ? <InviteUserDialog /> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {!editable ? <ReadOnlyNote /> : null}
          {error ? (
            <ErrorState error={error} />
          ) : isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-40">Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium">{u.name}</p>
                        {u.title ? (
                          <p className="text-xs text-muted-foreground">{u.title}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        {editable ? (
                          <Select value={u.role} onValueChange={(v) => changeRole(u, v as Role)}>
                            <SelectTrigger
                              size="sm"
                              className="w-32"
                              aria-label={`Role for ${u.name}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          ROLE_LABELS[u.role]
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.active ? 'secondary' : 'outline'}>
                          {u.active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>What each role can do.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            {ROLES.map((r) => (
              <div key={r}>
                <dt className="font-medium">{ROLE_LABELS[r]}</dt>
                <dd className="text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function InviteUserDialog() {
  const upsert = useUpsertUser();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('viewer');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    upsert.mutate(
      { name: name.trim(), email: email.trim(), role, active: true },
      {
        onSuccess: () => {
          toast.success(`Invited ${name.trim()}`);
          setOpen(false);
          setName('');
          setEmail('');
          setRole('viewer');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>
              In sample mode the user is added without sending an e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? 'Inviting…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
