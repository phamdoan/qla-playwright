import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BIEU_MAU_1B, LINH_VUC_1B, TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { ngay } from '../../../../utils/fake-data';
import { luuDongKetQua } from '../../../../utils/file-helper';
import { batDauBang, dungSo } from './chung';

/**
 * BƯỚC 09 · Tòa phúc thẩm · Tạo bản án phúc thẩm, ký logic, lưu kết quả (hướng dẫn bước 9)
 *
 *  1. Mở vụ án phúc thẩm → tab "Xét xử" → "Tạo bản án phúc thẩm" → popup "Thêm bản án phúc thẩm"
 *  2. "Dùng số" · ngày bản án = hôm nay · Thay mặt Hội đồng xét xử = người của tài khoản tòa phúc thẩm
 *     · Tiền án / Tiền sự "Không" · Tóm tắt nội dung vụ án
 *  3. Đề nghị đối với bản án sơ thẩm: "Sửa bản án sơ thẩm" → "Sửa": kháng cáo → "Tăng hình phạt", hình phạt chính
 *     "Tử hình" → "Thêm hình phạt"; kháng nghị → "Chuyển hình phạt khác nặng hơn" · "Do cấp sơ thẩm sai" → "Lưu"
 *  4. "Lấy theo ý kiến VKS" · Nơi nhận · bật các mục "Bật để khai mục này" · các ô nhận định / diễn giải
 *  5. "Lưu" → "Lấy số" → ngày bản án → "Lưu" → "Ký logic" → xác nhận "Ký logic" → "Đóng"
 *  6. Ghi output/1-hinh-su/1B/output-ma-vu-an-form-1B_<lần chạy>.xlsx
 * Mục "Bản án" đã có bản án (lượt trước) → chỉ lưu kết quả.
 */
export const buoc09: Buoc<VuAnNguon, TrangThai1B> = {
  so: 9,
  ten: 'Tòa phúc thẩm · Tạo bản án phúc thẩm, ký logic, lưu kết quả',
  huongDan: '9',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    const tk = tkToa(can('toaPhucTham', 4));
    const phien = await moPhien(tk);
    await phien.vao(can('urlVuAn', 5));
    const m = new ManHinh(phien.page);
    await m.moTab('xet-xu');
    const main = m.page.locator('main');

    // Ngày xét xử ở tiêu đề mục lịch: "Lịch xét xử - … dd/mm/yyyy · giờ"
    const dauLich = m.page.locator('.ant-collapse-header').filter({ hasText: /Lịch xét xử/ }).first();
    await dauLich.waitFor({ timeout: 30_000 }).catch(() => undefined);
    const ngayXetXu = ((await dauLich.innerText().catch(() => '')).match(/\d{2}\/\d{2}\/\d{4}/) ?? [''])[0];

    const nutTao = main.getByRole('button', { name: /Tạo bản án phúc thẩm/ });
    // Tiêu đề popup: "Thêm bản án phúc thẩm" → sau lần Lưu đầu đổi thành "Bản án phúc thẩm (dự thảo đã lưu)"
    const bm = m.popup(/bản án phúc thẩm/i);
    // Có cả "Lưu nháp" → khớp đúng tên nút "Lưu"
    const nutLuu = bm.getByRole('button', { name: 'save Lưu', exact: true });
    // Mục "Kết quả xét xử" chưa có kết quả: hai thẻ chọn "Bản án" / "Quyết định" → bấm thẻ "Bản án"
    // thì hiện nút "Tạo bản án phúc thẩm" (có lúc mở luôn form)
    const theBanAn = main.getByText('Tòa xét xử xong nội dung vụ án và ban hành', { exact: false }).first();
    if (await theBanAn.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false)) {
      await theBanAn.click();
      await m.choTaiXong(1500);
    }
    let soBanAn = tt.soBanAn;
    // Đã có bản án: bảng "Kết quả xét xử" có dòng "Bản án phúc thẩm" — còn dự thảo thì có nút "Chỉnh sửa dự thảo"
    const dongBanAn = main.locator('.ant-table-row').filter({ hasText: 'Bản án phúc thẩm' }).first();
    const nutSuaDuThao = dongBanAn.getByRole('button', { name: /Chỉnh sửa dự thảo/ });
    let trangThai = '' as 'tao' | 'duThao' | 'xong' | '';
    await expect
      .poll(
        async () =>
          (trangThai = (await bm.isVisible()) || (await nutTao.isVisible())
            ? 'tao'
            : (await nutSuaDuThao.isVisible())
              ? 'duThao'
              : (await dongBanAn.isVisible())
                ? 'xong'
                : ''),
        { timeout: 30_000, message: 'Tab "Xét xử" không có nút "Tạo bản án phúc thẩm" mà cũng chưa có dòng bản án' },
      )
      .toBeTruthy();
    if (trangThai === 'duThao') {
      // Lượt trước đã "Lưu" dự thảo → mở lại để lấy số, ký
      await nutSuaDuThao.click();
      await expect(bm, 'Không mở được dự thảo bản án').toBeVisible({ timeout: 30_000 });
      await m.choTaiXong(1500);
    }
    if (trangThai === 'tao') {
      // Nút còn chạy hiệu ứng nên Playwright hay báo "not stable" dù form đã mở → kiểm bằng form
      if (!(await bm.isVisible())) await nutTao.click({ timeout: 10_000 }).catch(() => undefined);
      await expect(bm, 'Không mở được form "Thêm bản án phúc thẩm"').toBeVisible({ timeout: 30_000 });
      await m.choTaiXong();

      // Ngày trước, "Dùng số" sau (chọn ngày sau thì ô số bị xóa)
      await m.ngay(bm, 'Ngày bản án', ngay(0));
      await dungSo(m, bm);
      if (!tk.ten) throw new Error(`Taikhoan.xlsx: tài khoản ${tk.taiKhoan} (${tk.toaAn}) thiếu cột "Tên" — cần để chọn người ký`);
      await m.chon(bm, /Thay mặt Hội đồng xét xử/, batDauBang(tk.ten));
      // Tiền án / Tiền sự (bắt buộc) nằm trong thẻ từng bị cáo ở "Thông tin bị cáo", thẻ đang thu gọn
      // (dòng tên có mũi tên "right") → bấm từng dòng tên để mở, rồi điền mọi ô "VD: Không…"
      const dongBiCao = bm.locator('div[style*="cursor: pointer"]').filter({ has: m.page.locator('[aria-label="right"]') });
      for (let i = (await dongBiCao.count()) - 1; i >= 0; i--) await dongBiCao.nth(i).click();
      const oTienAnSu = bm.locator('input[placeholder^="VD: Không"]');
      await oTienAnSu.first().waitFor({ timeout: 10_000 });
      for (let i = 0; i < (await oTienAnSu.count()); i++) await oTienAnSu.nth(i).fill('Không');
      await bm.getByRole('textbox', { name: /Tóm tắt nội dung vụ án/ }).fill('Tóm tắt nội dung vụ án theo bản án sơ thẩm.');

      // Đề nghị đối với bản án sơ thẩm → "Sửa bản án sơ thẩm" → popup sửa
      await bm.getByRole('radiogroup', { name: /Đề nghị đối với bản án sơ thẩm/ }).getByRole('radio', { name: /^Sửa bản án sơ thẩm/ }).click();
      await bm.getByRole('button', { name: 'Sửa', exact: true }).click();
      const sua = m.page.locator('.ant-modal-wrap:visible .ant-modal').last();
      await sua.getByRole('radio', { name: 'Do cấp sơ thẩm sai' }).waitFor({ timeout: 15_000 });
      await m.page.waitForTimeout(800);
      // Ô chọn trong popup: [0] "Đề nghị theo hướng"; chọn "Tăng hình phạt" thì hiện thêm dòng hình phạt đề nghị
      // [1] Loại hình phạt (mặc định "Hình phạt chính") · [2] Hình phạt (mặc định "Tù có thời hạn")
      const oChon = sua.locator('.ant-select:visible');
      if (vuAn.luong === 'khang-cao') {
        await m.chonTrong(oChon.first(), /^\s*Tăng hình phạt\s*$/);
        await expect(oChon.nth(2), 'Chọn "Tăng hình phạt" nhưng không hiện dòng hình phạt đề nghị').toBeVisible({ timeout: 15_000 });
        await m.chonTrong(oChon.nth(2), /^\s*Tử hình\s*$/);
      } else {
        await m.chonTrong(oChon.first(), /^\s*Chuyển hình phạt khác nặng hơn\s*$/);
      }
      await sua.getByRole('radio', { name: 'Do cấp sơ thẩm sai' }).check();
      await sua.getByRole('button', { name: 'Lưu', exact: true }).click();
      await sua.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);

      // Kết luận VKS: nút tách "Lấy theo ý kiến VKS" (mũi tên mở menu → mục cùng tên)
      await bm.getByRole('button', { name: 'arrow-down Lấy theo ý kiến VKS', exact: true }).first().click();
      await m.page.getByRole('button', { name: 'Lấy theo ý kiến VKS', exact: true }).last().click();
      await bm.getByRole('textbox', { name: 'Nhập nơi nhận' }).fill('Hà Nội');
      // Bật mọi mục khai thêm (chưa bật)
      const batMuc = bm.getByRole('switch', { name: 'Bật để khai mục này' });
      for (let i = 0; i < (await batMuc.count()); i++) {
        if ((await batMuc.nth(i).getAttribute('aria-checked')) !== 'true') await batMuc.nth(i).click();
      }
      for (const [nhan, chu] of [
        [/Kiến nghị cơ quan, tổ chức hữu quan/, 'Không có kiến nghị.'],
        [/Nhận định của Hội đồng xét xử phúc thẩm về tình tiết tăng nặng, giảm nhẹ/, 'Không có tình tiết mới.'],
        [/Nhận định của Hội đồng xét xử về từng vấn đề phải giải quyết/, 'Hội đồng xét xử nhận định theo hồ sơ vụ án.'],
        [/Diễn giải thêm căn cứ đề ngh/, 'Theo kháng cáo, kháng nghị.'],
        [/Diễn giải thêm căn cứ Viện ki/, 'Theo ý kiến Viện kiểm sát.'],
      ] as const) {
        const o = bm.getByRole('textbox', { name: nhan }).first();
        if (await o.isVisible().catch(() => false)) await o.fill(chu);
      }

      await nutLuu.click();
      await expect(bm, 'Bấm "Lưu" nhưng bản án chưa thành dự thảo đã lưu').toContainText(/dự thảo đã lưu/i, { timeout: 30_000 });
      await m.choTaiXong(1500);
    }
    if (trangThai === 'tao' || trangThai === 'duThao') {
      // "Lấy số" cần ô số đã có ("Biểu mẫu nhập số thủ công… Vui lòng nhập số trên văn bản") → trống thì "Dùng số" lại
      const oSo = bm.locator('#soBanAn');
      if (!(await oSo.inputValue().catch(() => ''))) await dungSo(m, bm);
      await expect(oSo, 'Ô "Số bản án" vẫn trống sau khi bấm "Dùng số"').not.toHaveValue('', { timeout: 10_000 });
      // Lưu (nếu đang sửa) → "Lấy số" → Lưu → ngày bản án → Lưu
      if (trangThai === 'duThao') {
        await nutLuu.click();
        await m.choTaiXong(1500);
      }
      // Đã cấp số thì "Lấy số" thành "Hủy cấp số" → bỏ qua
      const nutLaySo = bm.getByRole('button', { name: /^\S*\s*Lấy số$/ });
      if (await nutLaySo.isVisible().catch(() => false)) {
        await nutLaySo.click();
        await m.page.waitForTimeout(1500);
        await nutLuu.click();
        await m.choTaiXong(1500);
        await m.ngay(bm, 'Ngày bản án', ngay(0));
        await nutLuu.click();
        await m.choTaiXong(1500);
      }
      soBanAn = (await oSo.inputValue().catch(() => '')) || soBanAn;
      const nutKy = bm.getByRole('button', { name: /Ký logic/ });
      await expect(nutKy, 'Đã lưu và lấy số nhưng nút "Ký logic" vẫn khóa').toBeEnabled({ timeout: 30_000 });
      await nutKy.click();
      await m.page.getByRole('button', { name: 'Ký logic', exact: true }).last().click();
      await m.choThongBao(/Ký logic.*thành công|thành công/i, 60_000);
      await m.page.getByLabel('Đóng').last().click().catch(() => undefined);
      await m.choTaiXong(1500);
    }
    // Số bản án trên dòng bảng (đã ký → có số)
    if (!soBanAn && (await dongBanAn.isVisible().catch(() => false))) {
      soBanAn = (await m.docCot(dongBanAn, 'Số bản án').catch(() => '')).replace(/Chưa nhập/, '').trim() || soBanAn;
    }

    // ── Lưu kết quả ──
    await luuDongKetQua(
      LINH_VUC_1B,
      BIEU_MAU_1B,
      tk,
      ['Luồng', 'Mã vụ án sơ thẩm', 'Link vụ án sơ thẩm', 'Mã vụ án phúc thẩm', 'Số thụ lý PT', 'Ngày thụ lý PT', 'Tên vụ án', 'Tòa phúc thẩm',
        'Chủ tọa', 'Số QĐ đưa ra xét xử', 'Ngày xét xử', 'Số bản án', 'Link vụ án phúc thẩm'],
      [vuAn.luong === 'khang-cao' ? 'Kháng cáo' : 'Kháng nghị', vuAn.maVuAn, vuAn.urlVuAnSoTham, can('maVuAnPhucTham', 6), tt.soThuLy ?? '',
        tt.ngayThuLy ?? '', can('tenVuAn', 1), can('toaPhucTham', 4), tt.chuToa ?? '', tt.soQuyetDinhXetXu ?? '', ngayXetXu, soBanAn ?? '', tt.urlVuAn ?? ''],
    );
    test.info().annotations.push({ type: 'Vụ án phúc thẩm', description: `${vuAn.maVuAn} → ${tt.maVuAnPhucTham} · bản án ${soBanAn ?? ''}` });
    return { ngayXetXu, soBanAn };
  },
};
