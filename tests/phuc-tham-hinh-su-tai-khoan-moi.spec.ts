/**
 * Luồng "Vụ án hình sự phúc thẩm" — chạy tiếp trên các vụ sơ thẩm đã có bản án ký
 * (sổ cái seed-output/hinh-su-so-tham.<env>.json), dữ liệu lấy từ hai sheet:
 *   07_KHANG_CAO_KHANG_NGHI_PT  → kháng cáo / kháng nghị
 *   08_BAN_AN_PHUC_THAM         → thụ lý PT, bản án PT, kết quả
 *
 *   PT1  Tab "Kết quả sơ thẩm" › mục "Kháng cáo, kháng nghị" › Thêm mới đơn kháng cáo
 *
 * Mọi id (vụ án, bị cáo) đều resolve lúc chạy từ sổ cái và API, không viết cứng trong file.
 * Mỗi bước tự bỏ qua khi dữ liệu đã có (discover → reuse), chạy lại không tạo bản ghi trùng.
 *
 * Lọc: QLA_PT_MA=VA054,VA056 (mặc định chạy các vụ có dòng kháng cáo chưa làm và đã xong sơ thẩm).
 * ⚠ Tạo dữ liệu thật → chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 */
import { Page, expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { choPhepGhiTKM } from '../account';
import { choHetSpin, chonNgay, chonSelect, go, nghi, nguyenNhanLoi } from '../common/antd';
import { KhangCaoPT, docKhangCaoPT, tenNguoiKhangCao } from '../common/du-lieu-phuc-tham-hs';
import { moTrangVaiCauHinh } from '../common/luong-tkm';

const MOI_TRUONG = process.env.QLA_ENV || 'stg';
const VAI_CAN_BO = 'canBoDanSu';
const SO_CAI_ST = path.resolve(__dirname, `../seed-output/hinh-su-so-tham.${MOI_TRUONG}.json`);

type TrangThaiST = { idVuAn?: string; maVuAn?: string; tenBiCan?: string; daXong?: string[] };
const soCaiST: Record<string, TrangThaiST> = fs.existsSync(SO_CAI_ST) ? JSON.parse(fs.readFileSync(SO_CAI_ST, 'utf8')) : {};

/** Các vụ chạy được: có dòng kháng cáo chưa làm VÀ sơ thẩm đã ký bản án */
function chonVu(): KhangCaoPT[] {
  const loc = (process.env.QLA_PT_MA || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return docKhangCaoPT().filter(kc => {
    if (loc.length) return loc.includes(kc.maVuAnST);
    if (kc.trangThai || kc.maVuAnPT) return false;
    return (soCaiST[kc.maVuAnST]?.daXong || []).includes('kyBanAn');
  });
}

/** Gọi API GET của QLA bằng token bắt được từ chính trang (chỉ đọc) */
const TOKEN = new WeakMap<Page, string>();
function batToken(page: Page) {
  page.on('request', r => {
    const a = r.headers()['authorization'];
    if (a && r.url().includes('/qla/api/')) TOKEN.set(page, a);
  });
}
async function apiGet(page: Page, duongDan: string): Promise<any> {
  const token = TOKEN.get(page);
  if (!token) return undefined;
  const r = await page.request.get(`${new URL(page.url()).origin}/qla/api/v1/${duongDan}`, {
    headers: { accept: 'application/json', authorization: token },
  });
  return r.ok() ? r.json() : { loi: r.status(), noiDung: (await r.text()).slice(0, 500) };
}

/** Mở chi tiết vụ án sơ thẩm và chuyển sang tab theo tên */
async function moTabSoTham(page: Page, idVuAn: string, tenTab: string) {
  await page.goto(`vu-an/so-tham/chi-tiet?id=${idVuAn}`);
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await choHetSpin(page, 60_000);
  const tabs = page.getByRole('tab');
  const ten = (await tabs.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
  const i = ten.findIndex(t => t === tenTab);
  expect(i, `Không thấy tab "${tenTab}" (đang có: ${ten.join(' | ')})`).toBeGreaterThanOrEqual(0);
  await tabs.nth(i).click();
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await choHetSpin(page, 60_000);
  await nghi(page, 2000, 3000);
}

for (const KC of chonVu()) {
  const ST = soCaiST[KC.maVuAnST] || {};
  test.describe(`${KC.maVuAnST} · ${KC.ma} · ${KC.loai} · ${KC.chuThe}`, () => {
    test('PT1 · Kết quả sơ thẩm › Kháng cáo, kháng nghị › Thêm mới đơn kháng cáo', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      test.skip(!/^Kháng cáo$/i.test(KC.loai), `Dòng ${KC.ma} là "${KC.loai}", PT1 mới làm nhánh kháng cáo`);
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
      expect(ST.idVuAn, `Chưa có vụ án sơ thẩm cho ${KC.maVuAnST} trong sổ cái`).toBeTruthy();
      expect(ST.daXong, `Vụ ${KC.maVuAnST} chưa ký bản án sơ thẩm`).toContain('kyBanAn');

      const tenNguoi = tenNguoiKhangCao(KC.chuThe);
      expect(tenNguoi, `Không tách được tên người kháng cáo từ "${KC.chuThe}"`).toBeTruthy();

      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_CAN_BO);
      batToken(page);
      await moTabSoTham(page, ST.idVuAn!, 'Kết quả sơ thẩm');

      // discover → reuse: đã có đơn kháng cáo của đúng người thì không tạo thêm
      const daCo = await apiGet(page, `don-khang-cao?idVuAn=${ST.idVuAn}&current=1&pageSize=50`);
      const dsDon: any[] = daCo?.data?.data || daCo?.data || [];
      const donCu = Array.isArray(dsDon) ? dsDon.find(d => String(d?.tenNguoiKhangCao || '').includes(tenNguoi)) : undefined;
      if (donCu) {
        ghi('bỏ qua', `Đã có đơn kháng cáo của ${donCu.tenNguoiKhangCao} ngày ${donCu.ngayKhangCao} (id ${donCu.id})`);
        await context.close();
        return;
      }

      // Mục "Kháng cáo, kháng nghị" là khối gập — mở ra rồi mới thấy bảng bên trong
      const tieuDeMuc = page.getByRole('button', { name: /^Kháng cáo, kháng nghị$/ }).first();
      if (await tieuDeMuc.count()) {
        await tieuDeMuc.scrollIntoViewIfNeeded();
        await tieuDeMuc.click();
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
      }
      // Trong mục có hai bảng: "Đơn kháng cáo" và "Quyết định kháng nghị" — nhận bảng kháng cáo
      // qua chữ của chính nó ("Chưa có đơn kháng cáo trong vụ án" / "Tổng N đơn kháng cáo")
      const bangKhangCao = page.locator('.ant-pro-table').filter({ hasText: /đơn kháng cáo/i }).first();
      await expect(bangKhangCao, 'Không thấy bảng "Đơn kháng cáo" trong mục Kháng cáo, kháng nghị').toBeVisible({ timeout: 60_000 });
      await bangKhangCao.scrollIntoViewIfNeeded();
      await bangKhangCao.getByRole('button', { name: /Thêm mới$/ }).first().click();
      await choHetSpin(page);
      await nghi(page, 2000, 3000);

      const dr = page.locator('.ant-drawer-open').filter({ hasText: /kháng cáo/i }).last();
      await expect(dr, 'Không mở được form thêm đơn kháng cáo').toBeVisible({ timeout: 60_000 });
      ghi('form', (await dr.locator('.ant-drawer-title').innerText().catch(() => '')).trim());

      // Ngày kháng cáo + ngày tiếp nhận theo sheet 07 (Điều 333: ngày gửi/nhận đơn)
      await chonNgay(dr.locator('#ngayKhangCao').first(), KC.ngay);
      await dr.locator('.ant-drawer-title').first().click();
      await chonNgay(dr.locator('#ngayTiepNhan').first(), KC.ngay);
      await dr.locator('.ant-drawer-title').first().click();
      // Số tiếp nhận: Excel không có trường này và form không có cơ chế lấy số tự động
      // (ProFormText tự nhập) → dùng mã dòng Excel để tra ngược được về nguồn dữ liệu
      const oSoTn = dr.locator('#soTiepNhan').first();
      if ((await oSoTn.count()) && !(await oSoTn.inputValue().catch(() => 'x'))) {
        await go(oSoTn, KC.ma);
        ghi('số tiếp nhận', `${KC.ma} (Excel không có trường này, lấy theo mã dòng sheet 07)`);
      }

      // Người kháng cáo: tư cách + chọn đúng bị cáo trong vụ
      const oTuCach = dr.locator('#loaiNguoiKhangCao').first();
      if (await oTuCach.count()) ghi('tư cách người kháng cáo', await chonSelect(page, oTuCach, 'Bị cáo', { goDeLoc: false }));
      const oNguoi = dr.locator('#idNguoiKhangCao').first();
      expect(await oNguoi.count(), 'Không thấy ô "Người kháng cáo" trên form').toBeGreaterThan(0);
      ghi('người kháng cáo', await chonSelect(page, oNguoi, tenNguoi));

      // Kháng cáo đối với bị cáo nào (form có thể là chọn một hoặc chọn nhiều)
      for (const id of ['#idNguoiBiKhangCao', '#dsIdNguoiBiKhangCao']) {
        const o = dr.locator(id).first();
        if (!(await o.count())) continue;
        const chon = await chonSelect(page, o, tenNguoi).catch(() => '');
        if (chon) ghi('kháng cáo đối với', chon);
        break;
      }

      // Các ô bắt buộc còn trống (phạm vi kháng cáo, hình thức tiếp nhận…) chọn mục đầu
      for (const khung of await dr.locator('.ant-form-item:has(.ant-form-item-required) .ant-select').all()) {
        if (await khung.locator('.ant-select-selection-item').count()) continue;
        const nhan = (await khung.locator('xpath=ancestor::div[contains(@class,"ant-form-item")][1]//label').first().innerText().catch(() => '')).trim();
        const daChon = await chonSelect(page, khung.locator('input').first(), undefined, { goDeLoc: false }).catch(() => '');
        if (daChon) ghi(`bắt buộc · ${nhan || '(không rõ nhãn)'}`, daChon);
        await choHetSpin(page);
      }

      // Nội dung kháng cáo (bắt buộc) lấy nguyên văn cột "Nội dung" sheet 07
      const oNoiDung = dr.locator('#noiDung').first();
      expect(await oNoiDung.count(), 'Không thấy ô "Nội dung kháng cáo"').toBeGreaterThan(0);
      if (!(await oNoiDung.inputValue().catch(() => 'x'))) {
        await go(oNoiDung, KC.noiDung);
        ghi('nội dung kháng cáo', KC.noiDung);
      }

      // Khối "Yêu cầu kháng cáo" bắt buộc tick ít nhất một mục nhưng không hiện chữ lỗi nào, chỉ
      // viền đỏ. Cột "Nội dung" sheet 07 viết tự do nên dò theo từ khoá; không khớp thì lấy
      // "Kháng cáo giảm hình phạt" — yêu cầu phổ biến nhất của bị cáo kháng cáo bản án.
      const theoTuKhoa: [RegExp, string][] = [
        [/kêu oan|không phạm tội/i, 'Kêu oan'],
        [/án treo/i, 'Kháng cáo cho hưởng án treo'],
        [/miễn hình phạt/i, 'Kháng cáo đề nghị miễn hình phạt'],
        [/tội nhẹ hơn|thay đổi tội/i, 'Kháng cáo đề nghị thay đổi tội nhẹ hơn'],
        [/điều khoản/i, 'Kháng cáo đề nghị thay đổi điều khoản áp dụng'],
        [/hình phạt khác/i, 'Kháng cáo chuyển sang hình phạt khác thuộc loại nhẹ hơn'],
        [/giảm mức bồi thường/i, 'Kháng cáo giảm mức bồi thường'],
        [/trách nhiệm dân sự/i, 'Kháng cáo về phần trách nhiệm dân sự'],
        [/giảm nhẹ|giảm hình phạt/i, 'Kháng cáo giảm hình phạt'],
      ];
      const yeuCau = theoTuKhoa.find(([m]) => m.test(KC.noiDung))?.[1] || 'Kháng cáo giảm hình phạt';
      const oYeuCau = dr.getByRole('checkbox', { name: yeuCau }).first();
      expect(await oYeuCau.count(), `Không thấy ô tick "${yeuCau}" trong khối Yêu cầu kháng cáo`).toBeGreaterThan(0);
      if (!(await oYeuCau.isChecked())) await oYeuCau.check({ force: true });
      ghi('yêu cầu kháng cáo', `${yeuCau}${theoTuKhoa.some(([m]) => m.test(KC.noiDung)) ? '' : ' (nội dung Excel không nêu yêu cầu cụ thể)'}`);

      const nutLuu = dr.getByRole('button', { name: /^(Lưu mới|Lưu|Thêm mới|Xác nhận)$/ }).last();
      await expect(nutLuu, `Không thấy nút lưu trên form (đang có: ${(await dr.getByRole('button').allInnerTexts()).join(' | ')})`).toBeVisible({
        timeout: 30_000,
      });
      const choApi = page
        .waitForResponse(r => r.request().method() === 'POST' && /don-khang-cao/.test(r.url()), { timeout: 90_000 })
        .catch(() => null);
      await nutLuu.click();
      const res = await choApi;
      expect(res, `Không thấy API POST /don-khang-cao được gọi — ${await nguyenNhanLoi(page, dr)}`).toBeTruthy();
      const kq = await res!.json().catch(() => ({ success: res!.ok() }));
      expect(kq?.success, `Tạo đơn kháng cáo lỗi: ${kq?.message || res!.status()}`).not.toBe(false);
      ghi('đơn kháng cáo', `đã tạo, id ${kq?.data || '(không đọc được)'}`);
      await choHetSpin(page);
      await nghi(page, 2000, 3000);

      // Hậu kiểm bằng API: đúng một đơn của đúng người, đúng ngày
      const sau = await apiGet(page, `don-khang-cao?idVuAn=${ST.idVuAn}&current=1&pageSize=50`);
      const ds: any[] = sau?.data?.data || sau?.data || [];
      const cua = ds.filter(d => String(d?.tenNguoiKhangCao || '').includes(tenNguoi));
      expect(cua.length, `Sau khi lưu phải có đúng 1 đơn kháng cáo của ${tenNguoi}, đang có ${cua.length}`).toBe(1);
      ghi('hậu kiểm API', JSON.stringify({ ten: cua[0]?.tenNguoiKhangCao, ngay: cua[0]?.ngayKhangCao, id: cua[0]?.id }));
      await context.close();
    });

    // Đơn mới lập ở trạng thái "Chờ xử lý"; phải Duyệt (TrangThaiXuLyDonKhang.DON_HOP_LE) thì hồ sơ
    // mới đủ điều kiện chuyển lên tòa phúc thẩm — xem KhangCaoKhangNghiTab.choPhepDuyetTuChoi
    test('PT2 · Duyệt đơn kháng cáo (chốt đơn hợp lệ)', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      test.skip(!/^Kháng cáo$/i.test(KC.loai), `Dòng ${KC.ma} là "${KC.loai}", PT2 mới làm nhánh kháng cáo`);
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
      const tenNguoi = tenNguoiKhangCao(KC.chuThe);

      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_CAN_BO);
      batToken(page);
      await moTabSoTham(page, ST.idVuAn!, 'Kết quả sơ thẩm');

      const tieuDeMuc = page.getByRole('button', { name: /^Kháng cáo, kháng nghị$/ }).first();
      if (await tieuDeMuc.count()) {
        await tieuDeMuc.scrollIntoViewIfNeeded();
        await tieuDeMuc.click();
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
      }
      const bang = page.locator('.ant-pro-table').filter({ hasText: /đơn kháng cáo/i }).first();
      const dong = bang.locator('.ant-table-row').filter({ hasText: tenNguoi }).first();
      await expect(dong, `Không thấy dòng đơn kháng cáo của ${tenNguoi} (chạy PT1 trước)`).toBeVisible({ timeout: 60_000 });
      await dong.scrollIntoViewIfNeeded();

      const chuTrenDong = (await dong.innerText()).replace(/\s+/g, ' ').trim();
      // Nút có icon check-circle nên accessible name kèm tên icon — không neo đầu chuỗi
      const nutDuyet = dong.getByRole('button', { name: /Duyệt$/ }).first();
      if (!(await nutDuyet.count())) {
        // Không còn nút Duyệt nghĩa là đơn đã chốt trạng thái ở lần chạy trước
        ghi('bỏ qua', `Đơn không còn ở trạng thái chờ duyệt: ${chuTrenDong.slice(0, 200)}`);
        expect(chuTrenDong, 'Đơn không có nút Duyệt mà cũng chưa hợp lệ').toMatch(/hợp lệ/i);
        await context.close();
        return;
      }
      ghi('trạng thái trước khi duyệt', chuTrenDong.slice(0, 200));

      await nutDuyet.click();
      const xacNhan = page.locator('.ant-popover').filter({ hasText: /Xác nhận duyệt đơn/i }).last();
      await expect(xacNhan, 'Không mở được hộp xác nhận duyệt đơn').toBeVisible({ timeout: 30_000 });
      await xacNhan.getByRole('button', { name: /^Duyệt$/ }).last().click();
      await choHetSpin(page);
      await nghi(page, 2500, 3500);

      // Hậu kiểm: dòng phải chuyển sang trạng thái hợp lệ và không còn cặp Duyệt/Từ chối
      const sau = bang.locator('.ant-table-row').filter({ hasText: tenNguoi }).first();
      const chuSau = (await sau.innerText()).replace(/\s+/g, ' ').trim();
      ghi('trạng thái sau khi duyệt', chuSau.slice(0, 200));
      expect(chuSau, `Đơn kháng cáo chưa chuyển sang hợp lệ — ${await nguyenNhanLoi(page)}`).toMatch(/hợp lệ/i);
      await context.close();
    });

    // Màn "Hồ sơ chuyển đi" của SƠ THẨM: /vu-an/so-tham/chuyen-di. Không nhầm với
    // /vu-an/phuc-tham/chuyen-di — đó là hồ sơ đi sau khi phúc thẩm HỦY án, chuyển ngược về sơ thẩm.
    test('PT3 · Hồ sơ chuyển đi › chọn vụ án › Chuyển hồ sơ đi', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      test.skip(!/^Kháng cáo$/i.test(KC.loai), `Dòng ${KC.ma} là "${KC.loai}", PT3 mới làm nhánh kháng cáo`);
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
      const maVuAn = ST.maVuAn!;
      expect(maVuAn, 'Chưa có mã vụ án sơ thẩm trong sổ cái').toBeTruthy();

      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_CAN_BO);
      await page.goto('vu-an/so-tham/chuyen-di');
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page, 60_000);
      await nghi(page, 2500, 3500);
      const tenTab = async () => (await page.getByRole('tab').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
      ghi('tab lúc vào', (await tenTab()).join(' | '));

      const moTab = async (ten: string) => {
        await page.getByRole('tab').filter({ hasText: new RegExp(`^${ten} `) }).first().click();
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await choHetSpin(page, 60_000);
        await nghi(page, 2000, 3000);
      };

      // Đã chuyển rồi thì dừng — chạy lại không tạo thêm đợt chuyển
      for (const ten of ['Chờ tiếp nhận', 'Đã tiếp nhận', 'Đã thụ lý']) {
        await moTab(ten);
        if (await page.locator('.ant-table-row').filter({ hasText: maVuAn }).count()) {
          ghi('bỏ qua', `Hồ sơ ${maVuAn} đã ở tab "${ten}"`);
          await context.close();
          return;
        }
      }

      await moTab('Chưa chuyển');
      const dong = page.locator('.ant-table-row').filter({ hasText: maVuAn }).first();
      if (!(await dong.count())) {
        const dsDong = (await page.locator('.ant-table-row').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim().slice(0, 80));
        throw new Error(`Hồ sơ ${maVuAn} chưa vào tab "Chưa chuyển". Tab: ${(await tenTab()).join(' | ')}. Đang có: ${dsDong.join(' || ') || '(trống)'}`);
      }
      ghi('dòng hồ sơ', (await dong.innerText()).replace(/\s+/g, ' ').trim().slice(0, 220));

      // Tick chọn dòng thì nút "Chuyển hồ sơ đi" mới hiện trên thanh công cụ (handleChuyenVuAn)
      await dong.locator('input[type="checkbox"]').first().check({ force: true });
      await nghi(page, 800, 1200);
      const nutChuyen = page.getByRole('button', { name: /Chuyển hồ sơ đi$/ }).first();
      await expect(nutChuyen, 'Không thấy nút "Chuyển hồ sơ đi" sau khi chọn dòng').toBeVisible({ timeout: 30_000 });
      await nutChuyen.click();
      await choHetSpin(page);
      await nghi(page, 1500, 2500);

      // Chuyển trước khi hết thời hạn kháng cáo → hệ thống hỏi xác nhận trước khi tạo đợt chuyển
      for (let i = 0; i < 3; i++) {
        const hop = page.locator('.ant-modal-confirm, .ant-modal').filter({ hasText: /thời hạn kháng cáo|xác nhận|chắc chắn/i }).last();
        if (!(await hop.isVisible().catch(() => false))) break;
        const nut = hop.getByRole('button', { name: /^(Đồng ý|Xác nhận|OK|Tiếp tục|Chuyển)$/ }).last();
        if (!(await nut.count())) break;
        ghi('xác nhận', (await hop.innerText()).replace(/\s+/g, ' ').trim().slice(0, 180));
        await nut.click();
        await choHetSpin(page);
        await nghi(page, 2000, 3000);
      }
      await choHetSpin(page, 60_000);
      await nghi(page, 2500, 3500);

      // Hậu kiểm: hồ sơ phải rời "Chưa chuyển" và nằm ở "Chờ tiếp nhận"
      await moTab('Chờ tiếp nhận');
      await expect(
        page.locator('.ant-table-row').filter({ hasText: maVuAn }).first(),
        `Hồ sơ ${maVuAn} chưa sang "Chờ tiếp nhận" — ${await nguyenNhanLoi(page)}`,
      ).toBeVisible({ timeout: 60_000 });
      ghi('kết quả', `${maVuAn} đã ở tab "Chờ tiếp nhận"`);
      await context.close();
    });
  });
}
