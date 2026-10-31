import { test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai10I, cauHinh10I } from '../cau-hinh-10I';
import { hoaGiai, ketThucKhac, lapBieuMauKyLogic, moChiTietDon, oHien, soVanBan } from './chung';
import { luuDongKetQua } from '../../../../utils/file-helper';

/**
 * BƯỚC 08 · Quyết định công nhận kết quả đối thoại thành — 01-QĐĐT (hướng dẫn b7), lưu kết quả
 *
 *  1. Mở chi tiết đơn → tab "Hòa giải" → mục "Kết quả hòa giải" › "Ra quyết định" ở dòng kết quả
 *     → popup "Quyết định công nhận kết quả hòa giải thành tại Tòa án (…) (01-QĐHG)"
 *  2. Ngày quyết định = hôm nay → "Dùng số" → Vai trò "Người khởi kiện" → Nội dung hòa giải
 *  3. "Lưu" → "Ký logic" → "Đóng"
 *  4. Ghi output/10-hoa-giai/10I/output-ma-vu-an-form-10I_<lần chạy>.xlsx (kèm link đơn)
 */
export const buoc08: Buoc<DonNguon, TrangThai10I> = {
  so: 8,
  ten: 'Quyết định công nhận kết quả đối thoại thành (01-QĐĐT), ký logic, lưu kết quả',
  huongDan: 'b7',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    const urlDon = can('urlDon', 1);
    const tk = tkToa(vuAn.toaAn);
    const m = await moChiTietDon(await moPhien(tk), urlDon);
    await m.moTab('hoa-giai-doi-thoai');
    const main = m.page.locator('main');
    // Đơn kết thúc theo hướng khác (trả đơn, không thành…) → không có quyết định công nhận; vẫn ghi dòng kết quả
    let kt = tt.ketThucKhac ?? (await ketThucKhac(m));

    let soQDCongNhan = kt ? '' : await soVanBan(m, hoaGiai('Quyết định công nhận kết quả hòa giải thành'));
    const bangKQ = main.locator('.ant-table-wrapper').filter({ hasText: 'Ngày Tòa nhận kết quả' }).first();
    if (!kt && !soQDCongNhan) {
      await m.choBang(bangKQ);
      // Biên bản ghi "Không yêu cầu" công nhận (đơn làm tay) → không có nút "Ra quyết định", đơn dừng ở đây
      if (/Không yêu cầu/.test(await bangKQ.locator('.ant-table-row').first().innerText().catch(() => ''))) {
        kt = `${tt.ketQuaHoaGiai ?? 'Hòa giải thành'} - không yêu cầu công nhận`;
      }
    }
    if (!kt && !soQDCongNhan) {
      await m.nut(bangKQ, 'Ra quyết định').click();
      // Đơn hành chính (10I) dùng mẫu 01-QĐĐT thay cho 01-QĐHG
      const bm = m.popup(/\(01-QĐ(?:HG|ĐT)\)/);
      await bm.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      soQDCongNhan = await lapBieuMauKyLogic(m, bm, async () => {
        // Mẫu 01-QĐĐT (10I) không có ô Vai trò / Nội dung → chỉ điền khi có
        const vaiTro = oHien(m, bm, /^\s*Vai trò/);
        if (await vaiTro.count()) {
          await m.chonTrong(vaiTro, /^\s*Người khởi kiện\s*$/);
          await m.page.waitForTimeout(800);
        }
        const noiDung = oHien(m, bm, hoaGiai('Nội dung hòa giải')).locator('textarea').first();
        if (await noiDung.count()) await noiDung.fill('Các bên tự nguyện thỏa thuận được với nhau về việc giải quyết toàn bộ tranh chấp.');
      });
      // Ô "Số quyết định" chỉ có phần số; bảng văn bản có số đầy đủ (…/2026/QDCNHGT)
      soQDCongNhan = (await soVanBan(m, hoaGiai('Quyết định công nhận kết quả hòa giải thành'))) ?? soQDCongNhan;
    }

    // ── Lưu kết quả (ô đơn này xong; lần chạy sau ô sẽ tạo đơn mới) ──
    await luuDongKetQua(
      cauHinh10I.linhVuc,
      cauHinh10I.bieuMau,
      tk,
      ['Số tiếp nhận', 'Tên đơn', 'Quan hệ pháp luật', 'Người khởi kiện', 'Người bị kiện', 'Thẩm phán đối thoại', 'Số QĐ phân công', 'Số TB 01-ĐT', 'Kết quả lựa chọn',
        'Hòa giải viên', 'Số QĐ chỉ định HGV (06-ĐT)', 'Số TB chuyển đối thoại (07-ĐT)', 'Kết quả đối thoại', 'Số QĐ công nhận (01-QĐĐT)', 'Link đơn'],
      [tt.soTiepNhan ?? '', tt.tenDon ?? '', tt.quanHePhapLuat ?? '', tt.nguoiKhoiKien ?? '', tt.nguoiBiKien ?? '', tt.thamPhanHoaGiai ?? '', tt.soQuyetDinhPhanCong ?? '',
        tt.soThongBao01HG ?? '', tt.ketQuaLuaChon ?? '', tt.hoaGiaiVien ?? '', tt.soQDChiDinhHGV ?? '', tt.soTBChuyenHoaGiai ?? '', kt ?? tt.ketQuaHoaGiai ?? '', soQDCongNhan ?? '', urlDon],
    );
    test.info().annotations.push({
      type: kt ? 'Đơn kết thúc khác' : 'Đơn đã tạo',
      description: `${tt.soTiepNhan} · ${tt.tenDon} · ${kt ?? `QĐ công nhận ${soQDCongNhan}`} · ${urlDon}`,
    });
    return kt ? { ketThucKhac: kt } : { soQDCongNhan };
  },
};
