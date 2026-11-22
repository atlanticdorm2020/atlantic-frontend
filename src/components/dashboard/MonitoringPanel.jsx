import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Add,
  DeleteOutline,
  EditOutlined,
  Search,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { apiDelete, apiGet, apiPost, apiPut } from '../../config/api';
import { formatDateTime, manilaToday } from '../../config/resources';
import { useAuthStore } from '../../store/authStore';
import BranchBadge from './BranchBadge';

function formatMoney(value) {
  if (value == null || value === '') return '—';

  return `₱${Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function CompletenessChip({ status, kind }) {
  const labels = {
    files: {
      complete: 'Complete',
      missing: 'Missing Files',
      not_required: 'Not Required',
    },
    price: {
      complete: 'Priced',
      missing: 'Missing Price',
    },
  };

  return (
    <span className={`monitoring-chip is-${kind}-${status}`}>
      {labels[kind]?.[status] || status}
    </span>
  );
}

function StatusChip({ status, label }) {
  return (
    <span className={`monitoring-chip is-status-${status}`}>
      {label || status}
    </span>
  );
}

function DutyStatusChip({ status }) {
  const labels = {
    scheduled: 'Scheduled',
    active: 'On Duty',
    completed: 'Completed',
    overdue: 'Overdue',
  };

  return (
    <span className={`monitoring-chip is-duty-${status}`}>
      {labels[status] || status}
    </span>
  );
}

const MAX_DUTY_DAYS = 30;

function inclusiveDayCount(from, to) {
  if (!from || !to) return 0;

  const start = new Date(`${from}T00:00:00+08:00`);
  const end = new Date(`${to}T00:00:00+08:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function formatDutyRange(duty) {
  const from = duty.duty_date;
  const to = duty.end_date || duty.duty_date;
  if (!from) return '—';
  if (!to || to === from) return from;
  return `${from} – ${to}`;
}

function emptyDutyForm(user) {
  const today = manilaToday();

  return {
    user_id: user?.id ? String(user.id) : '',
    location_id: user?.location_id ? String(user.location_id) : '',
    duty_date: today,
    end_date: today,
    start_time: '08:00',
    cutoff_time: '17:00',
    overnight: false,
  };
}

export default function MonitoringPanel() {
  const user = useAuthStore((state) => state.user);
  const assignedLocationId = user?.location_id || null;
  const today = useMemo(() => manilaToday(), []);

  const [filters, setFilters] = useState({
    date_start: today,
    date_end: today,
    location_id: assignedLocationId ? String(assignedLocationId) : '',
    receptionist_id: '',
    status: '',
    missing_files: false,
    missing_price: false,
    search: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dashboard, setDashboard] = useState(null);
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dutyOpen, setDutyOpen] = useState(false);
  const [dutySaving, setDutySaving] = useState(false);
  const [dutyErrors, setDutyErrors] = useState({});
  const [dutyForm, setDutyForm] = useState(() => emptyDutyForm(user));
  const [editingDuty, setEditingDuty] = useState(null);

  const loadLookups = useCallback(async () => {
    const [staffResponse, branchResponse] = await Promise.all([
      apiGet('/api/monitoring/staff'),
      apiGet('/api/monitoring/branches'),
    ]);
    setStaff(staffResponse.data || []);
    setBranches(branchResponse.data || []);
  }, []);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setTableLoading(true);
    }
    setError('');

    const params = new URLSearchParams({
      date_start: filters.date_start,
      date_end: filters.date_end,
      page: String(page),
      per_page: '15',
    });

    if (filters.location_id) params.set('location_id', filters.location_id);
    if (filters.receptionist_id) params.set('receptionist_id', filters.receptionist_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.missing_files) params.set('missing_files', '1');
    if (filters.missing_price) params.set('missing_price', '1');
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

    try {
      const response = await apiGet(`/api/monitoring?${params.toString()}`);
      setDashboard(response.data || null);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load monitoring data.');
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [debouncedSearch, filters.date_start, filters.date_end, filters.location_id, filters.receptionist_id, filters.status, filters.missing_files, filters.missing_price, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = filters.search.trim();
      setDebouncedSearch((current) => {
        if (current !== nextQuery) {
          setPage(1);
        }
        return nextQuery;
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    loadLookups().catch((loadError) => {
      setError(loadError.message || 'Unable to load monitoring filters.');
    });
  }, [loadLookups]);

  useEffect(() => {
    loadDashboard(Boolean(dashboard));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDashboard]);

  const summary = dashboard?.summary || {};
  const items = dashboard?.items || [];
  const duties = dashboard?.duties || [];
  const pagination = dashboard?.pagination || { current_page: 1, last_page: 1, total: 0 };

  const updateFilter = (name, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const toggleFlag = (name) => {
    setPage(1);
    setFilters((current) => ({ ...current, [name]: !current[name] }));
  };

  const openDutyDialog = (duty = null) => {
    setEditingDuty(duty);
    setDutyErrors({});
    setDutyForm(duty ? {
      user_id: String(duty.user_id || ''),
      location_id: String(duty.location_id || assignedLocationId || ''),
      duty_date: duty.duty_date || today,
      end_date: duty.end_date || duty.duty_date || today,
      start_time: duty.start_time || '08:00',
      cutoff_time: duty.cutoff_time || '17:00',
      overnight: Boolean(duty.overnight),
    } : emptyDutyForm(user));
    setDutyOpen(true);
  };

  const closeDutyDialog = () => {
    if (!dutySaving) {
      setDutyOpen(false);
      setEditingDuty(null);
    }
  };

  const submitDuty = async (event) => {
    event.preventDefault();
    setDutySaving(true);
    setDutyErrors({});
    setNotice('');

    const dayCount = inclusiveDayCount(dutyForm.duty_date, dutyForm.end_date || dutyForm.duty_date);
    if (dayCount < 1) {
      setDutyErrors({ form: ['Duty end date must be on or after the start date.'] });
      setDutySaving(false);
      return;
    }
    if (dayCount > MAX_DUTY_DAYS) {
      setDutyErrors({ form: [`A duty schedule can cover at most ${MAX_DUTY_DAYS} days.`] });
      setDutySaving(false);
      return;
    }

    const payload = {
      user_id: Number(dutyForm.user_id),
      location_id: Number(dutyForm.location_id || assignedLocationId),
      duty_date: dutyForm.duty_date,
      end_date: dutyForm.end_date || dutyForm.duty_date,
      start_time: dutyForm.start_time,
      cutoff_time: dutyForm.cutoff_time,
      overnight: Boolean(dutyForm.overnight),
      timezone: 'Asia/Manila',
    };

    try {
      if (editingDuty) {
        await apiPut(`/api/duties/${editingDuty.id}`, payload);
        setNotice('Duty schedule updated.');
      } else {
        await apiPost('/api/duties', payload);
        setNotice('Duty schedule created.');
      }
      setDutyOpen(false);
      setEditingDuty(null);
      await loadDashboard(true);
    } catch (saveError) {
      setDutyErrors(saveError.errors || { form: [saveError.message] });
    } finally {
      setDutySaving(false);
    }
  };

  const removeDuty = async (duty) => {
    if (!window.confirm(`Remove duty schedule for ${duty.receptionist_name}?`)) {
      return;
    }

    try {
      await apiDelete(`/api/duties/${duty.id}`);
      setNotice('Duty schedule removed.');
      await loadDashboard(true);
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to remove duty schedule.');
    }
  };

  if (loading && !dashboard) {
    return (
      <Box className="dashboard-card dashboard-loading">
        <CircularProgress size={32} />
        <Typography>Loading receptionist monitoring...</Typography>
      </Box>
    );
  }

  return (
    <Box className="monitoring-page">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      <Box className="dashboard-metrics-grid monitoring-metrics-grid">
        <Box className="dashboard-metric-card is-occupants">
          <Box className="dashboard-metric-card-top">
            <Box className="dashboard-metric-copy">
              <Typography className="dashboard-metric-value">{summary.total_checkins ?? 0}</Typography>
              <Typography className="dashboard-metric-label">Total Customer Check-ins</Typography>
            </Box>
          </Box>
        </Box>
        <Box className="dashboard-metric-card is-earnings">
          <Box className="dashboard-metric-card-top">
            <Box className="dashboard-metric-copy">
              <Typography className="dashboard-metric-value">{summary.pending_transactions ?? 0}</Typography>
              <Typography className="dashboard-metric-label">Pending Transactions</Typography>
            </Box>
          </Box>
        </Box>
        <Box className="dashboard-metric-card is-files">
          <Box className="dashboard-metric-card-top">
            <Box className="dashboard-metric-copy">
              <Typography className="dashboard-metric-value">{summary.missing_files ?? 0}</Typography>
              <Typography className="dashboard-metric-label">Missing Files</Typography>
            </Box>
          </Box>
        </Box>
        <Box className="dashboard-metric-card is-prices">
          <Box className="dashboard-metric-card-top">
            <Box className="dashboard-metric-copy">
              <Typography className="dashboard-metric-value">{summary.missing_prices ?? 0}</Typography>
              <Typography className="dashboard-metric-label">Missing Prices</Typography>
            </Box>
          </Box>
        </Box>
        <Box className="dashboard-metric-card is-beds">
          <Box className="dashboard-metric-card-top">
            <Box className="dashboard-metric-copy">
              <Typography className="dashboard-metric-value">{summary.receptionists_on_duty ?? 0}</Typography>
              <Typography className="dashboard-metric-label">Receptionists On Duty</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box className="dashboard-card monitoring-card">
        <Box className="dashboard-card-toolbar monitoring-filters">
          <TextField
            label="Date start"
            type="date"
            size="small"
            value={filters.date_start}
            onChange={(event) => updateFilter('date_start', event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Date end"
            type="date"
            size="small"
            value={filters.date_end}
            onChange={(event) => updateFilter('date_end', event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          {!assignedLocationId && (
            <TextField
              label="Branch"
              select
              size="small"
              value={filters.location_id}
              onChange={(event) => updateFilter('location_id', event.target.value)}
            >
              <MenuItem value="">All branches</MenuItem>
              {branches.map((branch) => (
                <MenuItem value={String(branch.id)} key={branch.id}>{branch.name}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="Receptionist"
            select
            size="small"
            value={filters.receptionist_id}
            onChange={(event) => updateFilter('receptionist_id', event.target.value)}
          >
            <MenuItem value="">All receptionists</MenuItem>
            {staff.map((person) => (
              <MenuItem value={String(person.id)} key={person.id}>{person.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Status"
            select
            size="small"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
          <TextField
            className="dashboard-tx-search"
            placeholder="Search customer, receptionist, or reference"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Button
            variant={filters.missing_files ? 'contained' : 'outlined'}
            color={filters.missing_files ? 'error' : 'inherit'}
            onClick={() => toggleFlag('missing_files')}
          >
            Missing Attachments
          </Button>
          <Button
            variant={filters.missing_price ? 'contained' : 'outlined'}
            color={filters.missing_price ? 'warning' : 'inherit'}
            onClick={() => toggleFlag('missing_price')}
          >
            Missing Price
          </Button>
        </Stack>

        {!items.length ? (
          <Box className="dashboard-empty-state">
            <Typography className="dashboard-empty-title">No check-ins in this range</Typography>
            <Typography className="dashboard-empty-copy">
              Adjust the date range or filters to review receptionist activity.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer className={`dashboard-tx-table-wrap ${tableLoading ? 'is-loading' : ''}`}>
              {tableLoading && (
                <Box className="dashboard-table-loading">
                  <CircularProgress size={24} />
                </Box>
              )}
              <Table size="small" stickyHeader className="dashboard-tx-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell>Receptionist</TableCell>
                    <TableCell>Check-in Time</TableCell>
                    <TableCell>Transaction</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Files</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Last Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow hover key={item.id}>
                      <TableCell>
                        <Typography className="dashboard-tx-guest-name">{item.customer_name}</Typography>
                        <Typography className="dashboard-tx-bed">{item.reference}</Typography>
                      </TableCell>
                      <TableCell>
                        <BranchBadge
                          name={item.branch_name}
                          color={item.branch_color}
                          textColor={item.branch_color_text}
                        />
                      </TableCell>
                      <TableCell>{item.receptionist_name || '—'}</TableCell>
                      <TableCell className="dashboard-tx-cell-date">{formatDateTime(item.checked_in_at)}</TableCell>
                      <TableCell>{item.transaction_label}</TableCell>
                      <TableCell>
                        <StatusChip status={item.status_key} label={item.status_label} />
                      </TableCell>
                      <TableCell>
                        <CompletenessChip status={item.files_status} kind="files" />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <CompletenessChip status={item.price_status} kind="price" />
                          <Typography className="dashboard-tx-bed">{formatMoney(item.rate)}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell className="dashboard-tx-cell-date">{formatDateTime(item.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box className="dashboard-tx-pagination">
              <Typography className="dashboard-tx-pagination-summary">
                Showing {pagination.total === 0 ? 0 : ((pagination.current_page - 1) * pagination.per_page) + 1}
                –
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
              </Typography>
              <Box className="dashboard-pagination">
                <Button
                  className="dashboard-pagination-btn"
                  disabled={pagination.current_page <= 1}
                  onClick={() => setPage(pagination.current_page - 1)}
                >
                  Previous
                </Button>
                <Button
                  className="dashboard-pagination-btn"
                  disabled={pagination.current_page >= pagination.last_page}
                  onClick={() => setPage(pagination.current_page + 1)}
                >
                  Next
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Box>

      <Box className="dashboard-card monitoring-card">
        <Box className="dashboard-card-toolbar">
          <Box>
            <Typography className="dashboard-card-title">Receptionist duty monitoring</Typography>
            <Typography className="dashboard-empty-copy">
              Duty times use Asia/Manila. One schedule can cover up to 30 days with the same start and cut-off each day.
            </Typography>
          </Box>
          <Button
            variant="contained"
            className="dashboard-add-btn"
            startIcon={<Add />}
            onClick={() => openDutyDialog()}
          >
            Add duty
          </Button>
        </Box>

        {!duties.length ? (
          <Box className="dashboard-empty-state">
            <Typography className="dashboard-empty-title">No duty schedules in this range</Typography>
            <Typography className="dashboard-empty-copy">
              Add a receptionist start and cut-off time to track incomplete work before and after shift end.
            </Typography>
          </Box>
        ) : (
          <TableContainer className="dashboard-tx-table-wrap">
            <Table size="small" stickyHeader className="dashboard-tx-table">
              <TableHead>
                <TableRow>
                  <TableCell>Receptionist</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell>Duty range</TableCell>
                  <TableCell>Start</TableCell>
                  <TableCell>Cut-off</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Check-ins</TableCell>
                  <TableCell align="right">Pending</TableCell>
                  <TableCell align="right">Missing Files</TableCell>
                  <TableCell align="right">Missing Prices</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {duties.map((duty) => (
                  <TableRow hover key={duty.id}>
                    <TableCell>{duty.receptionist_name}</TableCell>
                    <TableCell>
                      <BranchBadge
                        name={duty.branch_name}
                        color={duty.branch_color}
                        textColor={duty.branch_color_text}
                      />
                    </TableCell>
                    <TableCell>
                      {formatDutyRange(duty)}
                      {duty.day_count > 1 ? ` (${duty.day_count} days)` : ''}
                    </TableCell>
                    <TableCell>{duty.start_time}</TableCell>
                    <TableCell>{duty.cutoff_time}{duty.overnight ? ' +1' : ''}</TableCell>
                    <TableCell>
                      <DutyStatusChip status={duty.duty_status} />
                    </TableCell>
                    <TableCell align="right">{duty.total_checkins}</TableCell>
                    <TableCell align="right">{duty.pending_transactions}</TableCell>
                    <TableCell align="right">{duty.missing_files}</TableCell>
                    <TableCell align="right">{duty.missing_prices}</TableCell>
                    <TableCell align="right" className="dashboard-actions-cell">
                      <Tooltip title="Edit duty">
                        <IconButton onClick={() => openDutyDialog(duty)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove duty">
                        <IconButton onClick={() => removeDuty(duty)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={dutyOpen} onClose={closeDutyDialog} fullWidth maxWidth="sm" className="dashboard-dialog">
        <DialogTitle>{editingDuty ? 'Edit duty schedule' : 'Add duty schedule'}</DialogTitle>
        <Box component="form" onSubmit={submitDuty}>
          <DialogContent className="dashboard-dialog-content">
            {dutyErrors.form && <Alert severity="error" sx={{ mb: 2 }}>{dutyErrors.form[0]}</Alert>}
            <Stack spacing={2}>
              <TextField
                label="Receptionist"
                select
                required
                value={dutyForm.user_id}
                onChange={(event) => setDutyForm((current) => ({ ...current, user_id: event.target.value }))}
                error={Boolean(dutyErrors.user_id)}
                helperText={dutyErrors.user_id?.[0]}
              >
                {staff.map((person) => (
                  <MenuItem value={String(person.id)} key={person.id}>{person.name}</MenuItem>
                ))}
              </TextField>
              {!assignedLocationId && (
                <TextField
                  label="Branch"
                  select
                  required
                  value={dutyForm.location_id}
                  onChange={(event) => setDutyForm((current) => ({ ...current, location_id: event.target.value }))}
                  error={Boolean(dutyErrors.location_id)}
                  helperText={dutyErrors.location_id?.[0]}
                >
                  {branches.map((branch) => (
                    <MenuItem value={String(branch.id)} key={branch.id}>{branch.name}</MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                label="From date"
                type="date"
                required
                value={dutyForm.duty_date}
                onChange={(event) => setDutyForm((current) => {
                  const duty_date = event.target.value;
                  const end_date = current.end_date && current.end_date < duty_date ? duty_date : current.end_date;
                  return { ...current, duty_date, end_date };
                })}
                InputLabelProps={{ shrink: true }}
                error={Boolean(dutyErrors.duty_date)}
                helperText={dutyErrors.duty_date?.[0]}
              />
              <TextField
                label="To date"
                type="date"
                required
                value={dutyForm.end_date}
                onChange={(event) => setDutyForm((current) => ({ ...current, end_date: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: dutyForm.duty_date }}
                error={Boolean(dutyErrors.end_date)}
                helperText={
                  dutyErrors.end_date?.[0]
                  || `Same hours apply each day. Maximum ${MAX_DUTY_DAYS} days.`
                }
              />
              <TextField
                label="Duty start"
                type="time"
                required
                value={dutyForm.start_time}
                onChange={(event) => setDutyForm((current) => ({ ...current, start_time: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Duty cut-off"
                type="time"
                required
                value={dutyForm.cutoff_time}
                onChange={(event) => setDutyForm((current) => ({ ...current, cutoff_time: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={Boolean(dutyForm.overnight)}
                    onChange={(event) => setDutyForm((current) => ({ ...current, overnight: event.target.checked }))}
                  />
                )}
                label="Overnight shift (cut-off is the next morning)"
              />
            </Stack>
          </DialogContent>
          <DialogActions className="dashboard-dialog-actions">
            <Button onClick={closeDutyDialog} disabled={dutySaving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={dutySaving}>
              {dutySaving ? 'Saving...' : editingDuty ? 'Save duty' : 'Create duty'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
