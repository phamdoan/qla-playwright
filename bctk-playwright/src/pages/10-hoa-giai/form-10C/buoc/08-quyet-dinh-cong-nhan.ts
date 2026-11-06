import path from 'path';
import { Locator, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai10C } from '../cau-hinh-10C';
import { ManHinh } from '../../../base.page';
import { hoaGiai, ketThucKhac, lapBieuMauKyLogic, moChiTietDon, oHien, soVanBan } from './chung';
import { DATA_DIR } from '../../../../utils/file-helper';
import { ngay } from '../../../../utils/fake-data';
import { diaBanCuaToa, vksCuaToa } from '../../../../utils/tai-khoan';

/**
 * BƯỚC 08 · Quyết định công nhận kết quả hòa giải thành — 01-QĐHG (hướng dẫn b7), lưu kết quả
 *
 *  1. Mở chi tiết đơn → tab "Hòa giải" → mục "Kết quả hòa giải" › "Ra quyết định" ở dòng kết quả
 *     → popup "Quyết định công nhận kết quả hòa giải thành tại Tòa án (…) (01-QĐHG)"
 *     Đơn ly hôn: popup "Quyết định công nhận thuận tình ly hôn và sự thỏa thuận… (03-QĐHG)" → thêm căn cứ
 *     Bộ luật HNGĐ 2014 Điều 55, các ô bắt buộc riêng, tệp quyết định (dienMau03)
 *  2. Ngày quyết định = hôm nay → "Dùng số" → Vai trò "Người khởi kiện" → Nội dung hòa giải
 *  3. "Lưu" → "Ký logic" → "Đóng"
 *  4. Ghi output/10-hoa-giai/10C/output-ma-vu-an-form-10C_<lần chạy>.xlsx (kèm link đơn)
 */
// Bảng văn bản: "Quyết định công nhận kết quả hòa giải thành…" (01-QĐHG) hoặc "…thuận tình ly hôn…" (03-QĐHG)
const TEN_QD_CN = /Quyết định công nhận (?:kết quả h(?:òa|oà) giải thành|thuận tình ly hôn)/i;
const TEP_QD = path.join(DATA_DIR, 'files', 'tai-lieu-mau.pdf');

// Ô bắt buộc riêng của mẫu 03-QĐHG (ô trống mới điền; Người yêu cầu, Các bên tham gia… hệ thống điền sẵn)
// Nơi ban hành, Viện kiểm sát, Cơ quan thi hành án theo tòa của tài khoản (không ghi cứng)
const chuMau03 = (toaAn: string): [RegExp, string][] => [
  [/Nơi ban hành quyết định/, diaBanCuaToa(toaAn)],
  [/Cơ quan đã thực hiện đăng ký kết hôn/, 'Ủy ban nhân dân phường Hoàn Kiếm, thành phố Hà Nội'],
  [/Viện kiểm sát/, vksCuaToa(toaAn)],
  [/Cơ quan thi hành án/, `Thi hành án dân sự ${diaBanCuaToa(toaAn)}`],
  [/Quan hệ hôn nhân/, 'Công nhận sự thuận tình ly hôn giữa các đương sự.'],
  [/con chung/, 'Các bên thỏa thuận người mẹ trực tiếp nuôi con chung, người cha cấp dưỡng hằng tháng.'],
  [/tài sản chung/, 'Các bên tự thỏa thuận phân chia tài sản chung, không yêu cầu Tòa án giải quyết.'],
  [/Nghĩa vụ chung/, 'Không có.'],
];

async function dienMau03(m: ManHinh, bm: Locator, toaAn: string) {
  // Căn cứ: bắt buộc ≥ 1 điều của Bộ luật HNGĐ ("Vui lòng thêm ít nhất một căn cứ bộ luật hôn nhân gia đình").
  // "+ Thêm điều luật" → chọn Bộ luật, Điều 55 "Thuận tình ly hôn" → bấm nút lưu (đĩa mềm) ở cột Thao tác của dòng
  const nutThemDL = m.nut(bm, /Thêm điều luật/);
  const bangDL = bm.locator('.ant-table-wrapper').filter({ hasText: 'Năm/Bộ luật' }).first();
  if ((await nutThemDL.count()) && !(await bangDL.locator('.ant-table-row').filter({ hasText: /Hôn nhân và gia đình/ }).count())) {
    await nutThemDL.click();
    const dong = bangDL.locator('.ant-table-row').last();
    const luaChon = m.page.locator('.ant-select-dropdown:visible .ant-select-item-option');
    await dong.locator('.ant-select').nth(0).click();
    await luaChon.filter({ hasText: /^Bộ luật Hôn nhân và gia đình 2014/ }).first().click();
    await m.page.waitForTimeout(1000);
    await dong.locator('.ant-select').nth(1).click();
    await m.page.keyboard.type('55');
    await luaChon.filter({ hasText: /^55 - / }).first().click();
    await m.page.waitForTimeout(800);
    await dong.locator('button').first().click();
    await m.page.waitForTimeout(1000);
  }
  const oNgayDon = oHien(m, bm, /Ngày làm đơn khởi kiện/).locator('.ant-picker input').first();
  if ((await oNgayDon.count()) && !(await oNgayDon.inputValue())) {
    await oNgayDon.click();
    await oNgayDon.fill(ngay(-7));
    await oNgayDon.press('Enter');
  }
  for (const [nhan, chu] of chuMau03(toaAn)) {
    const o = oHien(m, bm, nhan).locator('input:not([type=file]), textarea').first();
    if ((await o.count()) && !(await o.inputValue())) await o.fill(chu);
  }
  const oTep = oHien(m, bm, /Tệp quyết định/).locator('input[type=file]').first();
  if (await oTep.count()) {
    await oTep.setInputFiles(TEP_QD);
    await m.page.waitForTimeout(1500);
  }
}

export const buoc08: Buoc<DonNguon, TrangThai10C> = {
  so: 8,
  ten: 'Quyết định công nhận kết quả hòa giải thành (01-QĐHG), ký logic, lưu kết quả',
  huongDan: 'b7',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    const urlDon = can('urlDon', 1);
    const tk = tkToa(vuAn.toaAn);
    const m = await moChiTietDon(await moPhien(tk), urlDon);
    await m.moTab('hoa-giai-doi-thoai');
    const main = m.page.locator('main');
    // Đơn kết thúc theo hướng khác (trả đơn, không thành…) → không có quyết định công nhận; vẫn ghi dòng kết quả
    let kt = tt.ketThucKhac ?? (await ketThucKhac(m));

    let soQDCongNhan = kt ? '' : await soVanBan(m, TEN_QD_CN);
    const bangKQ = main.locator('.ant-table-wrapper').filter({ hasText: 'Ngày Tòa nhận kết quả' }).first();
    if (!kt) await m.choBang(bangKQ);
    // Số trần (chưa có đuôi /…) là QĐ nháp chưa ký; còn nút "Ra quyết định" thì mở lại để ký. Không còn nút (đơn làm tay) → giữ số đó
    if (!kt && soQDCongNhan && !soQDCongNhan.includes('/') && (await m.nut(bangKQ, 'Ra quyết định').count())) soQDCongNhan = '';
    if (!kt && !soQDCongNhan) {
      // Biên bản ghi "Không yêu cầu" công nhận (đơn làm tay) → không có nút "Ra quyết định", đơn dừng ở đây
      if (/Không yêu cầu/.test(await bangKQ.locator('.ant-table-row').first().innerText().catch(() => ''))) {
        kt = `${tt.ketQuaHoaGiai ?? 'Hòa giải thành'} - không yêu cầu công nhận`;
      }
    }
    if (!kt && !soQDCongNhan) {
      await m.nut(bangKQ, 'Ra quyết định').click();
      // Đơn ly hôn dùng mẫu 03-QĐHG (công nhận thuận tình ly hôn), các đơn HNGĐ khác 01-QĐHG
      const bm = m.popup(/\((?:01|03)-QĐHG\)/);
      await bm.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      soQDCongNhan = await lapBieuMauKyLogic(m, bm, async () => {
        const vaiTro = oHien(m, bm, /^\s*Vai trò/);
        if (await vaiTro.count()) {
          await m.chonTrong(vaiTro, /^\s*Người khởi kiện\s*$/);
          await m.page.waitForTimeout(800);
        }
        const noiDung = oHien(m, bm, hoaGiai('Nội dung hòa giải')).locator('textarea').first();
        if (await noiDung.count()) await noiDung.fill('Các bên tự nguyện thỏa thuận được với nhau về việc giải quyết toàn bộ tranh chấp.');
        await dienMau03(m, bm, vuAn.toaAn);
      });
      // Ô "Số quyết định" chỉ có phần số; bảng văn bản có số đầy đủ (…/2026/QDCNHGT)
      soQDCongNhan = (await soVanBan(m, TEN_QD_CN)) ?? soQDCongNhan;
    }

    // ── Lưu kết quả (ô đơn này xong; lần chạy sau ô sẽ tạo đơn mới) ──
    test.info().annotations.push({
      type: kt ? 'Đơn kết thúc khác' : 'Đơn đã tạo',
      description: `${tt.soTiepNhan} · ${tt.tenDon} · ${kt ?? `QĐ công nhận ${soQDCongNhan}`} · ${urlDon}`,
    });
    return kt ? { ketThucKhac: kt } : { soQDCongNhan };
  },
};
