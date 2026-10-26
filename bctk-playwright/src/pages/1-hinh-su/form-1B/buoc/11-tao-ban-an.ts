import path from 'path';
import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon, cauHinh1B } from '../cau-hinh-1B';
import { DATA_DIR, luuDongKetQua } from '../../../../utils/file-helper';
import { ghiDongExcel, xoaDongExcel } from '../../../../utils/excel-helper';

const COT_DA_CHAY = ['Thời điểm chạy', 'Mã vụ án', 'Tòa án', 'Luồng', 'Mã vụ án phúc thẩm', 'Ghi chú'];

/**
 * BƯỚC 11 · Tòa phúc thẩm · Tạo bản án phúc thẩm, lưu kết quả (hướng dẫn 5.5)
 *
 *  1. Mở vụ án phúc thẩm → tab "Xét xử" → đọc ngày xét xử ở mục "Lịch xét xử"
 *  2. Mục "Kết quả xét xử" › "Bản án" → "Tạo bản án phúc thẩm" (mở form — hướng dẫn dừng ở đây)
 *  3. Ghi output, chuyển vụ án từ data-1B.xlsx sang data-1B-old.xlsx
 */
export const buoc11: Buoc<VuAnNguon, TrangThai1B> = {
  so: 11,
  ten: 'Tòa phúc thẩm · Tạo bản án phúc thẩm, lưu kết quả',
  huongDan: '5.5',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    const phien = await moPhien(tkToa(can('toaPhucTham', 4)));
    await phien.vao(can('urlVuAn', 5));
    const m = new ManHinh(phien.page);
    await m.moTab('xet-xu');

    // Ngày xét xử ở tiêu đề mục lịch: "Lịch xét xử - … dd/mm/yyyy · giờ"
    const dauLich = m.page.locator('.ant-collapse-header').filter({ hasText: /Lịch xét xử/ }).first();
    await dauLich.waitFor({ timeout: 30_000 }).catch(() => undefined);
    const ngayXetXu = ((await dauLich.innerText().catch(() => '')).match(/\d{2}\/\d{2}\/\d{4}/) ?? [''])[0];

    const muc = await m.moMuc('Kết quả xét xử');
    const nutTao = m.nut(muc, 'Tạo bản án phúc thẩm');
    if (!(await nutTao.isVisible().catch(() => false))) {
      await muc.getByText('Bản án', { exact: true }).first().click();
      await m.choTaiXong();
    }
    // Nút còn chạy hiệu ứng nên Playwright hay báo "not stable" dù form đã mở → kiểm bằng form
    await nutTao.click({ timeout: 10_000 }).catch(() => undefined);
    await expect(m.popup('Thêm bản án phúc thẩm'), 'Không mở được form "Thêm bản án phúc thẩm"').toBeVisible({ timeout: 30_000 });

    // ── Lưu kết quả ──
    await luuDongKetQua(
      cauHinh1B.linhVuc,
      cauHinh1B.bieuMau,
      ['Luồng', 'Mã vụ án sơ thẩm', 'Mã vụ án phúc thẩm', 'Số thụ lý PT', 'Ngày thụ lý PT', 'Tên vụ án', 'Tòa phúc thẩm', 'Chủ tọa', 'Ngày xét xử'],
      [vuAn.luong, vuAn.maVuAn, can('maVuAnPhucTham', 6), tt.soThuLy ?? '', tt.ngayThuLy ?? '', can('tenVuAn', 1), can('toaPhucTham', 4), tt.chuToa ?? '', ngayXetXu],
    );
    const thoiDiem = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
    const d = vuAn.dongGoc;
    await ghiDongExcel(path.join(DATA_DIR, cauHinh1B.linhVuc, cauHinh1B.fileVuAnDaChay), COT_DA_CHAY, [
      [thoiDiem, vuAn.maVuAn, d['Tòa án'] ?? '', d['Luồng'] ?? '', can('maVuAnPhucTham', 6), 'Thành công'],
    ]);
    if (!(await xoaDongExcel(path.join(DATA_DIR, cauHinh1B.linhVuc, cauHinh1B.fileVuAn), 'Mã vụ án', [vuAn.maVuAn]))) {
      // File đang mở trong Excel: chưa xóa được, nhưng đã có trong file old nên lần sau vẫn tự bỏ qua
      test.info().annotations.push({ type: 'Lưu ý', description: `${cauHinh1B.fileVuAn} đang mở — chưa xóa được dòng ${vuAn.maVuAn}` });
    }
    test.info().annotations.push({ type: 'Vụ án phúc thẩm', description: `${vuAn.maVuAn} → ${tt.maVuAnPhucTham}` });
    return { ngayXetXu };
  },
};
