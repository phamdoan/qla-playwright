import path from 'path';
import { Locator, expect, test } from '@playwright/test';
import { ManHinh } from '../../../base.page';
import { ngay } from '../../../../utils/fake-data';
import { DATA_DIR } from '../../../../utils/file-helper';
import { PhienDangNhap } from '../../../common/login.page';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 10K.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó. Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

/** "hòa giải" trên màn viết lúc "hòa" lúc "hoà" (dấu đặt khác nhau là KÝ TỰ khác nhau) → khớp cả hai */
export const hoaGiai = (chu: string) =>
  new RegExp(chu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/h(?:òa|oà)/gi, 'h(?:òa|oà)'), 'i');

/** Ô đang HIỆN trong khung theo nhãn (biểu mẫu có ô ẩn trùng nhãn ở phần nội dung văn bản) */
export const oHien = (m: ManHinh, khung: Locator, nhan: RegExp) =>
  khung.locator('.ant-form-item:visible').filter({ has: m.page.locator('.ant-form-item-label', { hasText: nhan }) }).first();

/** Mở chi tiết đơn theo link và chờ trang vẽ xong (trang 404 / trống → qua Dashboard rồi vào lại) */
export async function moChiTietDon(phien: PhienDangNhap, urlDon: string): Promise<ManHinh> {
  const m = new ManHinh(phien.page);
  await phien.vaoCho(urlDon, m.page.locator('[role=tab][id$="-tab-thong-tin-chung"]'));
  await m.choTaiXong(1500);
  return m;
}

/** Đơn đã kết thúc theo hướng khác (trả đơn, hòa giải/đối thoại không thành…) → chữ trạng thái ở đầu trang; còn lại → undefined */
export async function ketThucKhac(m: ManHinh): Promise<string | undefined> {
  const dau = (await m.page.locator('main').innerText()).split('\n').slice(0, 8).join('\n');
  return dau.match(/^\s*(TRẢ ĐƠN|(?:HÒA GIẢI|HOÀ GIẢI|ĐỐI THOẠI) KHÔNG THÀNH|KHÔNG TIẾN HÀNH.*)\s*$/m)?.[1];
}

/** Số tiếp nhận ở đầu trang đơn ("80743 • Ngày nhận: …") */
export async function soTiepNhanTrenDon(m: ManHinh): Promise<string | undefined> {
  return (await m.page.locator('main').innerText()).slice(0, 400).match(/(\d+)\s*•\s*Ngày nhận/)?.[1];
}

/** Số hiệu văn bản đã ban hành trong bảng "Thông báo, quyết định, văn bản" (cuối tab Đối thoại của đơn); chưa có → undefined */
export async function soVanBan(m: ManHinh, tenVanBan: RegExp): Promise<string | undefined> {
  const bang = m.page.locator('main .ant-table-wrapper').filter({ hasText: 'Số hiệu' }).filter({ hasText: 'Ngày ban hành' }).last();
  await m.choBang(bang);
  const dong = bang.locator('.ant-table-row').filter({ hasText: tenVanBan }).first();
  if (!(await dong.count())) return undefined;
  return (await m.docCot(dong, 'Số hiệu').catch(() => '')) || '-';
}

/** Điền ngày hôm nay vào ô ngày (đã có giá trị thì để nguyên) */
export async function dienNgay(o: Locator) {
  const input = o.locator('.ant-picker input').first();
  if (!(await input.count()) || (await input.inputValue())) return;
  await input.click();
  await input.fill(ngay());
  await input.press('Enter');
}

/**
 * Biểu mẫu văn bản đang mở (quyết định / thông báo / yêu cầu):
 * "Dùng số" (nếu có) → các ô ngày trống điền hôm nay → `dienThem` → "Lưu" → "Ký logic" (nếu có) → "Đóng".
 * Trả về số văn bản (ô đầu tiên có nhãn bắt đầu bằng "Số").
 */
export async function lapVanBanKyLogic(m: ManHinh, bm: Locator, dienThem?: () => Promise<void>): Promise<string> {
  const nutDungSo = m.nut(bm, /Dùng số/);
  if (await nutDungSo.isVisible().catch(() => false)) {
    await nutDungSo.click();
    await m.page.waitForTimeout(800);
  } else {
    test.info().annotations.push({ type: 'Dùng số', description: 'Không thấy nút "Dùng số"' });
  }
  const cacNgay = bm.locator('.ant-form-item:visible').filter({ has: m.page.locator('.ant-picker') });
  for (let i = 0; i < (await cacNgay.count()); i++) await dienNgay(cacNgay.nth(i));
  if (dienThem) await dienThem();
  const oSo = bm.locator('.ant-form-item:visible').filter({ has: m.page.locator('.ant-form-item-label', { hasText: /^\s*\*?\s*Số/ }) }).locator('input').first();
  const so = (await oSo.inputValue().catch(() => '')) || '';

  await m.nut(bm, 'Lưu').click();
  await m.choThongBao(/thành công/i);
  const nutKy = m.nut(bm, /Ký logic/);
  if (await nutKy.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false)) {
    // Popup quyết định giải quyết: cú bấm có tác dụng nhưng Playwright treo chờ ở "done scrolling" → bấm bằng sự kiện
    await nutKy.click({ timeout: 10_000 }).catch(() => nutKy.dispatchEvent('click'));
    await m.dongYTatCaXacNhan();
    await m.choThongBao(/Ký logic thành công|thành công/i);
  }
  const nutDong = m.nut(bm, 'Đóng');
  if (await nutDong.isVisible().catch(() => false)) await nutDong.click();
  await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await m.choTaiXong(1500);
  return so;
}

/** Tệp đính kèm mẫu (.pdf) cho các ô tải lên */
export const TEP_MAU = path.join(DATA_DIR, 'files', 'tai-lieu-mau.pdf');

/** Tải tệp mẫu vào ô tải lên đầu tiên của khung */
export async function dinhKemTep(m: ManHinh, khung: Locator) {
  await khung.locator('input[type=file]').first().setInputFiles(TEP_MAU);
  await m.page.waitForTimeout(1500);
}

/**
 * Mở hồ sơ xử lý đề nghị (DNKN-…) của quyết định công nhận:
 * lần đầu tìm ở "Xử lý đề nghị, kiến nghị xem xét lại quyết định công nhận" (= nút "Mở danh sách xử lý cấp tỉnh" ở đơn)
 * theo số quyết định → bấm mã hồ sơ; lần sau mở thẳng link đã lưu. Mở xong chọn tab `tab` (theo chữ).
 */
export async function moHoSo(
  phien: PhienDangNhap,
  soQDCongNhan: string,
  urlHoSo: string | undefined,
  tab: string,
): Promise<{ m: ManHinh; maHoSo: string; urlHoSo: string }> {
  const m = new ManHinh(phien.page);
  const main = m.page.locator('main');
  const tabHoSo = main.locator('[role=tab]').filter({ hasText: new RegExp(`^\\s*${tab}\\s*$`) }).first();
  if (urlHoSo) {
    await phien.vaoCho(urlHoSo, tabHoSo);
  } else {
    await phien.vaoCho('xem-xet-quyet-dinh/de-nghi-kien-nghi/danh-sach', main.locator('.ant-table-wrapper').first());
    await m.choBang(main);
    // Số quyết định đứng riêng một ô ("46116"), không lẫn trong số khác
    const so = soQDCongNhan.split('/')[0];
    const i = (await main.locator('.ant-table-row').allInnerTexts()).findIndex(t => new RegExp(`(^|\\s)${so}(\\s|$)`).test(t));
    if (i < 0) throw new Error(`Không thấy hồ sơ đề nghị của quyết định ${soQDCongNhan} ở danh sách xử lý đề nghị, kiến nghị`);
    await main.locator('.ant-table-row').nth(i).locator('button, a').filter({ hasText: /DNKN-/ }).first().click();
    await m.page.waitForURL(/de-nghi-kien-nghi\/[0-9a-f-]{36}/, { timeout: 30_000 });
    await tabHoSo.waitFor({ timeout: 30_000 });
  }
  await m.choTaiXong(1500);
  const maHoSo = ((await main.innerText()).match(/DNKN-\d+-\d+/) ?? [''])[0];
  await m.page.locator('button', { hasText: 'Để sau' }).first().click({ timeout: 2_000 }).catch(() => undefined);
  await tabHoSo.click();
  await m.choTaiXong(1500);
  return { m, maHoSo, urlHoSo: m.page.url().replace(/[?&]tab=[^&]*/, '') };
}

/**
 * Nội dung tab của hồ sơ tải chậm (~15s, vòng xoay giữa trang) và lúc đầu còn hiện nội dung tab cũ →
 * không dùng "chưa thấy nút" để kết luận phần đó đã làm. Chờ tới khi: nút `nut` hiện → 'lam' (cần làm),
 * hoặc chữ trong trang khớp `daXong` (vd. thẻ "NHẬN HỒ SƠ NGUỒN — Đã hoàn tất") → 'xong'.
 */
export async function nutHoacXong(m: ManHinh, nut: Locator, daXong: RegExp, timeout = 90_000): Promise<'lam' | 'xong'> {
  let kq: 'lam' | 'xong' | undefined;
  await expect
    .poll(
      async () => {
        if (daXong.test((await m.page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' '))) kq = 'xong';
        else if (await nut.isVisible().catch(() => false)) kq = 'lam';
        return kq;
      },
      { timeout, intervals: [1_000], message: `Không thấy nút cần bấm lẫn dấu hiệu đã xong (${daXong.source})` },
    )
    .toBeTruthy();
  return kq!;
}
