import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { AUTH_FILE_TKM, DS_VAI_TKM, authFileVaiTKM, credentialsTKM, credentialsVaiTKM } from '../account';
import { loginSSO } from '../common/login';

/**
 * Đăng nhập SSO bằng tài khoản riêng của luồng "Thêm mới đơn theo bản án sơ thẩm" (QLA_TKM_USER),
 * lưu session vào file riêng → không ảnh hưởng session của các test cũ (AUTH_FILE).
 */
setup('đăng nhập SSO – tài khoản luồng nhập đơn', async ({ page }) => {
  const cred = credentialsTKM();
  if (!cred) throw new Error('Thiếu QLA_TKM_USER (khai trong e2e/.env.dev hoặc e2e/.env.staging)');

  await loginSSO(page, cred.user, { pass: cred.pass });

  fs.mkdirSync(path.dirname(AUTH_FILE_TKM), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE_TKM });
});

/** Đăng nhập sẵn các vai duyệt của Bước 6–9 (Chánh văn phòng, Phó Chánh án) */
for (const vai of DS_VAI_TKM) {
  setup(`đăng nhập SSO – ${vai}`, async ({ browser }) => {
    const cred = credentialsVaiTKM(vai);
    setup.skip(!cred, `Chưa khai tài khoản cho vai ${vai}`);
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await loginSSO(page, cred!.user, { pass: cred!.pass });
    fs.mkdirSync(path.dirname(authFileVaiTKM(vai)), { recursive: true });
    await context.storageState({ path: authFileVaiTKM(vai) });
    await context.close();
  });
}
