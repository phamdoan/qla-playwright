import { test } from '@playwright/test';
import { loginSSO } from '../common/login';
import { credentials } from '../account';

/** Kiểm tra luồng đăng nhập SSO từ đầu (không dùng session đã lưu). */
test.use({ storageState: { cookies: [], origins: [] } });

test('đăng nhập SSO', async ({ page }) => {
  const cred = credentials();
  test.skip(!cred, 'Khai QLA_LOGIN_USER trong e2e/.env');
  await loginSSO(page, cred!.user, { pass: cred!.pass });
});
