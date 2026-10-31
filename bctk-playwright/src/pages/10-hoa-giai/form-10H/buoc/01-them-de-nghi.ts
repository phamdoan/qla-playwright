import { Buoc } from '../../../common/buoc';
import { Don10H, TrangThai10H } from '../cau-hinh-10H';
import { hoaGiai, ketThucKhac, lapVanBanKyLogic, moChiTietDon, oHien, soTiepNhanTrenDon, soVanBan } from './chung';

/**
 * BƯỚC 01 · Thêm đề nghị xem xét lại quyết định công nhận (hướng dẫn bước 1)
 *
 *  0. (Điều kiện) Đơn 10G đã "Hòa giải thành" nhưng chưa có quyết định công nhận → "Ra quyết định" (01-QĐHG) ở mục
 *     "Kết quả hòa giải": Dùng số · Vai trò "Người khởi kiện" · Nội dung hòa giải → Lưu → Ký logic → Đóng
 *  1. Mở chi tiết đơn → tab "Hòa giải" → mục "Đề nghị / kiến nghị xem xét lại quyết định" › "Thêm mới đề nghị"
 *  2. Loại văn bản "Đề nghị của các bên / người liên quan" · Người/cơ quan thực hiện: người bị kiện
 *     · Nội dung cụ thể · tick căn cứ "1. Các bên không có đầy đủ năng lực hành vi dân sự."
 *     · tick "Có thời gian bất khả kháng/trở ngại khách quan…"
 *  3. "Lưu đề nghị/kiến nghị"
 * Mục đã có dòng đề nghị (lượt trước) → bỏ qua. Đơn hòa giải không thành / trả đơn / không có quyết định công nhận → ghi
 * ketThucKhac: bước 02–06 bỏ qua, bước 07 chỉ ghi dòng kết quả.
 */
export const buoc01: Buoc<Don10H, TrangThai10H> = {
  so: 1,
  ten: 'Thêm đề nghị xem xét lại quyết định công nhận kết quả hòa giải thành',
  huongDan: '1',
  chay: async ({ vuAn, moPhien, tkToa }) => {
    const m = await moChiTietDon(await moPhien(tkToa(vuAn.toaAn)), vuAn.urlDon);
    const soTiepNhan = (await soTiepNhanTrenDon(m)) ?? vuAn.soTiepNhan;
    // Đơn hòa giải không thành / trả đơn… → không có quyết định công nhận để đề nghị
    const kt = await ketThucKhac(m);
    if (kt) return { soTiepNhan, ketThucKhac: kt };
    await m.moTab('hoa-giai-doi-thoai');
    const main = m.page.locator('main');

    // ── 0. Quyết định công nhận (điều kiện mở thủ tục đề nghị) ──
    if (!(await soVanBan(m, hoaGiai('Quyết định công nhận kết quả hòa giải thành')))) {
      const bangKQ = main.locator('.ant-table-wrapper').filter({ hasText: 'Ngày Tòa nhận kết quả' }).first();
      await m.choBang(bangKQ);
      const nutRaQD = m.nut(bangKQ, 'Ra quyết định');
      // Chưa ghi nhận kết quả, hoặc hòa giải thành nhưng "Không yêu cầu" công nhận → không có nút
      if (!(await nutRaQD.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false))) {
        return { soTiepNhan, ketThucKhac: 'Chưa có quyết định công nhận' };
      }
      await nutRaQD.click();
      const bm = m.popup(/\(01-QĐHG\)/);
      await bm.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      await lapVanBanKyLogic(m, bm, async () => {
        await m.chonTrong(oHien(m, bm, /^\s*Vai trò/), /^\s*Người khởi kiện\s*$/);
        await m.page.waitForTimeout(800);
        await oHien(m, bm, hoaGiai('Nội dung hòa giải')).locator('textarea').first()
          .fill('Các bên tự nguyện thỏa thuận được với nhau về việc giải quyết toàn bộ tranh chấp.');
      });
    }

    // ── 1. Mục đề nghị / kiến nghị ──
    // Mục mặc định thu gọn (nút "Đề nghị / kiến nghị" đầu tab chỉ cuộn tới) → mở mục
    const muc = await m.moMuc('Đề nghị / kiến nghị xem xét lại quyết định');
    const nutThem = m.nut(muc, /Thêm mới đề nghị/);
    await nutThem.waitFor({ timeout: 30_000 });
    const soQDCongNhan = ((await muc.innerText()).match(/QUYẾT ĐỊNH CÔNG NHẬN\s*\n?\s*([^\s·]+)/i)?.[1] ?? '').trim();
    const bangDN = muc.locator('.ant-table-wrapper').filter({ hasText: 'Căn cứ xem xét' }).first();
    await m.choBang(bangDN);
    const dongDN = bangDN.locator('.ant-table-row').first();
    if (await dongDN.count()) {
      return { soTiepNhan, soQDCongNhan, nguoiDeNghi: (await m.docCot(dongDN, 'Người hoặc cơ quan thực hiện').catch(() => '')).split('\n')[0] };
    }

    await nutThem.click();
    const f = m.popup(/Thêm đề nghị\/kiến nghị/);
    await f.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    await m.chonTrong(oHien(m, f, /Loại văn bản/), /Đề nghị của các bên/);
    const nguoiDeNghi = (await m.chonTrong(oHien(m, f, /Người\/cơ quan thực hiện/), /Người bị kiện/)).replace(/\s*Người bị kiện\s*$/, '');
    await oHien(m, f, /Nội dung cụ thể/).locator('textarea').first().fill('Đề nghị xem xét lại quyết định công nhận kết quả hòa giải thành.');
    await f.getByRole('checkbox', { name: /^1\. Các bên không có đầy đủ/ }).check();
    await f.getByRole('checkbox', { name: /Có thời gian bất khả kháng/ }).check();
    await m.nut(f, /Lưu đề nghị\/kiến nghị/).click();
    await m.choThongBao(/thành công/i);
    await f.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    await m.choTaiXong(1500);
    return { soTiepNhan, soQDCongNhan, nguoiDeNghi };
  },
};
