-- Confirm the test accountant user for E2E verification
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'docchase.audit.1789840548911@gmail.com' AND email_confirmed_at IS NULL;
