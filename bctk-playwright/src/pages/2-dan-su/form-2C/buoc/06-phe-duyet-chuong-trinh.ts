import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn2C, TK_LANH_DAO, TK_VU_TRUONG, TrangThai2C } from '../cau-hinh-2C';
import { locTheoBanAn, xuLyChoDuyet } from './chung';

/**
 * BƯỚC 06 · Lãnh đạo · Phê duyệt chương trình làm việc (hướng dẫn bước 6)
 *
 *  Tài khoản lãnh đạo → Công tác lãnh đạo › Phê duyệt đề xuất › tab "Chờ duyệt"
 *  → mở "Chương trình làm việc" do Vụ trưởng trình (nội dung có số kháng nghị của hồ sơ) → "Phê duyệt"
 * Vụ trưởng thấy dòng tham mưu của hồ sơ đã "Đã duyệt" (lượt trước đã duyệt) → bỏ qua.
 */
export const buoc06: Buoc<BanAn2C, TrangThai2C> = {
  so: 6,
  ten: 'Lãnh đạo · Phê duyệt chương trình làm việc (danh sách vụ xét xử)',
  huongDan: '6',
  chay: async ({ vuAn, moPhien, can }) => {
    const soKhangNghi = can('soKhangNghi', 1);
    // Kiểm tra trước ở "Danh sách tham mưu" của Vụ trưởng: đề xuất đã duyệt không còn ở "Chờ duyệt",
    // dò hết danh sách mới báo "không thấy" (30/10: BA 89118 duyệt xong nhưng lượt đó không bắt được thông báo)
    const vt = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(vt.page);
    await vt.vao('vu-an/gdt-tt/quan-ly-vu-xet-xu/tham-muu');
    await m.choTaiXong(2500);
    await locTheoBanAn(m, vuAn.soBanAn);
    const dongTM = m.page.locator('main .ant-table-row').filter({ hasText: new RegExp(`Kháng nghị:\\s*${soKhangNghi}(?!\\d)`) }).first();
    if (await dongTM.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false)) {
      if (/Đã duyệt/.test(await dongTM.innerText())) return;
    }
    await xuLyChoDuyet(
      await moPhien(TK_LANH_DAO),
      /Chương trình làm việc|vụ xét xử/i,
      TK_VU_TRUONG.ten!,
      'Phê duyệt',
      new RegExp(`${soKhangNghi}(?!\\d)`),
    );
  },
};
