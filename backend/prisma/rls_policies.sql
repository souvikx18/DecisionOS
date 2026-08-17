-- ============================================================
-- Context helpers
-- ============================================================

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_org_id', TRUE), '')
$$;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')
$$;


-- ============================================================
-- 1. USERS
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_service" ON users;
DROP POLICY IF EXISTS "users_delete_own" ON users;

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (id = current_user_id());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = current_user_id())
  WITH CHECK (id = current_user_id());

CREATE POLICY "users_delete_own"
  ON users FOR DELETE
  USING (id = current_user_id());

-- No INSERT policy is intentionally created here.
-- Backend/service role is expected to create users.


-- ============================================================
-- 2. SESSIONS
-- ============================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_own" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_own" ON sessions;
DROP POLICY IF EXISTS "sessions_delete_own" ON sessions;

CREATE POLICY "sessions_select_own"
  ON sessions FOR SELECT
  USING ("userId" = current_user_id());

CREATE POLICY "sessions_insert_own"
  ON sessions FOR INSERT
  WITH CHECK ("userId" = current_user_id());

CREATE POLICY "sessions_delete_own"
  ON sessions FOR DELETE
  USING ("userId" = current_user_id());


-- ============================================================
-- 3. EMAIL VERIFICATIONS
-- ============================================================

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_verifications_own" ON email_verifications;

CREATE POLICY "email_verifications_own"
  ON email_verifications FOR ALL
  USING ("userId" = current_user_id())
  WITH CHECK ("userId" = current_user_id());


-- ============================================================
-- 4. PASSWORD RESETS
-- ============================================================

ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "password_resets_own" ON password_resets;

CREATE POLICY "password_resets_own"
  ON password_resets FOR ALL
  USING ("userId" = current_user_id())
  WITH CHECK ("userId" = current_user_id());


-- ============================================================
-- 5. ORGANIZATIONS
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_members_only" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_service" ON organizations;
DROP POLICY IF EXISTS "organizations_update_members" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_owner" ON organizations;

CREATE POLICY "organizations_select_members_only"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT "organizationId"
      FROM organization_members
      WHERE "userId" = current_user_id()
    )
  );

CREATE POLICY "organizations_update_members"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT "organizationId"
      FROM organization_members
      WHERE "userId" = current_user_id()
        AND "role" IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    id IN (
      SELECT "organizationId"
      FROM organization_members
      WHERE "userId" = current_user_id()
        AND "role" IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "organizations_delete_owner"
  ON organizations FOR DELETE
  USING (
    id IN (
      SELECT "organizationId"
      FROM organization_members
      WHERE "userId" = current_user_id()
        AND "role" = 'OWNER'
    )
  );

-- No INSERT policy is intentionally created here.
-- Backend/service role is expected to create organizations.


-- ============================================================
-- 6. ORGANIZATION MEMBERS
-- ============================================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_select_same_org" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_service" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_service" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete_service" ON organization_members;

CREATE POLICY "org_members_select_same_org"
  ON organization_members FOR SELECT
  USING ("organizationId" = current_org_id());

CREATE POLICY "org_members_insert_service"
  ON organization_members FOR INSERT
  WITH CHECK ("organizationId" = current_org_id());

CREATE POLICY "org_members_update_service"
  ON organization_members FOR UPDATE
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

CREATE POLICY "org_members_delete_service"
  ON organization_members FOR DELETE
  USING ("organizationId" = current_org_id());


-- ============================================================
-- 7. INVITATIONS
-- ============================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_org_isolation" ON invitations;

CREATE POLICY "invitations_org_isolation"
  ON invitations FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 8. CUSTOMERS
-- ============================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_org_isolation" ON customers;

CREATE POLICY "customers_org_isolation"
  ON customers FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 9. PRODUCTS
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_org_isolation" ON products;

CREATE POLICY "products_org_isolation"
  ON products FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 10. SALES
-- ============================================================

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_org_isolation" ON sales;

CREATE POLICY "sales_org_isolation"
  ON sales FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 11. EXPENSES
-- ============================================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_org_isolation" ON expenses;

CREATE POLICY "expenses_org_isolation"
  ON expenses FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 12. INVENTORY ITEMS
-- ============================================================

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_org_isolation" ON inventory_items;

CREATE POLICY "inventory_org_isolation"
  ON inventory_items FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 13. UPLOADED FILES
-- ============================================================

ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uploaded_files_org_isolation" ON uploaded_files;

CREATE POLICY "uploaded_files_org_isolation"
  ON uploaded_files FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 14. DATA IMPORTS
-- ============================================================

ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "data_imports_org_isolation" ON data_imports;

CREATE POLICY "data_imports_org_isolation"
  ON data_imports FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 15. AI INSIGHTS
-- ============================================================

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_insights_org_isolation" ON ai_insights;

CREATE POLICY "ai_insights_org_isolation"
  ON ai_insights FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 16. AI USAGE
-- ============================================================

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_org_isolation" ON ai_usage;

CREATE POLICY "ai_usage_org_isolation"
  ON ai_usage FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 17. AI JOBS
-- ============================================================

ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_jobs_org_isolation" ON ai_jobs;

CREATE POLICY "ai_jobs_org_isolation"
  ON ai_jobs FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 18. REPORTS
-- ============================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_org_isolation" ON reports;

CREATE POLICY "reports_org_isolation"
  ON reports FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 19. REPORT EXPORTS
-- ============================================================

ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_exports_org_isolation" ON report_exports;

CREATE POLICY "report_exports_org_isolation"
  ON report_exports FOR ALL
  USING (
    "reportId" IN (
      SELECT id
      FROM reports
      WHERE "organizationId" = current_org_id()
    )
  )
  WITH CHECK (
    "reportId" IN (
      SELECT id
      FROM reports
      WHERE "organizationId" = current_org_id()
    )
  );


-- ============================================================
-- 20. PLANS
-- ============================================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_public_read" ON plans;

CREATE POLICY "plans_public_read"
  ON plans FOR SELECT
  USING (TRUE);

-- No INSERT/UPDATE/DELETE policy: non-service roles cannot modify plans.


-- ============================================================
-- 21. SUBSCRIPTIONS
-- ============================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_org_isolation" ON subscriptions;

CREATE POLICY "subscriptions_org_isolation"
  ON subscriptions FOR ALL
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 22. PAYMENTS
-- ============================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_org_isolation" ON payments;

CREATE POLICY "payments_org_isolation"
  ON payments FOR SELECT
  USING (
    "subscriptionId" IN (
      SELECT id
      FROM subscriptions
      WHERE "organizationId" = current_org_id()
    )
  );

-- Payment writes are intended to come from the backend/Stripe webhook.


-- ============================================================
-- 23. NOTIFICATIONS
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_user_isolation" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_service" ON notifications;

CREATE POLICY "notifications_user_isolation"
  ON notifications FOR SELECT
  USING (
    "organizationId" = current_org_id()
    AND "userId" = current_user_id()
  );

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (
    "organizationId" = current_org_id()
    AND "userId" = current_user_id()
  )
  WITH CHECK (
    "organizationId" = current_org_id()
    AND "userId" = current_user_id()
  );

CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  USING (
    "organizationId" = current_org_id()
    AND "userId" = current_user_id()
  );

CREATE POLICY "notifications_insert_service"
  ON notifications FOR INSERT
  WITH CHECK ("organizationId" = current_org_id());


-- ============================================================
-- 24. AUDIT LOGS
-- ============================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_org_read" ON audit_logs;

CREATE POLICY "audit_logs_org_read"
  ON audit_logs FOR SELECT
  USING ("organizationId" = current_org_id());
