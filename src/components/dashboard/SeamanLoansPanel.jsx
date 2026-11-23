import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountBalanceWalletOutlined, DeleteOutline, EditOutlined, Search, VisibilityOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { formatDate, formatDateTimeShort, manilaToday } from '../../config/resources';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
];

const PAYMENT_METHODS = [
  { value: 'gcash', label: 'GCash' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
];

const initialPaymentForm = {
  amount: '',
  method: 'gcash',
  reference: '',
  paid_at: manilaToday(),
};

function formatMoney(value) {
  if (value == null || value === '') return '—';

  return `₱${Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusLabel(status) {
  return {
    pending: 'Pending',
    contacted: 'Contacted',
    closed: 'Closed',
  }[status] || status || 'Pending';
}

function statusChip(status) {
  const color = {
    pending: 'warning',
    contacted: 'info',
    closed: 'success',
  }[status] || 'default';

  return <Chip size="small" color={color} label={statusLabel(status)} />;
}

function InquiryField({ label, value, href, wide = false }) {
  return (
    <Box className={`loan-inquiry-field ${wide ? 'is-wide' : ''}`}>
      <span className="loan-inquiry-label">{label}</span>
      <Typography className="loan-inquiry-value">
        {href && value ? <a href={href}>{value}</a> : (value || '—')}
      </Typography>
    </Box>
  );
}

function buildPageNumbers(currentPage, lastPage) {
  if (lastPage <= 1) {
    return lastPage === 1 ? [1] : [];
  }

  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => index + 1);
  }

  const pages = [1];

  if (currentPage > 3) {
    pages.push('ellipsis-start');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(lastPage - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < lastPage - 2) {
    pages.push('ellipsis-end');
  }

  pages.push(lastPage);

  return pages;
}

function TablePagination({ page, lastPage, total, onPageChange }) {
  const pages = buildPageNumbers(page, lastPage);
  const start = total === 0 ? 0 : ((page - 1) * 10) + 1;
  const end = Math.min(page * 10, total);

  return (
    <Box className="dashboard-tx-pagination">
      <Typography className="dashboard-tx-pagination-summary">
        Showing {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </Typography>
      <Box className="dashboard-pagination">
        <Button className="dashboard-pagination-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Prev
        </Button>
        {pages.map((pageNumber) => (
          typeof pageNumber === 'string' ? (
            <Typography key={pageNumber} className="dashboard-pagination-ellipsis">…</Typography>
          ) : (
            <Button
              key={pageNumber}
              className={`dashboard-pagination-btn ${pageNumber === page ? 'is-active' : ''}`}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </Button>
          )
        ))}
        <Button className="dashboard-pagination-btn" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </Box>
    </Box>
  );
}

export default function SeamanLoansPanel() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [paymentErrors, setPaymentErrors] = useState({});
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const searchTimer = useRef(null);

  const loadApplications = useCallback(async (nextPage = page, nextSearch = search, nextStatus = statusFilter) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        per_page: '10',
      });

      if (nextSearch.trim()) {
        params.set('search', nextSearch.trim());
      }

      if (nextStatus !== 'all') {
        params.set('status', nextStatus);
      }

      const response = await apiGet(`/api/seaman-loan?${params.toString()}`);
      setRows(response.data?.data || []);
      setPage(response.data?.current_page || 1);
      setLastPage(response.data?.last_page || 1);
      setTotal(response.data?.total || 0);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load seaman loan inquiries.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearch(value);

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      setPage(1);
      loadApplications(1, value, statusFilter);
    }, 350);
  };

  const handleStatusChange = (event) => {
    const value = event.target.value;
    setStatusFilter(value);
    setPage(1);
    loadApplications(1, search, value);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    loadApplications(nextPage, search, statusFilter);
  };

  const resetPaymentForm = () => {
    setEditingPayment(null);
    setPaymentForm({ ...initialPaymentForm, paid_at: manilaToday() });
    setPaymentErrors({});
  };

  const openInquiry = (row) => {
    setSelected(row);
    setPaymentToDelete(null);
    resetPaymentForm();
    setNotice('');
    setError('');
  };

  const updatePaymentField = (field) => (event) => {
    setPaymentForm((current) => ({ ...current, [field]: event.target.value }));
    setPaymentErrors((current) => ({ ...current, [field]: undefined }));
  };

  const remainingBalance = selected
    ? Math.max(
      0,
      Number(selected.loanable_amount || 0)
        - (selected.payments || [])
          .filter((payment) => payment.id !== editingPayment?.id)
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    )
    : 0;

  const startEditPayment = (payment) => {
    setPaymentToDelete(null);
    setEditingPayment(payment);
    setPaymentForm({
      amount: String(payment.amount ?? ''),
      method: payment.method || 'gcash',
      reference: payment.reference || '',
      paid_at: payment.paid_at || manilaToday(),
    });
    setPaymentErrors({});
    setNotice('');
    setError('');
  };

  const savePayment = async (event) => {
    event.preventDefault();
    if (!selected) return;

    setPaymentLoading(true);
    setError('');
    setNotice('');
    setPaymentErrors({});

    try {
      const response = editingPayment
        ? await apiPut(`/api/seaman-loan/${selected.id}/payments/${editingPayment.id}`, paymentForm)
        : await apiPost(`/api/seaman-loan/${selected.id}/payments`, paymentForm);

      setSelected(response.data);
      resetPaymentForm();
      setNotice(editingPayment ? 'Payment updated.' : 'Payment recorded.');
      await loadApplications(page, search, statusFilter);
    } catch (paymentError) {
      if (paymentError.errors) {
        setPaymentErrors(paymentError.errors);
      }
      setError(paymentError.message || 'Unable to save payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const removePayment = async () => {
    if (!selected || !paymentToDelete) return;

    setPaymentLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await apiDelete(`/api/seaman-loan/${selected.id}/payments/${paymentToDelete.id}`);
      setSelected(response.data);
      if (editingPayment?.id === paymentToDelete.id) {
        resetPaymentForm();
      }
      setPaymentToDelete(null);
      setNotice('Payment removed.');
      await loadApplications(page, search, statusFilter);
    } catch (paymentError) {
      setError(paymentError.message || 'Unable to remove payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const updateStatus = async (application, status) => {
    setActionLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await apiPut(`/api/seaman-loan/${application.id}`, { status });
      const updated = response.data;
      setSelected(updated);
      setNotice(`Marked as ${status}.`);
      await loadApplications(page, search, statusFilter);
    } catch (actionError) {
      setError(actionError.message || 'Unable to update loan inquiry.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Alert severity="error" className="dashboard-notice" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && !selected && (
        <Alert severity="success" className="dashboard-notice" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <Box className="dashboard-tx-card dashboard-reservations-card">
        <Box className="dashboard-tx-toolbar dashboard-reservations-toolbar">
          <Box className="dashboard-tx-heading">
            <span className="dashboard-tx-heading-icon"><AccountBalanceWalletOutlined /></span>
            <Box>
              <Typography className="dashboard-tx-title">Seaman loan inquiries</Typography>
              <Typography className="dashboard-tx-subtitle">
                {total.toLocaleString()} record{total === 1 ? '' : 's'} · submitted from the homepage loan form
              </Typography>
            </Box>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            className="dashboard-reservations-filters"
          >
            <TextField
              size="small"
              placeholder="Search name, phone, email, or agency..."
              value={search}
              onChange={handleSearchChange}
              className="dashboard-tx-search dashboard-reservations-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={handleStatusChange}
              className="dashboard-reservations-status-filter"
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>

        {loading ? (
          <Box className="dashboard-loading dashboard-reservations-loading">
            <CircularProgress size={28} />
          </Box>
        ) : rows.length === 0 ? (
          <Box className="dashboard-empty-state dashboard-reservations-empty">
            <Typography className="dashboard-empty-title">No seaman loan inquiries found</Typography>
            <Typography className="dashboard-empty-copy">
              Inquiries from the homepage Seaman Loan card will appear here.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer className="dashboard-tx-table-wrap dashboard-reservations-table-wrap">
              <Table size="small" className="dashboard-tx-table dashboard-reservations-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Applicant</TableCell>
                    <TableCell>Rank / agency</TableCell>
                    <TableCell>Loanable amount</TableCell>
                    <TableCell>Remaining</TableCell>
                    <TableCell>Departure</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell align="right" className="dashboard-reservations-actions-head">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell className="dashboard-reservations-customer-cell">
                        <Typography className="dashboard-reservations-customer-name">{row.full_name}</Typography>
                        <Typography className="dashboard-reservations-customer-meta">
                          {row.phone} · {row.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>{row.position_rank}</Typography>
                        <Typography className="dashboard-tx-muted">{row.agency_name}</Typography>
                      </TableCell>
                      <TableCell align="right" className="dashboard-tx-cell-money is-strong">
                        {formatMoney(row.loanable_amount)}
                      </TableCell>
                      <TableCell align="right" className="dashboard-tx-cell-money">
                        {formatMoney(row.remaining_balance ?? row.loanable_amount)}
                      </TableCell>
                      <TableCell>{formatDate(row.departure_date)}</TableCell>
                      <TableCell>{statusChip(row.status)}</TableCell>
                      <TableCell className="dashboard-reservations-date-cell">
                        {formatDateTimeShort(row.created_at)}
                      </TableCell>
                      <TableCell align="right" className="dashboard-reservations-actions-cell">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityOutlined />}
                          onClick={() => openInquiry(row)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination page={page} lastPage={lastPage} total={total} onPageChange={handlePageChange} />
          </>
        )}
      </Box>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="md"
        aria-labelledby="loan-inquiry-title"
        className="dashboard-dialog loan-inquiry-dialog"
      >
        {selected && (
          <Box className="loan-inquiry-header">
            <Box>
              <Typography className="loan-inquiry-kicker">Seaman loan inquiry</Typography>
              <Typography id="loan-inquiry-title" component="h2" className="loan-inquiry-name">{selected.full_name}</Typography>
              <Typography className="loan-inquiry-meta">
                {[selected.position_rank, selected.agency_name].filter(Boolean).join(' · ')}
                {selected.created_at ? ` · Submitted ${formatDateTimeShort(selected.created_at)}` : ''}
              </Typography>
            </Box>
            {statusChip(selected.status)}
          </Box>
        )}
        <DialogContent className="dashboard-dialog-content loan-inquiry-content">
          {selected && (
            <>
              {error && (
                <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
              )}
              {notice && (
                <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>
              )}
              <Box className="loan-inquiry-amount-grid is-three">
                <Box className="loan-inquiry-amount-card">
                  <span className="loan-inquiry-label">Loanable amount</span>
                  <Typography className="loan-inquiry-value">{formatMoney(selected.loanable_amount)}</Typography>
                </Box>
                <Box className="loan-inquiry-amount-card">
                  <span className="loan-inquiry-label">Total paid</span>
                  <Typography className="loan-inquiry-value">{formatMoney(selected.total_paid ?? 0)}</Typography>
                </Box>
                <Box className="loan-inquiry-amount-card is-primary">
                  <span className="loan-inquiry-label">Remaining balance</span>
                  <Typography className="loan-inquiry-value">{formatMoney(selected.remaining_balance ?? selected.loanable_amount)}</Typography>
                </Box>
              </Box>

              <Box className="loan-inquiry-section">
                <Typography className="loan-inquiry-section-title">Contact</Typography>
                <Box className="loan-inquiry-grid">
                  <InquiryField label="Phone" value={selected.phone} href={selected.phone ? `tel:${selected.phone}` : undefined} />
                  <InquiryField label="Email" value={selected.email} href={selected.email ? `mailto:${selected.email}` : undefined} />
                  <InquiryField label="Address" value={selected.address} wide />
                </Box>
              </Box>

              <Box className="loan-inquiry-section">
                <Typography className="loan-inquiry-section-title">Application details</Typography>
                <Box className="loan-inquiry-grid">
                  <InquiryField label="Birthday" value={formatDate(selected.birthday)} />
                  <InquiryField label="Departure date" value={formatDate(selected.departure_date)} />
                  <InquiryField label="Position / rank" value={selected.position_rank} />
                  <InquiryField label="Agency" value={selected.agency_name} />
                  <InquiryField label="Basic salary" value={formatMoney(selected.basic_salary)} />
                </Box>
              </Box>

              <Box className="loan-inquiry-section">
                <Typography className="loan-inquiry-section-title">Payments</Typography>
                {selected.payments?.length ? (
                  <TableContainer className="loan-inquiry-payments-table">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Reference</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selected.payments.map((payment) => (
                          <TableRow key={payment.id} className={editingPayment?.id === payment.id ? 'is-editing' : ''}>
                            <TableCell>{formatDate(payment.paid_at)}</TableCell>
                            <TableCell>{payment.method_label}</TableCell>
                            <TableCell>{payment.reference || '—'}</TableCell>
                            <TableCell align="right">{formatMoney(payment.amount)}</TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <Tooltip title="Edit payment">
                                  <IconButton
                                    aria-label="Edit payment"
                                    size="small"
                                    onClick={() => startEditPayment(payment)}
                                    disabled={paymentLoading}
                                  >
                                    <EditOutlined fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove payment">
                                  <IconButton
                                    aria-label="Remove payment"
                                    size="small"
                                    onClick={() => setPaymentToDelete(payment)}
                                    disabled={paymentLoading}
                                  >
                                    <DeleteOutline fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography className="loan-inquiry-empty">No payments recorded yet.</Typography>
                )}

                {remainingBalance > 0 || editingPayment ? (
                  <Box component="form" className="loan-inquiry-payment-form" onSubmit={savePayment}>
                    <Typography className="loan-inquiry-section-title">
                      {editingPayment ? 'Edit payment' : 'Add payment'}
                    </Typography>
                    <Box className="loan-inquiry-grid">
                      <TextField
                        label="Amount"
                        type="number"
                        required
                        size="small"
                        inputProps={{ min: 0.01, step: '0.01', max: remainingBalance }}
                        value={paymentForm.amount}
                        onChange={updatePaymentField('amount')}
                        error={Boolean(paymentErrors.amount?.[0])}
                        helperText={paymentErrors.amount?.[0] || `Remaining ${formatMoney(remainingBalance)}`}
                      />
                      <TextField
                        select
                        label="Method"
                        required
                        size="small"
                        value={paymentForm.method}
                        onChange={updatePaymentField('method')}
                        error={Boolean(paymentErrors.method?.[0])}
                        helperText={paymentErrors.method?.[0]}
                      >
                        {PAYMENT_METHODS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        label="Reference"
                        size="small"
                        value={paymentForm.reference}
                        onChange={updatePaymentField('reference')}
                        error={Boolean(paymentErrors.reference?.[0])}
                        helperText={paymentErrors.reference?.[0] || 'GCash, bank, or cheque reference'}
                      />
                      <TextField
                        label="Payment date"
                        type="date"
                        required
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={paymentForm.paid_at}
                        onChange={updatePaymentField('paid_at')}
                        error={Boolean(paymentErrors.paid_at?.[0])}
                        helperText={paymentErrors.paid_at?.[0]}
                      />
                    </Box>
                    <Box className="loan-inquiry-payment-actions">
                      {editingPayment && (
                        <Button type="button" onClick={resetPaymentForm} disabled={paymentLoading}>
                          Cancel
                        </Button>
                      )}
                      <Button type="submit" variant="contained" disabled={paymentLoading}>
                        {paymentLoading
                          ? 'Saving...'
                          : editingPayment
                            ? 'Save changes'
                            : 'Record payment'}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography className="loan-inquiry-empty">This loan is fully paid.</Typography>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions className="loan-inquiry-actions">
          <Button onClick={() => setSelected(null)}>Close</Button>
          {selected?.status !== 'pending' && (
            <Button variant="outlined" disabled={actionLoading} onClick={() => updateStatus(selected, 'pending')}>
              Mark pending
            </Button>
          )}
          {selected?.status !== 'contacted' && (
            <Button variant="outlined" disabled={actionLoading} onClick={() => updateStatus(selected, 'contacted')}>
              {actionLoading ? 'Saving...' : 'Mark contacted'}
            </Button>
          )}
          {selected?.status !== 'closed' && (
            <Button variant="contained" disabled={actionLoading} onClick={() => updateStatus(selected, 'closed')}>
              {actionLoading ? 'Saving...' : 'Mark closed'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(paymentToDelete)}
        onClose={() => !paymentLoading && setPaymentToDelete(null)}
        fullWidth
        maxWidth="xs"
        className="dashboard-dialog"
      >
        <DialogTitle>Remove payment</DialogTitle>
        <DialogContent className="dashboard-dialog-content">
          <Typography>
            Remove the {paymentToDelete ? formatMoney(paymentToDelete.amount) : ''} {paymentToDelete?.method_label || 'payment'}
            {paymentToDelete?.paid_at ? ` from ${formatDate(paymentToDelete.paid_at)}` : ''}? This will update total paid and remaining balance.
          </Typography>
        </DialogContent>
        <DialogActions className="dashboard-dialog-actions">
          <Button onClick={() => setPaymentToDelete(null)} disabled={paymentLoading}>Cancel</Button>
          <Button color="error" variant="contained" onClick={removePayment} disabled={paymentLoading}>
            {paymentLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
