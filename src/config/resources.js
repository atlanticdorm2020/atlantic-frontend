export const statusOptions = [
  { value: 1, label: 'Active' },
  { value: 0, label: 'Inactive' },
];

export const yesNoOptions = [
  { value: 1, label: 'Yes' },
  { value: 0, label: 'No' },
];

export const MANILA_TZ = 'Asia/Manila';

function withManilaOffset(value) {
  const raw = String(value).trim();

  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T00:00:00+08:00`;
  }

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(normalized)) {
    return `${normalized}+08:00`;
  }

  return raw;
}

export function parseAppDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(withManilaOffset(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function manilaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatInManila(value, options) {
  const date = parseAppDate(value);
  if (!date) {
    return value ? String(value) : '—';
  }

  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: MANILA_TZ,
      ...options,
    }).format(date);
  } catch {
    return String(value);
  }
}

export function formatDateTime(value) {
  return formatInManila(value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDateTimeShort(value) {
  return formatInManila(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  return formatInManila(value, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTimeNumeric(value) {
  const date = parseAppDate(value);
  if (!date) {
    return value ? String(value) : '—';
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: MANILA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export const auditColumns = [
  { id: 'created_at', label: 'Created', type: 'datetime', getValue: (item) => item.created_at },
  { id: 'updated_at', label: 'Updated', type: 'datetime', getValue: (item) => item.updated_at },
  { id: 'user', label: 'Updated by', getValue: (item) => item.user?.name ?? '—' },
];

export const resourceConfigs = {
  customers: {
    apiPath: 'customers',
    singular: 'Customer',
    plural: 'Customers',
    getItemLabel: (item) => [item?.first_name, item?.last_name].filter(Boolean).join(' ') || `#${item?.id}`,
    columns: [
      {
        id: 'name',
        label: 'Customer',
        getValue: (item) => [item.first_name, item.last_name].filter(Boolean).join(' ') || '—',
      },
      { id: 'sirb_no', label: 'SIRB No.', getValue: (item) => item.sirb_no ?? '—' },
      { id: 'mobile_no', label: 'Mobile', getValue: (item) => item.mobile_no ?? '—' },
      {
        id: 'branch',
        label: 'Branch',
        type: 'branch',
        getValue: (item) => item.location?.name ?? '—',
        getColor: (item) => item.location?.color_hex,
        getTextColor: (item) => item.location?.color_text,
      },
      { id: 'rank', label: 'Rank', getValue: (item) => item.rank ?? '—' },
      { id: 'status', label: 'Status', type: 'status', getValue: (item) => item.status },
      ...auditColumns,
    ],
    fields: [
      { name: 'first_name', label: 'First name', type: 'text', required: true },
      { name: 'last_name', label: 'Last name', type: 'text', required: true },
      { name: 'middle_name', label: 'Middle name', type: 'text', optional: true },
      { name: 'sirb_no', label: 'SIRB number', type: 'text', required: true },
      { name: 'mobile_no', label: 'Mobile number', type: 'text', required: true },
      { name: 'permanent_address', label: 'Permanent address', type: 'text', required: true, fullWidth: true },
      { name: 'rank', label: 'Rank', type: 'text', required: true },
      { name: 'agency', label: 'Agency', type: 'text', required: true },
      { name: 'location_id', label: 'Branch', type: 'select', optionSource: 'locations', optional: true },
      { name: 'icoe_name', label: 'Emergency contact name', type: 'text', required: true },
      { name: 'icoe_relation', label: 'Emergency contact relation', type: 'text', required: true },
      { name: 'icoe_contact', label: 'Emergency contact number', type: 'text', required: true },
      { name: 'note', label: 'Note', type: 'text', required: true, fullWidth: true, multiline: true, rows: 3 },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
    ],
    defaults: { status: 1, note: '' },
    pagination: { perPage: 10 },
    formColumns: 2,
    accountCredentials: true,
    customerActions: {
      files: true,
      balance: true,
      history: true,
    },
  },
  branches: {
    apiPath: 'locations',
    singular: 'Branch',
    plural: 'Branches',
    columns: [
      { id: 'name', label: 'Branch', getValue: (item) => item.name },
      {
        id: 'color',
        label: 'Color',
        type: 'branch',
        getValue: (item) => item.name,
        getColor: (item) => item.color_hex || item.color,
        getTextColor: (item) => item.color_text,
      },
      { id: 'address', label: 'Address', getValue: (item) => item.address },
      { id: 'rate', label: 'Rate', getValue: (item) => (item.rate?.amount != null ? `₱${item.rate.amount}` : '—') },
      { id: 'status', label: 'Status', type: 'status', getValue: (item) => item.status },
      ...auditColumns,
    ],
    fields: [
      { name: 'name', label: 'Branch name', type: 'text', required: true },
      { name: 'address', label: 'Address', type: 'text', required: true },
      { name: 'color', label: 'Branch color', type: 'color', optional: true },
      { name: 'rate_id', label: 'Rate', type: 'select', optionSource: 'rates', optional: true },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
    ],
    defaults: { status: 1 },
    pagination: { perPage: 10 },
  },
  rates: {
    apiPath: 'rates',
    singular: 'Rate',
    plural: 'Rates',
    columns: [
      { id: 'amount', label: 'Amount', getValue: (item) => (item.amount != null ? `₱${item.amount}` : '—') },
      { id: 'status', label: 'Status', type: 'status', getValue: (item) => item.status },
      ...auditColumns,
    ],
    fields: [
      { name: 'amount', label: 'Amount', type: 'number', required: true, step: '0.01' },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
    ],
    defaults: { status: 1 },
    pagination: { perPage: 10 },
  },
  rooms: {
    apiPath: 'rooms',
    singular: 'Room',
    plural: 'Rooms',
    columns: [
      { id: 'name', label: 'Room', getValue: (item) => item.name },
      {
        id: 'branch',
        label: 'Branch',
        type: 'branch',
        getValue: (item) => item.location?.name ?? '—',
        getColor: (item) => item.location?.color_hex,
        getTextColor: (item) => item.location?.color_text,
      },
      { id: 'rate', label: 'Rate', getValue: (item) => (item.rate?.amount != null ? `₱${item.rate.amount}` : '—') },
      { id: 'bedspace', label: 'Bedspace', getValue: (item) => (item.is_bedspace ? 'Yes' : 'No') },
      { id: 'status', label: 'Status', type: 'status', getValue: (item) => item.status },
      ...auditColumns,
    ],
    fields: [
      { name: 'name', label: 'Room name', type: 'text', required: true },
      { name: 'location_id', label: 'Branch', type: 'select', optionSource: 'locations', required: true },
      { name: 'rate_id', label: 'Rate', type: 'select', optionSource: 'rates', required: true },
      { name: 'is_bedspace', label: 'Bedspace', type: 'select', options: yesNoOptions, required: true },
      { name: 'ordered', label: 'Display order', type: 'number', required: true },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
    ],
    defaults: { status: 1, is_bedspace: 0, ordered: 0 },
    pagination: { perPage: 10 },
  },
  beds: {
    apiPath: 'beds',
    singular: 'Bed',
    plural: 'Beds',
    columns: [
      { id: 'name', label: 'Bed', getValue: (item) => item.name },
      { id: 'room', label: 'Room', getValue: (item) => item.room?.name ?? '—' },
      {
        id: 'branch',
        label: 'Branch',
        type: 'branch',
        getValue: (item) => item.room?.location?.name ?? '—',
        getColor: (item) => item.room?.location?.color_hex,
        getTextColor: (item) => item.room?.location?.color_text,
      },
      { id: 'sort', label: 'Sort', getValue: (item) => item.sort ?? '—' },
      { id: 'status', label: 'Status', type: 'status', getValue: (item) => item.status },
      ...auditColumns,
    ],
    fields: [
      { name: 'name', label: 'Bed name', type: 'text', required: true },
      { name: 'room_id', label: 'Room', type: 'select', optionSource: 'rooms', required: true },
      { name: 'sort', label: 'Sort order', type: 'number', optional: true },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
    ],
    defaults: { status: 1, sort: 0 },
    pagination: { perPage: 10 },
  },
};

export function getResourceItemLabel(config, item) {
  if (config.getItemLabel) {
    return config.getItemLabel(item);
  }

  return item?.name || `#${item?.id}`;
}

export function buildOptionLabel(source, item) {
  if (source === 'rates') {
    return item.amount != null ? `₱${item.amount} (#${item.id})` : `Rate #${item.id}`;
  }

  if (source === 'locations') {
    return item.name;
  }

  if (source === 'rooms') {
    const branch = item.location?.name ? ` · ${item.location.name}` : '';
    return `${item.name}${branch}`;
  }

  return String(item.name ?? item.id);
}

export function mapItemToForm(config, item) {
  const values = { ...config.defaults };

  config.fields.forEach((field) => {
    const value = item?.[field.name];
    values[field.name] = value ?? (field.optional ? '' : values[field.name] ?? '');

    if (field.type === 'color') {
      values[field.name] = item?.color || item?.color_hex || values[field.name] || '#64748B';
    }
  });

  return values;
}

export function mapFormToPayload(config, form) {
  const payload = {};

  config.fields.forEach((field) => {
    const raw = form[field.name];

    if (raw === '' || raw === null || raw === undefined) {
      if (field.optional || !field.required) {
        return;
      }
    }

    if (field.type === 'number' || field.type === 'select') {
      if (raw === '' || raw === null || raw === undefined) {
        payload[field.name] = field.type === 'number' ? 0 : null;
      } else {
        payload[field.name] = Number(raw);
      }
      return;
    }

    payload[field.name] = raw;
  });

  return payload;
}
