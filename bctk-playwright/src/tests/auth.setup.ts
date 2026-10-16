import { test as setup } from '@playwright/test';
import { AUTH_FILE } from '../../playwright.config';
import { LoginPage } from '../pages/common/login.page';

// Phiên dùng chung cho các spec một tài khoản (1A, 1C, 1D, 2A). Luồng 1B tự đăng nhập từng tài khoản.
setup('Đăng nhập và lưu phiên', async ({ page }) => {
  const user = process.env.BCTK_USER;
  if (!user) throw new Error('Thiếu BCTK_USER trong .env');
  await new LoginPage(page).dangNhap(user, process.env.BCTK_PASS || undefined);
  await page.context().storageState({ path: AUTH_FILE });
});
