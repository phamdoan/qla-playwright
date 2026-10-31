import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn6D, TK_LANH_DAO, TK_VU_TRUONG, TrangThai6D } from '../cau-hinh-6D';
import { chonNguoi, chonTab, locTheoBanAn } from './chung';

/** Thẩm phán KHÔNG được chọn vào hội đồng (theo hướng dẫn) */
const KHONG_CHON = ['Nguyễn Văn Quảng'];
/** Hội đồng 5 thẩm phán = chủ tọa + 4 thẩm phán khác */
const SO_THAM_PHAN_KHAC = 4;

/**
 * BƯỚC 05 · Vụ trưởng · Tạo lịch xét xử, tham mưu, trình ký chương trình làm việc (hướng dẫn bước 5)
 *
 *  1. Giám đốc thẩm, tái thẩm › Quản lý xét xử GĐT (tab "Tất cả") → tick dòng của hồ sơ (Kháng nghị: <số KN>) → "Tạo lịch xét xử"
 *  2. Popup "Danh sách vụ xét xử đã chọn": "Hội đồng 5 thẩm phán" · Chủ tọa = lãnh đạo (Nguyễn Hải Trâm)
 *     · "Thêm" thẩm phán khác cho đủ 4 người (trừ Nguyễn Văn Quảng; chủ tọa cũ tự chuyển thành thẩm phán khác)
 *  3. "Chọn lịch xét xử" → bấm ô lịch đỏ đã tạo sẵn (sự kiện "Lịch xét xử" chưa gắn bản án) → "Lưu"
 *  4. "Danh sách tham mưu" → "Xem chi tiết" vụ đã tham mưu → ("Lấy số" nếu có) → "Trình ký" → "Gửi"
 */
export const buoc05: Buoc<BanAn6D, TrangThai6D> = {
  so: 5,
  ten: 'Vụ trưởng · Tạo lịch xét xử (HĐ 5 thẩm phán), tham mưu, trình ký',
  huongDan: '5',
  chay: async ({ vuAn, tt, moPhien, can }) => {
    const soKhangNghi = can('soKhangNghi', 1);
    const phien = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phien.page);
    const p = m.page;
    const main = p.locator('main');
    await phien.vao('vu-an/gdt-tt/quan-ly-vu-xet-xu/danh-sach');
    await m.choTaiXong(3000);

    let thanhVienHDXX = tt.thanhVienHDXX;
    let lichXetXu = tt.lichXetXu;
    // Danh sách phân trang (10 dòng/trang) → lọc theo số bản án trước khi tìm dòng của hồ sơ
    const khangNghi = new RegExp(`Kháng nghị:\\s*${soKhangNghi}(?!\\d)`);
    const dong = main.locator('.ant-table-row').filter({ hasText: khangNghi }).first();
    // Màn có tab "Tất cả | Chưa có lịch xét xử | Đã có kết quả xét xử"; vụ đã tạo lịch vẫn hiện ở "Tất cả"
    // với trạng thái "Đã lên lịch xét xử" → xét theo chữ trong dòng
    if (await m.page.locator('main [role=tab]').filter({ hasText: 'Tất cả' }).count()) await chonTab(m, 'Tất cả');
    await locTheoBanAn(m, vuAn.soBanAn);
    await expect(dong, `Không thấy hồ sơ KN ${soKhangNghi} ở "Quản lý xét xử GĐT"`).toBeVisible({ timeout: 30_000 });
    const chuaCoLich = !/Đã lên lịch/.test(await dong.innerText());
    if (chuaCoLich) {
      await dong.locator('input[type=checkbox]').first().check();
      await m.nut(main, 'Tạo lịch xét xử').click();
      const d = p.locator('.ant-modal-wrap:visible .ant-modal').filter({ hasText: 'Danh sách vụ xét xử đã chọn' }).last();
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong(2000);

      await d.locator('.ant-segmented-item').filter({ hasText: 'Hội đồng 5 thẩm phán' }).click();
      await chonNguoi(m, d.locator('.hdxx-chu-toa-select'), TK_LANH_DAO.ten!);
      const daCo = new Set([...KHONG_CHON, TK_LANH_DAO.ten!]);
      for (const c of await d.locator('.hdxx-chip').allInnerTexts()) daCo.add(c.replace('×', '').trim());
      for (let vong = 0; (await d.locator('.hdxx-chip').count()) < SO_THAM_PHAN_KHAC && vong < 8; vong++) {
        await d.locator('button.hdxx-add').click();
        const cacMuc = p.locator('.ant-select-dropdown:visible .ant-select-item-option');
        await cacMuc.first().waitFor({ timeout: 15_000 });
        // Danh sách ảo chỉ vẽ vài mục đầu → mục đang hiện đều đã có trong hội đồng thì cuộn xuống tìm tiếp
        const timMoi = async () => (await cacMuc.evaluateAll(es => es.map(e => e.getAttribute('title') || ''))).find(t => t && !daCo.has(t));
        let ten = await timMoi();
        const cuon = p.locator('.ant-select-dropdown:visible .rc-virtual-list-holder').first();
        for (let i = 0; !ten && i < 15 && (await cuon.count()); i++) {
          await cuon.evaluate(e => e.scrollBy(0, 150));
          await p.waitForTimeout(300);
          ten = await timMoi();
        }
        if (!ten) throw new Error('Không còn thẩm phán nào để thêm vào hội đồng');
        daCo.add(ten);
        await p.locator(`.ant-select-dropdown:visible .ant-select-item-option[title="${ten}"]`).first().click();
        await p.waitForTimeout(800);
      }
      thanhVienHDXX = (await d.locator('.hdxx-chip').allInnerTexts()).map(c => c.replace('×', '').trim()).join(' ; ');

      // Lịch: sự kiện đỏ "Lịch xét xử" chưa gắn bản án (ô đã tạo sẵn) — lấy ô cuối (ngày xa nhất)
      await m.nut(d, 'Chọn lịch xét xử').click();
      const lich = p.locator('.ant-modal-wrap:visible .ant-modal').filter({ has: p.locator('.rbc-calendar') }).last();
      await lich.waitFor({ timeout: 30_000 });
      await m.choTaiXong(2000);
      const oTrong = lich.locator('.rbc-event').filter({ hasText: /^\s*GĐT\/TT\s*Lịch xét xử\s*$/ });
      if (!(await oTrong.count())) throw new Error('Lịch xét xử không còn ô nào tạo sẵn (sự kiện "Lịch xét xử" chưa gắn bản án) — tạo thêm lịch rồi chạy lại');
      await oTrong.last().click();
      await lich.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
      lichXetXu = ((await d.innerText()).match(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}(:\d{2})? – [^\n]+/) ?? [''])[0].trim();
      await expect(d, 'Chọn lịch xong nhưng popup chưa có thời gian xét xử').toContainText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/, { timeout: 10_000 });

      // Lưu không hiện thông báo → popup đóng là đã lưu (hồ sơ chuyển sang tab "Đã có lịch xét xử")
      await m.nut(d, 'Lưu').click();
      await m.dongYTatCaXacNhan();
      await expect(d, 'Bấm "Lưu" nhưng popup tạo lịch không đóng').toBeHidden({ timeout: 30_000 });
      await m.choTaiXong(1500);
    }

    // ── Danh sách tham mưu → mở vụ (nút ở cột Thao tác) → "Lấy số" → "Trình ký" → "Gửi" ──
    if (tt.daTrinhKyChuongTrinh) return { thanhVienHDXX, lichXetXu };
    await m.nut(main, 'Danh sách tham mưu').click();
    await p.waitForURL(/quan-ly-vu-xet-xu\/tham-muu/, { timeout: 60_000 });
    await m.choTaiXong(2500);
    await locTheoBanAn(m, vuAn.soBanAn);
    const dongTM = main.locator('.ant-table-row').filter({ hasText: khangNghi }).first();
    await dongTM.waitFor({ timeout: 30_000 });
    const chuTM = (await dongTM.innerText()).replace(/\s+/g, ' ');
    if (!/Chưa trình/.test(chuTM)) return { thanhVienHDXX, lichXetXu, daTrinhKyChuongTrinh: true };
    await dongTM.locator('td').last().locator('button, a').first().click();
    const ct = p.locator('.ant-modal-wrap:visible .ant-modal').filter({ hasText: 'Danh sách vụ xét xử đã chọn' }).last();
    await ct.waitFor({ timeout: 30_000 });
    await m.choTaiXong(2000);
    lichXetXu ||= ((await ct.innerText()).match(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}(:\d{2})? – [^\n]+/) ?? [''])[0].trim();
    const nutLaySo = m.nut(ct, 'Lấy số');
    if (await nutLaySo.isEnabled().catch(() => false)) {
      await nutLaySo.click();
      await m.choTaiXong(2000);
    }
    // Trình ký: có hộp "Nhập thông tin trình duyệt ký" (nút "Gửi") thì gửi; không hiện thông báo
    // → xác nhận bằng trạng thái dòng trong "Danh sách tham mưu" chuyển sang "Chờ duyệt" (kèm số danh sách)
    await m.nut(ct, 'Trình ký').click();
    const gui = p.locator('.ant-modal-wrap:visible .ant-modal').filter({ has: p.locator('button', { hasText: /^\s*Gửi\s*$/ }) }).last();
    if (await gui.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) await m.nut(gui, /^\s*Gửi\s*$/).click();
    await m.choTaiXong(2000);
    await expect(dongTM, 'Trình ký xong nhưng danh sách tham mưu chưa chuyển "Chờ duyệt"').toContainText(/Chờ duyệt|Đã duyệt/, { timeout: 30_000 });
    const soChuongTrinh = ((await dongTM.innerText()).match(/Số:\s*(\d+)/) ?? [])[1];
    return { thanhVienHDXX, lichXetXu, soChuongTrinh, daTrinhKyChuongTrinh: true };
  },
};
