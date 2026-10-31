import path from 'path';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai10E } from '../cau-hinh-10E';
import { hoaGiai, ketThucKhac, moChiTietDon, oHien } from './chung';
import { DATA_DIR } from '../../../../utils/file-helper';

const BIEN_BAN = path.join(DATA_DIR, 'files', 'tai-lieu-mau.pdf');

/**
 * BƯỚC 07 · Ghi nhận kết quả hòa giải — biên bản 11-HG (hướng dẫn b6)
 *
 *  1. Mở chi tiết đơn → tab "Hòa giải" → mục "Kết quả hòa giải" › "Ghi nhận kết quả"
 *     → popup "Biên bản ghi nhận kết quả hòa giải (Hòa giải viên được chỉ định) (11-HG)"
 *  2. Kết quả "Hòa giải thành" → Yêu cầu Tòa án công nhận: "Có yêu cầu"
 *  3. Nội dung tóm tắt kết quả → tải lên tệp biên bản → "Lưu kết quả"
 *     (Ngày nhận kết quả, Ngày lập biên bản, Người lập biên bản hệ thống điền sẵn)
 */
export const buoc07: Buoc<DonNguon, TrangThai10E> = {
  so: 7,
  ten: 'Ghi nhận kết quả hòa giải thành (11-HG), có yêu cầu công nhận',
  huongDan: 'b6',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    if (tt.ketThucKhac) return;
    const m = await moChiTietDon(await moPhien(tkToa(vuAn.toaAn)), can('urlDon', 1));
    await m.moTab('hoa-giai-doi-thoai');
    const main = m.page.locator('main');
    const kt = await ketThucKhac(m);
    if (kt) return { ketThucKhac: kt };

    // Bảng kết quả (cột "Ngày Tòa nhận kết quả") đã có dòng → lượt trước đã ghi nhận
    const bangKQ = main.locator('.ant-table-wrapper').filter({ hasText: 'Ngày Tòa nhận kết quả' }).first();
    await m.choBang(bangKQ);
    const daCo = bangKQ.locator('.ant-table-row').filter({ hasText: hoaGiai('Hòa giải') }).first();
    if (await daCo.count()) return { ketQuaHoaGiai: (await daCo.innerText()).match(/(?:H(?:òa|oà) giải|Đối thoại) (?:không )?thành/i)?.[0] };

    await m.nut(main, 'Ghi nhận kết quả').click();
    // Đơn hành chính (10I) dùng biên bản 11-ĐT thay cho 11-HG
    const bm = m.popup(/\(11-(?:HG|ĐT)\)/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    const ketQuaHoaGiai = await m.chonTrong(oHien(m, bm, /^\s*\*?\s*Kết quả/), hoaGiai('Hòa giải thành'));
    // Chọn "Hòa giải thành" thì hiện ô "Yêu cầu Tòa án công nhận" (mặc định "Không yêu cầu") → "Có yêu cầu"
    const oYeuCau = oHien(m, bm, /Yêu cầu Tòa án công nhận/);
    await oYeuCau.waitFor({ timeout: 10_000 });
    await m.chonTrong(oYeuCau, /^\s*Có yêu cầu\s*$/);
    await oHien(m, bm, /Nội dung tóm tắt kết quả/).locator('textarea').first().fill('Các bên thống nhất được toàn bộ nội dung tranh chấp.');
    await bm.locator('input[type=file]').first().setInputFiles(BIEN_BAN);
    await m.page.waitForTimeout(1500);

    await m.nut(bm, 'Lưu kết quả').click();
    // Bỏ qua "Upload thành công" của tệp biên bản (còn hiện) — chờ thông báo lưu, hoặc báo lỗi của máy chủ
    await m.choThongBao(/^(?!Upload).*thành công/i);
    await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    await m.choTaiXong(1500);
    return { ketQuaHoaGiai };
  },
};
