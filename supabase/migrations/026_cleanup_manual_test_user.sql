-- Clean up any malformed test user from manual insert
DELETE FROM auth.identities WHERE email = 'docchase.secondary.tester@gmail.com';
DELETE FROM auth.users WHERE email = 'docchase.secondary.tester@gmail.com';
DELETE FROM public.profiles WHERE email = 'docchase.secondary.tester@gmail.com';
