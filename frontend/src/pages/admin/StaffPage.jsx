import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import { FormModal } from '../../components/admin/Modal';
import { CustomerStatusBadge } from '../../components/admin/StatusBadge';
import CustomerAvatar from '../../components/admin/CustomerAvatar';
import Pagination from '../../components/admin/Pagination';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { FilterToolbar, SearchInput } from '../../components/ui/FilterToolbar';
import { CustomerListSkeleton } from '../../components/loading';
import { formatShortDate } from '../../lib/format';
import { getErrorMessage } from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import './StaffPage.css';

const STAFF_ROLES = ['owner', 'manager', 'support'];

const ROLE_LABELS = {
  owner: 'Owner',
  manager: 'Manager',
  support: 'Support',
};

const ROLE_HINTS = {
  owner: 'Full access to every part of the admin area.',
  manager: 'Runs the kitchen day to day: catalog, orders and customers.',
  support: 'Handles orders and customers, without catalogue or settings access.',
};

const PERMISSION_GROUPS = [
  {
    label: 'Dashboard',
    permissions: [['overview:read', 'View dashboard']],
  },
  {
    label: 'Catalog',
    permissions: [
      ['catalog:read', 'View products'],
      ['catalog:write', 'Manage products'],
    ],
  },
  {
    label: 'Orders',
    permissions: [
      ['orders:read', 'View orders'],
      ['orders:write', 'Update orders'],
    ],
  },
  {
    label: 'Customers',
    permissions: [
      ['customers:read', 'View customers'],
      ['customers:write', 'Manage customers'],
    ],
  },
  {
    label: 'Coupons',
    permissions: [
      ['coupons:read', 'View coupons'],
      ['coupons:write', 'Manage coupons'],
    ],
  },
  {
    label: 'Reviews',
    permissions: [
      ['reviews:read', 'View reviews'],
      ['reviews:write', 'Moderate reviews'],
    ],
  },
  {
    label: 'Inventory',
    permissions: [
      ['inventory:read', 'View inventory'],
      ['inventory:write', 'Adjust inventory'],
    ],
  },
  {
    label: 'System',
    permissions: [
      ['settings:read', 'View settings'],
      ['settings:write', 'Manage settings'],
      ['staff:read', 'View staff'],
      ['staff:write', 'Manage staff'],
      ['audit:read', 'View activity log'],
      ['notifications:read', 'View notifications'],
      ['notifications:write', 'Manage notifications'],
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions.map(([key]) => key));

const emptyCreateForm = {
  name: '',
  email: '',
  password: '',
  staffRole: 'manager',
  permissions: [],
};

const roleLabel = (role) => (role ? ROLE_LABELS[role] || role : 'Owner');
const roleTone = (role) => (!role || role === 'owner' ? 'accent' : 'info');

function PermissionPicker({ value, onChange }) {
  const toggle = (permission) => {
    onChange(
      value.includes(permission)
        ? value.filter((item) => item !== permission)
        : [...value, permission]
    );
  };

  const toggleGroup = (group) => {
    const keys = group.permissions.map(([key]) => key);
    const allSelected = keys.every((key) => value.includes(key));
    onChange(
      allSelected
        ? value.filter((key) => !keys.includes(key))
        : Array.from(new Set([...value, ...keys]))
    );
  };

  return (
    <div className="permission-picker">
      <div className="permission-summary">
        <Icon name="shield-check" size={15} label="" />
        <span>
          {value.length === 0
            ? 'Using the role defaults — nothing is overridden.'
            : `${value.length} of ${ALL_PERMISSIONS.length} permissions granted explicitly.`}
        </span>
      </div>
      {PERMISSION_GROUPS.map((group) => {
        const keys = group.permissions.map(([key]) => key);
        const selectedCount = keys.filter((key) => value.includes(key)).length;
        const allSelected = selectedCount === keys.length;

        return (
          <fieldset key={group.label} className="permission-group">
            <legend>{group.label}</legend>
            <button
              type="button"
              className="permission-group-toggle"
              onClick={() => toggleGroup(group)}
              aria-label={`${allSelected ? 'Clear' : 'Select all'} ${group.label} permissions`}
            >
              {allSelected ? 'Clear' : 'Select all'}
            </button>
            <div className="permission-options">
              {group.permissions.map(([permission, label]) => (
                <label key={permission} className="permission-option">
                  <input
                    type="checkbox"
                    checked={value.includes(permission)}
                    onChange={() => toggle(permission)}
                  />
                  <span className="permission-option-text">
                    <span className="permission-option-label">{label}</span>
                    <code className="permission-option-key">{permission}</code>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export default function StaffPage() {
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ staffRole: 'manager', status: 'active', permissions: [] });

  useDocumentTitle('Staff');

  const params = { q: search || undefined, page };

  const {
    data,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.staff(params),
    queryFn: () => adminApi.staff(params),
    placeholderData: keepPreviousData,
  });

  const staff = useMemo(() => data?.items || [], [data]);
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });

  const createMutation = useMutation({
    mutationFn: adminApi.createStaff,
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      showSuccess('Staff member added');
    },
    onError: (err) => showError(getErrorMessage(err, 'Failed to add staff member')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: patch }) => adminApi.updateStaff(id, patch),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      showSuccess('Staff member updated');
    },
    onError: (err) => showError(getErrorMessage(err, 'Failed to update staff member')),
  });

  const openEdit = (member) => {
    setEditing(member);
    setEditForm({
      staffRole: member.staffRole || 'manager',
      status: member.status || 'active',
      permissions: member.hasExplicitPermissions ? member.permissions || [] : [],
    });
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const renderBody = () => {
    if (isPending) {
      return (
        <div className="staff-loading" aria-busy="true">
          <CustomerListSkeleton count={5} />
        </div>
      );
    }

    if (error) {
      return (
        <ErrorState
          title="We could not load the team"
          description={getErrorMessage(error, 'The staff request failed. Please try again.')}
          onRetry={() => refetch()}
        />
      );
    }

    if (!staff.length) {
      return (
        <EmptyState
          icon="shield-check"
          title={search ? 'No one matches that search' : 'No team members yet'}
          description={
            search
              ? 'Try a different name or email address.'
              : 'Add your first colleague to share the workload in the kitchen.'
          }
          actions={
            search ? null : (
              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                iconLeft={<Icon name="plus" size={16} />}
              >
                Add staff
              </Button>
            )
          }
        />
      );
    }

    return (
      <ul className="staff-list" aria-busy={isFetching || undefined}>
        {staff.map((member, index) => {
          const permissions = member.permissions || [];
          const visiblePermissions = permissions.slice(0, 4);
          const remaining = permissions.length - visiblePermissions.length;

          return (
            <Motion.li
              key={member.id}
              className="staff-card"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.22,
                delay: reduceMotion ? 0 : Math.min(index, 6) * 0.03,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="staff-card-identity">
                <CustomerAvatar name={member.name} email={member.email} size="lg" />
                <div className="staff-card-text">
                  <strong>{member.name}</strong>
                  <span className="staff-card-email">{member.email}</span>
                </div>
              </div>

              <div className="staff-card-badges">
                <Badge tone={roleTone(member.staffRole)}>
                  {roleLabel(member.staffRole)}
                </Badge>
                <CustomerStatusBadge status={member.status} />
                {member.hasExplicitPermissions ? (
                  <Badge tone="warning">Custom permissions</Badge>
                ) : (
                  <Badge tone="neutral">Role default</Badge>
                )}
              </div>

              <div className="staff-card-permissions">
                {permissions.length ? (
                  <>
                    {visiblePermissions.map((permission) => (
                      <span key={permission} className="staff-permission-chip">
                        {permission}
                      </span>
                    ))}
                    {remaining > 0 ? (
                      <span className="staff-permission-chip is-more">
                        +{remaining} more
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="staff-permission-empty">No permissions resolved</span>
                )}
              </div>

              <div className="staff-card-foot">
                <span className="staff-card-lastlogin">
                  <Icon name="clock" size={14} label="" />
                  {member.lastLoginAt
                    ? `Last active ${formatShortDate(member.lastLoginAt)}`
                    : 'Never signed in'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openEdit(member)}
                  aria-label={`Edit ${member.name}`}
                  iconLeft={<Icon name="pencil" size={15} />}
                >
                  Edit
                </Button>
              </div>
            </Motion.li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="staff-page">
      <PageHeader
        eyebrow="Access control"
        title="Staff"
        description="Manage administrator accounts, roles and permissions."
        actions={
          <>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              iconLeft={<Icon name="plus" size={16} />}
            >
              Add staff
            </Button>
            <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing team" />
          </>
        }
      />

      <FilterToolbar>
        <SearchInput
          id="staff-search"
          label="Search staff"
          placeholder="Search name or email..."
          value={search}
          onChange={handleSearch}
        />
      </FilterToolbar>

      {renderBody()}

      {!isPending && !error && meta.totalPages > 1 ? (
        <Pagination
          page={page}
          pageCount={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
        />
      ) : null}

      <FormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate(createForm);
        }}
        title="Add staff member"
        description="They will be able to sign in to the admin area with the password you set."
        submitText="Create staff"
        loading={createMutation.isPending}
        size="lg"
      >
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="staff-name">Name</label>
            <input
              id="staff-name"
              type="text"
              className="modal-field-input"
              value={createForm.name}
              onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="staff-email">Email</label>
            <input
              id="staff-email"
              type="email"
              className="modal-field-input"
              value={createForm.email}
              onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="staff-password">Temporary password</label>
            <input
              id="staff-password"
              type="password"
              className="modal-field-input"
              minLength={8}
              value={createForm.password}
              onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="staff-role">Role</label>
            <select
              id="staff-role"
              className="modal-field-select"
              value={createForm.staffRole}
              onChange={(event) => setCreateForm({ ...createForm, staffRole: event.target.value })}
            >
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            <p className="field-hint">{ROLE_HINTS[createForm.staffRole]}</p>
          </div>
        </div>
        <div className="form-field">
          <label>Permission overrides</label>
          <p className="field-hint">
            Leave everything unchecked to use the role defaults. Select permissions to grant an
            explicit set.
          </p>
          <PermissionPicker
            value={createForm.permissions}
            onChange={(permissions) => setCreateForm({ ...createForm, permissions })}
          />
        </div>
      </FormModal>

      <FormModal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSubmit={(event) => {
          event.preventDefault();
          updateMutation.mutate({ id: editing.id, data: editForm });
        }}
        title={editing ? `Edit ${editing.name}` : 'Edit staff'}
        description="Change the role, the account status or the explicit permission set."
        submitText="Save changes"
        loading={updateMutation.isPending}
        size="lg"
      >
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="edit-role">Role</label>
            <select
              id="edit-role"
              className="modal-field-select"
              value={editForm.staffRole}
              onChange={(event) => setEditForm({ ...editForm, staffRole: event.target.value })}
            >
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            <p className="field-hint">{ROLE_HINTS[editForm.staffRole]}</p>
          </div>
          <div className="form-field">
            <label htmlFor="edit-status">Status</label>
            <select
              id="edit-status"
              className="modal-field-select"
              value={editForm.status}
              onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <p className="field-hint">
              Suspended accounts cannot sign in to the admin area.
            </p>
          </div>
        </div>
        <div className="form-field">
          <label>Permission overrides</label>
          <p className="field-hint">
            Leave everything unchecked to keep the role defaults. Select permissions to grant an
            explicit set.
          </p>
          <PermissionPicker
            value={editForm.permissions}
            onChange={(permissions) => setEditForm({ ...editForm, permissions })}
          />
        </div>
      </FormModal>
    </div>
  );
}
