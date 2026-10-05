import { Locator, Page, expect } from '@playwright/test';
import { choHetSpin, chonSelect, go, hienTrong, nghi, toastDaHien } from '../common/antd';
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

/** Số trang của tab "Chờ duyệt" sẽ dò khi tìm đề xuất của vụ (hàng chờ Chánh án trên STG 30+ dòng) */
const SO_TRANG_DO = 3;

/**
 * Dấu hiệu nhận vụ có khớp đoạn chữ này không.
 *
 * Dấu hiệu TOÀN SỐ (số bản án "12", "13") KHÔNG được khớp kiểu chuỗi con: trang nào cũng có "12" trong
 * một ngày hoặc một giờ nào đó, nên mở trúng văn bản của vụ khác vẫn bị coi là "đúng vụ" rồi duyệt/ký
 * lên văn bản của họ. Yêu cầu số đứng riêng và hai bên không phải chữ số hay dấu "/" (loại ngày
 * 12/09/2026, giờ 21:59:12 và số dạng 13/2026/KDTM-ST).
 */
export const khopDauHieu = (chu: string, dauHieu: string) => {
  if (!/^[0-9]+$/.test(dauHieu)) return chu.includes(dauHieu);
  return new RegExp(`(^|[^0-9/:])${dauHieu}([^0-9/:]|$)`).test(chu);
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

    // Mở đúng đường FE dùng: tờ trình (Tờ trình phân công hoặc TO_TRINH_*) → trang V2; văn bản khác → màn ký.
    // Nhận cả mã cũ MS_02 và mã mới 19-GDT.TC01-2026: UAT có thể chưa đổi mã biểu mẫu.
    // Trang V2 trống (vai Trưởng/Phó phòng) thì chuyenSangTrangKyNeuTrangV2Trong() tự chuyển sang màn ký.
    const MA_TO_TRINH_PHAN_CONG = ['MS_02', '19-GDT.TC01-2026'];
    const laToTrinh =
      MA_TO_TRINH_PHAN_CONG.includes(rec.maBieuMau || '') || /TO_TRINH/.test(rec.loaiYeuCau || '');
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
    const { page } = this;
    const tabCho = page.getByRole('tab', { name: /^Chờ duyệt/ });
    // Menu "Công tác lãnh đạo" có HAI dạng tuỳ quyền của tài khoản:
    //   · nhiều quyền  → là menu CHA, "Phê duyệt đề xuất" là mục con phải mở ra mới bấm được
    //   · ít quyền     → chính nó là mục lá, bấm một lần là vào màn
    // Đang ở sẵn màn phê duyệt (gọi mo() lần 2) thì KHÔNG đụng vào menu: bấm menu cha lúc đó làm
    // submenu đóng lại giữa chừng → "element is not visible / intercepts pointer events" rồi hết 30s
    // (lỗi B9 của K01, 29/09/2026).
    if (await hienTrong(tabCho, 2_000)) {
      await tabCho.click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      return;
    }
    const con = page.locator('.ant-layout-sider, aside').first().getByRole('menuitem', { name: /^Phê duyệt đề xuất/ }).first();
    for (let lan = 0; lan < 2 && !(await hienTrong(tabCho, 1_000)); lan++) {
      await moMenu(page, ['Công tác lãnh đạo']).catch(() => {});
      if (await hienTrong(con, 3_000)) await con.click({ timeout: 10_000 }).catch(() => {});
      await choHetSpin(page);
    }
    // Menu đổi dạng hoặc submenu đóng mở không ổn định → vào thẳng bằng đường dẫn.
    // Route thật khai trong qla-webapp/src/app.tsx là '/lanh-dao/phe-duyet-de-xuat' (KHÔNG có
    // '/danh-sach' — đường dẫn cũ trả về trang trắng, gây lỗi "Không mở được màn" ở B20 ngày 29/09/2026).
    for (const duong of ['lanh-dao/phe-duyet-de-xuat', 'lanh-dao/phe-duyet-de-xuat/danh-sach']) {
      if (await hienTrong(tabCho, 3_000)) break;
      await page.goto(duong);
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page);
    }
    await expect(tabCho, 'Không mở được màn "Phê duyệt đề xuất"').toBeVisible({ timeout: 60_000 });
    await tabCho.click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
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
   * Mở đề xuất ĐÚNG VỤ khi không có id trong sổ cái: mọi vụ đều có đề xuất cùng tên loại văn bản nên
   * dòng đầu tiên thường là của vụ khác. Duyệt lần lượt các dòng khớp loại, mở ra và đối chiếu dấu
   * hiệu vụ (số bản án, tên đương sự); sai thì quay lại danh sách và thử dòng kế.
   *
   * Trả về true khi đã mở đúng vụ ở tab "Chờ duyệt"; false khi đề xuất của vụ này đã duyệt xong từ
   * lần chạy trước (tìm thấy ở tab "Đã duyệt"); ném lỗi khi không thấy ở cả hai tab.
   */
  async moChiTietDungVu(
    loai: string | RegExp,
    dauHieu: string[],
    tuLuc: Date,
    toiDa = 6,
    /**
     * Tên người tạo đề xuất — màn "Phê duyệt đề xuất" CÓ ô lọc "Người tạo đề xuất" (và "Loại đề xuất",
     * "Ngày tạo đề xuất"): lọc trước thì hàng chờ 30+ dòng của Chánh án co lại còn vài dòng, đỡ phải dò
     * từng trang. Người dùng chỉ ra 03/10/2026.
     */
    nguoiTao = '',
  ): Promise<boolean> {
    const { page } = this;
    const can = dauHieu.filter(Boolean);
    const ten = loai instanceof RegExp ? loai.source : loai;
    /**
     * LỌC THEO TÊN LOẠI, NHƯNG BỎ LỌC KHI KHÔNG RA DÒNG NÀO.
     *
     * Màn "Phê duyệt đề xuất" gọi văn bản bằng TÊN KHÁC màn "Danh sách đơn": đo pre-prod 05/10/2026,
     * màn đơn có "Yêu cầu bổ sung" còn màn duyệt ghi "Giấy yêu cầu bổ sung", và hàng "Đã duyệt" có
     * "Quyết định phân công thẩm phán" — trong khi bước 26–28 tìm dòng chứa "Tờ trình".
     * Không dòng nào chứa "Tờ trình" → danh sách khớp RỖNG → vòng lặp không mở dòng nào → bước đỏ
     * với "không thấy đề xuất ở cả Chờ duyệt lẫn Đã duyệt", trông y như môi trường thiếu dữ liệu.
     * Thực ra kịch bản ĐÃ VÀO ĐÚNG màn danh sách (ảnh trang: tab "Chờ duyệt (1)" có đúng một dòng
     * đang chờ), chỉ là không nhận ra dòng của mình.
     *
     * Không đoán bảng ánh xạ tên giữa hai màn: khi lọc theo tên ra 0 dòng thì QUÉT HẾT các dòng và
     * để `xacNhanDungVu` (đối chiếu dấu hiệu vụ TRONG CHI TIẾT) phán quyết. Chậm hơn vài giây,
     * nhưng không bao giờ bỏ sót vì một chữ khác nhau. Bộ lọc "Người tạo đề xuất" + mốc thời gian
     * vẫn giữ nên số dòng phải mở vẫn nhỏ.
     */
    let boLocTen = true;
    const dongKhop = () =>
      boLocTen ? page.locator('.ant-table-row').filter({ hasText: loai }) : page.locator('.ant-table-row');

    await this.mo();
    await this.datBoLoc(typeof loai === 'string' ? loai : undefined, nguoiTao);
    /**
     * CHỜ BẢNG DỰNG XONG TRƯỚC KHI ĐẾM.
     *
     * Đếm ngay sau `datBoLoc` có thể ra 0 chỉ vì bảng chưa kịp tải — rồi bỏ lọc tên một cách vô cớ.
     * Chờ tới khi có ít nhất một dòng HOẶC ô "Không có dữ liệu" hiện ra thì con số mới có nghĩa.
     */
    await page
      .locator('.ant-table-row, .ant-empty, .ant-table-placeholder')
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => {});
    if ((await dongKhop().count()) === 0) {
      boLocTen = false;
      await this.mo();
      await this.datBoLoc(undefined, nguoiTao);
      console.log(
        `    · không dòng nào mang tên "${ten}" → bỏ lọc tên, quét ${await dongKhop().count()} dòng ` +
          `theo người tạo${nguoiTao ? ` "${nguoiTao}"` : ''} + mốc thời gian`,
      );
    }
    /** Sang trang thứ `trang` của danh sách đang mở (trang 1 = không bấm gì) */
    const moTrang = async (trang: number) => {
      for (let i = 1; i < trang; i++) {
        const sau = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)').first();
        if (!(await sau.isVisible().catch(() => false))) return false;
        await sau.click().catch(() => undefined);
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await nghi(page, 1000, 1500);
      }
      return true;
    };
    for (let trang = 1; trang <= SO_TRANG_DO; trang++) {
      await this.mo();
      await this.datBoLoc(boLocTen && typeof loai === 'string' ? loai : undefined, nguoiTao);
      if (!(await moTrang(trang))) break;
      const tong = Math.min(await dongKhop().count(), toiDa);
      for (let i = 0; i < tong; i++) {
        const t = docThoiGian(await dongKhop().nth(i).innerText().catch(() => ''));
        if (t && t.getTime() < tuLuc.getTime() - 60_000) continue; // đề xuất cũ, không phải lượt này
        await this.moChiTiet(dongKhop().nth(i));
        try {
          await this.xacNhanDungVu(can);
          return true;
        } catch {
          await this.mo();
          await this.datBoLoc(boLocTen && typeof loai === 'string' ? loai : undefined, nguoiTao);
          if (!(await moTrang(trang))) break;
        }
      }
    }
    // Không còn ở "Chờ duyệt" → có thể đã duyệt xong từ lần chạy trước
    await this.mo();
    await page.getByRole('tab', { name: /^Đã duyệt/ }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await nghi(page, 1000, 1500);
    if (can.length) {
      const ds = dongKhop();
      for (let i = 0; i < (await ds.count()); i++) {
        const chu = (await ds.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ');
        if (can.some(t => khopDauHieu(chu, t))) return false;
      }
    }
    /**
     * BÁO LỖI PHẢI NÓI RA NÓ ĐÃ THẤY GÌ.
     *
     * Thông báo cũ chỉ nói "không thấy đề xuất <tên>" — đọc xong vẫn không biết là màn rỗng, hay có
     * dòng mà tên khác, hay có dòng mà dấu hiệu không khớp. Đo pre-prod 05/10/2026: ba lượt chạy
     * liên tiếp cùng một câu đó, trong khi màn CÓ đúng 1 dòng ở "Chờ duyệt" và 3 dòng ở "Đã duyệt".
     * Liệt kê tên các dòng thật của cả hai tab thì một lượt chạy là đủ kết luận.
     */
    const tenDong = async () =>
      [
        ...new Set(
          (await page.locator('.ant-table-row').allInnerTexts().catch(() => []))
            .map(s => (s.split('\n').find(x => x.trim()) || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean),
        ),
      ]
        .slice(0, 8)
        .join(' | ') || '(không dòng nào)';
    const dongDaDuyet = await tenDong();
    await this.mo();
    await page.getByRole('tab', { name: /^Chờ duyệt/ }).click().catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await nghi(page, 800, 1200);
    const dongChoDuyet = await tenDong();
    throw new Error(
      `Không thấy đề xuất "${ten}" của vụ này (dấu hiệu: ${can.join(' / ') || '-'}) ở cả hai tab.\n` +
        `  · "Chờ duyệt" đang có: ${dongChoDuyet}\n` +
        `  · "Đã duyệt" đang có: ${dongDaDuyet}\n` +
        '  → Dòng CÓ mà tên khác "' +
        ten +
        '" thì đây là lệch TÊN LOẠI giữa màn Danh sách đơn và màn Phê duyệt đề xuất, ' +
        'không phải thiếu dữ liệu.',
    );
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
    if (!can.some(t => khopDauHieu(chu, t))) {
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
  /**
   * Trả về ĐÃ TRÌNH TIẾP ĐƯỢC HAY KHÔNG, để bước gọi báo đúng việc nó làm.
   *
   * ⚠ LỖI CŨ Ở ĐÂY LÀ MỘT DẠNG XANH GIẢ. Hai ô "Đề xuất trình tiếp" chỉ có trên trang V2 nên mã đặt
   * chúng `if (count())` rồi đi tiếp — hợp lý. Nhưng bước 27 lại GHI BẰNG CHỨNG "đã cho ý kiến và
   * trình Phó Chánh án (…)" lấy thẳng từ dữ liệu gieo, KHÔNG kiểm hai ô đó có tồn tại không. Kết quả:
   * bước 27 xanh và báo đã trình, trong khi văn bản chỉ được KÝ chứ chưa chuyển cho ai.
   *
   * Đo pre-prod 04/10/2026: màn ký chỉ có hai ô ý kiến + các nút Ký số / Ký logic / Từ chối ký / Lưu
   * — KHÔNG có ô cấp trình tiếp. Hộp "Phê duyệt đề xuất" của Phó Chánh án (dò bằng `do-phe-duyet`)
   * không có đề xuất này ở bất kỳ tab nào, dù hộp đó vẫn nhận văn bản khác trong cùng ngày. Bước 28
   * vì thế đỏ với câu "Không thấy đề xuất …" — đúng hiện tượng, sai nguyên nhân.
   */
  async ykienVaKyLogic(
    noiDung: string,
    capTrinhTiep?: string,
    nguoiTrinhTiep?: string,
  ): Promise<{ daTrinhTiep: boolean; moTa: string }> {
    const { page } = this;
    await this.nhapYKien(noiDung);
    let daTrinhTiep = false;
    let moTa = 'màn ký KHÔNG có ô "Đề xuất trình tiếp" → chỉ ký, KHÔNG chuyển cho ai';
    if (capTrinhTiep && (await page.locator('#capTrinhTiep').count())) {
      await chonSelect(page, page.locator('#capTrinhTiep'), capTrinhTiep, { goDeLoc: false });
      if (await page.locator('#nguoiDeXuatTrinh').count()) {
        await chonSelect(page, page.locator('#nguoiDeXuatTrinh'), nguoiTrinhTiep, { goDeLoc: false });
      }
      daTrinhTiep = true;
      moTa = `đã chọn trình tiếp: ${capTrinhTiep}${nguoiTrinhTiep ? ` (${nguoiTrinhTiep})` : ''}`;
    }
    const nut = await this.nutKy([/Lưu và ký logic/, /Ký logic$/, /^Ký số$/]);
    await this.bamVaChoApi(nut.nut, /ky-so-va-duyet|ky-logic|\/duyet$/);
    return { daTrinhTiep, moTa: `${moTa} · nút đã bấm: ${nut.ten}` };
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
    if (!(await hienTrong(khoi, 30_000))) {
      // Dự thảo đã được duyệt ở lượt chạy trước → trang mở ra không còn khối tick + nút Duyệt.
      // Chỉ coi là xong khi trang thật sự hiện trạng thái đã duyệt/đã ký, để không nuốt lỗi thật.
      const chu = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (/(Đã duyệt|Đã ký|Đã ban hành)/i.test(chu)) {
        console.log('    · Dự thảo kèm theo đã ở trạng thái đã duyệt/đã ký → bỏ qua thao tác Duyệt');
        return;
      }
      throw new Error(
        'Không thấy khối "Tờ trình và dự thảo kèm theo" và trang cũng không hiện trạng thái đã duyệt. ' +
          `Chữ trên trang: ${chu.slice(0, 200)}`,
      );
    }
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
   * NÚT KÝ — tên khác nhau giữa các môi trường, trả về nút ĐẦU TIÊN thật có trên màn.
   *
   * ⚠ TÊN KHẢ TRUY CẬP CÓ TIỀN TỐ TÊN ICON. Trên màn "Ký số văn bản" của pre-prod, nút ký logic có
   * tên khả truy cập là **"code Ký logic"** (icon `code` đứng trước), nên `/^Ký logic$/` KHÔNG khớp
   * mà `/Ký logic$/` thì khớp. Cùng một bẫy với "rollback Đổi loại kết quả" và "printer In hồ sơ".
   *
   * Đo 04/10/2026: lần đầu tôi chỉ liệt kê nút trong `main` của màn phê duyệt (thấy Ký số | Lưu |
   * Từ chối ký) rồi KẾT LUẬN SAI rằng pre-prod không có ký logic. Màn "Ký số văn bản" có cả hai.
   *
   * Thứ tự ưu tiên: KÝ LOGIC TRƯỚC, "Ký số" sau. "Ký số" là ký bằng chứng thư số thật — nếu nó mở
   * hộp thoại hệ điều hành hoặc đòi USB token thì Playwright không điều khiển được.
   */
  private async nutKy(uuTien: RegExp[]) {
    for (const ten of uuTien) {
      const nut = this.page.getByRole('button', { name: ten }).first();
      if (await hienTrong(nut, 4_000)) return { nut, ten: ten.source };
    }
    const co = [
      ...new Set(
        (await this.page.locator('main').getByRole('button').allInnerTexts().catch(() => []))
          .map(t => t.replace(/s+/g, ' ').trim())
          .filter(Boolean),
      ),
    ];
    throw new Error(
      `Không thấy nút ký nào trong ${uuTien.map(r => r.source).join(' | ')}. Nút đang có: ${co.join(' | ') || '(không có)'}`,
    );
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
