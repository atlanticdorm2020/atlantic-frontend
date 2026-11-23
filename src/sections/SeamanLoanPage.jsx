import { useState } from 'react';
import {
  ArrowForward,
  Check,
  ExpandMore,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { submitSeamanLoan } from '../config/api';
import { seamanLoan } from '../data';
import { Footer, useSectionReveal } from './HomeSections';

const initialForm = {
  full_name: '',
  address: '',
  birthday: '',
  phone: '',
  email: '',
  position_rank: '',
  basic_salary: '',
  departure_date: '',
  agency_name: '',
  loanable_amount: '',
};

function FieldGroup({ title, description, children }) {
  return (
    <Box className="register-form-group">
      <Box className="register-form-group-heading">
        <Typography component="h2" className="register-form-group-title">{title}</Typography>
        {description && <Typography className="register-form-group-description">{description}</Typography>}
      </Box>
      <Box className="register-form-grid">{children}</Box>
    </Box>
  );
}

export default function SeamanLoanPage() {
  useSectionReveal();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const fieldError = (name) => errors[name]?.[0];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSubmitError('');
    setErrors({});

    try {
      await submitSeamanLoan(form);
      setSubmitted(true);
      setForm(initialForm);
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      }
      setSubmitError(error.message || 'Unable to submit your seaman loan inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main>
        <section className="page-hero" data-scroll-section>
          <Container className="site-container page-hero-layout">
            <Box className="page-hero-copy">
              <Typography className="eyebrow">Finance</Typography>
              <Typography component="h1" className="page-title">Seaman Loan</Typography>
              <Typography className="section-description">{seamanLoan.intro}</Typography>
              <Button variant="contained" href="#loan-application" endIcon={<ArrowForward />} sx={{ mt: 3 }}>
                Start application
              </Button>
            </Box>
            <Box className="page-hero-image is-cover">
              <img src={seamanLoan.image} alt="Seaman Loan at Atlantic Seaman's Dormitory" />
            </Box>
          </Container>
        </section>

        <section className="section loan-highlights-section" data-scroll-section>
          <Container className="site-container">
            <Typography className="eyebrow">Loan details</Typography>
            <Typography component="h2" className="section-title">Rates, term, and releasing</Typography>
            <Box className="loan-highlight-grid">
              {seamanLoan.highlights.map(([label, value]) => (
                <Box className="loan-highlight-card" key={label}>
                  <Typography className="loan-highlight-label">{label}</Typography>
                  <Typography className="loan-highlight-value">{value}</Typography>
                </Box>
              ))}
            </Box>
            <Stack className="loan-detail-list" spacing={1.5}>
              {seamanLoan.details.map(([label, value]) => (
                <Typography key={label}><strong>{label}</strong> {value}</Typography>
              ))}
            </Stack>
          </Container>
        </section>

        <section className="section" data-scroll-section>
          <Container className="site-container rules-layout">
            <Box>
              <Typography className="eyebrow">What to prepare</Typography>
              <Typography component="h2" className="section-title">Requirements</Typography>
              <Typography className="section-description">
                Bring these documents for evaluation. You can start the inquiry online, then submit the complete set during interview or walk-in.
              </Typography>
              <Box className="check-list">
                {seamanLoan.requirements.map((item) => (
                  <Typography key={item}><Check />{item}</Typography>
                ))}
              </Box>
            </Box>
            <Box className="inner-feature-image">
              <img src={seamanLoan.image} alt="Seaman loan requirements" />
            </Box>
          </Container>
        </section>

        <section className="section loan-process-section" data-scroll-section>
          <Container className="site-container">
            <Typography className="eyebrow">How it works</Typography>
            <Typography component="h2" className="section-title">Application process</Typography>
            <Box className="stage-list loan-process-list">
              {seamanLoan.process.map(([title, copy], index) => (
                <Box className="stage-item" key={title}>
                  <span>0{index + 1}</span>
                  <Box>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </Box>
                </Box>
              ))}
            </Box>
          </Container>
        </section>

        <section className="section faq-section" data-scroll-section>
          <Container className="site-container faq-layout">
            <Box>
              <Typography component="h2" className="section-title">Seaman loan FAQs</Typography>
              <Typography className="section-description">
                Common questions about rates, documents, releasing, and repayment.
              </Typography>
            </Box>
            <Box className="faq-list">
              {seamanLoan.faqs.map(([question, answer]) => (
                <Accordion key={question}>
                  <AccordionSummary expandIcon={<ExpandMore />}>{question}</AccordionSummary>
                  <AccordionDetails>{answer}</AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Container>
        </section>

        <section className="section register-section" id="loan-application" data-scroll-section>
          <Container className="site-container">
            {submitted ? (
              <Box className="register-success-card">
                <Typography component="h2" className="register-form-group-title">
                  Inquiry submitted
                </Typography>
                <Typography className="register-form-group-description">
                  Thank you. We received your seaman loan application and will contact you for the interview and document evaluation.
                </Typography>
                <Box className="register-form-actions">
                  <Button variant="contained" onClick={() => setSubmitted(false)}>
                    Submit another inquiry
                  </Button>
                  <Button href="/contacts" variant="outlined">Contact a branch</Button>
                </Box>
              </Box>
            ) : (
              <Box component="form" className="register-form" onSubmit={handleSubmit} noValidate>
                {submitError && (
                  <Alert severity="error" className="register-alert">
                    {submitError}
                  </Alert>
                )}

                <FieldGroup
                  title="Application details"
                  description="Fill in the inquiry form. After you submit, we will follow up for documents, a 5 to 15 minute interview, evaluation, and releasing."
                >
                  <TextField label="Full name" required fullWidth value={form.full_name} onChange={updateField('full_name')} error={Boolean(fieldError('full_name'))} helperText={fieldError('full_name')} />
                  <TextField label="Phone" required fullWidth value={form.phone} onChange={updateField('phone')} error={Boolean(fieldError('phone'))} helperText={fieldError('phone')} />
                  <TextField label="Email" type="email" required fullWidth value={form.email} onChange={updateField('email')} error={Boolean(fieldError('email'))} helperText={fieldError('email')} />
                  <TextField label="Birthday" type="date" required fullWidth InputLabelProps={{ shrink: true }} value={form.birthday} onChange={updateField('birthday')} error={Boolean(fieldError('birthday'))} helperText={fieldError('birthday')} />
                  <TextField label="Address" required fullWidth className="register-field-full" value={form.address} onChange={updateField('address')} error={Boolean(fieldError('address'))} helperText={fieldError('address')} />
                  <TextField label="Position / rank" required fullWidth value={form.position_rank} onChange={updateField('position_rank')} error={Boolean(fieldError('position_rank'))} helperText={fieldError('position_rank')} />
                  <TextField label="Basic salary" type="number" required fullWidth inputProps={{ min: 0, step: '0.01' }} value={form.basic_salary} onChange={updateField('basic_salary')} error={Boolean(fieldError('basic_salary'))} helperText={fieldError('basic_salary')} />
                  <TextField label="Departure date" type="date" required fullWidth InputLabelProps={{ shrink: true }} value={form.departure_date} onChange={updateField('departure_date')} error={Boolean(fieldError('departure_date'))} helperText={fieldError('departure_date')} />
                  <TextField label="Agency name" required fullWidth value={form.agency_name} onChange={updateField('agency_name')} error={Boolean(fieldError('agency_name'))} helperText={fieldError('agency_name')} />
                  <TextField label="Loanable amount" type="number" required fullWidth inputProps={{ min: 0, step: '0.01' }} value={form.loanable_amount} onChange={updateField('loanable_amount')} error={Boolean(fieldError('loanable_amount'))} helperText={fieldError('loanable_amount')} />
                </FieldGroup>

                <Box className="register-form-actions">
                  <Button type="submit" variant="contained" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit inquiry'}
                  </Button>
                  <Typography className="register-form-footnote">
                    Submitting this form starts the inquiry. Prepare the required documents for interview and evaluation. You may also walk in or contact a branch.
                  </Typography>
                </Box>
              </Box>
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
