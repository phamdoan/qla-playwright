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
import { choPhepGhiTKM } from '../../../account';
import { choHetSpin, chonNgay, chonSelect, go, moTaForm, nghi, nguyenNhanLoi, toastDaHien } from '../../../common/antd';
import { KhangCaoPT, docKhangCaoPT, tenNguoiKhangCao } from '../../../common/du-lieu-phuc-tham-hs';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';
import { bieuMauDangMo, dienSoVaNgayNeuCan, dongBieuMau, laySoVaKyLogic, luuBieuMau } from '../../../common/bieu-mau';

const MOI_TRUONG = process.env.QLA_ENV || 'stg';
const VAI_CAN_BO = 'canBoDanSu';
/**
 * Ngày kháng cáo/tiếp nhận: bản án sơ thẩm mang NGÀY LẤY SỐ (= ngày chạy, hệ thống tự gán khi "Lấy số")
 * nên ngày kháng cáo trong dữ liệu (tháng 8) sẽ trước ngày bản án → dùng ngày chạy (đào tạo 15/10/2026).
 */
const NGAY_CHAY = (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })();
const SO_CAI_ST = path.resolve(__dirname, `../../../seed-output/hinh-su-so-tham.${MOI_TRUONG}.json`);

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

/**
 * Sổ cái phúc thẩm (R1/R5): bước đã xong + khoá sinh ra (id vụ PT, số thụ lý PT, số bản án PT…) theo mã vụ ST.
 * Đọc lại MỖI lần (không cache) để các bước sau thấy khoá bước trước vừa ghi.
 */
const SO_CAI_PT = path.resolve(__dirname, `../../../seed-output/hinh-su-phuc-tham.${MOI_TRUONG}.json`);
type TrangThaiPT = { daXong?: string[]; [k: string]: unknown };
const docSoCaiPT = (): Record<string, TrangThaiPT> => (fs.existsSync(SO_CAI_PT) ? JSON.parse(fs.readFileSync(SO_CAI_PT, 'utf8')) : {});
function ghiSoCaiPT(ma: string, them: { xong?: string } & Record<string, unknown>) {
  const s = docSoCaiPT();
  const cu = s[ma] || {};
  const { xong, ...khoa } = them;
  s[ma] = { ...cu, ...khoa, daXong: [...new Set([...(cu.daXong || []), ...(xong ? [xong] : [])])] };
  fs.mkdirSync(path.dirname(SO_CAI_PT), { recursive: true });
  fs.writeFileSync(SO_CAI_PT, JSON.stringify(s, null, 2));
}
const daXongPT = (ma: string, buoc: string) => (docSoCaiPT()[ma]?.daXong || []).includes(buoc);

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
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      expect(ST.idVuAn, `Chưa có vụ án sơ thẩm cho ${KC.maVuAnST} trong sổ cái`).toBeTruthy();
      if (daXongPT(KC.maVuAnST, 'chuyenDi')) {
        ghi('bỏ qua', `${KC.maVuAnST} đã chuyển hồ sơ lên phúc thẩm`);
        return;
      }
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
      await chonNgay(dr.locator('#ngayKhangCao').first(), NGAY_CHAY);
      await dr.locator('.ant-drawer-title').first().click();
      await chonNgay(dr.locator('#ngayTiepNhan').first(), NGAY_CHAY);
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
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tenNguoi = tenNguoiKhangCao(KC.chuThe);
      if (daXongPT(KC.maVuAnST, "tb048") || daXongPT(KC.maVuAnST, "chuyenDi")) {
        ghi("bỏ qua", `${KC.maVuAnST} đã qua bước duyệt (sổ cái phúc thẩm)`);
        return;
      }

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

    /**
     * PT2b · Thông báo về việc kháng cáo (mẫu 048) cho đơn vừa duyệt: Lưu → Lấy số → Ký logic.
     * Điều kiện của cả danh sách "Hồ sơ chuyển đi" lẫn API chuyển hồ sơ (đào tạo 15/10/2026):
     *   qla VuChuyenRepository (EXISTS đơn có idVanBanThongBao đã ký) + VuChuyenServiceImpl.validateDieuKienChuyenPhucTham
     *   ("Chưa ban hành Thông báo về việc kháng cáo…"). Mẫu 068 đang TẮT (BAT_BUOC_THONG_BAO_AN_PHI_TRUOC_KHI_CHUYEN=false).
     * FE: KhangCaoKhangNghiTab.tsx — dòng đơn › "Thao tác" › "Lập biểu mẫu" › "Thông báo về việc kháng cáo" (key tb-khang-cao).
     * Chạy bằng Chánh án (người ký) để Ký logic ngay.
     */
    test('PT2b · Thông báo về việc kháng cáo (048) → Lưu → Lấy số → Ký', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      test.skip(!/^Kháng cáo$/i.test(KC.loai), `Dòng ${KC.ma} là "${KC.loai}"`);
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tenNguoi = tenNguoiKhangCao(KC.chuThe);
      // Sổ cái: đã ký 048 (TH01 làm tay 15/10/2026 trước khi có sổ cái thì hồ sơ đã sang "Chưa chuyển") → bỏ qua
      if (daXongPT(KC.maVuAnST, 'tb048') || daXongPT(KC.maVuAnST, 'chuyenDi')) {
        ghi('bỏ qua', `${KC.maVuAnST} đã lập + ký thông báo 048 (sổ cái phúc thẩm)`);
        return;
      }

      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAnDanSu');
      batToken(page);
      // Đã có thông báo đã ký (idVanBanThongBao) thì bỏ qua — chạy lại không lập thêm
      const truoc = await apiGet(page, `don-khang-cao?idVuAn=${ST.idVuAn}&current=1&pageSize=50`).catch(() => undefined);
      await moTabSoTham(page, ST.idVuAn!, 'Kết quả sơ thẩm');
      const dsTruoc: any[] = truoc?.data?.data || truoc?.data || [];
      const donCua = Array.isArray(dsTruoc) ? dsTruoc.find(d => String(d?.tenNguoiKhangCao || '').includes(tenNguoi)) : undefined;
      if (donCua?.idVanBanThongBao) {
        ghi('bỏ qua', `Đơn ${donCua.id} đã có thông báo kháng cáo đã ký (${donCua.idVanBanThongBao})`);
        await context.close();
        return;
      }

      const tieuDeMuc = page.getByRole('button', { name: /^Kháng cáo, kháng nghị$/ }).first();
      if (await tieuDeMuc.count()) {
        await tieuDeMuc.scrollIntoViewIfNeeded();
        await tieuDeMuc.click();
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
      }
      const bang = page.locator('.ant-pro-table').filter({ hasText: /đơn kháng cáo/i }).first();
      const dong = bang.locator('.ant-table-row').filter({ hasText: tenNguoi }).first();
      await expect(dong, `Không thấy dòng đơn kháng cáo của ${tenNguoi}`).toBeVisible({ timeout: 60_000 });
      await dong.scrollIntoViewIfNeeded();
      ghi('dòng đơn', (await dong.innerText()).replace(/\s+/g, ' ').trim().slice(0, 200));

      // "Thao tác" › "Lập biểu mẫu" › "Thông báo về việc kháng cáo"
      // Cột Thao tác: nút "Lập biểu mẫu ▾" ngay trên dòng (đo đào tạo 15/10/2026) → mở danh sách mẫu
      const nutLapBm = dong.locator('button').filter({ hasText: /Lập biểu mẫu/ }).first();
      await expect(nutLapBm, 'Dòng đơn không có nút "Lập biểu mẫu" (đơn chưa duyệt?)').toBeVisible({ timeout: 15_000 });
      await nutLapBm.click();
      const mucTb = page.locator('.ant-dropdown-menu-item, [role="menuitem"]').filter({ hasText: /Thông báo về việc kháng cáo/ }).locator('visible=true').first();
      await expect(mucTb, 'Không thấy mục "Thông báo về việc kháng cáo"').toBeVisible({ timeout: 15_000 });
      await mucTb.click();
      await choHetSpin(page);
      await nghi(page, 2500, 3500);

      const bm = bieuMauDangMo(page);
      await expect(bm, 'Không mở được biểu mẫu Thông báo về việc kháng cáo').toBeVisible({ timeout: 60_000 });
      await dienSoVaNgayNeuCan(page, bm, `${KC.maVuAnST}-tb048`, 'TB 048', ghi);
      // Lịch "Ngày thông báo" còn mở sau khi gõ → che nút Lưu, Lưu không gửi gì (ảnh đào tạo 15/10/2026)
      await page.keyboard.press('Escape').catch(() => {});
      await bm.getByText('Thông báo về việc kháng cáo').first().click().catch(() => {});
      await expect(page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});

      // Bắt buộc ≥ 1 "Người được thông báo" (BieuMau048.tsx:702 validator) — chọn ở ô chọn rồi bấm nút ↓ để thêm dòng.
      // Thêm lần lượt các người tham gia có sẵn (bị cáo, VKS, bị hại…), tối đa 4.
      const nutThemNguoi = bm.locator('button:has(.anticon-arrow-down)').first();
      if (await nutThemNguoi.count()) {
        const oChonNguoi = nutThemNguoi.locator('xpath=ancestor::div[contains(@class,"ant-row")][1]').locator('.ant-select input').first();
        const daThem: string[] = [];
        for (let i = 0; i < 4; i++) {
          const ten = await chonSelect(page, oChonNguoi, undefined, { goDeLoc: false }).catch(() => '');
          if (!ten || daThem.includes(ten)) break;
          await nutThemNguoi.click();
          await nghi(page, 400, 700);
          daThem.push(ten);
        }
        ghi('người được thông báo', daThem.join(' · ') || '(không chọn được)');
      }
      await page.screenshot({ path: testInfo.outputPath('tb048-truoc-luu.png'), fullPage: true }).catch(() => {});
      ghi('form TB 048 trước khi lưu', (await moTaForm(bm).catch(e => [`(không đọc được: ${e})`])).join(' ¦ '));
      await luuBieuMau(page, bm, 'TB 048', ghi);
      ghi('form TB 048 sau khi lưu', (await moTaForm(bm).catch(e => [`(không đọc được: ${e})`])).join(' ¦ '));
      await laySoVaKyLogic(page, bm, ghi, 'TB 048');
      await dongBieuMau(page, bm);

      // Hậu kiểm bằng API: đơn đã gắn thông báo đã ký
      const sau = await apiGet(page, `don-khang-cao?idVuAn=${ST.idVuAn}&current=1&pageSize=50`);
      const ds: any[] = sau?.data?.data || sau?.data || [];
      const don = Array.isArray(ds) ? ds.find(d => String(d?.tenNguoiKhangCao || '').includes(tenNguoi)) : undefined;
      // API danh sách đơn không trả idVanBanThongBao (đo 15/10/2026) → ghi lại các trường liên quan; bằng
      // chứng thật là vụ hiện ở tab "Chưa chuyển" của Hồ sơ chuyển đi (PT3 kiểm)
      const lienQuan = Object.fromEntries(Object.entries(don || {}).filter(([k]) => /thongBao|vuChuyen|vanBan/i.test(k)));
      ghi('hậu kiểm', JSON.stringify({ id: don?.id, ...lienQuan }).slice(0, 400));
      ghiSoCaiPT(KC.maVuAnST, { xong: 'tb048' });
      await context.close();
    });

    // Màn "Hồ sơ chuyển đi" của SƠ THẨM: /vu-an/so-tham/chuyen-di. Không nhầm với
    // /vu-an/phuc-tham/chuyen-di — đó là hồ sơ đi sau khi phúc thẩm HỦY án, chuyển ngược về sơ thẩm.
    test('PT3 · Hồ sơ chuyển đi › chọn vụ án › Chuyển hồ sơ đi', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      test.skip(!/^Kháng cáo$/i.test(KC.loai), `Dòng ${KC.ma} là "${KC.loai}", PT3 mới làm nhánh kháng cáo`);
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const maVuAn = ST.maVuAn!;
      if (daXongPT(KC.maVuAnST, 'chuyenDi')) {
        ghi('bỏ qua', `${maVuAn} đã chuyển hồ sơ (sổ cái phúc thẩm)`);
        return;
      }
      expect(maVuAn, 'Chưa có mã vụ án sơ thẩm trong sổ cái').toBeTruthy();

      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_CAN_BO);
      // `vu-an/so-tham/chuyen-di` nay 404 (đào tạo 15/10/2026): danh sách do menu API cấp → đi theo href
      // của mục "Hồ sơ chuyển đi" thuộc Hình sự › Quản lý án sơ thẩm (MenuV3: mục là link)
      // Đường dẫn hình sự sơ thẩm: qla-webapp/src/components/HuongDan/kich-ban/hinhSu.ts:58 (DUONG_DAN_CHUYEN_DI).
      // moMenu theo nhãn đi nhầm sang "Hồ sơ chuyển đi" của khiếu nại tố tụng (trùng nhãn).
      // Gõ thẳng URL cũng 404 với tài khoản này (route do menu API cấp) → đứng ở chi tiết vụ sơ thẩm (menu
      // Hình sự › Quản lý án sơ thẩm đang mở) rồi bấm mục "Hồ sơ chuyển đi" ĐANG HIỆN — đó là mục của hình sự
      // Bắt API menu (danh sách màn do menu API cấp) để lấy đúng đường dẫn mục "Hồ sơ chuyển đi" của hình sự
      const menuJson: string[] = [];
      page.on('response', async r => {
        if (!/menu/i.test(r.url()) || r.request().method() !== 'GET') return;
        const t = await r.text().catch(() => '');
        if (t.includes('chuyển đi') || t.includes('chuyen-di')) menuJson.push(t);
      });
      await page.goto('vu-an/so-tham/chi-tiet?id=' + ST.idVuAn);
      await choHetSpin(page, 60_000);
      await nghi(page, 3000, 4000);
      {
        const dsDuong = new Set<string>();
        for (const t of menuJson) for (const m of t.matchAll(/"[a-zA-Z]*(?:path|url|duongDan|link)[a-zA-Z]*"\s*:\s*"([^"]*chuyen-di[^"]*)"/gi)) dsDuong.add(m[1]);
        ghi('đường dẫn chuyển đi từ API menu', [...dsDuong].join(' , ') || `(không bắt được — ${menuJson.length} phản hồi menu)`);
      }
      // Nhiều mục "Hồ sơ chuyển đi" (khiếu nại tố tụng, dân sự, hình sự…) — liệt kê href rồi chọn mục hình sự sơ thẩm
      const dsLink = await page.locator('a').filter({ hasText: /^\s*Hồ sơ chuyển đi\s*$/ }).evaluateAll(es =>
        es.map(e => {
          const r = (e as HTMLElement).getBoundingClientRect();
          return { href: e.getAttribute('href') || '', y: Math.round(r.top), hien: r.width > 0 && r.height > 0 };
        }),
      );
      ghi('các link Hồ sơ chuyển đi', dsLink.map(l => `${l.href}${l.hien ? ` @${l.y}` : ' (ẩn)'}`).join(' , '));
      const linkHs =
        dsLink.find(l => /\/vu-an\/so-tham\//.test(l.href) && !/bpxlch|hanh-chinh|dan-su/.test(l.href)) ||
        dsLink.find(l => /hinh-su/.test(l.href));
      expect(linkHs, 'Không thấy link "Hồ sơ chuyển đi" của hình sự sơ thẩm').toBeTruthy();
      await page.goto(linkHs!.href.replace(/^\/qla\//, ''));
      await page.waitForURL(u => !/chi-tiet\?id=/.test(u.toString()), { timeout: 30_000 }).catch(() => {});
      ghi('màn Hồ sơ chuyển đi', page.url());
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page, 60_000);
      await nghi(page, 2500, 3500);
      const tenTab = async () => (await page.getByRole('tab').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
      ghi('tab lúc vào', (await tenTab()).join(' | '));

      const moTab = async (ten: string) => {
        await page.getByRole('tab').filter({ hasText: new RegExp(`^${ten} `) }).first().click();
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await choHetSpin(page, 60_000);
        // Lọc theo mã vụ án (keySearch — VuChuyenServiceImpl.java:2849) thay vì đọc trang đầu (R2)
        const oTim = page.getByPlaceholder(/Nhập mã vụ án/).first();
        if (await oTim.isVisible().catch(() => false)) {
          await oTim.fill(maVuAn);
          await oTim.press('Enter');
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
          await choHetSpin(page, 60_000);
        }
        await nghi(page, 2000, 3000);
      };

      // Đã chuyển rồi thì dừng — chạy lại không tạo thêm đợt chuyển
      for (const ten of ['Chờ tiếp nhận', 'Đã tiếp nhận', 'Đã thụ lý']) {
        await moTab(ten);
        if (await page.locator('.ant-table-row').filter({ hasText: maVuAn }).count()) {
          ghi('bỏ qua', `Hồ sơ ${maVuAn} đã ở tab "${ten}"`);
          ghiSoCaiPT(KC.maVuAnST, { xong: 'chuyenDi' });
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
        const nut = hop.getByRole('button', { name: /^(Đồng ý|Xác nhận|OK|Tiếp tục|Chuyển|Vẫn chuyển)$/ }).last();
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
      ghiSoCaiPT(KC.maVuAnST, { xong: 'chuyenDi' });
      await context.close();
    });

    /**
     * PT4 · TAND TP Hà Nội (Nguyễn Xuân Kỳ, vai chanhAnPhucThamHanhChinh) tiếp nhận hồ sơ: menu "Hồ sơ chuyển đến"
     * (phúc thẩm hình sự) → tìm theo mã vụ ST → chi tiết → đối chiếu đầu mục "Đủ" → Biên bản giao nhận → Lấy số/Ký.
     * Vụ phúc thẩm chỉ sinh sau khi ký biên bản (ST_PT_Hinh_su.txt phần E). Cặp KV9 → TP Hà Nội đã đi trọn ở dân sự.
     */
    test('PT4 · Phúc thẩm tiếp nhận hồ sơ chuyển đến (đối chiếu, biên bản giao nhận)', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      testInfo.setTimeout(12 * 60_000);
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const maVuAn = ST.maVuAn!;
      if (daXongPT(KC.maVuAnST, 'tiepNhanPT')) {
        ghi('bỏ qua', `${maVuAn} đã tiếp nhận ở phúc thẩm`);
        return;
      }
      expect(daXongPT(KC.maVuAnST, 'chuyenDi'), 'Chưa chuyển hồ sơ (chạy PT3 trước)').toBe(true);
      const chup = (ten: string) => page.screenshot({ path: testInfo.outputPath(`${ten}.png`), fullPage: true }).catch(() => {});
      const dsNutTrang = async () =>
        (await page.locator('button:visible').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 25).join(' | ');

      // Án tử hình/chung thân được chuyển phúc thẩm lên TAND TỐI CAO (VuChuyenServiceImpl: timVuAnTuyenTuHinhChungThan
      // → toaAnToiCao), không lên TAND TP Hà Nội. Ở D01, màn "Vụ án phúc thẩm chuyển đến" = /vu-an/phuc-tham/chuyen-den
      // (đo đào tạo 15/10/2026, tài khoản thư ký Vụ hình sự). Ô tìm kiếm KHÔNG khớp mã hồ sơ → tab "Chưa nhận", cỡ trang
      // 100, khớp theo tên bị cáo + số bản án sơ thẩm.
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'thuKyVu');
      batToken(page);
      const ptCu = docSoCaiPT()[KC.maVuAnST] || {};
      let soBaST = String(ptCu.soBanAnST || '');
      let ngayBaST = String(ptCu.ngayBanAnST || '');
      // Đã biết id hồ sơ đến (lần chạy trước) → đi thẳng theo khoá (R1), hồ sơ có thể đã sang tab khác
      timHoSo: {
      if (ptCu.idHoSoDenPT) {
        await page.goto(`vu-an/phuc-tham/hinh-su/ho-so-chuyen-den/chi-tiet/${ptCu.idHoSoDenPT}`);
        await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
        await choHetSpin(page, 60_000);
        await nghi(page, 2500, 3500);
        break timHoSo;
      }
      await page.goto('vu-an/phuc-tham/chuyen-den');
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page, 60_000);
      await nghi(page, 2000, 3000);
      ghi('màn vụ án phúc thẩm chuyển đến', `${page.url()} · tab: ${(await page.getByRole('tab').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).join(' | ')}`);
      await page.getByRole('tab', { name: /^Chưa nhận/ }).first().click();
      await choHetSpin(page, 60_000);
      await nghi(page, 1500, 2500);
      // Chờ lưới + thanh phân trang rồi đổi cỡ trang 100 (R2); chưa thấy thì lật trang
      await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});
      const coTrang = page.locator('.ant-pagination-options .ant-select').first();
      if (await coTrang.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false)) {
        await coTrang.click();
        await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^100/ }).first().click().catch(() => {});
        await choHetSpin(page, 60_000);
        await nghi(page, 2500, 3500);
      }
      const tenBiCao = ST.tenBiCan || tenNguoiKhangCao(KC.chuThe);
      const dong = page.locator('.ant-table-row').filter({ hasText: tenBiCao }).filter({ hasText: /Bản án sơ thẩm/ }).first();
      for (let trang = 0; trang < 10 && !(await dong.isVisible().catch(() => false)); trang++) {
        const sau = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)').first();
        if (!(await sau.isVisible().catch(() => false))) break;
        await sau.click();
        await choHetSpin(page, 60_000);
        await nghi(page, 1500, 2500);
      }
      await chup('pt4-1-danh-sach');
      if (!(await dong.isVisible().catch(() => false))) {
        const ds = (await page.locator('.ant-table-row').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim().slice(0, 90));
        throw new Error(`Không thấy hồ sơ của ${tenBiCao} ở tab "Chưa nhận". Dòng đang có: ${ds.join(' || ') || '(trống)'}`);
      }
      const chuDong = (await dong.innerText()).replace(/\s+/g, ' ').trim();
      const maHoSoPT = (chuDong.match(/\b(TN\d{2}-\d+|HSD\d{2}-\d+)\b/) || [])[1] || '';
      ghi('dòng hồ sơ', chuDong.slice(0, 260));
      ghiSoCaiPT(KC.maVuAnST, { maHoSoPT });
      ghi('nút trên dòng', (await dong.locator('button, a').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ') || '(không nút)');
      // Dòng không có nút; ô trạng thái "Chưa nhận" (thẻ màu cam) bấm được → mở tiếp nhận (đo đào tạo 15/10/2026)
      await dong.getByText(/^\s*Chưa nhận\s*$/).last().click();
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page, 60_000);
      await nghi(page, 2500, 3500);
      await chup('pt4-2-chi-tiet');
      const idHoSoDen = (page.url().match(/chi-tiet\/([^/?#]+)/) || [])[1] || new URL(page.url()).searchParams.get('id') || '';
      ghi('chi tiết hồ sơ chuyển đến', `${page.url()} · nút: ${await dsNutTrang()}`);
      ghiSoCaiPT(KC.maVuAnST, { idHoSoDenPT: idHoSoDen });

      // Số + ngày bản án sơ thẩm đọc từ dòng danh sách ("Bản án sơ thẩm: Số 655014727 · 15/10/2026")
      const mBa = chuDong.match(/Bản án sơ thẩm:\s*Số\s*(\S+)\s*·\s*(\d{2}\/\d{2}\/\d{4})/);
      soBaST = mBa?.[1] || '';
      ngayBaST = mBa?.[2] || '';
      ghiSoCaiPT(KC.maVuAnST, { soBanAnST: soBaST, ngayBanAnST: ngayBaST });
      }

      // Trang chi tiết tải chậm: chờ khối nút của hồ sơ hiện ra rồi mới đối chiếu
      await expect(
        page.getByRole('button', { name: /Biên bản giao nhận|Tiếp nhận hồ sơ/ }).first(),
        'Trang chi tiết hồ sơ chuyển đến chưa hiện nút "Biên bản giao nhận"/"Tiếp nhận hồ sơ"',
      ).toBeVisible({ timeout: 90_000 });
      await choHetSpin(page, 60_000);
      await nghi(page, 1500, 2500);
      // Đối chiếu tài liệu: các cặp "Đủ | Thiếu" — bấm "Đủ" ở mọi cặp (có cặp mặc định "Thiếu")
      const nutDu = page.locator('button:visible').filter({ hasText: /^\s*(check\s*)?Đủ\s*$/ });
      const soDu = await nutDu.count();
      for (let i = 0; i < soDu; i++) {
        await nutDu.nth(i).scrollIntoViewIfNeeded().catch(() => {});
        await nutDu.nth(i).click().catch(() => {});
        await nghi(page, 300, 600);
      }
      ghi('đối chiếu Đủ', String(soDu));

      // Biên bản giao nhận (nếu chưa lập)
      const nutBienBan = page.getByRole('button', { name: /Biên bản giao nhận/ }).first();
      // Đã lập biên bản ở lượt trước (sổ cái) → không lập lại
      if (!daXongPT(KC.maVuAnST, 'bienBanPT') && (await nutBienBan.isVisible().catch(() => false))) {
        await nutBienBan.click();
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
        const bm = page.locator('.ant-modal-content:visible').filter({ hasText: /giao, nhận hồ sơ/ }).last();
        await expect(bm, 'Không mở được Biên bản giao nhận').toBeVisible({ timeout: 30_000 });
        // Họ tên bên giao: ô CHỌN (bắt buộc) — người của tòa sơ thẩm chuyển hồ sơ
        const oBenGiao = bm.locator('.ant-form-item').filter({ hasText: /Họ tên bên giao/ }).locator('.ant-select input').first();
        // Ưu tiên người thật sự chuyển hồ sơ ở sơ thẩm (thư ký Nguyễn Tiến Dũng); không có thì mục đầu
        ghi(
          'bên giao',
          await chonSelect(page, oBenGiao, 'Nguyễn Tiến Dũng').catch(() =>
            chonSelect(page, oBenGiao, undefined, { goDeLoc: false }).catch(e => `(không chọn được: ${String(e).slice(0, 80)})`),
          ),
        );
        const oChucVu = bm.getByPlaceholder(/Đại diện Tòa án sơ thẩm/).first();
        if ((await oChucVu.isVisible().catch(() => false)) && !(await oChucVu.inputValue())) await go(oChucVu, 'Thư ký Tòa án');
        // Dòng hồ sơ bàn giao: số/ngày của BẢN ÁN sơ thẩm (form điền nhầm số cáo trạng)
        const dongHs = bm.locator('tr.ant-table-row, tbody tr').filter({ has: page.locator('input') }).first();
        const oSoHs = dongHs.locator('input').first();
        if (soBaST && (await oSoHs.isVisible().catch(() => false))) {
          await oSoHs.fill(soBaST);
          const oNgayHs = dongHs.getByPlaceholder('dd/mm/yyyy').first();
          if (ngayBaST && (await oNgayHs.isVisible().catch(() => false))) {
            await chonNgay(oNgayHs, ngayBaST);
            // KHÔNG Escape: Escape đóng luôn modal biên bản → bấm tiêu đề để đóng lịch
            await bm.getByText(/Biên bản về việc giao, nhận hồ sơ/).first().click().catch(() => {});
          }
          ghi('hồ sơ bàn giao', `Bản án sơ thẩm số ${soBaST} ngày ${ngayBaST}`);
        }
        await chup('pt4-3-bien-ban');
        await bm.getByRole('button', { name: /Lưu$/ }).last().click();
        await toastDaHien(page, /thành công|Đã lưu|Đã lập biên bản/i, 60_000, /thất bại|Vui lòng|lỗi|không thể/i, 0).catch(async e => {
          throw new Error(`Lưu biên bản giao nhận lỗi: ${String(e).slice(0, 200)} · ${await nguyenNhanLoi(page, bm)}`);
        });
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
        const tbDong = page.locator('.ant-modal').filter({ hasText: /Đã lưu biên bản/ }).last();
        if (await tbDong.isVisible().catch(() => false)) await tbDong.getByRole('button', { name: /Đóng/ }).click().catch(() => {});
        ghi('biên bản giao nhận', 'đã lưu');
        ghiSoCaiPT(KC.maVuAnST, { xong: 'bienBanPT' });
      }

      // Nút "Tiếp nhận hồ sơ" chỉ mở khi mục "Tài liệu" đã có tệp (ChiTietHoSoChuyenDen: daTaiBienBanGiaoNhan =
      // danhSachTaiLieu.length > 0) → tải biên bản ở "Quyết định xử lý" về rồi đính kèm vào "Tài liệu" (như B4 sơ thẩm).
      if (!daXongPT(KC.maVuAnST, 'taiLieuBienBanPT')) {
        const dongBb = page.locator('.ant-table-row').filter({ hasText: /Biên bản về việc giao, nhận hồ sơ/ }).first();
        await expect(dongBb, 'Mục Quyết định xử lý chưa có biên bản giao nhận').toBeVisible({ timeout: 60_000 });
        const [taiVe] = await Promise.all([
          page.waitForEvent('download', { timeout: 120_000 }),
          dongBb.locator('button:has(.anticon-download)').first().click(),
        ]);
        const tep = testInfo.outputPath(taiVe.suggestedFilename());
        await taiVe.saveAs(tep);
        ghi('biên bản tải về', taiVe.suggestedFilename());
        const theTl = page.locator('div').filter({ has: page.locator('strong', { hasText: /^Tài liệu$/ }) })
          .filter({ has: page.getByRole('button', { name: /Chọn tệp/ }) }).last();
        const [hopChonTep] = await Promise.all([
          page.waitForEvent('filechooser'),
          theTl.getByRole('button', { name: /Chọn tệp/ }).click(),
        ]);
        await hopChonTep.setFiles(tep);
        const nutThem = theTl.getByRole('button', { name: /Thêm mới/ });
        await expect(nutThem, 'Tải tệp lên chưa xong (nút Thêm mới vẫn khoá)').toBeEnabled({ timeout: 120_000 });
        ghi('loại tài liệu', await chonSelect(page, theTl.getByRole('combobox').first(), 'Biên bản giao nhận').catch(() =>
          chonSelect(page, theTl.getByRole('combobox').first(), undefined, { goDeLoc: false })));
        await nutThem.click();
        await choHetSpin(page);
        await expect(theTl.locator('.ant-table-row').first(), 'Không thấy tài liệu vừa thêm trong danh sách Tài liệu')
          .toBeVisible({ timeout: 60_000 });
        ghiSoCaiPT(KC.maVuAnST, { xong: 'taiLieuBienBanPT' });
        await nghi(page, 1500, 2500);
      }
      await page.evaluate(() => window.scrollTo(0, 0));

      // Đã tiếp nhận (hệ thống có thể tự chuyển khi đủ tài liệu) → chỉ còn nút sang vụ án phúc thẩm
      const nutMoVuPT = page.getByRole('button', { name: /Mở vụ án phúc thẩm|Thụ lý phúc thẩm/ }).first();
      if (await nutMoVuPT.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await nutMoVuPT.click();
        await page.waitForURL(/phuc-tham\/chi-tiet\?id=/, { timeout: 60_000 });
        const idVuAnPT = new URL(page.url()).searchParams.get('id') || '';
        ghi('vụ án phúc thẩm', `${idVuAnPT} · ${page.url()}`);
        ghiSoCaiPT(KC.maVuAnST, { xong: 'tiepNhanPT', idVuAnPT });
        await context.close();
        return;
      }

      // "Tiếp nhận hồ sơ" (góc trên) → xác nhận
      const nutTiepNhan = page.getByRole('button', { name: /Tiếp nhận hồ sơ/ }).first();
      await expect(nutTiepNhan, `Không thấy nút "Tiếp nhận hồ sơ". Nút: ${await dsNutTrang()}`).toBeVisible({ timeout: 30_000 });
      await nutTiepNhan.click();
      await nghi(page, 1200, 1800);
      await chup('pt4-4-xac-nhan-tiep-nhan');
      const hop = page.locator('.ant-modal-content:visible, .ant-popover:visible, .ant-modal-confirm:visible').last();
      if (await hop.isVisible().catch(() => false)) {
        ghi('hộp tiếp nhận', (await hop.innerText()).replace(/\s+/g, ' ').trim().slice(0, 300));
        const oNgay = hop.getByPlaceholder(/ngày|dd\/mm/i).first();
        if ((await oNgay.isVisible().catch(() => false)) && !(await oNgay.inputValue())) await chonNgay(oNgay, NGAY_CHAY);
        await hop.getByRole('button', { name: /^(Tiếp nhận|Xác nhận|Đồng ý|OK|Lưu)$/ }).last().click();
      }
      await toastDaHien(page, /thành công|Đã tiếp nhận/i, 60_000, /thất bại|lỗi|Vui lòng/i, 0).catch(async e => {
        throw new Error(`Tiếp nhận hồ sơ lỗi: ${String(e).slice(0, 200)} · nút: ${await dsNutTrang()}`);
      });
      await choHetSpin(page);
      await nghi(page, 2000, 3000);
      await chup('pt4-5-sau-tiep-nhan');
      ghi('sau tiếp nhận', `${page.url()} · nút: ${await dsNutTrang()}`);
      let idVuAnPT = '';
      if (await nutMoVuPT.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await nutMoVuPT.click();
        await page.waitForURL(/phuc-tham\/chi-tiet\?id=/, { timeout: 60_000 }).catch(() => {});
        idVuAnPT = new URL(page.url()).searchParams.get('id') || '';
        ghi('vụ án phúc thẩm', idVuAnPT);
      }
      ghiSoCaiPT(KC.maVuAnST, { xong: 'tiepNhanPT', ...(idVuAnPT ? { idVuAnPT } : {}) });
      await context.close();
    });

    /**
     * PT5 · Thụ lý phúc thẩm (TANDTC, thư ký Vụ). Tab "Thụ lý" của vụ án phúc thẩm hình sự dùng lại đúng ThuLyTab
     * của sơ thẩm (PhucTham/HinhSu/ChiTietVuAn/index.tsx) → popup "Xác nhận thụ lý", số do hệ thống cấp.
     */
    test('PT5 · Tab Thụ lý: thụ lý phúc thẩm', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const pt = docSoCaiPT()[KC.maVuAnST] || {};
      expect(pt.daXong, 'Chưa tiếp nhận hồ sơ phúc thẩm (chạy PT4 trước)').toContain('tiepNhanPT');
      if (pt.daXong?.includes('thuLyPT')) {
        ghi('bỏ qua', `đã thụ lý phúc thẩm số ${pt.soThuLyPT}`);
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_PT);
      const idVuAnPT = await layIdVuAnPT(page, KC.maVuAnST, ghi);
      await moTabPhucTham(page, idVuAnPT, 'Thụ lý');
      ghi('tab vụ án phúc thẩm', (await page.getByRole('tab').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).join(' | '));
      const nutThuLy = page.getByRole('button', { name: /^(file-done )?Thụ lý( phúc thẩm)?$/ }).first();
      await expect(nutThuLy, `Không thấy nút Thụ lý. Nút: ${await dsNut(page)}`).toBeVisible({ timeout: 30_000 });
      await nutThuLy.click();
      const modal = page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: /Xác nhận thụ lý/ }) }).last();
      await expect(modal, 'Không mở được popup Thụ lý').toBeVisible({ timeout: 30_000 });
      await choHetSpin(page);
      await nghi(page, 800, 1200);
      const oNgay = modal.locator('#ngayThuLy');
      if (!(await oNgay.inputValue().catch(() => ''))) await chonNgay(oNgay, NGAY_CHAY);
      await choHetSpin(page);
      await nghi(page, 1500, 2000);
      const soThuLyPT = await modal.locator('#soThuLy').inputValue().catch(() => '');
      ghi('thụ lý phúc thẩm', `ngày ${await oNgay.inputValue().catch(() => '')} · số ${soThuLyPT || '(hệ thống tự cấp)'}`);
      await modal.getByRole('button', { name: /Xác nhận thụ lý/ }).click();
      await toastDaHien(page, /thành công/i, 60_000, /lỗi|thất bại|không thành công|vui lòng/i, 0);
      await expect(modal).toBeHidden({ timeout: 30_000 });
      ghiSoCaiPT(KC.maVuAnST, { xong: 'thuLyPT', soThuLyPT: soThuLyPT || 'da-thu-ly' });
      // Dò trước tab Phân công cho bước sau
      await moTabPhucTham(page, idVuAnPT, 'Phân công');
      ghi('tab Phân công · nút', await dsNut(page));
      await page.screenshot({ path: testInfo.outputPath('pt5-phan-cong.png'), fullPage: true }).catch(() => {});
      await context.close();
    });

    /**
     * PT6 · Phân công HĐXX phúc thẩm (Điều 344 BLTTHS: 3 Thẩm phán) — phúc thẩm chỉ có "Phân công Thẩm phán"
     * (PhanCongTab: khongPhanCongHoiTham khi isPhucTham). Chủ tọa = người sẽ ký bản án (bản án khoá người ký theo
     * chủ tọa); người ký QĐ = Chánh án (BO_LOC_NGUOI_KY_PHAN_CONG: Chánh án / Chánh tòa HS).
     */
    test('PT6 · Tab Phân công: Phân công Thẩm phán (chủ tọa + 2 thành viên) → Lưu → Trình ký', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const pt = docSoCaiPT()[KC.maVuAnST] || {};
      expect(pt.daXong, 'Chưa thụ lý phúc thẩm (chạy PT5 trước)').toContain('thuLyPT');
      if (pt.daXong?.includes('phanCongPT')) {
        ghi('bỏ qua', 'đã phân công Thẩm phán phúc thẩm');
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_PT);
      const idVuAnPT = await layIdVuAnPT(page, KC.maVuAnST, ghi);
      await moTabPhucTham(page, idVuAnPT, 'Phân công');
      const tieuDe = page.getByText('Danh sách quyết định phân công', { exact: true }).first();
      const nutPhanCong = page.getByRole('button', { name: /^(user )?Phân công$/ }).first();
      if (!(await nutPhanCong.isVisible().catch(() => false))) await tieuDe.click();
      // Đã có QĐ phân công chủ tọa (lần chạy trước) → không lập thêm
      const daCoQd = page.locator('.ant-table-row').filter({ hasText: 'Thẩm phán chủ tọa' }).filter({ hasText: /Chờ ký|Đã ký|Có hiệu lực/ });
      if (await daCoQd.count()) {
        ghi('bỏ qua', `đã có QĐ: ${(await daCoQd.first().innerText()).replace(/\s+/g, ' ').trim().slice(0, 160)}`);
        ghiSoCaiPT(KC.maVuAnST, { xong: 'phanCongPT' });
        await context.close();
        return;
      }
      await nutPhanCong.click();
      await page.getByRole('menuitem', { name: /Phân công Thẩm phán$/ }).first().click();
      const modal = page.locator('.ant-modal').filter({ hasText: 'Phân công Thẩm phán' }).filter({ has: page.locator('#bieuMau001_noiDung_vaiTro') }).last();
      await expect(modal, 'Không mở được popup Phân công Thẩm phán').toBeVisible({ timeout: 30_000 });
      await choHetSpin(page);
      await nghi(page, 800, 1200);
      await chonNgay(modal.locator('#bieuMau001_ngayQuyetDinh'), NGAY_CHAY);
      await modal.getByText('Phân công Thẩm phán', { exact: true }).first().click();
      await expect(page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')).toHaveCount(0, { timeout: 10_000 });
      const oSo = modal.getByPlaceholder('Nhập số quyết định');
      await go(oSo, String(soPT(KC, 1)));
      const hauTo = (await oSo.locator('xpath=ancestor::*[contains(@class,"ant-input-group-wrapper")][1]').innerText().catch(() => '')).trim();
      let soQd = `${await oSo.inputValue()}${hauTo}`;
      ghi('người ký', await chonSelect(page, modal.locator('#bieuMau001_noiDung_MA_NGUOI_KY'), NGUOI_KY_PC_PT));

      // Chủ tọa + 2 Thẩm phán thành viên, mỗi người một lần "mũi tên xuống" thêm vào bảng; người đã chọn bỏ qua
      const daChon: string[] = [];
      for (const [vaiTro, ten] of [['Thẩm phán chủ tọa', CHU_TOA_PT], ['Thẩm phán thành viên hội đồng xét xử', ''], ['Thẩm phán thành viên hội đồng xét xử', '']] as const) {
        await chonSelect(page, modal.locator('#bieuMau001_noiDung_vaiTro'), vaiTro);
        const oNguoi = modal.locator('#bieuMau001_noiDung_nguoiDuocPC');
        let nhan = '';
        if (ten) nhan = await chonSelect(page, oNguoi, ten);
        else {
          await oNguoi.click();
          // Dropdown "Vai trò" vừa đóng vẫn còn trong DOM → chỉ lấy mục dạng "Họ tên - dd/mm/yyyy - chức danh"
          const ds = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: / - \d{2}\/\d{2}\/\d{4}/ });
          await ds.first().waitFor({ state: 'visible', timeout: 15_000 });
          const n = await ds.count();
          for (let i = 0; i < n && !nhan; i++) {
            const t = (await ds.nth(i).innerText()).trim();
            if (!daChon.some(d => t.startsWith(d))) {
              await ds.nth(i).click();
              nhan = t;
            }
          }
        }
        expect(nhan, `Không chọn được người cho vai ${vaiTro}`).toBeTruthy();
        await modal.locator('button:has(.anticon-arrow-down)').first().click();
        const tenNguoi = nhan.split(' - ')[0].trim();
        daChon.push(tenNguoi);
        await expect(modal.locator('.ant-table-row').filter({ hasText: tenNguoi }).first(), `Chưa thêm ${tenNguoi} vào danh sách`).toBeVisible({ timeout: 15_000 });
        ghi(vaiTro, nhan);
      }

      const luu = async () => {
        await modal.getByRole('button', { name: /Lưu$/ }).last().click();
        return toastDaHien(page, /thành công/i, 60_000, /lỗi|thất bại|không thành công|vui lòng/i, 0).then(
          () => true,
          (e: Error) => {
            if (!/đã tồn tại/i.test(e.message)) throw e;
            return false;
          },
        );
      };
      let daLuu = await luu();
      for (let lan = 1; !daLuu && lan <= 8; lan++) {
        await go(oSo, String(soPT(KC, 1) + 900 + lan * 137));
        soQd = `${await oSo.inputValue()}${hauTo}`;
        ghi('số quyết định trùng', `đổi sang ${soQd} (lần ${lan})`);
        daLuu = await luu();
      }
      expect(daLuu, 'Số quyết định vẫn trùng sau 8 lần đổi số').toBe(true);
      await choHetSpin(page);
      ghi('quyết định phân công', `${soQd} ngày ${NGAY_CHAY} · HĐXX: ${daChon.join(', ')}`);
      await trinhKyPT(page, ghi);
      const soChinh = soQd.split('/')[0].trim();
      const dongQd = page.locator('.ant-table-row').filter({ hasText: new RegExp(`(^|\\D)${soChinh}(\\D|$)`) }).first();
      const daChoKy = await dongQd.filter({ hasText: /Chờ ký/ }).first().waitFor({ state: 'visible', timeout: 60_000 }).then(() => true, () => false);
      if (!daChoKy) {
        const ds = (await page.locator('.ant-table-row').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim().slice(0, 90));
        throw new Error(`Quyết định ${soQd} chưa ở trạng thái Chờ ký. Dòng: ${ds.join(' || ')}`);
      }
      ghiSoCaiPT(KC.maVuAnST, { xong: 'phanCongPT', soQdPhanCongPT: soQd, hdxxPT: daChon });
      await context.close();
    });

    test('PT7 · Chánh án: Phê duyệt đề xuất › Chờ duyệt › ký logic QĐ phân công phúc thẩm', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const pt = docSoCaiPT()[KC.maVuAnST] || {};
      expect(pt.daXong, 'Chưa trình ký phân công (chạy PT6 trước)').toContain('phanCongPT');
      if (pt.daXong?.includes('kyPhanCongPT')) {
        ghi('bỏ qua', 'đã ký QĐ phân công phúc thẩm');
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_KY_PC_PT);
      const tenBiCao = ST.tenBiCan || tenNguoiKhangCao(KC.chuThe);
      const soKy = await kyLogicChoDuyet(page, ghi, tenBiCao, /Phân công/);
      ghi('đã ký', `${soKy} văn bản`);
      ghiSoCaiPT(KC.maVuAnST, { xong: 'kyPhanCongPT' });
      await context.close();
    });

    /**
     * PT8 · Tab "Chuẩn bị xét xử" (dùng chung ChuanBiXetXuTab sơ thẩm) › Quyết định tố tụng › Quyết định đưa vụ án ra
     * xét xử phúc thẩm → lịch xét xử → Lưu → Trình ký. Ngày QĐ/phiên tòa = ngày chạy: bản án PT mang ngày lấy số
     * (hôm nay) nên phiên tòa không thể sau hôm nay.
     */
    test('PT8 · Quyết định đưa vụ án ra xét xử phúc thẩm → lịch xét xử → Lưu → Trình ký', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const pt = docSoCaiPT()[KC.maVuAnST] || {};
      expect(pt.daXong, 'Chưa ký QĐ phân công (chạy PT7 trước)').toContain('kyPhanCongPT');
      if (pt.daXong?.includes('qdXetXuPT')) {
        ghi('bỏ qua', `đã có QĐ đưa vụ án ra xét xử phúc thẩm số ${pt.soQdXetXuPT}`);
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_PT);
      const idVuAnPT = await layIdVuAnPT(page, KC.maVuAnST, ghi);
      await moTabPhucTham(page, idVuAnPT, 'Chuẩn bị xét xử');
      // Đã lập từ lần chạy trước (đang chờ ký/đã ký) → không lập thêm
      const daCo = page.locator('.ant-table-row').filter({ hasText: /đưa vụ án ra xét xử/i }).filter({ hasText: /Chờ ký|Đã ký|hiệu lực/ });
      if (await daCo.count()) {
        ghi('bỏ qua', `đã có: ${(await daCo.first().innerText()).replace(/\s+/g, ' ').trim().slice(0, 160)}`);
        ghiSoCaiPT(KC.maVuAnST, { xong: 'qdXetXuPT' });
        await context.close();
        return;
      }
      const nutQd = page.getByRole('button', { name: /Quyết định đưa vụ án ra xét xử( phúc thẩm)?$/ }).first();
      if (!(await nutQd.isVisible().catch(() => false))) await page.getByText('Quyết định tố tụng', { exact: true }).first().click();
      await expect(nutQd, `Không thấy nút Quyết định đưa vụ án ra xét xử. Nút: ${await dsNut(page)}`).toBeVisible({ timeout: 30_000 });
      await nutQd.click();
      const modal = page.locator('.ant-modal').filter({ hasText: /Quyết định đưa vụ án ra xét xử/ }).last();
      await expect(modal, 'Không mở được popup Quyết định đưa vụ án ra xét xử').toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);
      await nghi(page, 1000, 1500);
      ghi('popup', (await modal.locator('.ant-modal-title').first().innerText().catch(() => '')).trim());

      await chonNgay(modal.getByLabel('Ngày quyết định').first(), NGAY_CHAY);
      await modal.locator('.ant-modal-title').first().click();
      const oSo = modal.getByPlaceholder('Nhập số quyết định').first();
      await go(oSo, String(soPT(KC, 2)));
      const oNguoiKy = modal.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
      const khungKy = oNguoiKy.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
      if ((await oNguoiKy.count()) && !(await khungKy.locator('.ant-select-selection-item').count())) {
        ghi('người ký', await chonSelect(page, oNguoiKy, CHU_TOA_PT).catch(() => chonSelect(page, oNguoiKy, NGUOI_KY_PC_PT)));
      } else ghi('người ký', (await khungKy.locator('.ant-select-selection-item').first().innerText().catch(() => '(không có ô)')).trim());

      await taoLichXetXu(page, modal, NGAY_CHAY, ghi);

      for (let lan = 0; ; lan++) {
        await modal.getByRole('button', { name: /^Lưu$/ }).first().click();
        const ok = await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi/i, 0).then(
          () => true,
          (e: Error) => {
            if (!/đã tồn tại/i.test(e.message) || lan >= 8) throw e;
            return false;
          },
        );
        if (ok) break;
        await go(oSo, String(soPT(KC, 2) + 900 + (lan + 1) * 137));
        ghi('số quyết định trùng', `đổi sang ${await oSo.inputValue()} (lần ${lan + 1})`);
      }
      const soQd = await oSo.inputValue();
      ghi('quyết định đưa vụ án ra xét xử phúc thẩm', `số ${soQd} ngày ${NGAY_CHAY}`);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      await trinhKyPT(page, ghi);
      ghiSoCaiPT(KC.maVuAnST, { xong: 'qdXetXuPT', soQdXetXuPT: soQd });
      await context.close();
    });

    test('PT9 · Người ký: ký logic Quyết định đưa vụ án ra xét xử phúc thẩm', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const pt = docSoCaiPT()[KC.maVuAnST] || {};
      expect(pt.daXong, 'Chưa trình ký QĐ xét xử (chạy PT8 trước)').toContain('qdXetXuPT');
      if (pt.daXong?.includes('kyQdXetXuPT')) {
        ghi('bỏ qua', 'đã ký QĐ đưa vụ án ra xét xử phúc thẩm');
        return;
      }
      const tenBiCao = ST.tenBiCan || tenNguoiKhangCao(KC.chuThe);
      let soKy = 0;
      // Người ký chọn ở PT8 là chủ tọa; không thấy ở hộp chờ duyệt của chủ tọa thì thử Chánh án
      for (const vai of [VAI_CHU_TOA_PT, VAI_KY_PC_PT]) {
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vai);
        soKy = await kyLogicChoDuyet(page, ghi, tenBiCao, /đưa vụ án ra xét xử/i);
        await context.close();
        ghi('ký', `${vai}: ${soKy} văn bản`);
        if (soKy) break;
      }
      expect(soKy, 'Không thấy QĐ đưa vụ án ra xét xử phúc thẩm ở tab Chờ duyệt của chủ tọa/Chánh án').toBeGreaterThan(0);
      ghiSoCaiPT(KC.maVuAnST, { xong: 'kyQdXetXuPT' });
    });

    /**
     * PT10 · Tab "Kết quả phúc thẩm" › thẻ "Bản án" → ngăn kéo lập bản án phúc thẩm (BM028): Ý kiến VKS và Quyết định
     * đều chọn thẻ "Giữ nguyên bản án sơ thẩm" (Điều 356 BLTTHS — không chấp nhận kháng cáo, y án tử hình), nhập nội
     * dung, nhận định, nơi nhận → Lưu → Lấy số → Trình ký (người ký = chủ tọa).
     */
    test('PT10 · Bản án phúc thẩm: giữ nguyên bản án sơ thẩm → Lưu → Lấy số → Trình ký', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      testInfo.setTimeout(15 * 60_000);
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const pt = docSoCaiPT()[KC.maVuAnST] || {};
      expect(pt.daXong, 'Chưa ký QĐ đưa vụ án ra xét xử phúc thẩm (chạy PT9 trước)').toContain('kyQdXetXuPT');
      if (pt.daXong?.includes('banAnPT')) {
        ghi('bỏ qua', `đã lập bản án phúc thẩm ${pt.soBanAnPT || ''}`);
        return;
      }
      const tenBiCao = ST.tenBiCan || tenNguoiKhangCao(KC.chuThe);
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_PT);
      const idVuAnPT = await layIdVuAnPT(page, KC.maVuAnST, ghi);
      // Bản án phúc thẩm lập ở tab "Xét xử" › mục "Kết quả xét xử" (tab Kết quả phúc thẩm chỉ hiện sau khi ký)
      await moTabPhucTham(page, idVuAnPT, 'Xét xử');
      await nghi(page, 1500, 2500);
      const mucKq = page.locator('.ant-collapse-header, .ant-pro-card-title, h4, h5').filter({ hasText: /Kết quả xét xử/i }).first();
      if (await mucKq.count()) {
        await mucKq.scrollIntoViewIfNeeded();
        if (!(await page.getByText('Tòa xét xử xong nội dung vụ án', { exact: false }).first().isVisible().catch(() => false))) await mucKq.click();
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
      }
      ghi('mục tab Xét xử', (await page.locator('.ant-collapse-header').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12).join(' | '));
      const chup = (ten: string) => page.screenshot({ path: testInfo.outputPath(`${ten}.png`), fullPage: true }).catch(() => {});

      const ngan = page.locator('.ant-drawer-open').filter({ hasText: /Bản án phúc thẩm|bản án phúc thẩm/ }).last();
      // Chạy lại: bản án đã có → Chờ ký/Đã ký thì xong; Dự thảo thì mở lại để Lấy số + Trình ký
      const dongBa = page.locator('.ant-table-row').filter({ hasText: /Bản án/ }).first();
      if (await dongBa.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const chu = (await dongBa.innerText()).replace(/\s+/g, ' ');
        ghi('bản án đã có', chu.slice(0, 200));
        if (/Chờ ký|Đã ký|hiệu lực/i.test(chu) && !/Dự thảo/i.test(chu)) {
          ghiSoCaiPT(KC.maVuAnST, { xong: 'banAnPT' });
          await context.close();
          return;
        }
        await dongBa.locator('button, a').filter({ hasText: /Chỉnh sửa|Sửa|Xem/ }).first().click().catch(() => dongBa.click());
      } else {
        const theBanAn = page.getByText('Tòa xét xử xong nội dung vụ án', { exact: false }).first();
        if (await theBanAn.isVisible({ timeout: 10_000 }).catch(() => false)) await theBanAn.click();
        else await page.getByRole('button', { name: /Tạo bản án phúc thẩm/ }).first().click();
      }
      await choHetSpin(page);
      await nghi(page, 2500, 3500);
      await expect(ngan, 'Không mở được ngăn kéo bản án phúc thẩm').toBeVisible({ timeout: 60_000 });
      await chup('pt10-1-mo');

      // Người ký = chủ tọa
      const oNguoiKy = ngan.locator('[id$="nguoiKy"]').first();
      const khungKy = oNguoiKy.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
      if (!(await khungKy.locator('.ant-select-selection-item').count())) await chonSelect(page, oNguoiKy, CHU_TOA_PT).catch(() => '');
      ghi('người ký', (await khungKy.locator('.ant-select-selection-item').first().innerText().catch(() => '')).trim());

      // Mở mọi khối đang thu gọn của ngăn kéo
      const dauKhoi = ngan.locator('.ant-collapse-item:not(.ant-collapse-item-active) > .ant-collapse-header');
      for (let i = 0; i < 12 && (await dauKhoi.count()); i++) {
        await dauKhoi.first().click();
        await nghi(page, 300, 500);
      }

      const toi = /ma túy/i.test(ST.toiDanh || '') ? 'Mua bán trái phép chất ma túy' : 'Giết người';
      const dieu = toi === 'Giết người' ? 'điểm n khoản 1 Điều 123' : 'điểm b khoản 4 Điều 251';
      const banAnST = `Bản án hình sự sơ thẩm số ${pt.soBanAnST || ''} ngày ${pt.ngayBanAnST || ''} của Tòa án nhân dân khu vực 9 - Hà Nội`;

      // Nội dung vụ án: lấy từ bản án sơ thẩm, không có thì tự viết
      const oNoiDung = ngan.locator('textarea[id$="noiDungVuAn"]').first();
      // Nội dung sơ thẩm có thể chỉ là một câu ngắn → viết lại đầy đủ như bản án thật
      if ((await oNoiDung.inputValue().catch(() => '')).trim().length < 150) {
        {
          await oNoiDung.fill(
            `Theo ${banAnST}, bị cáo ${tenBiCao} bị xử phạt tử hình về tội "${toi}" theo ${dieu} Bộ luật Hình sự. ` +
              `Trong thời hạn luật định, bị cáo ${tenBiCao} có đơn kháng cáo xin giảm hình phạt. Tại phiên tòa phúc thẩm, ` +
              `bị cáo giữ nguyên nội dung kháng cáo, thừa nhận hành vi phạm tội như bản án sơ thẩm đã xác định, không xuất trình tình tiết giảm nhẹ mới.`,
          );
        }
      }
      ghi('nội dung vụ án', (await oNoiDung.inputValue().catch(() => '')).slice(0, 120));

      // Ý kiến VKS + Quyết định: thẻ "Giữ nguyên bản án sơ thẩm" trong hai nhóm radio
      for (const nhom of ['Đề nghị đối với bản án sơ thẩm', 'Quyết định đối với bản án sơ thẩm']) {
        const g = ngan.getByRole('radiogroup', { name: nhom }).first();
        await g.scrollIntoViewIfNeeded().catch(() => {});
        const the = g.getByRole('radio', { name: /Giữ nguyên bản án sơ thẩm/ }).first();
        await expect(the, `Không thấy thẻ "Giữ nguyên bản án sơ thẩm" trong nhóm ${nhom}`).toBeVisible({ timeout: 30_000 });
        if ((await the.getAttribute('aria-checked')) !== 'true') await the.click();
        await nghi(page, 800, 1200);
        ghi(nhom, (await the.getAttribute('aria-checked')) === 'true' ? 'Giữ nguyên bản án sơ thẩm' : '(chưa chọn được)');
      }
      // Ý kiến VKS về tình tiết tăng nặng, giảm nhẹ (bắt buộc) + nhận định HĐXX phúc thẩm về tình tiết
      const TINH_TIET =
        `Bị cáo ${tenBiCao} không có tình tiết tăng nặng trách nhiệm hình sự. Tình tiết giảm nhẹ "thành khẩn khai báo, ăn năn hối cải" ` +
        `(điểm s khoản 1 Điều 51 Bộ luật Hình sự) đã được Tòa án cấp sơ thẩm xem xét; tại cấp phúc thẩm bị cáo không xuất trình được tình tiết giảm nhẹ mới.`;
      for (const ten of ['vksTinhTietDienGiai', 'toaTinhTietDienGiai']) {
        const o = ngan.locator(`textarea[id$="${ten}"]`).first();
        if ((await o.count()) && !(await o.inputValue().catch(() => ''))) await o.fill(TINH_TIET);
      }
      await dienBiCaoPT(page, ngan, tenBiCao, KC, ghi);
      const oVks = ngan.locator('textarea[id$="ykienKiemSatVien"]').first();
      if ((await oVks.count()) && !(await oVks.inputValue().catch(() => ''))) {
        await oVks.fill(
          `Kiểm sát viên đề nghị Hội đồng xét xử phúc thẩm căn cứ điểm a khoản 1 Điều 355, Điều 356 Bộ luật Tố tụng hình sự: ` +
            `không chấp nhận kháng cáo của bị cáo ${tenBiCao}, giữ nguyên ${banAnST}.`,
        );
      }
      const oNhanDinh = ngan.locator('textarea[id$="nhanDinh"]').first();
      if (!(await oNhanDinh.inputValue().catch(() => ''))) {
        await oNhanDinh.fill(
          `[1] Đơn kháng cáo của bị cáo ${tenBiCao} làm trong thời hạn và đúng thủ tục quy định tại Điều 331, Điều 333 Bộ luật Tố tụng hình sự nên được xem xét theo trình tự phúc thẩm.\n` +
            `[2] Lời khai nhận tội của bị cáo tại phiên tòa phúc thẩm phù hợp với lời khai tại cơ quan điều tra, phiên tòa sơ thẩm, biên bản khám nghiệm hiện trường, kết luận giám định và các tài liệu, chứng cứ khác có trong hồ sơ vụ án. ` +
            `Có đủ căn cứ kết luận bị cáo phạm tội "${toi}" theo ${dieu} Bộ luật Hình sự như bản án sơ thẩm đã xét xử là đúng người, đúng tội, đúng pháp luật.\n` +
            `[3] Xét kháng cáo xin giảm hình phạt: hành vi của bị cáo đặc biệt nghiêm trọng, xâm phạm ${toi === 'Giết người' ? 'tính mạng con người' : 'chế độ độc quyền quản lý của Nhà nước về chất ma túy'}, gây bất bình trong dư luận. ` +
            `Tòa án cấp sơ thẩm đã xem xét đầy đủ tính chất, mức độ hành vi và các tình tiết giảm nhẹ; tại cấp phúc thẩm bị cáo không xuất trình được tình tiết giảm nhẹ mới. Cần loại bỏ vĩnh viễn bị cáo ra khỏi đời sống xã hội nên không có căn cứ chấp nhận kháng cáo.\n` +
            `[4] Ý kiến của Kiểm sát viên tại phiên tòa phúc thẩm phù hợp với nhận định của Hội đồng xét xử.\n` +
            `[5] Bị cáo phải chịu án phí hình sự phúc thẩm theo quy định.`,
        );
      }
      const oNoiNhan = ngan.locator('textarea[id$="noiNhan"]').first();
      if (!(await oNoiNhan.inputValue().catch(() => ''))) {
        await oNoiNhan.fill(
          '- VKSND tối cao;\n- Cục C02 Bộ Công an;\n- TAND khu vực 9 - Hà Nội;\n- VKSND khu vực 9 - Hà Nội;\n- Cơ quan THAHS Công an TP Hà Nội;\n- Trại tạm giam Công an TP Hà Nội;\n- Bị cáo;\n- Lưu hồ sơ vụ án, Vụ Giám đốc kiểm tra về hình sự.',
        );
      }
      await chup('pt10-2-da-dien');

      // Lưu (chốt) → bật Lấy số
      const nutLuu = ngan.getByRole('button', { name: /^(save )?Lưu$/ }).first();
      await nutLuu.click();
      await toastDaHien(page, /thành công|Đã lưu/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi|bỏ trống|Chưa/i, 0).catch(async e => {
        await chup('pt10-loi-luu');
        const loiForm = (await ngan.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [] as string[])).join(' | ');
        throw new Error(`Lưu bản án phúc thẩm lỗi: ${String(e).slice(0, 300)} · lỗi form: ${loiForm || '(không)'}`);
      });
      await choHetSpin(page);
      await nghi(page, 2000, 3000);
      ghi('bản án', 'đã Lưu');

      const nutLaySo = ngan.locator('button').filter({ hasText: /Lấy số/ }).last();
      await expect(nutLaySo, 'Không thấy nút Lấy số sau khi Lưu').toBeEnabled({ timeout: 30_000 });
      await nutLaySo.click();
      const xacNhan = page.locator('.ant-modal-confirm:visible, .ant-popconfirm:visible, .ant-popover:visible').filter({ has: page.getByRole('button') }).last();
      if (await xacNhan.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await xacNhan.getByRole('button', { name: /^(Đồng ý|Xác nhận|OK|Lấy số|Có)$/ }).last().click().catch(() => {});
      }
      await toastDaHien(page, /thành công/i, 60_000, /Không thể cấp số|thất bại|lỗi/i, 0);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      const soBanAnPT = await ngan.locator('[id$="soBanAn"]').first().inputValue().catch(() => '');
      const ngayBanAnPT = await ngan.locator('[id$="ngayBanAn"]').first().inputValue().catch(() => '');
      ghi('lấy số bản án phúc thẩm', `số ${soBanAnPT} ngày ${ngayBanAnPT}`);
      ghiSoCaiPT(KC.maVuAnST, { soBanAnPT, ngayBanAnPT });
      await chup('pt10-3-lay-so');

      await trinhKyPT(page, ghi);
      ghiSoCaiPT(KC.maVuAnST, { xong: 'banAnPT' });
      await context.close();
    });

    test('PT11 · Chủ tọa: ký logic bản án phúc thẩm', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) => (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const pt = docSoCaiPT()[KC.maVuAnST] || {};
      expect(pt.daXong, 'Chưa trình ký bản án phúc thẩm (chạy PT10 trước)').toContain('banAnPT');
      if (pt.daXong?.includes('kyBanAnPT')) {
        ghi('bỏ qua', 'đã ký bản án phúc thẩm');
        return;
      }
      const tenBiCao = ST.tenBiCan || tenNguoiKhangCao(KC.chuThe);
      let soKy = 0;
      for (const vai of [VAI_CHU_TOA_PT, VAI_KY_PC_PT]) {
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vai);
        soKy = await kyLogicChoDuyet(page, ghi, tenBiCao, /Bản án/i);
        await context.close();
        ghi('ký', `${vai}: ${soKy} văn bản`);
        if (soKy) break;
      }
      expect(soKy, 'Không thấy bản án phúc thẩm ở tab Chờ duyệt của chủ tọa/Chánh án').toBeGreaterThan(0);
      ghiSoCaiPT(KC.maVuAnST, { xong: 'kyBanAnPT' });
    });
  });
}

/**
 * Lịch xét xử trong popup QĐ đưa vụ án ra xét xử (như B10 sơ thẩm): "Chọn lịch xét xử" → lịch react-big-calendar
 * → bấm NỀN ô ngày → "Thêm lịch xét xử" (Cả ngày, tính chất, phòng) → Tạo mới; trùng phòng/HĐXX thì "Đồng ý".
 */
async function taoLichXetXu(page: Page, modal: import('@playwright/test').Locator, ngayLich: string, ghi: (t: string, d: string) => unknown) {
  const bangLich = modal.locator('.ant-table').filter({ hasText: 'Ngày mở phiên tòa' }).last();
  const dongLich = bangLich.locator('.ant-table-row').filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ });
  if (await dongLich.filter({ hasText: ngayLich }).count()) return;
  await modal.getByRole('button', { name: /(Chọn|Sửa) lịch xét xử/ }).first().click();
  await choHetSpin(page);
  await nghi(page, 2000, 3000);
  const popupLich = page.locator('.ant-modal, .ant-drawer-open').filter({ hasText: /lịch xét xử/i }).last();
  await expect(popupLich, 'Không mở được màn chọn lịch xét xử').toBeVisible({ timeout: 60_000 });
  const [ngay, thang, nam] = ngayLich.split('/').map(Number);
  const tieuDe = popupLich.getByText(/Tháng \d+ Năm \d{4}/).first();
  for (let i = 0; i < 36; i++) {
    const t = (await tieuDe.innerText()).match(/Tháng (\d+) Năm (\d{4})/);
    if (!t) throw new Error('Không đọc được tháng đang hiển thị trên lịch xét xử');
    const lech = (nam - Number(t[2])) * 12 + (thang - Number(t[1]));
    if (lech === 0) break;
    await popupLich.locator(lech < 0 ? 'button:has(.anticon-left)' : 'button:has(.anticon-right)').first().click();
    await nghi(page, 500, 900);
  }
  const bamNen = async () => {
    const hangs = popupLich.locator('.rbc-month-row');
    for (let r = 0; r < (await hangs.count()); r++) {
      const hang = hangs.nth(r);
      const oSo = hang.locator('.rbc-date-cell');
      for (let c = 0; c < (await oSo.count()); c++) {
        const o = oSo.nth(c);
        if (Number((await o.innerText()).trim()) !== ngay) continue;
        if ((await o.getAttribute('class'))?.includes('rbc-off-range')) continue;
        const cot = await o.evaluate(e => [...(e.parentElement?.children || [])].indexOf(e));
        await hang.locator('.rbc-row-bg > *').nth(cot).click();
        return true;
      }
    }
    return false;
  };
  expect(await bamNen(), `Không thấy ngày ${ngayLich} trên lịch`).toBe(true);
  await choHetSpin(page);
  await nghi(page, 2000, 3000);
  const popupThem = page.locator('.ant-modal').filter({ has: page.locator('.ant-modal-title', { hasText: /Thêm lịch xét xử/i }) }).last();
  const oCaNgay = popupThem.locator('#caNgay');
  await expect(oCaNgay, 'Không mở được popup "Thêm lịch xét xử"').toBeVisible({ timeout: 60_000 });
  if (!(await oCaNgay.isChecked())) await oCaNgay.check({ force: true });
  await nghi(page, 600, 1000);
  for (const id of ['#hinhThucXetXu', '#tinhChat', '#idPhongXetXu']) {
    const o = popupThem.locator(id);
    if (!(await o.count())) continue;
    const khung = o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
    if (await khung.locator('.ant-select-selection-item').count()) continue;
    const daChon = await chonSelect(page, o, undefined, { goDeLoc: false }).catch(() => '');
    if (daChon) ghi(`lịch xét xử · ${id.slice(1)}`, daChon);
    await choHetSpin(page);
  }
  const oDiaDiem = popupThem.locator('#diaDiemChiTiet');
  if ((await oDiaDiem.count()) && !(await oDiaDiem.inputValue().catch(() => 'x'))) await go(oDiaDiem, 'Trụ sở Tòa án nhân dân tối cao');
  await popupThem.getByRole('button', { name: /^Tạo mới$/ }).first().click();
  await choHetSpin(page);
  await nghi(page, 1500, 2500);
  const hopTrung = page.locator('.ant-modal-confirm').filter({ hasText: /đang trùng/i }).last();
  if (await hopTrung.isVisible().catch(() => false)) {
    ghi('lịch xét xử · trùng', (await hopTrung.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 160));
    await hopTrung.getByRole('button', { name: /^Đồng ý$/ }).last().click();
    await choHetSpin(page);
    await nghi(page, 1500, 2500);
  }
  if (!(await oCaNgay.waitFor({ state: 'hidden', timeout: 30_000 }).then(() => true, () => false))) {
    throw new Error(`Không tạo được lịch xét xử ngày ${ngayLich} — ${await nguyenNhanLoi(page, popupThem)}`);
  }
  await expect(dongLich.filter({ hasText: ngayLich }).first(), `Lịch xét xử chưa được tạo đúng ngày ${ngayLich}`).toBeVisible({ timeout: 60_000 });
  ghi('lịch xét xử', `phiên tòa ngày ${ngayLich}, cả ngày`);
}

/** Người ký QĐ phân công phúc thẩm ở TAND tối cao: Chánh án (vai chanhAn) */
const NGUOI_KY_PC_PT = 'Nguyễn Văn Quảng';
const VAI_KY_PC_PT = 'chanhAn';
/** Thẩm phán chủ tọa phúc thẩm = người ký bản án phúc thẩm (vai phoChanhAn) */
const CHU_TOA_PT = 'Nguyễn Hải Trâm';
const VAI_CHU_TOA_PT = 'phoChanhAn';
/** Số văn bản phúc thẩm duy nhất theo vụ (KC01 → 7010 + loai) */
const soPT = (kc: KhangCaoPT, loai: number) => 7000 + Number(kc.ma.replace(/\D/g, '')) * 10 + loai;

/**
 * Thông tin bắt buộc của bị cáo trong bản án phúc thẩm (ThongTinBiCaoSection): thẻ bị cáo › "Chỉnh sửa" → Trình độ văn hóa,
 * Tôn giáo (ô chọn), Họ tên cha/mẹ, Tiền án, Tiền sự, Nhân thân (ô chữ, lưu khi rời ô) → "Xong". Giá trị dựng theo đúng
 * công thức hoanThienBanAn của spec sơ thẩm để hồ sơ hai cấp khớp nhau.
 */
async function dienBiCaoPT(page: Page, ngan: import('@playwright/test').Locator, tenBiCao: string, kc: KhangCaoPT, ghi: (t: string, d: string) => unknown) {
  const idx = Number(kc.maVuAnST.replace(/\D/g, '')) || 1;
  const ho = tenBiCao.split(' ')[0];
  const TEN = ['Hùng', 'Thịnh', 'Bảo', 'Quang', 'Đức', 'Tín', 'Hòa', 'Nghĩa'];
  const TEN_ME = ['Lan', 'Hoa', 'Mai', 'Hằng', 'Thu', 'Nga', 'Liên', 'Thơm'];
  const HO_ME = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ'];
  // Sheet 04: bị cáo dòng i có đặc điểm "tai_pham" khi i % 4 === 0 (i tính từ 0) ⇔ idx % 4 === 1
  const taiPham = idx % 4 === 1;
  const the = ngan.locator('.ant-card, .ant-pro-card').filter({ hasText: tenBiCao }).filter({ has: page.getByText(/Đầu vụ|Sinh năm|kháng cáo/i) }).first();
  if (!(await the.count())) {
    ghi('thông tin bị cáo', `không thấy thẻ bị cáo ${tenBiCao}`);
    return;
  }
  await the.scrollIntoViewIfNeeded().catch(() => {});
  const nutSua = the.getByRole('button', { name: /Chỉnh sửa$/ }).first();
  if (!(await nutSua.isVisible().catch(() => false))) {
    await the.getByText(tenBiCao).first().click();
    await nghi(page, 600, 900);
  }
  if (await nutSua.isVisible().catch(() => false)) {
    await nutSua.click();
    await nghi(page, 600, 900);
  }
  const chonO = async (goiY: RegExp, tim: string) => {
    const o = the.locator('.ant-select').filter({ has: page.locator('.ant-select-selection-placeholder', { hasText: goiY }) }).first();
    if (!(await o.count())) return '';
    await o.click();
    const mo = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
    await mo.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    // Nhãn danh mục có thể khác chữ dự kiến (vd "Lớp 9/12") → gõ lọc; không còn mục nào thì xoá chữ, lấy mục đầu
    await page.keyboard.type(tim, { delay: 40 });
    await nghi(page, 600, 900);
    if (!(await mo.first().isVisible().catch(() => false))) {
      for (let i = 0; i < tim.length; i++) await page.keyboard.press('Backspace');
      await nghi(page, 600, 900);
    }
    await mo.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    const t = (await mo.first().innerText().catch(() => '')).trim();
    await mo.first().click().catch(() => page.keyboard.press('Escape'));
    return t;
  };
  // Danh mục TRINH_DO_VAN_HOA: "Lớp 1"…"Lớp 12" (khớp 7/12, 9/12, 12/12 của sơ thẩm)
  const trinhDo = await chonO(/trình độ văn hóa/i, ['Lớp 7', 'Lớp 9', 'Lớp 12'][idx % 3]);
  const tonGiao = await chonO(/tôn giáo/i, 'Không');
  const go1 = async (goiY: string, giaTri: string) => {
    const o = the.getByPlaceholder(goiY, { exact: true }).first();
    if (!(await o.count()) || (await o.inputValue().catch(() => ''))) return;
    await o.fill(giaTri);
    await o.blur();
    await nghi(page, 200, 400);
  };
  const cha = `${ho} Văn ${TEN[idx % TEN.length]}`;
  const me = `${HO_ME[idx % HO_ME.length]} Thị ${TEN_ME[idx % TEN_ME.length]}`;
  await go1('Nhập họ tên cha', cha);
  await go1('Nhập họ tên mẹ', me);
  await go1('VD: Không / 01 tiền án về tội ... (đã xóa án tích)',
    taiPham ? `01 tiền án: Bản án số ${40 + idx}/2019/HS-ST ngày 12/6/2019 xử phạt 03 năm tù về tội Cố ý gây thương tích, chưa được xóa án tích` : 'Không');
  await go1('VD: Không', 'Không');
  await go1('Nhập nhân thân', 'Bị cáo đang bị tạm giam tại Trại tạm giam số 1 Công an thành phố Hà Nội; sau khi xét xử sơ thẩm có đơn kháng cáo xin giảm hình phạt');
  const nutXong = the.getByRole('button', { name: /Xong$/ }).first();
  if (await nutXong.isVisible().catch(() => false)) await nutXong.click();
  ghi('thông tin bị cáo', `${tenBiCao} · ${trinhDo || '?'} · tôn giáo ${tonGiao || '?'} · cha ${cha} · mẹ ${me}${taiPham ? ' · tái phạm' : ''}`);
}

/** Trình ký văn bản vừa lưu (nút "Trình ký" trên bảng/ngăn kéo) → hộp xác nhận "Gửi" */
async function trinhKyPT(page: Page, ghi: (t: string, d: string) => unknown) {
  const nut = page.getByRole('button', { name: /Trình ký/ }).last();
  await expect(nut, 'Không thấy nút "Trình ký" sau khi Lưu').toBeVisible({ timeout: 60_000 });
  await nut.click();
  const popup = page.locator('.ant-modal').filter({ hasText: /Nhập thông tin trình duyệt ký/ }).last();
  await expect(popup, 'Không mở được popup "Nhập thông tin trình duyệt ký"').toBeVisible({ timeout: 30_000 });
  await choHetSpin(page);
  await nghi(page, 800, 1200);
  await popup.getByRole('button', { name: /Gửi/ }).last().click();
  if (!(await popup.waitFor({ state: 'hidden', timeout: 60_000 }).then(() => true, () => false))) {
    const toasts = await page.evaluate(() => ((window as any).__toasts || []).slice(-5).map((x: any) => x.t)).catch(() => [] as string[]);
    throw new Error(`Popup trình duyệt ký chưa đóng sau khi Gửi · thông báo gần nhất: ${toasts.join(' | ') || '(không có)'}`);
  }
  ghi('trình ký', 'đã gửi trình duyệt ký');
  const nutDong = page.locator('.ant-modal-wrap:visible').getByRole('button', { name: /^Đóng$/ }).last();
  if (await nutDong.isVisible().catch(() => false)) await nutDong.click();
  await choHetSpin(page);
}

/** Lãnh đạo › Phê duyệt đề xuất › Chờ duyệt: ký logic mọi văn bản của vụ khớp `loai` (như B9 sơ thẩm) */
async function kyLogicChoDuyet(page: Page, ghi: (t: string, d: string) => unknown, tenBiCao: string, loai: RegExp): Promise<number> {
  let soKy = 0;
  for (let lan = 0; lan < 8; lan++) {
    await page.goto('lanh-dao/phe-duyet-de-xuat/danh-sach');
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page, 60_000);
    await page.getByRole('tab', { name: /^Chờ duyệt/ }).first().click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await choHetSpin(page);
    const dong = page.locator('.ant-table-row').filter({ hasText: `Vụ án ${tenBiCao} -` }).filter({ hasText: loai }).first();
    if (!(await dong.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false))) break;
    ghi('chờ duyệt', (await dong.innerText()).replace(/\s+/g, ' ').trim().slice(0, 200));
    await dong.locator('a, .ant-typography-link, [class*="link"]').first().click();
    await page.waitForURL(/y-kien-lanh-dao/, { timeout: 60_000 });
    await expect(page.getByText('Ký số văn bản').first(), 'Không mở được màn Ký số văn bản').toBeVisible({ timeout: 60_000 });
    await choHetSpin(page, 60_000);
    await nghi(page, 1500, 2000);
    const choApi = page.waitForResponse(r => r.request().method() === 'POST' && /phe-duyet-de-xuat/.test(r.url()), { timeout: 90_000 }).catch(() => null);
    await page.getByRole('button', { name: /Ký logic$/ }).first().click();
    const xacNhan = page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Ký|Ký logic)$/ }) }).last();
    if (await xacNhan.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) {
      await xacNhan.getByRole('button', { name: /^(Đồng ý|Xác nhận|Ký|Ký logic)$/ }).last().click();
    }
    const res = await choApi;
    expect(res, 'Không thấy API ký được gọi khi Ký logic').toBeTruthy();
    const kq = await res!.json().catch(() => ({ success: res!.ok() }));
    expect(kq?.success, `Ký logic lỗi: ${kq?.message || res!.status()}`).not.toBe(false);
    soKy++;
    await nghi(page, 1500, 2000);
  }
  return soKy;
}

/** Tài khoản làm phúc thẩm ở TAND tối cao (án tử hình): Thư ký viên Vụ hình sự (Trương Minh Trang) */
const VAI_PT = 'thuKyVu';

const dsNut = async (page: Page) =>
  (await page.locator('main button:visible, .ant-layout-content button:visible').allInnerTexts())
    .map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30).join(' | ');

/** Id vụ án phúc thẩm: từ sổ cái; chưa có thì mở chi tiết hồ sơ chuyển đến › "Mở vụ án phúc thẩm…" */
async function layIdVuAnPT(page: Page, ma: string, ghi: (t: string, d: string) => unknown): Promise<string> {
  const pt = docSoCaiPT()[ma] || {};
  if (pt.idVuAnPT) return String(pt.idVuAnPT);
  expect(pt.idHoSoDenPT, 'Sổ cái phúc thẩm không có idHoSoDenPT').toBeTruthy();
  await page.goto(`vu-an/phuc-tham/hinh-su/ho-so-chuyen-den/chi-tiet/${pt.idHoSoDenPT}`);
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await choHetSpin(page, 60_000);
  await page.getByRole('button', { name: /Mở vụ án phúc thẩm|Thụ lý phúc thẩm/ }).first().click();
  await page.waitForURL(/phuc-tham\/chi-tiet\?id=/, { timeout: 60_000 });
  const id = new URL(page.url()).searchParams.get('id') || '';
  ghi('vụ án phúc thẩm', id);
  ghiSoCaiPT(ma, { idVuAnPT: id });
  return id;
}

/** Mở chi tiết vụ án phúc thẩm và chuyển sang tab (tên tab gồm cả nhãn icon) */
async function moTabPhucTham(page: Page, idVuAnPT: string, tab: string) {
  await page.goto(`vu-an/phuc-tham/chi-tiet?id=${idVuAnPT}`);
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await choHetSpin(page, 60_000);
  // Không cờ 'i': "Chuẩn bị xét xử" không được khớp tab "Xét xử"
  await page.getByRole('tab', { name: new RegExp(`(^|\\s)${tab}\\s*$`) }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await choHetSpin(page, 60_000);
  await nghi(page, 1000, 1500);
}
