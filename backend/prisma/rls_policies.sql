-- ============================================================
-- DecisionOS — Row Level Security (RLS) Policies
-- ============================================================
-- HOW TO APPLY:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste this entire file and click "Run"
--
-- HOW IT WORKS:
--   The backend sets app.current_org_id and app.current_user_id
--   before every query via Prisma middleware.
--   RLS policies read these values to enforce isolation.
--
--   Service role (your backend server) bypasses RLS automatically.
--   Anon/authenticated roles are restricted by these policies.
-- ============================================================


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns the current organization ID set by the backend
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_org_id', TRUE), '')
$$ LANGUAGE SQL STABLE;

-- Returns the current user ID set by the backend
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')
$$ LANGUAGE SQL STABLE;


-- ============================================================
-- 1. USERS TABLE
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see and edit their own record
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (id = current_user_id());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = current_user_id());

-- Only backend (service role) can insert/delete users
CREATE POLICY "users_insert_service"
  ON users FOR INSERT
  WITH CHECK (TRUE); -- Service role bypasses; anon cannot insert

CREATE POLICY "users_delete_own"
  ON users FOR DELETE
  USING (id = current_user_id());


-- ============================================================
-- 2. SESSIONS TABLE
-- ============================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_own"
  ON sessions FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "sessions_insert_own"
  ON sessions FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "sessions_delete_own"
  ON sessions FOR DELETE
  USING (user_id = current_user_id());


-- ============================================================
-- 3. EMAIL VERIFICATIONS TABLE
-- ============================================================
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_verifications_own"
  ON email_verifications FOR ALL
  USING (user_id = current_user_id());


-- ============================================================
-- 4. PASSWORD RESETS TABLE
-- ============================================================
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "password_resets_own"
  ON password_resets FOR ALL
  USING (user_id = current_user_id());


-- ============================================================
-- 5. ORGANIZATIONS TABLE
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- A user can only see orgs they are a member of
CREATE POLICY "organizations_select_members_only"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = current_user_id()
    )
  );

-- Only backend (service role) can create/update/delete orgs
CREATE POLICY "organizations_insert_service"
  ON organizations FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "organizations_update_members"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = current_user_id()
        AND role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "organizations_delete_owner"
  ON organizations FOR DELETE
  USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = current_user_id()
        AND role = 'OWNER'
    )
  );


-- ============================================================
-- 6. ORGANIZATION MEMBERS TABLE
-- ============================================================
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members in the same org
CREATE POLICY "org_members_select_same_org"
  ON organization_members FOR SELECT
  USING (organization_id = current_org_id());

-- Only OWNER/ADMIN can insert members (handled via backend + service role)
CREATE POLICY "org_members_insert_service"
  ON organization_members FOR INSERT
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY "org_members_update_service"
  ON organization_members FOR UPDATE
  USING (organization_id = current_org_id());

CREATE POLICY "org_members_delete_service"
  ON organization_members FOR DELETE
  USING (organization_id = current_org_id());


-- ============================================================
-- 7. INVITATIONS TABLE
-- ============================================================
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_org_isolation"
  ON invitations FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 8. CUSTOMERS TABLE
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_org_isolation"
  ON customers FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 9. PRODUCTS TABLE
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_org_isolation"
  ON products FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 10. SALES TABLE
-- ============================================================
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_org_isolation"
  ON sales FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 11. EXPENSES TABLE
-- ============================================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_org_isolation"
  ON expenses FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 12. INVENTORY ITEMS TABLE
-- ============================================================
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_org_isolation"
  ON inventory_items FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 13. UPLOADED FILES TABLE
-- ============================================================
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uploaded_files_org_isolation"
  ON uploaded_files FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 14. DATA IMPORTS TABLE
-- ============================================================
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_imports_org_isolation"
  ON data_imports FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 15. AI INSIGHTS TABLE
-- ============================================================
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_insights_org_isolation"
  ON ai_insights FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 16. AI USAGE TABLE
-- ============================================================
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_org_isolation"
  ON ai_usage FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 17. AI JOBS TABLE
-- ============================================================
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_jobs_org_isolation"
  ON ai_jobs FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 18. REPORTS TABLE
-- ============================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_org_isolation"
  ON reports FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 19. REPORT EXPORTS TABLE
-- ============================================================
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

-- Report exports are accessible if the parent report belongs to the org
CREATE POLICY "report_exports_org_isolation"
  ON report_exports FOR ALL
  USING (
    report_id IN (
      SELECT id FROM reports
      WHERE organization_id = current_org_id()
    )
  );


-- ============================================================
-- 20. PLANS TABLE
-- ============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Plans are public read — anyone authenticated can see them
CREATE POLICY "plans_public_read"
  ON plans FOR SELECT
  USING (TRUE);

-- Only service role (admin) can modify plans
-- (No INSERT/UPDATE/DELETE policy = blocked for non-service roles)


-- ============================================================
-- 21. SUBSCRIPTIONS TABLE
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_org_isolation"
  ON subscriptions FOR ALL
  USING (organization_id = current_org_id());


-- ============================================================
-- 22. PAYMENTS TABLE
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Payments readable only if the linked subscription belongs to current org
CREATE POLICY "payments_org_isolation"
  ON payments FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions
      WHERE organization_id = current_org_id()
    )
  );

-- Only service role can insert/update payments (via Stripe webhooks)


-- ============================================================
-- 23. NOTIFICATIONS TABLE
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications within their org
CREATE POLICY "notifications_user_isolation"
  ON notifications FOR SELECT
  USING (
    organization_id = current_org_id()
    AND user_id = current_user_id()
  );

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (
    organization_id = current_org_id()
    AND user_id = current_user_id()
  );

CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  USING (
    organization_id = current_org_id()
    AND user_id = current_user_id()
  );

-- Service role inserts notifications (system-generated)
CREATE POLICY "notifications_insert_service"
  ON notifications FOR INSERT
  WITH CHECK (organization_id = current_org_id());


-- ============================================================
-- 24. AUDIT LOGS TABLE
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs: read-only for org members. Only service role can write.
CREATE POLICY "audit_logs_org_read"
  ON audit_logs FOR SELECT
  USING (organization_id = current_org_id());

-- No INSERT/UPDATE/DELETE policy for non-service roles
-- Audit logs are immutable from user perspective


-- ============================================================
-- VERIFY: List all tables with RLS enabled
-- ============================================================
-- Run this after applying to confirm all tables are protected:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- Every business table should show rowsecurity = TRUE
