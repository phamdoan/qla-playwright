import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { loginSSO } from '../common/login';
import { AUTH_FILE, DS_VAI, authFileVai, credentials, credentialsVai } from '../account';

/** Đăng nhập SSO một lần, lưu session vào AUTH_FILE cho các test dùng lại (xem common/login.ts). */
setup('đăng nhập SSO', async ({ page }) => {
  const cred = credentials();
  if (!cred) throw new Error('Thiếu QLA_LOGIN_USER trong e2e/.env');

  await loginSSO(page, cred.user, { pass: cred.pass });

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});

/** Đăng nhập từng vai có khai QLA_<VAI>_USER, lưu session riêng (dùng cho luồng xuyên suốt nhiều vai) */
for (const vai of DS_VAI) {
  setup(`đăng nhập SSO – ${vai}`, async ({ browser }) => {
    const cred = credentialsVai(vai);
    setup.skip(!cred, `Không khai QLA_${vai}_USER trong e2e/.env`);

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await loginSSO(page, cred!.user, { pass: cred!.pass });
    fs.mkdirSync(path.dirname(authFileVai(vai)), { recursive: true });
    await context.storageState({ path: authFileVai(vai) });
    await context.close();
  });
}
