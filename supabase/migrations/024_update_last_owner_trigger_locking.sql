-- Update last-owner trigger function with explicit PERFORM FOR UPDATE locking
CREATE OR REPLACE FUNCTION public.tr_protect_last_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_count INTEGER;
BEGIN
    -- Check when an owner row is deleted or an owner's role is updated away from 'owner'
    IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR 
       (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner') THEN

        -- 1. Lock the parent workspace row FOR UPDATE to serialize concurrent owner changes.
        -- If the workspace itself is being deleted in this transaction (cascade),
        -- FOUND will be false and we do not block workspace deletion.
        PERFORM 1 FROM public.workspaces WHERE id = OLD.workspace_id FOR UPDATE;

        IF FOUND THEN
            -- 2. Check remaining owners in the workspace
            SELECT COUNT(*) INTO v_owner_count
            FROM public.workspace_members
            WHERE workspace_id = OLD.workspace_id
              AND role = 'owner'
              AND id != OLD.id;

            IF v_owner_count = 0 THEN
                IF TG_OP = 'DELETE' THEN
                    RAISE EXCEPTION 'CANNOT_REMOVE_LAST_OWNER: Cannot delete the last remaining owner of workspace %', OLD.workspace_id;
                ELSE
                    RAISE EXCEPTION 'CANNOT_DEMOTE_LAST_OWNER: Cannot demote the last remaining owner of workspace %', OLD.workspace_id;
                END IF;
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;
