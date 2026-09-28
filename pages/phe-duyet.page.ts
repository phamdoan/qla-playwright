import { Locator, Page, expect } from '@playwright/test';
import { chonSelect, go, hienTrong, nghi, toastDaHien } from '../common/antd';
import { moMenu } from '../common/menu';

/**
 * Màn "Phê duyệt đề xuất" (Công tác lãnh đạo) – qla-webapp pages/VuAn/CongTacLanhDao/PheDuyetDeXuat.
 * Không có ô tìm theo mã đơn → nhận diện dòng bằng loại đề xuất + người tạo + thời điểm tạo
 * (không sớm hơn lúc trình ở bước trước). Dòng: "<Tên> <Nội dung> <Mức độ> <Người tạo> dd/mm/yyyy HH:MM:SS <Trạng thái>..."
 */

/** "22/09/2026 13:50:36" → Date */
const docThoiGian = (s: string) => {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]) : undefined;
};

interface BanGhiPheDuyet {
  id: string;
  idDuLieu?: string;
  idChiTiet?: string;
  maBieuMau?: string;
  loaiYeuCau?: string;
  hinhThuc?: string;
  trangThaiTongHop?: string;
}

export class PheDuyetPage {
  /** Các bản ghi API danh sách trả về (để mở đúng yêu cầu theo id, không dò theo tên + thời gian) */
  private banGhi: BanGhiPheDuyet[] = [];
  /** URL API danh sách gần nhất, để tải lại với số lượng lớn khi bản ghi nằm ở trang sau */
  private urlDanhSach?: string;

  constructor(readonly page: Page) {
    page.on('response', async r => {
      if (r.request().method() !== 'GET' || !/phe-duyet-de-xuat/.test(r.url()) || /thong-ke/.test(r.url())) return;
      try {
        const j: any = await r.json();
        const d = j?.data?.content || j?.data?.items || j?.data?.data || j?.data?.records || j?.data;
        if (Array.isArray(d)) {
          this.banGhi.push(...d);
          this.urlDanhSach = r.url();
        }
      } catch {
        /* phản hồi không phải JSON */
      }
    });
  }

  /** Tải toàn bộ danh sách qua API (danh sách trên màn chỉ 10 dòng/trang nên bản ghi mới có thể ở trang sau) */
  private async taiThemBanGhi() {
    const { page } = this;
    if (!this.urlDanhSach) return;
    const u = new URL(this.urlDanhSach);
    u.searchParams.set('size', '200');
    u.searchParams.set('page', '0');
    const res = await page.request.get(u.toString()).catch(() => null);
    if (!res) return;
    const j: any = await res.json().catch(() => null);
    const d = j?.data?.content || j?.data?.items || j?.data?.data || j?.data?.records || j?.data;
    if (Array.isArray(d)) this.banGhi.push(...d);
  }

  /**
   * Mở chi tiết yêu cầu phê duyệt theo id (lấy khi trình ký ở bước trước).
   * Trả về false nếu yêu cầu đã được duyệt xong từ lần chạy trước (trangThaiTongHop = 2).
   * Tờ trình phân công (MS_02) mở bằng màn ký, các loại khác theo đúng đường FE dùng.
   */
  async moChiTietTheoId(khoa: string): Promise<boolean> {
    const { page } = this;
    const khop = (x: BanGhiPheDuyet) => x.id === khoa || x.idDuLieu === khoa;
    await this.mo();
    let rec = this.banGhi.find(khop);
    if (!rec) {
      await page.getByRole('tab', { name: /^Tất cả/ }).click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await nghi(page, 1000, 1500);
      rec = this.banGhi.find(khop);
    }
    if (!rec) {
      await this.taiThemBanGhi();
      rec = this.banGhi.find(khop);
    }
    if (!rec) throw new Error(`Không thấy yêu cầu phê duyệt cho ${khoa} trong danh sách`);
    if (rec.trangThaiTongHop === '2') return false; // đã duyệt xong ở lần chạy trước

    // Mở đúng đường FE dùng: tờ trình (MS_02 hoặc TO_TRINH_*) → trang V2; văn bản khác → màn ký.
    // Trang V2 trống (vai Trưởng/Phó phòng) thì chuyenSangTrangKyNeuTrangV2Trong() tự chuyển sang màn ký.
    const laToTrinh = rec.maBieuMau === 'MS_02' || /TO_TRINH/.test(rec.loaiYeuCau || '');
    const p = laToTrinh
      ? new URLSearchParams({
          idToTrinh: rec.idDuLieu || '',
          idYeuCauPheDuyet: rec.id,
          idChiTiet: rec.idChiTiet || '',
          role: 'LANH_DAO',
          loaiVanBan: rec.loaiYeuCau || '',
          loaiYeuCau: rec.loaiYeuCau || '',
          maBieuMau: rec.maBieuMau || '',
          version: 'v2',
        })
      : new URLSearchParams({
          yeuCauId: rec.id,
          idDuLieu: rec.idDuLieu || '',
          idChiTiet: rec.idChiTiet || '',
          action: 'ky-so',
          hinhThuc: rec.hinhThuc || 'DUYET',
        });
    await page.goto(`lanh-dao/phe-duyet-de-xuat/y-kien-lanh-dao?${p}`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await nghi(page, 1500, 2500);
    await this.chuyenSangTrangKyNeuTrangV2Trong();
    return true;
  }

  async mo() {
    // Tuỳ vai: "Công tác lãnh đạo" là menu lá (Trưởng phòng) hoặc menu cha có con "Phê duyệt đề xuất" (Chánh án)
    const { page } = this;
    await moMenu(page, ['Công tác lãnh đạo']);
    const con = page.locator('.ant-layout-sider, aside').first().getByRole('menuitem', { name: /^Phê duyệt đề xuất/ }).first();
    // Gọi mo() lần 2 (menu cha đang mở) thì bấm menu cha lại làm nó ĐÓNG → mục con ẩn; bấm lần nữa để mở lại
    if (!(await hienTrong(con, 3_000)) && !(await hienTrong(this.page.getByRole('tab', { name: /^Chờ duyệt/ }), 2_000)))
      await moMenu(page, ['Công tác lãnh đạo']);
    if (await hienTrong(con, 3_000)) await con.click();
    await expect(this.page.getByRole('tab', { name: /^Chờ duyệt/ })).toBeVisible({ timeout: 60_000 });
    await this.page.getByRole('tab', { name: /^Chờ duyệt/ }).click();
    await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  /**
   * Đặt bộ lọc của màn "Phê duyệt đề xuất" rồi Tìm kiếm.
   * Màn có tới vài trăm đề xuất, phân trang 10 dòng — chỉ nhìn trang 1 là trượt. Lọc bằng chính bộ lọc
   * của màn (Người tạo đề xuất, Loại đề xuất) cho kết quả nhanh và đúng, thay vì dò DOM.
   * Ô nào không có trên màn thì bỏ qua, không làm hỏng các vai khác.
   */
  private async datBoLoc(loai?: string | RegExp, nguoiTao?: string) {
    const { page } = this;
    const chon = async (nhan: string, giaTri: string) => {
      const o = page.getByLabel(nhan, { exact: true }).first();
      if (!(await hienTrong(o, 3_000))) return false;
      await chonSelect(page, o, giaTri, { goDeLoc: true }).catch(() => {});
      return true;
    };
    let daLoc = false;
    if (nguoiTao) daLoc = (await chon('Người tạo đề xuất', nguoiTao)) || daLoc;
    // "Loại đề xuất" là ô chọn nên chỉ lọc được khi truyền đúng một nhãn; truyền RegExp (nhiều nhãn
    // có thể có) thì bỏ ô này, chỉ lọc theo người tạo rồi khớp dòng bằng RegExp.
    if (typeof loai === 'string' && loai) daLoc = (await chon('Loại đề xuất', loai)) || daLoc;
    if (!daLoc) return;
    const nut = page.getByRole('button', { name: /Tìm kiếm$/ }).first();
    if (await hienTrong(nut, 3_000)) {
      await nut.click();
      await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await nghi(page, 1200, 2000);
    }
  }

  /** Dòng đề xuất đầu tiên (mới nhất) khớp loại + người tạo, tạo từ `tuLuc` trở đi */
  async timDong(loai: string | RegExp, nguoiTao: string, tuLuc: Date): Promise<Locator> {
    const { page } = this;
    await this.datBoLoc(loai, nguoiTao);
    const dongs = page.locator('.ant-table-row').filter({ hasText: loai }).filter({ hasText: nguoiTao });
    const ten = loai instanceof RegExp ? loai.source : loai;
    await expect(dongs.first(), `Không có đề xuất "${ten}" của ${nguoiTao} chờ duyệt`).toBeVisible({ timeout: 60_000 });
    const n = await dongs.count();
    for (let i = 0; i < n; i++) {
      const t = docThoiGian(await dongs.nth(i).innerText());
      if (t && t.getTime() >= tuLuc.getTime() - 60_000) return dongs.nth(i);
    }
    throw new Error(`Không có đề xuất "${ten}" của ${nguoiTao} tạo sau ${tuLuc.toLocaleString('vi-VN')}`);
  }

  /**
   * Mở chi tiết đề xuất nếu còn ở "Chờ duyệt"; trả về false khi bước này đã xong từ lần chạy trước
   * (đề xuất đã nằm ở tab "Đã duyệt") để chạy lại không báo lỗi giả.
   */
  async moChiTietNeuCon(loai: string | RegExp, nguoiTao: string, tuLuc: Date): Promise<boolean> {
    const { page } = this;
    try {
      await this.moChiTiet(await this.timDong(loai, nguoiTao, tuLuc));
      return true;
    } catch (loi) {
      await this.mo();
      await page.getByRole('tab', { name: /^Đã duyệt/ }).click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await this.timDong(loai, nguoiTao, tuLuc).catch(() => {
        throw loi; // không ở "Chờ duyệt" mà cũng không ở "Đã duyệt" → lỗi thật
      });
      return false;
    }
  }

  /**
   * Chốt danh tính trang đề xuất đang mở: phải thấy ít nhất một dấu hiệu của vụ (tên bị cáo, số bản
   * án). Mọi vụ đều có đề xuất cùng tên loại văn bản nên mở theo tên rất dễ trúng vụ khác rồi
   * duyệt/ký lên văn bản của họ (28/09/2026: VG16 bản án 33 mở trúng vụ bản án 47).
   */
  async xacNhanDungVu(dauHieu: string[]) {
    const { page } = this;
    const can = dauHieu.filter(Boolean);
    if (!can.length) return;
    const chu = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
    if (!can.some(t => chu.includes(t))) {
      throw new Error(
        'Trang phê duyệt đang mở KHÔNG phải của vụ này (không thấy ' + can.join(' / ') + ' trên trang) — ' +
          'mở theo tên loại văn bản đã trúng đề xuất của vụ khác. Cần id văn bản trong sổ cái.',
      );
    }
  }

  /** Trưởng/Phó phòng: tick dòng → "Phê duyệt" trên thanh công cụ → "Đồng ý" */
  async pheDuyetHangLoat(dong: Locator) {
    const { page } = this;
    await dong.locator('.ant-checkbox-input').first().check();
    await nghi(page);
    await page.getByRole('button', { name: /^(check )?Phê duyệt$/ }).first().click();
    const hop = page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Đồng ý' }) }).last();
    await expect(hop).toBeVisible({ timeout: 15_000 });
    await hop.getByRole('button', { name: 'Đồng ý' }).click();
    await toastDaHien(page, 'Đã phê duyệt', 60_000, /thất bại|Không thể|lỗi/i);
  }

  /** Mở chi tiết đề xuất: bấm link ở cột "Tên vụ án/Tên quyết định" → trang ý kiến lãnh đạo */
  async moChiTiet(dong: Locator) {
    const { page } = this;
    await dong.locator('a, .ant-typography-link, [class*="link"]').first().click();
    await page.waitForURL(/y-kien-lanh-dao|ky-so/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await nghi(page, 1000, 1500);
    await this.chuyenSangTrangKyNeuTrangV2Trong();
  }

  /**
   * Tờ trình phân công (MS_02) luôn được FE mở bằng trang V2 (PheDuyetDeXuat/index.tsx: handleXemChiTiet),
   * nhưng trang V2 chỉ dựng form cho CVP/PCVP, CA/PCA, TP1, HU35 (XinYKienPage.tsx: canUseXinYKienPageV2).
   * Với Trưởng/Phó phòng, trang hiện ra trống ("Chọn tài liệu để xem chi tiết", chỉ có Quay lại | Đóng).
   * Cùng văn bản đó mở bằng màn ký (action=ky-so&hinhThuc=DUYET) thì có đủ ô ý kiến + nút Phê duyệt,
   * nên chuyển sang màn ký với chính các id trên URL hiện tại.
   */
  private async chuyenSangTrangKyNeuTrangV2Trong() {
    const { page } = this;
    const url = new URL(page.url());
    if (url.searchParams.get('version') !== 'v2') return;
    if (!(await hienTrong(page.getByText('Chọn tài liệu để xem chi tiết'), 8_000))) return;

    const p = new URLSearchParams({
      yeuCauId: url.searchParams.get('idYeuCauPheDuyet') || '',
      idDuLieu: url.searchParams.get('idToTrinh') || '',
      idChiTiet: url.searchParams.get('idChiTiet') || '',
      action: 'ky-so',
      hinhThuc: 'DUYET',
    });
    await page.goto(`lanh-dao/phe-duyet-de-xuat/y-kien-lanh-dao?${p}`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await nghi(page, 1500, 2500);
  }

  /**
   * Chánh/Phó Văn phòng (MS_02): nhập ý kiến, chọn cấp trình tiếp + người trình tiếp (Chánh án) → "Lưu và ký logic".
   */
  async ykienVaKyLogic(noiDung: string, capTrinhTiep?: string, nguoiTrinhTiep?: string) {
    const { page } = this;
    await this.nhapYKien(noiDung);
    // "Đề xuất trình tiếp" chỉ có trên trang V2 (Chánh VP chuyển tiếp Chánh án); màn ký không có
    if (capTrinhTiep && (await page.locator('#capTrinhTiep').count())) {
      await chonSelect(page, page.locator('#capTrinhTiep'), capTrinhTiep, { goDeLoc: false });
      if (await page.locator('#nguoiDeXuatTrinh').count()) {
        await chonSelect(page, page.locator('#nguoiDeXuatTrinh'), nguoiTrinhTiep, { goDeLoc: false });
      }
    }
    await this.bamVaChoApi(page.getByRole('button', { name: /Lưu và ký logic/ }), /ky-so-va-duyet|ky-logic|\/duyet$/);
  }

  /** Chánh/Phó Chánh án (MS_02): nhập ý kiến → "Phê duyệt" */
  async ykienVaPheDuyet(noiDung: string) {
    const { page } = this;
    await this.nhapYKien(noiDung);
    await this.bamVaChoApi(page.getByRole('button', { name: /^(check )?Phê duyệt$/ }).last(), /\/duyet$/);
  }

  /**
   * Màn duyệt dự thảo kèm theo tờ trình (vd. Quyết định Kháng nghị giám đốc thẩm — Bước 13 tài liệu):
   * khối "Tờ trình và dự thảo kèm theo" có ô tick từng dự thảo và cặp nút "Duyệt" / "Trả lại",
   * KHÔNG có ô nhập ý kiến như màn tờ trình. Tick dự thảo rồi bấm "Duyệt".
   */
  async duyetDuThaoKemTheo() {
    const { page } = this;
    const khoi = page
      .locator('.ant-card, .ant-pro-card, .ant-collapse-item')
      .filter({ hasText: /Tờ trình và dự thảo kèm theo/ })
      .last();
    await expect(khoi, 'Không thấy khối "Tờ trình và dự thảo kèm theo"').toBeVisible({ timeout: 30_000 });
    const oTick = khoi.locator('.ant-checkbox-input');
    const n = await oTick.count();
    expect(n, 'Không thấy ô tick dự thảo nào trong khối kèm theo').toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const o = oTick.nth(i);
      if (!(await o.isChecked())) await o.check({ force: true });
    }
    await khoi.getByRole('button', { name: /^(check )?Duyệt$/ }).first().click();
    const xn = page
      .locator('.ant-modal-confirm, .ant-modal')
      .filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Duyệt)$/ }) })
      .last();
    if (await hienTrong(xn, 5_000)) await xn.getByRole('button', { name: /^(Đồng ý|Xác nhận|Duyệt)$/ }).last().click();
    // Màn này KHÔNG bắn toast khi duyệt xong → kiểm chứng bằng chính trạng thái: dòng dự thảo
    // chuyển sang "Đã duyệt" và cặp nút Duyệt/Trả lại biến mất.
    await expect(khoi, 'Dự thảo chưa chuyển sang "Đã duyệt" sau khi bấm Duyệt').toContainText(/Đã duyệt/i, { timeout: 60_000 });
    await expect(khoi.getByRole('button', { name: /^(check )?Duyệt$/ }), 'Vẫn còn nút Duyệt sau khi duyệt').toHaveCount(0, {
      timeout: 30_000,
    });
  }

  /** Trang "ký số" (vd. Thông báo phân công TP – Chánh/Phó VP): nhập ý kiến → "Ký logic" */
  async ykienVaKyLogicVanBan(noiDung: string) {
    const { page } = this;
    // Màn phê duyệt có HAI LOẠI văn bản, nút hiện ra khác nhau:
    //   · TỜ TRÌNH            → ô nhập ý kiến lãnh đạo + nút "Ký logic"
    //   · TỜ TRÌNH KÈM DỰ THẢO → không có ô ý kiến, chỉ "Duyệt" / "Trả lại"
    //     (vd. "Tờ trình và dự thảo kèm theo: Quyết định Kháng nghị giám đốc thẩm")
    // Nhận diện theo cặp nút Duyệt/Trả lại của màn dự thảo; không thấy thì đi đường tờ trình.
    const nutDuyet = page.getByRole('button', { name: /^Duyệt$/ }).first();
    const nutTraLai = page.getByRole('button', { name: /^Trả lại$/ }).first();
    const laManDuThao = (await hienTrong(nutDuyet, 8_000)) && (await hienTrong(nutTraLai, 3_000));
    if (laManDuThao) {
      await this.bamVaChoApi(nutDuyet, /ky-so-va-duyet|ky-logic|\/duyet$/);
      return;
    }
    // Văn bản đã duyệt/đã ký ở lượt trước: không còn ô ý kiến, cũng không còn cặp Duyệt/Trả lại, chỉ
    // còn nhãn "Đã duyệt"/"Đã ký" — nghiệp vụ chốt 28/09/2026: thấy "Đã duyệt" là bước này đã xong.
    const oYKien = page.locator('#noiDungYKienLanhDao').or(page.locator('#yKienLanhDao')).first();
    if (!(await hienTrong(oYKien, 8_000))) {
      const daXong = page.getByText(/Đã duyệt|Đã ký/i).first();
      if (await hienTrong(daXong, 5_000)) {
        console.log('    · Phê duyệt: văn bản đã ở trạng thái "' + (await daXong.innerText()).trim() + '" từ trước → bỏ qua');
        return;
      }
    }
    await this.nhapYKien(noiDung);
    await this.bamVaChoApi(page.getByRole('button', { name: /Ký logic$/ }).first(), /ky-so-va-duyet|ky-logic|\/duyet$/);
  }

  /**
   * Bấm nút rồi xác nhận bằng PHẢN HỒI API, không chờ toast: sau khi duyệt/ký, app điều hướng ngay
   * (vd. về /dashboard) nên toast không kịp hiện. Có hộp xác nhận thì bấm Đồng ý trước.
   */
  private async bamVaChoApi(nut: Locator, duongDan: RegExp) {
    const { page } = this;
    const choApi = page
      .waitForResponse(r => r.request().method() === 'POST' && /phe-duyet-de-xuat/.test(r.url()) && duongDan.test(r.url()), { timeout: 90_000 })
      .catch(() => null);
    await nut.click();
    const xn = page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Ký|Ký logic)$/ }) }).last();
    if (await hienTrong(xn, 5_000)) await xn.getByRole('button', { name: /^(Đồng ý|Xác nhận|Ký|Ký logic)$/ }).last().click();
    const res = await choApi;
    if (!res) throw new Error('Không thấy API phê duyệt/ký được gọi sau khi bấm nút');
    const kq = await res.json().catch(() => ({ success: res.ok() }));
    if (kq && kq.success === false) throw new Error(`API ${new URL(res.url()).pathname} lỗi: ${kq.message}`);
    await nghi(page, 1000, 1500);
  }

  /**
   * Ô ý kiến tuỳ loại trang: trang V2 (tờ trình MS_02) có #noiDungYKienLanhDao;
   * trang "ký số" (thông báo, văn bản thường) có #yKienLanhDao.
   */
  private async nhapYKien(noiDung: string, yKien = 'Kháng nghị') {
    const { page } = this;
    const v2 = page.locator('#noiDungYKienLanhDao');
    const cu = page.locator('#yKienLanhDao');
    const trangCuTrong = page.getByText('Chọn tài liệu để xem chi tiết');
    await expect(v2.or(cu).first(), 'Không thấy ô nhập ý kiến lãnh đạo').toBeVisible({ timeout: 60_000 });
    if (await trangCuTrong.isVisible()) {
      throw new Error('Trang phê duyệt trống (chưa chuyển được sang màn ký) — kiểm tra quyền của tài khoản');
    }
    if (await v2.isVisible()) {
      await go(v2, noiDung);
      return;
    }
    // Tờ trình thẩm tra hình sự (MS_44): #yKienLanhDao là Select ý kiến (Kháng nghị, Trả lời đơn...)
    // + textarea "Nhập ý kiến lãnh đạo" không có id. Văn bản thường: #yKienLanhDao là ô chữ.
    if ((await cu.getAttribute('role')) === 'combobox') {
      await chonSelect(page, cu, yKien, { goDeLoc: false });
      const oNoiDung = page.getByPlaceholder('Nhập ý kiến lãnh đạo').first();
      if (await hienTrong(oNoiDung, 3_000)) await go(oNoiDung, noiDung);
    } else if (await cu.isEditable()) await go(cu, noiDung);
  }
}
