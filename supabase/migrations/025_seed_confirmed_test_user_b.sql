-- Seed secondary test user for multi-user security tests
DO $$
DECLARE
    v_user_id UUID := '77777777-7777-7777-7777-777777777777';
    v_email TEXT := 'docchase.secondary.tester@gmail.com';
    v_encrypted_pw TEXT;
BEGIN
    v_encrypted_pw := extensions.crypt('TestPassword123!@#SecureB', extensions.gen_salt('bf'));

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_email,
            v_encrypted_pw,
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Secondary Security Tester"}',
            NOW(),
            NOW()
        );

        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email),
            'email',
            v_email,
            NOW(),
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE email = v_email;
    END IF;
END;
$$;
