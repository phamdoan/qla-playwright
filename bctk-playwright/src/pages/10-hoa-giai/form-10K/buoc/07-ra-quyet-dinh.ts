import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { Don10K, KET_QUA_10K, TrangThai10K } from '../cau-hinh-10K';
import { dinhKemTep, lapVanBanKyLogic, moHoSo, nutHoacXong, oHien } from './chung';

/**
 * BƯỚC 07 · Ra quyết định giải quyết đề nghị, lưu kết quả (hướng dẫn bước 7)
 *
 *  1. Mở hồ sơ DNKN → tab "Quyết định" › "Ra quyết định" → popup "Ra quyết định giải quyết"
 *  2. Chọn "Không chấp nhận — giữ nguyên Quyết định công nhận" · Nhận thấy · Quá trình giải quyết · Xét thấy
 *     · Nội dung quyết định · tệp quyết định (.pdf)
 *  3. "Lưu" → "Ký logic" → "Đóng" → "Xem quyết định" → "Đóng"
 *  4. Ghi output/10-hoa-giai/10K/output-ma-vu-an-form-10K_<lần chạy>.xlsx
 * Mục "Quyết định giải quyết" đã có quyết định (lượt trước) → chỉ lưu kết quả.
 * Đơn không có quyết định công nhận (bước 01 ghi ketThucKhac) → không làm gì thêm.
 */
export const buoc07: Buoc<Don10K, TrangThai10K> = {
  so: 7,
  ten: 'Ra quyết định giải quyết đề nghị (không chấp nhận — giữ nguyên), ký logic, lưu kết quả',
  huongDan: '7',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    // Đơn không có quyết định công nhận (bước 01) → không có hồ sơ đề nghị
    if (tt.ketThucKhac) {
      test.info().annotations.push({ type: 'Đơn không đề nghị được', description: `${vuAn.soTiepNhan} · ${tt.ketThucKhac} · ${vuAn.urlDon}` });
      return;
    }
    const { m, maHoSo } = await moHoSo(await moPhien(tk), can('soQDCongNhan', 1), tt.urlHoSo, 'Quyết định');
    const main = m.page.locator('main');
    const nut = main.getByRole('button', { name: 'Ra quyết định', exact: true });
    const nutSua = main.getByRole('button', { name: 'Sửa quyết định', exact: true });
    let soQuyetDinh = tt.soQuyetDinh;
    // Đã ký → dòng "Quyết định" có số (vd. 46152/2026/QĐGQHGT-DS); có dự thảo chưa ký → "Sửa quyết định" rồi ký;
    // chưa có gì ("Chưa phát sinh dữ liệu") → "Ra quyết định"
    const coSo = /Quyết định\s*\d+\/\d{4}\//;
    const tinhTrang = await nutHoacXong(m, nut, coSo);
    if (tinhTrang === 'lam') {
      const coDuThao = await nutSua.isVisible().catch(() => false);
      await (coDuThao ? nutSua : nut).click();
      const bm = m.popup(/quyết định giải quyết/i);
      await bm.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      soQuyetDinh = await lapVanBanKyLogic(m, bm, async () => {
        await bm.getByRole('radio', { name: new RegExp(KET_QUA_10K) }).check();
        await m.page.waitForTimeout(800);
        const dien = (nhan: RegExp, chu: string) => oHien(m, bm, nhan).locator('textarea').first().fill(chu);
        await dien(/^\s*\*?\s*Nhận thấy/, 'Người bị kiện đề nghị xem xét lại quyết định công nhận kết quả đối thoại thành.');
        await dien(/^\s*\*?\s*Quá trình giải quyết/, 'Tòa án đã thụ lý, phân công Thẩm phán và nghiên cứu hồ sơ.');
        await dien(/^\s*\*?\s*Xét thấy/, 'Đề nghị không có căn cứ.');
        await dien(/^\s*\*?\s*Nội dung quyết định/, 'Không chấp nhận đề nghị, giữ nguyên quyết định công nhận kết quả đối thoại thành.');
        await dinhKemTep(m, bm);
      });
      const nutXem = main.getByRole('button', { name: 'Xem quyết định', exact: true });
      if (await nutXem.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await nutXem.click();
        const xem = m.page.locator('.ant-modal-wrap:visible .ant-modal, .ant-drawer-open .ant-drawer-content').last();
        await xem.waitFor({ timeout: 15_000 }).catch(() => undefined);
        await m.choTaiXong(1500);
        await m.nut(xem, 'Đóng').click().catch(() => m.page.keyboard.press('Escape'));
      }
    }
    // Số quyết định đã ban hành hiện ở mục "Quyết định giải quyết" (vd. 46152/2026/QĐGQHGT-DS)
    await expect(main, 'Ký xong nhưng quyết định chưa có số').toContainText(coSo, { timeout: 30_000 });
    soQuyetDinh = (await main.innerText()).match(/Quyết định\s+(\d+\/\d{4}\/[^\s·]+)/)?.[1] || soQuyetDinh;

    test.info().annotations.push({ type: 'Hồ sơ', description: `${maHoSo} · QĐ ${soQuyetDinh} · ${tt.urlHoSo}` });
    return { ketQua: KET_QUA_10K, soQuyetDinh };
  },
};
