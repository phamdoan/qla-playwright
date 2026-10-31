import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn2C, TK_LANH_DAO, TK_VU_TRUONG, TrangThai2C } from '../cau-hinh-2C';
import { chonNguoi, chonTab, dongHoSo, locTheoBanAn } from './chung';

/**
 * BƯỚC 02 · Vụ trưởng · Phân công thẩm phán ngẫu nhiên, tạo tờ trình, trình ký (hướng dẫn bước 2)
 *
 *  1. Giám đốc thẩm, tái thẩm › Phân công › Phân công thẩm phán → tab "DS chưa phân công ngẫu nhiên"
 *     · Hình thức phân công "Hồ sơ kháng nghị GĐT-TT" · lọc theo số bản án → có dòng của hồ sơ
 *     → "Phân công ngẫu nhiên" → "Xác nhận"
 *  2. Tab "Quản lý kết quả phân công" → tick dòng của hồ sơ → "Tạo tờ trình phân công"
 *     → Người ký = lãnh đạo (Nguyễn Hải Trâm) → "Lưu văn bản" → "Lấy số" → "Trình ký"
 */
export const buoc02: Buoc<BanAn2C, TrangThai2C> = {
  so: 2,
  ten: 'Vụ trưởng · Phân công thẩm phán ngẫu nhiên, tạo tờ trình phân công, trình ký',
  huongDan: '2',
  chay: async ({ vuAn, tt, moPhien, can }) => {
    const soKhangNghi = can('soKhangNghi', 1);
    const phien = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phien.page);
    await phien.vao('vu-an/gdt-tt/phan-cong-vu-an/danh-sach');
    const main = m.page.locator('main');

    // ── Phân công ngẫu nhiên (hồ sơ còn ở danh sách chưa phân công) ──
    await chonTab(m, 'DS chưa phân công ngẫu nhiên');
    await locTheoBanAn(m, vuAn.soBanAn);
    const chuaPC = dongHoSo(m, soKhangNghi);
    // Bảng tải chậm sau khi lọc → chờ dòng (không có sau 15s = đã phân công ở lượt trước)
    if (await chuaPC.waitFor({ timeout: 15_000 }).then(() => true).catch(() => false)) {
      const chon = chuaPC.locator('input[type=checkbox]').first();
      if (await chon.count()) await chon.check();
      await m.nut(main, 'Phân công ngẫu nhiên').click();
      const hoi = m.page.locator('.ant-modal-wrap:visible .ant-modal').last();
      await hoi.waitFor({ timeout: 15_000 });
      await m.nut(hoi, /Xác nhận/).click();
      // Thông báo không cố định chữ → chờ hồ sơ rời danh sách chưa phân công
      await expect(chuaPC, 'Phân công ngẫu nhiên xong nhưng hồ sơ vẫn ở danh sách chưa phân công').toBeHidden({ timeout: 30_000 });
      await m.choTaiXong(1500);
    }

    // ── Tờ trình phân công ──
    await chonTab(m, 'Quản lý kết quả phân công');
    await locTheoBanAn(m, vuAn.soBanAn);
    const dong = dongHoSo(m, soKhangNghi);
    await expect(dong, `Không thấy hồ sơ KN ${soKhangNghi} trong "Quản lý kết quả phân công"`).toBeVisible({ timeout: 30_000 });
    const chu = (await dong.innerText()).replace(/\s+/g, ' ');
    // Cột thẩm phán: tên đứng ngay trước nút "Sửa" ở cuối dòng
    // Tên = chuỗi từ VIẾT HOA liền trước nút "Sửa" (ô trạng thái "Dự thảo" đứng ngay trước, có chữ thường → không lấn sang)
    // Chữ có thể ở dạng dấu tổ hợp (NFD) → "thảo" lọt vào \p{Lu}…, ra "Dự thảo Nguyễn Hồng Nam" → chuẩn hóa NFC, bỏ chữ trạng thái đứng đầu
    const thamPhan =
      chu.normalize('NFC').match(/((?:\p{Lu}[\p{Ll}\p{M}]*\s+){1,5}\p{Lu}[\p{Ll}\p{M}]*)\s*Sửa\s*$/u)?.[1]?.trim().replace(/^(Dự thảo|Đã ban hành|Chờ ký)\s+/u, '') ??
      tt.thamPhan?.replace(/^Dự thảo\s+/u, '');
    // Tờ trình "Dự thảo" vẫn giữ chữ này sau khi trình ký (đổi thành "Đã ban hành" khi lãnh đạo ký)
    // → trình ký xong thì ghi state, lượt sau bỏ qua; đã ban hành thì cũng bỏ qua
    // Đã có tờ trình thì dòng ghi "Người ký: … Số:546/TTr-TANDTC" → lấy số cho bước 04 ký đúng tờ trình
    const soToTrinhDong = chu.match(/Người ký[^]*?Số:\s*(\d+)/)?.[1] ?? tt.soToTrinh;
    if (tt.daTrinhKyToTrinh || /Đã ban hành/.test(chu)) return { thamPhan, soToTrinh: soToTrinhDong, daTrinhKyToTrinh: true };

    // Tick dòng → "Tạo tờ trình phân công": lần đầu tạo mới, lần sau mở lại bản dự thảo đã lưu
    await dong.locator('input[type=checkbox]').first().check();
    await m.nut(main, /Tạo tờ trình phân công/).click();
    const tt2 = m.page.locator('.ant-modal-wrap:visible .ant-modal').last();
    await tt2.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);
    // Mở lại bản dự thảo thì ô Người ký trống → luôn chọn lại (thiếu người ký thì "Trình ký" bấm không có tác dụng)
    await chonNguoi(m, m.oTheoNhan('Người ký', tt2), TK_LANH_DAO.ten!);
    const nutLuu = m.nut(tt2, /Lưu văn bản/);
    if (await nutLuu.isEnabled()) {
      await nutLuu.click();
      await m.choThongBao(/thành công/i);
    }
    const nutLaySo = m.nut(tt2, /Lấy số/);
    if (await nutLaySo.isVisible().catch(() => false)) {
      await nutLaySo.click();
      await m.choTaiXong(1500);
    }
    // Số tờ trình đọc TRONG popup sau khi lấy số (dòng bảng chụp trước khi tạo tờ trình chưa có số → state thiếu soToTrinh,
    // bước 04 ký nhầm tờ trình đầu tiên đang chờ của hồ sơ khác)
    const soToTrinh = ((await tt2.innerText()).replace(/\s+/g, ' ').match(/Số:?\s*(\d+)\s*\//) ?? [])[1] ?? soToTrinhDong;
    // Trình ký không hiện thông báo → xác nhận bằng phản hồi của API trình ký
    const [phanHoi] = await Promise.all([
      m.page.waitForResponse(r => /phe-duyet-de-xuat\/trinh-ky/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 }),
      m.nut(tt2, /Trình ký/).click(),
    ]);
    const kq = await phanHoi.json().catch(() => ({}));
    if (!kq?.success) throw new Error(`Trình ký tờ trình phân công không thành công: ${JSON.stringify(kq).slice(0, 300)}`);
    await m.choTaiXong(1500);
    return { thamPhan, soToTrinh, daTrinhKyToTrinh: true };
  },
};
