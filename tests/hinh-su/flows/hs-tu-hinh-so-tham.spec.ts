/**
 * Luồng "Vụ án hình sự sơ thẩm" (Training AI hình sự.docx) — chạy theo danh sách
 * data/data-test-hinh-su.xlsx, sheet "03_MASTER_VU_AN".
 *
 *   B1   Đăng nhập <CCCD:canBoDanSu>, mở Hồ sơ tiếp nhận (/vu-an/so-tham/ho-so-tiep-nhan), thấy "Tạo mới hồ sơ"
 *   B2   Tạo mới hồ sơ (tên bị can, tội danh bị truy tố, VKS khu vực 9, cáo trạng trước ngày thụ lý ST,
 *        biện pháp ngăn chặn "Không xác định") → Lưu & tiếp nhận
 *   B3   Chi tiết hồ sơ: đối chiếu đầu mục "Đủ" → Biên bản giao nhận (bên giao: Kiểm sát viên) → Lưu → Đóng
 *   B4   Quyết định xử lý › Tải xuống → Tài liệu › Chọn tệp, loại "Hồ sơ tiếp nhận - Biên bản giao nhận"
 *        → Thêm mới → Chuyển đến vụ án
 *   B5   Chỉnh sửa vụ án › Sửa bị can đầu vụ (nhân thân, "Không có thông tin", địa bàn, điều luật)
 *   B6   Tạo đồng phạm (nếu có) → Phân loại tội phạm → Lưu
 *   B7   Tab Thụ lý › Thụ lý (Ngày thụ lý ST) → Xác nhận thụ lý
 *   B8   Tab Phân công › Phân công Thẩm phán / Hội thẩm → Lưu → Trình ký → Gửi
 *   B9   <CCCD:chanhAnDanSu> (Nguyễn Mậu Trường) › Phê duyệt đề xuất › Chờ duyệt › Ký logic 2 quyết định
 *   B10  Tìm vụ án theo mã › Chuẩn bị xét xử › Quyết định đưa vụ án ra xét xử → ngày/số quyết định
 *        → "Chọn lịch xét xử" (tài liệu dừng ở 7.3 nên chưa Lưu)
 *
 * Dữ liệu: sheet "03_MASTER_VU_AN" (vụ án) ghép với "04_MASTER_BI_CAO" (bị can) qua ID vụ án.
 * Mặc định chạy HẾT các vụ chưa làm (cột "Trạng thái sơ thẩm" trống), mỗi vụ một nhóm test.
 * Trên UI bấm ▶ ở nhóm vụ muốn chạy. Lọc tuỳ chọn: QLA_HS_MA=VA017,VA020 / QLA_HS_SO_VU=3.
 *
 * Dữ liệu từng bước (mã hồ sơ, mã vụ án…) ghi vào seed-output/hinh-su-so-tham.<env>.json
 * để bước sau dùng lại và chạy lại không tạo trùng.
 *
 * Viết và chạy TỪNG BƯỚC: bước trước xanh mới làm bước sau.
 * ⚠ Từ B2 trở đi là tạo dữ liệu thật → chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 *   npm run hinh-su:dev        (chạy hết trên DEV)      npm run hinh-su:dev:ui   (UI trên DEV)
 *   npm run hinh-su:stg        (chạy hết trên STG)      npm run hinh-su:stg:ui   (UI trên STG)
 */
import { Locator, Page, expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";
import { choPhepGhiTKM } from "../../../account";
import {
  choHetSpin,
  chonNgauNhien,
  chonNgay,
  dienTrongO,
  chonRadio,
  chonSelect,
  go,
  nghi,
  nguyenNhanLoi,
  toastDaHien,
} from "../../../common/antd";
import { taiKhoan } from "../../../common/cau-hinh-luong";
import {
  BiCanHinhSu,
  VuAnHinhSu,
  chonVuHinhSu,
  congNgay,
  docVuAnHinhSu,
  nhanBoLuat,
} from "../../../common/du-lieu-hinh-su";
import { moTrangVaiCauHinh } from "../../../common/luong-tkm";

const MOI_TRUONG = process.env.QLA_ENV || "stg";
const DS_VU = docVuAnHinhSu();
/** Các vụ sẽ chạy: mặc định mọi vụ chưa làm (xem chonVuHinhSu) */
const DS_CHAY = chonVuHinhSu(DS_VU);
/** Cán bộ nhập hồ sơ (<CCCD:canBoDanSu>) và người ký/phân công (Nguyễn Mậu Trường, <CCCD:chanhAnDanSu>) */
const VAI_CAN_BO = "canBoDanSu";
/** Người ký / người phân công và Thẩm phán chủ tọa */
const NGUOI_KY_PHAN_CONG = "Nguyễn Mậu Trường";
/** Tài khoản Nguyễn Mậu Trường (<CCCD:chanhAnDanSu>) — ký logic văn bản */
const VAI_LANH_DAO = "chanhAnDanSu";

/**
 * Số văn bản DUY NHẤT cho một vụ: suy từ số thứ tự dòng trong sheet nên mỗi vụ một số, chạy lại ra
 * đúng số cũ, và không bao giờ trùng giữa các vụ (số ngẫu nhiên trong dải hẹp từng gây trùng số ở
 * luồng dân sự). `loai` tách các văn bản khác nhau của cùng một vụ.
 */
// Đào tạo 15/10/2026: số nhỏ (dong*10) trùng số học viên đã dùng → dải 8000+, vẫn duy nhất theo vụ
const soTheoVuAn = (vu: VuAnHinhSu, loai: number) => 8000 + vu.dong * 10 + loai;

/** Trạng thái đã làm của từng vụ (theo Mã vụ án trong Excel) */
interface TrangThaiVu {
  idHoSo?: string;
  soCaoTrang?: string;
  ngayCaoTrang?: string;
  tenBiCan?: string;
  toiDanh?: string;
  maHoSo?: string;
  idVuAn?: string;
  maVuAn?: string;
  soThuLy?: string;
  soQuyetDinhXetXu?: string;
  soBanAn?: string;
  daXong?: string[];
}
const FILE_TT = path.resolve(
  __dirname,
  `../../../seed-output/hinh-su-so-tham.${MOI_TRUONG}.json`,
);
const docTatCa = (): Record<string, TrangThaiVu> =>
  fs.existsSync(FILE_TT) ? JSON.parse(fs.readFileSync(FILE_TT, "utf8")) : {};
const trangThai = (vu: VuAnHinhSu): TrangThaiVu => docTatCa()[vu.maVuAn] || {};
function ghiTrangThai(vu: VuAnHinhSu, them: TrangThaiVu & { xong?: string }) {
  const tatCa = docTatCa();
  const cu = tatCa[vu.maVuAn] || {};
  const { xong, ...duLieu } = them;
  const daXong = [...new Set([...(cu.daXong || []), ...(xong ? [xong] : [])])];
  tatCa[vu.maVuAn] = { ...cu, ...duLieu, daXong };
  fs.mkdirSync(path.dirname(FILE_TT), { recursive: true });
  fs.writeFileSync(FILE_TT, JSON.stringify(tatCa, null, 2));
}

test("Danh sách vụ cần chạy", () => {
  expect(
    DS_VU.length,
    "Không đọc được vụ án nào từ sheet 03_MASTER_VU_AN",
  ).toBeGreaterThan(0);
  test.info().annotations.push({
    type: "số vụ",
    description: `${DS_CHAY.length}: ${DS_CHAY.map((v) => v.maVuAn).join(", ")}`,
  });
});

// Mỗi vụ một nhóm, chạy tuần tự trong nhóm: vụ nào lỗi chỉ dừng vụ đó, các vụ khác vẫn chạy
for (const VU of DS_CHAY) {
  test.describe(`${VU.maVuAn} · ${VU.tenVuAn}`, () => {
    test.describe.configure({ mode: "serial" });

    test("B1 · Đăng nhập, đọc dữ liệu Excel, mở Hồ sơ tiếp nhận", async ({
      browser,
    }, testInfo) => {
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      ghi(
        "vụ sẽ chạy",
        `${VU.maVuAn} · ${VU.tenVuAn} · thụ lý ${VU.ngayThuLyST} · ${VU.boLuat}`,
      );
      ghi(
        "bị can",
        VU.biCan
          .map((b) => `${b.hoTen} (${b.namSinh}, ${b.gioiTinh})`)
          .join("; "),
      );
      await testInfo.attach("vu-hinh-su.json", {
        body: JSON.stringify(VU, null, 2),
        contentType: "application/json",
      });

      ghi("tài khoản", `${taiKhoan(VAI_CAN_BO).cccd} trên ${MOI_TRUONG}`);
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_CAN_BO,
      );
      await page.goto("vu-an/so-tham/ho-so-tiep-nhan");
      await page
        .waitForLoadState("networkidle", { timeout: 60_000 })
        .catch(() => {});
      await choHetSpin(page);
      await expect(
        page.getByRole("button", { name: /Tạo mới hồ sơ/ }).first(),
        'Không thấy nút "Tạo mới hồ sơ"',
      ).toBeVisible({ timeout: 60_000 });
      ghi("url", new URL(page.url()).pathname);
      await context.close();
    });

    test("B2 · Tạo mới hồ sơ, điền thông tin bắt buộc, Lưu & tiếp nhận", async ({
      browser,
    }, testInfo) => {
      test.skip(
        !choPhepGhiTKM(),
        `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
      );
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tt = trangThai(VU);
      if (tt.idHoSo) {
        ghi(
          "bỏ qua",
          `Đã tạo hồ sơ ${tt.idHoSo} cho ${VU.maVuAn} (${tt.soCaoTrang})`,
        );
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_CAN_BO,
      );
      await page.goto("vu-an/so-tham/ho-so-tiep-nhan");
      await page
        .waitForLoadState("networkidle", { timeout: 60_000 })
        .catch(() => {});
      await choHetSpin(page);
      await page
        .getByRole("button", { name: /Tạo mới hồ sơ/ })
        .first()
        .click();
      await expect(
        page.locator("#tenBiCan"),
        "Không mở được form Tạo mới hồ sơ",
      ).toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);
      await nghi(page, 1000, 1500);

      const biCanDau = VU.biCan[0];
      const ngayCaoTrang = congNgay(
        VU.ngayThuLyST,
        -(5 + (Number(VU.maVuAn.replace(/\D/g, "")) % 10)),
      );
      // Số cáo trạng phải DUY NHẤT giữa các vụ: lấy theo số thứ tự vụ trong sheet thay vì ngẫu
      // nhiên (dải ngẫu nhiên hẹp từng làm số tiếp nhận trùng nhau ở luồng dân sự). Chạy lại cùng
      // một vụ cũng ra đúng số cũ.
      const soCaoTrang = `${soTheoVuAn(VU, 1)}/CT-VKSKV9`;
      const tongSoButLuc = String(80 + (soTheoVuAn(VU, 0) % 220));

      await go(page.locator("#tenBiCan"), biCanDau.hoTen);
      // 2.3 · "Tội danh bị truy tố" lấy cột "Tội danh VKS truy tố" của bị can đầu vụ (sheet 04).
      // Danh mục hệ thống ghi dạng "360 - Thiếu trách nhiệm gây hậu quả nghiêm trọng" (không có tiền
      // tố "Tội") nên bỏ tiền tố khi tra; danh mục không có tên đó thì tra theo số điều của sheet 03.
      const tenToiDanh = biCanDau.toiDanhTruyTo.replace(/^s*tộis+/i, "").trim();
      let toiDanh = await chonSelect(
        page,
        page.locator("#toiDanhTruyTo"),
        tenToiDanh,
      ).catch(() => "");
      if (!toiDanh) {
        toiDanh = await chonSelect(
          page,
          page.locator("#toiDanhTruyTo"),
          `Điều ${VU.dieuLuat} -`,
        );
        ghi(
          "tội danh (tra theo số điều)",
          `danh mục không có "${tenToiDanh}" → dùng Điều ${VU.dieuLuat}`,
        );
      }
      ghi("tội danh bị truy tố", toiDanh);
      await chonRadio(page, "Viện kiểm sát");
      const noiChuyen = await chonSelect(
        page,
        page.locator("#donViChuyenDen"),
        /khu vực 9\s*-\s*Hà Nội/i,
      );
      ghi("nơi chuyển đến", noiChuyen);
      await chonNgay(page.locator("#ngayGiao"), ngayCaoTrang);
      await go(page.locator("#soCaoTrang"), soCaoTrang);
      await chonNgay(page.locator("#ngayCaoTrang"), ngayCaoTrang);
      await chonSelect(
        page,
        page.locator("#bienPhapNganChan"),
        "Không xác định",
        { goDeLoc: false },
      );
      await go(page.locator("#tongSoButLuc"), tongSoButLuc);
      ghi(
        "cáo trạng",
        `${soCaoTrang} ngày ${ngayCaoTrang} (thụ lý ST ${VU.ngayThuLyST}), ${tongSoButLuc} bút lục`,
      );

      await page
        .getByRole("button", { name: /Lưu & tiếp nhận/ })
        .first()
        .click();
      await toastDaHien(
        page,
        /Tạo mới hồ sơ thành công/,
        60_000,
        /lỗi|thất bại|không thành công|vui lòng/i,
      );
      // id hồ sơ là UUID
      await page.waitForURL(/ho-so-tiep-nhan\/chi-tiet\/[^/?#]+/, {
        timeout: 60_000,
      });
      const idHoSo = (page.url().match(/chi-tiet\/([^/?#]+)/) || [])[1];
      ghiTrangThai(VU, {
        idHoSo,
        soCaoTrang,
        ngayCaoTrang,
        tenBiCan: biCanDau.hoTen,
        toiDanh: toiDanh.replace(/^Điều \d+\w* - /, ""),
      });
      ghi("hồ sơ", `id ${idHoSo} · ${new URL(page.url()).pathname}`);
      await context.close();
    });

    test('B3 · Chi tiết hồ sơ: đối chiếu đầu mục "Đủ", lập Biên bản giao nhận', async ({
      browser,
    }, testInfo) => {
      test.skip(
        !choPhepGhiTKM(),
        `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
      );
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tt = trangThai(VU);
      expect(tt.idHoSo, "Chưa có hồ sơ (chạy B2 trước)").toBeTruthy();
      if (tt.daXong?.includes("bienBanGiaoNhan")) {
        ghi("bỏ qua", `Hồ sơ ${tt.idHoSo} đã lập biên bản giao nhận`);
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_CAN_BO,
      );
      await moChiTietHoSo(page, tt.idHoSo!);

      // Mọi đầu mục bắt buộc đang "Chưa đối chiếu" → bấm "Đủ" (nhóm nút có 3 lựa chọn Chưa đối chiếu / Đủ / Thiếu)
      const the = page
        .locator(".ant-pro-card")
        .filter({
          has: page.getByText("Đối chiếu đầu mục hồ sơ bắt buộc", {
            exact: true,
          }),
        })
        .first();
      await expect(the).toBeVisible({ timeout: 60_000 });
      const soDauMuc = await the
        .locator("button", { hasText: "Chưa đối chiếu" })
        .count();
      for (let i = 0; i < soDauMuc; i++) {
        const nutDu = the
          .locator("button", { hasText: "Chưa đối chiếu" })
          .nth(i)
          .locator("xpath=following-sibling::button[1]");
        await nutDu.scrollIntoViewIfNeeded();
        await nutDu.click();
        await nghi(page, 600, 1000);
      }
      ghi("đầu mục đã đối chiếu Đủ", String(soDauMuc));

      const nutBienBan = the.getByRole("button", {
        name: /Biên bản giao nhận/,
      });
      await expect(
        nutBienBan,
        'Nút "Biên bản giao nhận" vẫn khoá sau khi đối chiếu',
      ).toBeEnabled({ timeout: 30_000 });
      await nutBienBan.click();
      // Popup là biểu mẫu TNHSCN "Biên bản về việc giao, nhận hồ sơ vụ án và bản cáo trạng"
      const modal = page
        .locator(".ant-modal")
        .filter({
          hasText: "Biên bản về việc giao, nhận hồ sơ vụ án và bản cáo trạng",
        })
        .last();
      await expect(modal, "Không mở được popup Biên bản giao nhận").toBeVisible(
        { timeout: 30_000 },
      );
      await choHetSpin(page);
      await nghi(page, 1200, 1800);

      // Tên bị can / tội danh popup tự lấy từ hồ sơ; còn trống thì điền đúng như lúc tạo hồ sơ
      const oTenBiCan = modal.getByLabel("Tên bị can (đầu vụ)");
      if (!(await oTenBiCan.inputValue())) await go(oTenBiCan, tt.tenBiCan!);
      const oToiDanh = modal.getByLabel("Tội danh bị truy tố");
      if (!(await oToiDanh.inputValue()))
        await go(oToiDanh, tt.toiDanh || VU.toiDanh);
      const benGiao = nguoiBenGiao(VU.maVuAn);
      await go(modal.getByLabel("Họ tên bên giao"), benGiao);
      await go(
        modal.getByLabel("Chức vụ / chức danh").first(),
        "Kiểm sát viên",
      );
      ghi("bên giao", `${benGiao} – Kiểm sát viên`);
      await modal.getByRole("button", { name: /^Lưu$/ }).click();

      const thongBao = page
        .locator(".ant-modal")
        .filter({ hasText: /Đã lưu biên bản giao nhận/ })
        .last();
      await expect(
        thongBao,
        'Không thấy thông báo "Đã lưu biên bản giao nhận"',
      ).toBeVisible({ timeout: 60_000 });
      await thongBao.getByRole("button", { name: /Đóng/ }).click();
      await expect(thongBao).toBeHidden({ timeout: 15_000 });
      ghiTrangThai(VU, { xong: "bienBanGiaoNhan" });
      await context.close();
    });

    test("B4 · Tải biên bản giao nhận, đính kèm vào Tài liệu, Chuyển đến vụ án", async ({
      browser,
    }, testInfo) => {
      test.skip(
        !choPhepGhiTKM(),
        `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
      );
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tt = trangThai(VU);
      expect(
        tt.daXong,
        "Chưa lập biên bản giao nhận (chạy B3 trước)",
      ).toContain("bienBanGiaoNhan");
      if (tt.idVuAn) {
        ghi(
          "bỏ qua",
          `Hồ sơ ${tt.maHoSo || tt.idHoSo} đã chuyển đến vụ án ${tt.idVuAn}`,
        );
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_CAN_BO,
      );
      batToken(page);
      await moChiTietHoSo(page, tt.idHoSo!);

      if (!tt.daXong?.includes("taiLieuBienBan")) {
        // Mục "Quyết định xử lý" › cột Thao tác › Tải xuống biểu mẫu biên bản giao nhận vừa lập
        const theQd = theCo(page, "Quyết định xử lý");
        const dongQd = theQd.locator(".ant-table-row").first();
        await expect(
          dongQd,
          "Mục Quyết định xử lý chưa có biên bản giao nhận",
        ).toBeVisible({ timeout: 60_000 });
        ghi(
          "quyết định xử lý",
          (await dongQd.innerText()).replace(/\s+/g, " ").trim(),
        );
        const [taiVe] = await Promise.all([
          page.waitForEvent("download", { timeout: 120_000 }),
          dongQd.locator("button:has(.anticon-download)").first().click(),
        ]);
        const tep = testInfo.outputPath(taiVe.suggestedFilename());
        await taiVe.saveAs(tep);
        ghi("biên bản tải về", taiVe.suggestedFilename());

        // Mục "Tài liệu" › Chọn tệp (biên bản vừa tải) › Loại tài liệu › Thêm mới
        const theTl = theCo(page, "Tài liệu");
        const [hopChonTep] = await Promise.all([
          page.waitForEvent("filechooser"),
          theTl.getByRole("button", { name: /Chọn tệp/ }).click(),
        ]);
        await hopChonTep.setFiles(tep);
        const nutThem = theTl.getByRole("button", { name: /Thêm mới/ });
        await expect(
          nutThem,
          "Tải tệp lên chưa xong (nút Thêm mới vẫn khoá)",
        ).toBeEnabled({ timeout: 120_000 });
        const loai = await chonSelect(
          page,
          theTl.getByRole("combobox").first(),
          "Hồ sơ tiếp nhận - Biên bản giao nhận",
        );
        ghi("loại tài liệu", loai);
        await nutThem.click();
        await choHetSpin(page);
        await expect(
          theTl
            .locator(".ant-table-row")
            .filter({ hasText: /Biên bản giao nhận/ })
            .first(),
          "Không thấy tài liệu biên bản giao nhận trong danh sách Tài liệu",
        ).toBeVisible({ timeout: 60_000 });
        ghiTrangThai(VU, { xong: "taiLieuBienBan" });
      }

      // Chuyển đến vụ án (hệ thống đã tự lập vụ án khi tiếp nhận)
      const nutChuyen = page
        .getByRole("button", { name: /Chuyển đến vụ án/ })
        .first();
      await expect(nutChuyen, 'Không thấy nút "Chuyển đến vụ án"').toBeVisible({
        timeout: 60_000,
      });
      await nutChuyen.click();
      await page.waitForURL(/so-tham\/chi-tiet\?id=/, { timeout: 60_000 });
      const idVuAn = new URL(page.url()).searchParams.get("id")!;
      const vuAn = await apiGet(page, `vu-an/${idVuAn}`);
      const maVuAn = vuAn?.data?.maVuAn || "";
      ghiTrangThai(VU, { idVuAn, maVuAn });
      ghi("vụ án", `${maVuAn || "(chưa đọc được mã)"} · id ${idVuAn}`);
      await context.close();
    });

    test("B5 · Chỉnh sửa vụ án: sửa bị can đầu vụ theo dữ liệu Excel", async ({
      browser,
    }, testInfo) => {
      test.skip(
        !choPhepGhiTKM(),
        `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
      );
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tt = trangThai(VU);
      expect(tt.idVuAn, "Chưa có vụ án (chạy B4 trước)").toBeTruthy();
      if (tt.daXong?.includes("suaBiCanDauVu")) {
        ghi("bỏ qua", `Vụ án ${tt.maVuAn} đã sửa bị can đầu vụ`);
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_CAN_BO,
      );
      await moChinhSuaVuAn(page, tt.idVuAn!);

      const biCan = VU.biCan[0];
      const dongBiCan = page
        .locator(".ant-table-row")
        .filter({ hasText: biCan.hoTen })
        .first();
      await expect(
        dongBiCan,
        `Danh sách bị can không có ${biCan.hoTen}`,
      ).toBeVisible({ timeout: 60_000 });
      await dongBiCan.locator("button:has(.anticon-edit)").first().click();
      const ketQua = await dienBiCan(page, VU, biCan);
      ghi("bị can đầu vụ", ketQua);

      await expect(
        page.locator(".ant-table-row").filter({ hasText: biCan.hoTen }).first(),
        "Danh sách bị can chưa cập nhật năm sinh",
      ).toContainText(String(biCan.namSinh), {
        timeout: 30_000,
      });
      ghiTrangThai(VU, { xong: "suaBiCanDauVu" });
      await context.close();
    });

    test("B6 · Chỉnh sửa vụ án: tạo đồng phạm (nếu có), chọn Phân loại tội phạm, Lưu", async ({
      browser,
    }, testInfo) => {
      test.skip(
        !choPhepGhiTKM(),
        `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
      );
      testInfo.setTimeout(15 * 60_000);
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tt = trangThai(VU);
      expect(tt.daXong, "Chưa sửa bị can đầu vụ (chạy B5 trước)").toContain(
        "suaBiCanDauVu",
      );
      if (tt.daXong?.includes("luuVuAn")) {
        ghi("bỏ qua", `Vụ án ${tt.maVuAn} đã lưu thông tin`);
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_CAN_BO,
      );
      batToken(page);
      await moChinhSuaVuAn(page, tt.idVuAn!);

      // Đồng phạm: bị can thứ 2 trở đi, chỉ tạo người chưa có trong danh sách (chạy lại không tạo trùng)
      const dongPham = VU.biCan.slice(1);
      ghi("số đồng phạm", String(dongPham.length));
      for (const bc of dongPham) {
        // Trùng họ tên với bị can đã có thì phải xét cả năm sinh, không thì đồng phạm bị coi là
        // "đã có" và không bao giờ được tạo
        const daCo = page
          .locator(".ant-table-row")
          .filter({ hasText: bc.hoTen })
          .filter({ hasText: String(bc.namSinh) });
        if (await daCo.count()) {
          ghi("đồng phạm đã có", `${bc.hoTen} (${bc.namSinh})`);
          continue;
        }
        await page
          .getByRole("button", { name: /Tạo mới/ })
          .first()
          .click();
        const kq = await dienBiCan(page, VU, bc);
        ghi("đồng phạm", kq);
        await expect(
          daCo.first(),
          `Danh sách bị can chưa có ${bc.hoTen} (${bc.namSinh})`,
        ).toBeVisible({
          timeout: 30_000,
        });
      }

      // Phân loại tội phạm của vụ án (bắt buộc): mức nặng nhất trong các bị can — hệ thống đã tự tính
      // cho từng bị can theo điều luật áp dụng (trường phanLoai)
      const oMucDo = page.locator("#formThemMoiVuAn_maMucDo");
      const khungMucDo = oMucDo.locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]',
      );
      const mucDoHienTai = (
        await khungMucDo
          .locator(".ant-select-selection-item")
          .first()
          .innerText()
          .catch(() => "")
      ).trim();
      const dsTruoc = await apiGet(
        page,
        `doi-tuong/bi-can?idVuAn=${tt.idVuAn}`,
      );
      const maBiCan: string[] =
        JSON.stringify(dsTruoc?.data?.data || [])
          .match(/"phanLoai":"\d{3}"/g)
          ?.map((x) => x.slice(-4, -1)) || [];
      const maCaoNhat = MUC_DO_TANG_DAN.filter((m) =>
        maBiCan.includes(m),
      ).pop();
      ghi("phân loại của các bị can", maBiCan.join(", ") || "(chưa có)");
      if (maCaoNhat && (!mucDoHienTai || /Chưa xác định/.test(mucDoHienTai))) {
        const mucDo = await chonSelect(page, oMucDo, TEN_MUC_DO[maCaoNhat], {
          goDeLoc: false,
        });
        ghi("phân loại tội phạm", mucDo);
      } else if (!mucDoHienTai || /Chưa xác định/.test(mucDoHienTai)) {
        // Không bị can nào mang phân loại (điều luật áp dụng không kèm mức độ) → suy theo mức hình
        // phạt cao nhất của vụ, theo ngưỡng Điều 9 BLHS. Ghi rõ là suy ra, không phải hệ thống trả về.
        const namCaoNhat = Math.max(
          0,
          ...VU.biCan.map(
            (b) => soNamTu(b.mucHinhPhat) || soNamTu(b.hinhPhatChinhST),
          ),
        );
        const nang = VU.biCan.some((b) =>
          /chung thân|tử hình/i.test(`${b.mucHinhPhat} ${b.hinhPhatChinhST}`),
        );
        const ma =
          nang || namCaoNhat > 15
            ? "003"
            : namCaoNhat > 7
              ? "004"
              : namCaoNhat > 3
                ? "001"
                : "002";
        const mucDo = await chonSelect(page, oMucDo, TEN_MUC_DO[ma], {
          goDeLoc: false,
        });
        ghi(
          "phân loại tội phạm (suy từ mức hình phạt)",
          `${mucDo} — cao nhất ${namCaoNhat} năm${nang ? ", có chung thân/tử hình" : ""}`,
        );
      } else {
        expect(
          mucDoHienTai,
          "Không xác định được Phân loại tội phạm cho vụ án",
        ).toBeTruthy();
        ghi("phân loại tội phạm (có sẵn)", mucDoHienTai);
      }

      // Bắt buộc từ bản FE hiện hành: "Vui lòng thêm ít nhất 1 địa điểm xảy ra vụ án" (đo đào tạo 15/10/2026).
      // Dòng nhập nằm trong bảng; cách điền lấy từ flows/hinh-su/flow-001-so-tham/tao-vu-an.flow.ts (themDiaDiemXayRa).
      {
        const DIA_DIEM = [
          'Số 12 ngõ 45 phố Hoàng Cầu', 'Khu tập thể Thành Công, nhà C5', 'Bãi đất trống cạnh đê sông Hồng, thôn Bãi',
          'Quán nước ven đường Phạm Văn Đồng', 'Nhà trọ số 7 ngách 18 ngõ 102 Trường Chinh', 'Ngã ba đường Láng – Nguyễn Chí Thanh',
        ];
        const idx = Number(VU.maVuAn.replace(/\D/g, '')) || 0;
        const diaDiem = `${DIA_DIEM[idx % DIA_DIEM.length]}, Hà Nội`;
        const bangDd = page.locator('.ant-table-row').filter({ hasText: DIA_DIEM[idx % DIA_DIEM.length] });
        const nutThemDd = page.getByRole('button', { name: /Thêm địa điểm xảy ra/i }).first();
        if (!(await bangDd.count()) && (await nutThemDd.isVisible().catch(() => false))) {
          await nutThemDd.click();
          await choHetSpin(page);
          const dongDd = page.locator('tr.ant-table-row').filter({ has: page.getByRole('textbox', { name: 'Địa điểm chi tiết' }) }).last();
          for (const [ten, giaTri] of [
            ['Giờ xảy ra', `${String(19 + (idx % 4)).padStart(2, '0')}:30`],
            ['Ngày xảy ra', congNgay(VU.ngayThuLyST, -120)],
            ['Địa điểm chi tiết', diaDiem],
          ] as [string, string][]) {
            const o = dongDd.getByRole('textbox', { name: ten }).first();
            await go(o, giaTri);
            if (/Giờ|Ngày/.test(ten)) {
              await o.press('Enter');
              await expect(page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')).toHaveCount(0, { timeout: 10_000 });
            }
          }
          // Combobox gộp Quốc gia / Tỉnh / Phường
          const oDc = dongDd.locator('[role="combobox"]').first();
          if (await oDc.isVisible().catch(() => false)) {
            const daChon = await dienTrongO(page, dongDd.locator('td').filter({ has: oDc }).first(), 'Quốc gia / Tỉnh/Thành phố / Phường/Xã', 'Hà Nội').catch(
              async (e: Error) => {
                await page.keyboard.press('Escape').catch(() => {});
                return `(không chọn được: ${e.message.slice(0, 80)})`;
              },
            );
            ghi('địa điểm xảy ra · địa chỉ', String(daChon));
          }
          await dongDd.locator('button:has(img[aria-label="save"]), button:has(.anticon-save)').first().click();
          await choHetSpin(page);
          await expect
            .poll(() => bangDd.count(), { message: `Lưu địa điểm nhưng bảng không có dòng "${diaDiem}"`, timeout: 20_000, intervals: [1500] })
            .toBeGreaterThan(0);
          ghi('địa điểm xảy ra', diaDiem);
        }
      }

      // Đào tạo 15/10/2026: form nạp lại sau khi tải danh sách bị can → ô "Phân loại tội phạm" đọc được
      // giá trị lúc đầu nhưng bị xoá trước khi Lưu (ảnh lỗi: ô trống, không toast). Kiểm lại ngay trước khi Lưu.
      await page.waitForTimeout(1_500);
      for (let lan = 0; lan < 3; lan++) {
        const conLai = (
          await khungMucDo.locator(".ant-select-selection-item").first().innerText().catch(() => "")
        ).trim();
        if (conLai && !/Chưa xác định/.test(conLai)) break;
        const chon = await chonSelect(page, oMucDo, TEN_MUC_DO[maCaoNhat || "003"], { goDeLoc: false });
        ghi("phân loại tội phạm (chọn lại vì form xoá)", chon);
        await page.waitForTimeout(1_000);
      }

      await page.getByRole("button", { name: /^Lưu$/ }).last().click();
      await toastDaHien(
        page,
        /thành công/i,
        60_000,
        /lỗi|thất bại|không thành công|vui lòng/i,
      );
      await choHetSpin(page);
      const dsBiCan = await apiGet(
        page,
        `doi-tuong/bi-can?idVuAn=${tt.idVuAn}`,
      );
      const ten = (dsBiCan?.data?.data || []).map((x: any) => x.hoTen);
      ghi("bị can trên hệ thống", ten.join("; "));
      expect(
        ten.length,
        "Số bị can trên hệ thống khác số bị can trong dữ liệu",
      ).toBe(VU.biCan.length);
      ghiTrangThai(VU, { xong: "luuVuAn" });
      await context.close();
    });

    test("B7 · Tab Thụ lý: thụ lý vụ án theo Ngày thụ lý ST", async ({
      browser,
    }, testInfo) => {
      test.skip(
        !choPhepGhiTKM(),
        `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
      );
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tt = trangThai(VU);
      expect(tt.daXong, "Chưa lưu thông tin vụ án (chạy B6 trước)").toContain(
        "luuVuAn",
      );
      if (tt.soThuLy) {
        ghi("bỏ qua", `Vụ án ${tt.maVuAn} đã thụ lý số ${tt.soThuLy}`);
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_CAN_BO,
      );
      await moTabVuAn(page, tt.idVuAn!, "Thụ lý");

      await page
        .getByRole("button", { name: /^(file-done )?Thụ lý$/ })
        .first()
        .click();
      const modal = page
        .locator(".ant-modal")
        .filter({ has: page.getByRole("button", { name: /Xác nhận thụ lý/ }) })
        .last();
      await expect(modal, "Không mở được popup Thụ lý").toBeVisible({
        timeout: 30_000,
      });
      await choHetSpin(page);
      await nghi(page, 800, 1200);
      await chonNgay(modal.getByLabel("Ngày thụ lý"), VU.ngayThuLyST);
      await choHetSpin(page);
      await nghi(page, 1500, 2000);
      // Hệ thống cấp số theo ngày thụ lý
      const soThuLy = await modal.getByLabel("Số thụ lý").inputValue();
      ghi(
        "ngày thụ lý",
        `${VU.ngayThuLyST} · số thụ lý ${soThuLy || "(hệ thống tự cấp)"}`,
      );
      await modal.getByRole("button", { name: /Xác nhận thụ lý/ }).click();
      await toastDaHien(
        page,
        /thành công/i,
        60_000,
        /lỗi|thất bại|không thành công|vui lòng/i,
      );
      await expect(modal).toBeHidden({ timeout: 30_000 });
      ghiTrangThai(VU, { soThuLy: soThuLy || "da-thu-ly", xong: "thuLy" });
      ghi("mã vụ án (lưu để tìm kiếm)", tt.maVuAn || "");
      await context.close();
    });

    for (const pc of [
      {
        khoa: "phanCongThamPhan",
        menu: "Phân công Thẩm phán",
        vaiTro: "Thẩm phán chủ tọa",
        nguoi: NGUOI_KY_PHAN_CONG,
        ngay: 2,
      },
      {
        khoa: "phanCongHoiTham",
        menu: "Phân công Hội thẩm",
        vaiTro: "Hội thẩm nhân dân",
        nguoi: "",
        ngay: 3,
      },
    ] as const) {
      test(`B8 · Tab Phân công: ${pc.menu} → Lưu → Trình ký → Gửi`, async ({
        browser,
      }, testInfo) => {
        test.skip(
          !choPhepGhiTKM(),
          `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
        );
        testInfo.setTimeout(8 * 60_000);
        const ghi = (type: string, description: string) =>
          (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
        const tt = trangThai(VU);
        expect(tt.daXong, "Chưa thụ lý (chạy B7 trước)").toContain("thuLy");
        if (tt.daXong?.includes(pc.khoa)) {
          ghi(
            "bỏ qua",
            `Vụ án ${tt.maVuAn} đã ${pc.menu.toLowerCase()} và trình ký`,
          );
          return;
        }
        const { page, context } = await moTrangVaiCauHinh(
          browser,
          testInfo,
          VAI_CAN_BO,
        );
        await moTabVuAn(page, tt.idVuAn!, "Phân công");

        // Vụ án đã có quyết định phân công cho vai trò này (do lần chạy trước, hoặc do người khác
        // lập) thì dừng lại. Thiếu chỗ này, mỗi lần chạy lại đều lập thêm một quyết định nữa và để
        // lại rác trên hệ thống.
        const daCoQd = page
          .locator(".ant-table-row")
          .filter({ hasText: pc.vaiTro })
          .filter({ hasText: /Chờ ký|Đã ký/ });
        if (await daCoQd.count()) {
          ghi(
            "bỏ qua",
            `Vụ án ${tt.maVuAn} đã có quyết định ${pc.vaiTro}: ${(await daCoQd.first().innerText()).replace(/\s+/g, " ").trim()}`,
          );
          ghiTrangThai(VU, { xong: pc.khoa });
          await context.close();
          return;
        }

        const tieuDe = page
          .getByText("Danh sách quyết định phân công", { exact: true })
          .first();
        const nutPhanCong = page
          .getByRole("button", { name: /^(user )?Phân công$/ })
          .first();
        if (!(await nutPhanCong.isVisible())) await tieuDe.click();
        await nutPhanCong.click();
        await page
          .getByRole("menuitem", { name: new RegExp(`${pc.menu}$`) })
          .first()
          .click();

        const modal = page
          .locator(".ant-modal")
          .filter({ hasText: pc.menu })
          .filter({ has: page.locator("#bieuMau001_noiDung_vaiTro") })
          .last();
        await expect(modal, `Không mở được popup ${pc.menu}`).toBeVisible({
          timeout: 30_000,
        });
        await choHetSpin(page);
        await nghi(page, 800, 1200);

        // Ngày/số quyết định "tùy ý": vài ngày sau ngày thụ lý; ô số chỉ nhập phần đầu, hậu tố "/<năm>/QĐ-TA" hệ thống tự gắn
        const ngayQd = congNgay(VU.ngayThuLyST, pc.ngay);
        await chonNgay(modal.locator("#bieuMau001_ngayQuyetDinh"), ngayQd);
        // Lịch vẫn mở sau Enter → bấm ra tiêu đề popup để đóng
        await modal.getByText(pc.menu, { exact: true }).first().click();
        await expect(
          page.locator(".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)"),
        ).toHaveCount(0, { timeout: 10_000 });
        const oSo = modal.getByPlaceholder("Nhập số quyết định");
        await go(oSo, String(soTheoVuAn(VU, pc.ngay)));
        const hauTo = (
          await oSo
            .locator(
              'xpath=ancestor::*[contains(@class,"ant-input-group-wrapper")][1]',
            )
            .innerText()
            .catch(() => "")
        ).trim();
        let soQd = `${await oSo.inputValue()}${hauTo}`;
        await chonSelect(
          page,
          modal.locator("#bieuMau001_noiDung_MA_NGUOI_KY"),
          NGUOI_KY_PHAN_CONG,
        );
        const vaiTro = await chonSelect(
          page,
          modal.locator("#bieuMau001_noiDung_vaiTro"),
          pc.vaiTro,
        );
        const nguoi = pc.nguoi
          ? await chonSelect(
              page,
              modal.locator("#bieuMau001_noiDung_nguoiDuocPC"),
              pc.nguoi,
            )
          : await chonSelect(
              page,
              modal.locator("#bieuMau001_noiDung_nguoiDuocPC"),
            );
        await modal.locator("button:has(.anticon-arrow-down)").first().click();
        // Nhãn mục chọn dạng "Họ tên - ngày sinh - chức danh", bảng chỉ hiện họ tên
        const tenNguoi = nguoi.split(" - ")[0].trim();
        await expect(
          modal.locator(".ant-table-row").filter({ hasText: tenNguoi }).first(),
          "Chưa thêm người được phân công vào danh sách",
        ).toBeVisible({ timeout: 15_000 });
        ghi(
          "quyết định",
          `${soQd} ngày ${ngayQd} · người ký ${NGUOI_KY_PHAN_CONG} · ${vaiTro}: ${nguoi}`,
        );

        // Số quyết định suy từ số dòng Excel, mà STG dùng chung với vụ do người khác tạo nên có thể
        // trùng. Hệ thống báo "Số được cấp đã tồn tại, vui lòng cấp lại số khác" → đổi số rồi Lưu lại,
        // đúng như thao tác tay. Mọi lỗi khác vẫn ném ra ngay.
        const luu = async () => {
          await modal.getByRole("button", { name: /Lưu$/ }).last().click();
          // truocMs = 0: chỉ xét toast SAU lần bấm này — mặc định nhận cả toast 5 s trước, nên toast
          // "đã tồn tại" của lần thử trước làm lần lưu thành công bị coi là trùng (đào tạo 15/10/2026: lưu
          // được 9159 nhưng vẫn đổi số thêm 3 lần)
          return toastDaHien(
            page,
            /thành công/i,
            60_000,
            /lỗi|thất bại|không thành công|vui lòng/i,
            0,
          ).then(
            () => true,
            (e: Error) => {
              if (!/đã tồn tại/i.test(e.message)) throw e;
              return false;
            },
          );
        };
        let daLuu = await luu();
        // Dải theo số dòng Excel đụng nhiều số đã có sẵn trên STG (VA024 trùng cả 5 lần) → nhảy sang
        // dải cao, mỗi lần một bước lớn để thoát hẳn vùng số người khác đã dùng
        for (let lan = 1; !daLuu && lan <= 8; lan++) {
          await go(oSo, String(9000 + soTheoVuAn(VU, pc.ngay) + lan * 137));
          soQd = `${await oSo.inputValue()}${hauTo}`;
          ghi("số quyết định trùng", `đổi sang ${soQd} (lần ${lan})`);
          daLuu = await luu();
        }
        expect(
          daLuu,
          `Số quyết định vẫn trùng sau 8 lần đổi số (vụ ${VU.maVuAn})`,
        ).toBe(true);
        await choHetSpin(page);
        await trinhKy(page, testInfo);
        // Bảng hiển thị số quyết định có thể khác chuỗi ghép ở ô nhập (hậu tố do hệ thống gắn) →
        // dóng theo phần số, vẫn đủ chặt để biết đúng quyết định vừa lập
        const soChinh = soQd.split("/")[0].trim();
        const dongQd = page
          .locator(".ant-table-row")
          .filter({ hasText: new RegExp(`(^|\\D)${soChinh}(\\D|$)`) })
          .first();
        const daChoKy = await dongQd
          .filter({ hasText: /Chờ ký/ })
          .first()
          .waitFor({ state: "visible", timeout: 60_000 })
          .then(
            () => true,
            () => false,
          );
        if (!daChoKy) {
          const dsDong = (
            await page.locator(".ant-table-row").allInnerTexts()
          ).map((s) => s.replace(/\s+/g, " ").trim().slice(0, 90));
          throw new Error(
            `Quyết định ${soQd} chưa ở trạng thái Chờ ký. Các dòng đang có: ${dsDong.join(" || ") || "(không có dòng nào)"}`,
          );
        }
        ghiTrangThai(VU, { xong: pc.khoa });
        await context.close();
      });
    }

    test("B9 · Nguyễn Mậu Trường: Phê duyệt đề xuất › Chờ duyệt › ký logic 2 quyết định phân công", async ({
      browser,
    }, testInfo) => {
      test.skip(
        !choPhepGhiTKM(),
        `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
      );
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tt = trangThai(VU);
      expect(tt.daXong, "Chưa trình ký phân công (chạy B8 trước)").toEqual(
        expect.arrayContaining(["phanCongThamPhan", "phanCongHoiTham"]),
      );
      if (tt.daXong?.includes("kyPhanCong")) {
        ghi("bỏ qua", `Vụ án ${tt.maVuAn} đã ký logic quyết định phân công`);
        return;
      }
      ghi(
        "tài khoản",
        `${taiKhoan(VAI_LANH_DAO).cccd} (${taiKhoan(VAI_LANH_DAO).ten})`,
      );
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_LANH_DAO,
      );

      // Mỗi loại có thể còn nhiều quyết định đang chờ duyệt (lần chạy trước lập dư) → ký cho hết,
      // không thì phép kiểm "không còn quyết định chờ duyệt" ở cuối không bao giờ đạt
      for (const loai of ["Phân công Thẩm phán", "Phân công Hội thẩm"]) {
        for (let lan = 0; lan < 8; lan++) {
          await page.goto("lanh-dao/phe-duyet-de-xuat/danh-sach");
          await page
            .waitForLoadState("networkidle", { timeout: 60_000 })
            .catch(() => {});
          await choHetSpin(page, 60_000);
          await page
            .getByRole("tab", { name: /^Chờ duyệt/ })
            .first()
            .click();
          await page
            .waitForLoadState("networkidle", { timeout: 30_000 })
            .catch(() => {});
          await choHetSpin(page);
          const dong = page
            .locator(".ant-table-row")
            .filter({ hasText: `Vụ án ${tt.tenBiCan} -` })
            .filter({ hasText: loai })
            .first();
          if (
            !(await dong.waitFor({ state: "visible", timeout: 20_000 }).then(
              () => true,
              () => false,
            ))
          ) {
            if (lan === 0)
              ghi(loai, "không còn ở tab Chờ duyệt (đã ký từ lần chạy trước)");
            break;
          }
          await dong
            .locator('a, .ant-typography-link, [class*="link"]')
            .first()
            .click();
          await page.waitForURL(/y-kien-lanh-dao/, { timeout: 60_000 });
          await expect(
            page.getByText("Ký số văn bản").first(),
            "Không mở được màn Ký số văn bản",
          ).toBeVisible({ timeout: 60_000 });
          await choHetSpin(page, 60_000);
          await nghi(page, 1500, 2000);

          const choApi = page
            .waitForResponse(
              (r) =>
                r.request().method() === "POST" &&
                /phe-duyet-de-xuat/.test(r.url()),
              { timeout: 90_000 },
            )
            .catch(() => null);
          await page
            .getByRole("button", { name: /Ký logic$/ })
            .first()
            .click();
          const xacNhan = page
            .locator(".ant-modal")
            .filter({
              has: page.getByRole("button", {
                name: /^(Đồng ý|Xác nhận|Ký|Ký logic)$/,
              }),
            })
            .last();
          if (
            await xacNhan.waitFor({ state: "visible", timeout: 5_000 }).then(
              () => true,
              () => false,
            )
          ) {
            await xacNhan
              .getByRole("button", { name: /^(Đồng ý|Xác nhận|Ký|Ký logic)$/ })
              .last()
              .click();
          }
          const res = await choApi;
          expect(
            res,
            `Không thấy API ký được gọi khi Ký logic "${loai}"`,
          ).toBeTruthy();
          const kq = await res!.json().catch(() => ({ success: res!.ok() }));
          expect(
            kq?.success,
            `Ký logic "${loai}" lỗi: ${kq?.message || res!.status()}`,
          ).not.toBe(false);
          ghi(
            loai,
            `đã ký logic (${new URL(res!.url()).pathname.split("/").pop()})`,
          );
          await nghi(page, 1500, 2000);
        }
      }

      // Kiểm chứng: không còn quyết định phân công nào của vụ này ở tab Chờ duyệt
      await page.goto("lanh-dao/phe-duyet-de-xuat/danh-sach");
      await page
        .waitForLoadState("networkidle", { timeout: 60_000 })
        .catch(() => {});
      await page
        .getByRole("tab", { name: /^Chờ duyệt/ })
        .first()
        .click();
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
      await choHetSpin(page);
      await expect(
        page
          .locator(".ant-table-row")
          .filter({ hasText: `Vụ án ${tt.tenBiCan} -` })
          .filter({ hasText: /Phân công/ }),
        "Vẫn còn quyết định phân công chờ duyệt",
      ).toHaveCount(0, {
        timeout: 30_000,
      });
      ghiTrangThai(VU, { xong: "kyPhanCong" });
      await context.close();
    });

    test("B10 · Tìm vụ án › Quyết định đưa vụ án ra xét xử → lịch xét xử → Lưu → Trình ký", async ({
      browser,
    }, testInfo) => {
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tt = trangThai(VU);
      expect(tt.daXong, "Chưa ký logic phân công (chạy B9 trước)").toContain(
        "kyPhanCong",
      );
      // Thiếu guard này thì chạy lại sẽ lập quyết định lần hai và hỏng, chặn luôn B11–B13 phía sau
      if (tt.daXong?.includes("quyetDinhXetXu")) {
        ghi(
          "bỏ qua",
          `Vụ án ${tt.maVuAn} đã có quyết định đưa vụ án ra xét xử`,
        );
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_CAN_BO,
      );

      // Bước 6: Danh sách vụ án sơ thẩm › tìm theo mã vụ án đã lưu › mở vụ án
      await page.goto("vu-an/so-tham/danh-sach");
      await page
        .waitForLoadState("networkidle", { timeout: 60_000 })
        .catch(() => {});
      await choHetSpin(page, 60_000);
      const oTim = page
        .getByPlaceholder(/tìm kiếm|từ khóa|từ khoá|mã vụ án/i)
        .first();
      await go(oTim, tt.maVuAn!);
      await oTim.press("Enter");
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
      await choHetSpin(page);
      const dong = page
        .locator(".ant-table-row")
        .filter({ hasText: tt.maVuAn! })
        .first();
      await expect(dong, `Không tìm thấy vụ án ${tt.maVuAn}`).toBeVisible({
        timeout: 60_000,
      });
      ghi(
        "tìm thấy",
        (await dong.innerText()).replace(/\s+/g, " ").slice(0, 200),
      );
      // Cả dòng là vùng bấm (không có link riêng)
      await dong.locator("td").nth(1).click();
      await page.waitForURL(/so-tham\/chi-tiet\?id=/, { timeout: 60_000 });
      expect(new URL(page.url()).searchParams.get("id"), "Mở nhầm vụ án").toBe(
        tt.idVuAn,
      );
      await choHetSpin(page, 60_000);

      // Bước 7: tab Chuẩn bị xét xử › Quyết định tố tụng › Quyết định đưa vụ án ra xét xử
      await page
        .getByRole("tab", { name: /(^|\s)Chuẩn bị xét xử\s*$/i })
        .first()
        .click();
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
      await choHetSpin(page);
      const nutQd = page
        .getByRole("button", { name: /Quyết định đưa vụ án ra xét xử$/ })
        .first();
      if (!(await nutQd.isVisible()))
        await page
          .getByText("Quyết định tố tụng", { exact: true })
          .first()
          .click();
      await nutQd.click();
      const modal = page
        .locator(".ant-modal")
        .filter({ hasText: /Quyết định đưa vụ án ra xét xử sơ thẩm/ })
        .last();
      await expect(
        modal,
        "Không mở được popup Quyết định đưa vụ án ra xét xử sơ thẩm",
      ).toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);
      await nghi(page, 1000, 1500);

      // 7.1 Ngày quyết định: trước "Ngày kết quả" (sheet 03); 7.2 Số quyết định tùy ý
      const ngayKetQua = VU.ngayKetQua || congNgay(VU.ngayThuLyST, 60);
      const ngayQd = congNgay(ngayKetQua, -10);
      // Hệ thống không cho xếp phiên vào Chủ nhật (hideSunday + disabledDate day()===0 trong
      // NgayGioXetXuFields), mà vài dòng Excel có "Ngày kết quả" rơi đúng Chủ nhật → lùi sang Thứ hai
      const [dKQ, mKQ, yKQ] = ngayKetQua.split("/").map(Number);
      const laChuNhat = new Date(yKQ, mKQ - 1, dKQ).getDay() === 0;
      const ngayLich = laChuNhat ? congNgay(ngayKetQua, 1) : ngayKetQua;
      if (laChuNhat)
        ghi(
          "lịch xét xử · dời ngày",
          `${ngayKetQua} là Chủ nhật, hệ thống không cho xếp phiên → ${ngayLich}`,
        );
      const oNgay = modal.getByLabel("Ngày quyết định").first();
      await chonNgay(oNgay, ngayQd);
      await modal.locator(".ant-modal-title").first().click();
      const oSo = modal.getByPlaceholder("Nhập số quyết định").first();
      await go(oSo, String(soTheoVuAn(VU, 7)));
      ghi(
        "quyết định",
        `số ${await oSo.inputValue()} ngày ${ngayQd} (ngày kết quả ${ngayKetQua})`,
      );

      // 7.3 · "Người ký/người phân công" chọn Nguyễn Mậu Trường
      // Chỉ lấy ô select thật; biểu mẫu còn có input ẩn "..._noiDung_NGUOI_KY" không nằm trong .ant-select
      const oNguoiKy = modal.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
      const khungCua = oNguoiKy.locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]',
      );
      if (
        (await oNguoiKy.count()) &&
        !(await khungCua.locator(".ant-select-selection-item").count())
      ) {
        const nguoiKy = await chonSelect(page, oNguoiKy, NGUOI_KY_PHAN_CONG);
        ghi("người ký", nguoiKy);
      }

      // 7.4 · Lịch xét xử: bảng lịch là bảng có cột "Ngày mở phiên tòa" (BieuMau020) — popup còn
      // nhiều bảng khác cũng chứa ngày, quét chung sẽ bắt nhầm dòng không phải lịch.
      // Muốn có lịch thì phải bấm "Chọn lịch xét xử" rồi điền, không xoá lịch cũ.
      const bangLich = modal
        .locator(".ant-table")
        .filter({ hasText: "Ngày mở phiên tòa" })
        .last();
      const dongLichCu = bangLich
        .locator(".ant-table-row")
        .filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ });

      if (!(await dongLichCu.filter({ hasText: ngayLich }).count())) {
        await modal
          .getByRole("button", { name: /(Chọn|Sửa) lịch xét xử/ })
          .first()
          .click();
        await choHetSpin(page);
        await nghi(page, 2000, 3000);
        const popupLich = page
          .locator(".ant-modal, .ant-drawer-open")
          .filter({ hasText: /lịch xét xử/i })
          .last();
        await expect(
          popupLich,
          "Không mở được màn chọn lịch xét xử",
        ).toBeVisible({ timeout: 60_000 });

        // 7.5 · Lịch mở ở tháng hiện tại → chuyển về đúng tháng của ngày xếp lịch rồi mới chọn ngày
        const [ngayKQ, thangKQ, namKQ] = ngayLich.split("/").map(Number);
        const tieuDe = popupLich.getByText(/Tháng \d+ Năm \d{4}/).first();
        for (let i = 0; i < 36; i++) {
          const t = (await tieuDe.innerText()).match(/Tháng (\d+) Năm (\d{4})/);
          if (!t)
            throw new Error(
              "Không đọc được tháng đang hiển thị trên lịch xét xử",
            );
          const lech = (namKQ - Number(t[2])) * 12 + (thangKQ - Number(t[1]));
          if (lech === 0) break;
          await popupLich
            .locator(
              lech < 0
                ? "button:has(.anticon-left)"
                : "button:has(.anticon-right)",
            )
            .first()
            .click();
          await nghi(page, 500, 900);
        }
        const t = (await tieuDe.innerText()).match(/Tháng (\d+) Năm (\d{4})/)!;
        expect(
          `${Number(t[1])}/${t[2]}`,
          "Lịch không chuyển được về tháng của Ngày kết quả",
        ).toBe(`${thangKQ}/${namKQ}`);

        // Lịch là react-big-calendar. Popup "Thêm lịch xét xử" mở qua onSelectSlot — tức bấm vào
        // NỀN ô ngày (.rbc-day-bg). Số ngày chỉ là link drill-down, bấm vào đó không mở popup.
        // Ô nền không mang ngày, nên dóng theo vị trí cột của ô số trong cùng hàng tháng.
        const bamVaoNenNgay = async () => {
          const hangs = popupLich.locator(".rbc-month-row");
          for (let r = 0; r < (await hangs.count()); r++) {
            const hang = hangs.nth(r);
            const oSo = hang.locator(".rbc-date-cell");
            for (let c = 0; c < (await oSo.count()); c++) {
              const o = oSo.nth(c);
              if (Number((await o.innerText()).trim()) !== ngayKQ) continue;
              // Ô của tháng khác (mờ) mang cùng số ngày → bỏ qua
              if ((await o.getAttribute("class"))?.includes("rbc-off-range"))
                continue;
              const cot = await o.evaluate((e) =>
                [...(e.parentElement?.children || [])].indexOf(e),
              );
              // Ô nền bị .lich-date-cell-wrapper (dateCellWrapper) phủ lên → bấm vào chính lớp phủ
              await hang.locator(".rbc-row-bg > *").nth(cot).click();
              return true;
            }
          }
          return false;
        };
        expect(
          await bamVaoNenNgay(),
          `Không thấy ngày ${ngayLich} trên lịch`,
        ).toBe(true);
        await choHetSpin(page);
        await nghi(page, 2000, 3000);

        // 7.6–7.8 · popup "Thêm lịch xét xử": tích "Cả ngày", tính chất + địa điểm, rồi "Tạo mới".
        // Popup này được ấn định z-index 1500 để nổi trên picker (LichXetXuPickerModal) nên KHÔNG
        // nằm cuối DOM — neo theo tiêu đề của chính nó, .last() sẽ bắt trượt.
        const popupThem = page
          .locator(".ant-modal")
          .filter({
            has: page.locator(".ant-modal-title", {
              hasText: /Thêm lịch xét xử/i,
            }),
          })
          .last();
        await expect(
          popupThem.locator("#caNgay"),
          'Không mở được popup "Thêm lịch xét xử"',
        ).toBeVisible({ timeout: 60_000 });
        const oCaNgay = popupThem.locator("#caNgay");
        if (!(await oCaNgay.isChecked())) await oCaNgay.check({ force: true });
        await expect(oCaNgay, 'Không tích được "Cả ngày"').toBeChecked({
          timeout: 10_000,
        });
        await nghi(page, 600, 1000);

        for (const id of ["#hinhThucXetXu", "#tinhChat", "#idPhongXetXu"]) {
          const o = popupThem.locator(id);
          if (!(await o.count())) continue;
          const khung = o.locator(
            'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]',
          );
          if (await khung.locator(".ant-select-selection-item").count())
            continue;
          const daChon = await chonSelect(page, o, undefined, {
            goDeLoc: false,
          }).catch(() => "");
          if (daChon) ghi(`lịch xét xử · ${id.slice(1)}`, daChon);
          await choHetSpin(page);
        }

        // "Địa điểm xét xử (chi tiết)" là ô chữ bắt buộc, chỉ hiện với một số địa điểm
        // (LichXetXuTrucTiepForm) — bỏ trống thì form chặn Tạo mới
        const oDiaDiem = popupThem.locator("#diaDiemChiTiet");
        if (
          (await oDiaDiem.count()) &&
          !(await oDiaDiem.inputValue().catch(() => "x"))
        ) {
          await go(oDiaDiem, "Trụ sở Tòa án");
          ghi("lịch xét xử · diaDiemChiTiet", "Trụ sở Tòa án");
        }

        await popupThem
          .getByRole("button", { name: /^Tạo mới$/ })
          .first()
          .click();
        await choHetSpin(page);
        await nghi(page, 1500, 2500);

        // Lịch trùng phòng xét xử hoặc trùng thành viên HĐXX với vụ khác → hệ thống hỏi xác nhận
        // ("Đồng ý"/"Hủy"), chưa trả lời thì không lưu và cũng không báo lỗi gì (LichXetXuModal).
        const hopTrung = page
          .locator(".ant-modal-confirm")
          .filter({ hasText: /đang trùng/i })
          .last();
        if (await hopTrung.isVisible().catch(() => false)) {
          ghi(
            "lịch xét xử · trùng",
            (
              await hopTrung
                .locator(".ant-modal-confirm-title")
                .innerText()
                .catch(() => "")
            ).trim(),
          );
          await hopTrung
            .getByRole("button", { name: /^Đồng ý$/ })
            .last()
            .click();
          await choHetSpin(page);
          await nghi(page, 1500, 2500);
        }
        // Form còn mở nghĩa là hệ thống từ chối tạo lịch → nêu đúng lý do (thiếu trường bắt buộc,
        // trùng phòng…). Bám vào ô "Cả ngày" của chính form.
        const daDongLich = await popupThem
          .locator("#caNgay")
          .waitFor({ state: "hidden", timeout: 30_000 })
          .then(
            () => true,
            () => false,
          );
        if (!daDongLich)
          throw new Error(
            `Không tạo được lịch xét xử ngày ${ngayLich} — ${await nguyenNhanLoi(page, popupThem)}`,
          );
      }

      // Lịch phải nằm đúng ngày kết quả thì mới đi tiếp — xét đúng bảng lịch, không phải bảng khác
      // trong popup cũng có ngày
      await expect(
        dongLichCu.filter({ hasText: ngayLich }).first(),
        `Lịch xét xử chưa được tạo đúng ngày ${ngayLich}`,
      ).toBeVisible({ timeout: 60_000 });
      ghi("lịch xét xử", `phiên toà ngày ${ngayKetQua}, cả ngày`);

      // 7.9 · "Lưu" → "Trình ký" → Gửi → Đóng
      // Số trùng ("Số được cấp đã tồn tại") → đổi số rồi Lưu lại như thao tác tay (giống B8);
      // truocMs = 0 để không đọc nhầm toast của lần thử trước
      for (let lan = 0; ; lan++) {
        await modal.getByRole("button", { name: /^Lưu$/ }).first().click();
        const ok = await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi/i, 0).then(
          () => true,
          (e: Error) => {
            if (!/đã tồn tại/i.test(e.message) || lan >= 8) throw e;
            return false;
          },
        );
        if (ok) break;
        await go(oSo, String(9000 + soTheoVuAn(VU, 7) + (lan + 1) * 137));
        ghi("số quyết định xét xử trùng", `đổi sang ${await oSo.inputValue()} (lần ${lan + 1})`);
      }
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      await trinhKy(page, testInfo);
      ghiTrangThai(VU, {
        soQuyetDinhXetXu: String(soTheoVuAn(VU, 7)),
        xong: "quyetDinhXetXu",
      });
      await context.close();
    });

    // Bước 8 tài liệu: Nguyễn Mậu Trường ký logic Quyết định đưa vụ án ra xét xử vừa trình ký
    test("B11 · Nguyễn Mậu Trường: ký logic Quyết định đưa vụ án ra xét xử sơ thẩm", async ({
      browser,
    }, testInfo) => {
      test.skip(
        !choPhepGhiTKM(),
        `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
      );
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tt = trangThai(VU);
      expect(
        tt.daXong,
        "Chưa trình ký quyết định đưa vụ án ra xét xử (chạy B10 trước)",
      ).toContain("quyetDinhXetXu");
      if (tt.daXong?.includes("kyQuyetDinhXetXu")) {
        ghi(
          "bỏ qua",
          `Vụ án ${tt.maVuAn} đã ký logic quyết định đưa vụ án ra xét xử`,
        );
        return;
      }
      ghi(
        "tài khoản",
        `${taiKhoan(VAI_LANH_DAO).cccd} (${taiKhoan(VAI_LANH_DAO).ten})`,
      );
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_LANH_DAO,
      );

      await page.goto("lanh-dao/phe-duyet-de-xuat/danh-sach");
      await page
        .waitForLoadState("networkidle", { timeout: 60_000 })
        .catch(() => {});
      await choHetSpin(page, 60_000);
      await page
        .getByRole("tab", { name: /^Chờ duyệt/ })
        .first()
        .click();
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
      await choHetSpin(page);

      const dong = page
        .locator(".ant-table-row")
        .filter({ hasText: `Vụ án ${tt.tenBiCan} -` })
        .filter({ hasText: /đưa vụ án ra xét xử/i })
        .first();
      await expect(
        dong,
        `Không thấy quyết định đưa vụ án ra xét xử của ${tt.maVuAn} ở tab Chờ duyệt`,
      ).toBeVisible({
        timeout: 60_000,
      });
      ghi(
        "bản ghi chờ duyệt",
        (await dong.innerText()).replace(/\s+/g, " ").slice(0, 200),
      );

      await dong
        .locator('a, .ant-typography-link, [class*="link"]')
        .first()
        .click();
      await page.waitForURL(/y-kien-lanh-dao/, { timeout: 60_000 });
      await expect(
        page.getByText("Ký số văn bản").first(),
        "Không mở được màn Ký số văn bản",
      ).toBeVisible({ timeout: 60_000 });
      await choHetSpin(page, 60_000);
      await nghi(page, 1500, 2000);

      const choApi = page
        .waitForResponse(
          (r) =>
            r.request().method() === "POST" &&
            /phe-duyet-de-xuat/.test(r.url()),
          { timeout: 90_000 },
        )
        .catch(() => null);
      await page
        .getByRole("button", { name: /Ký logic$/ })
        .first()
        .click();
      const xacNhan = page
        .locator(".ant-modal")
        .filter({
          has: page.getByRole("button", {
            name: /^(Đồng ý|Xác nhận|Ký|Ký logic)$/,
          }),
        })
        .last();
      if (
        await xacNhan.waitFor({ state: "visible", timeout: 5_000 }).then(
          () => true,
          () => false,
        )
      ) {
        await xacNhan
          .getByRole("button", { name: /^(Đồng ý|Xác nhận|Ký|Ký logic)$/ })
          .last()
          .click();
      }
      const res = await choApi;
      expect(
        res,
        "Không thấy API ký được gọi khi Ký logic quyết định đưa vụ án ra xét xử",
      ).toBeTruthy();
      const kq = await res!.json().catch(() => ({ success: res!.ok() }));
      expect(
        kq?.success,
        `Ký logic lỗi: ${kq?.message || res!.status()}`,
      ).not.toBe(false);
      await nghi(page, 1500, 2000);

      // Kiểm chứng: quyết định không còn ở tab Chờ duyệt
      await page.goto("lanh-dao/phe-duyet-de-xuat/danh-sach");
      await page
        .waitForLoadState("networkidle", { timeout: 60_000 })
        .catch(() => {});
      await page
        .getByRole("tab", { name: /^Chờ duyệt/ })
        .first()
        .click();
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
      await choHetSpin(page);
      await expect(
        page
          .locator(".ant-table-row")
          .filter({ hasText: `Vụ án ${tt.tenBiCan} -` })
          .filter({ hasText: /đưa vụ án ra xét xử/i }),
        "Vẫn còn quyết định đưa vụ án ra xét xử chờ duyệt",
      ).toHaveCount(0, { timeout: 30_000 });
      ghiTrangThai(VU, { xong: "kyQuyetDinhXetXu" });
      await context.close();
    });

    // Bước 9 + 10 tài liệu: tìm lại vụ án theo mã → tab Xét xử › Kết quả xét xử › Bản án › Tạo bản án
    test("B12 · Tạo bản án: ý kiến VKS, quyết định hình phạt, Lưu nháp, Trình ký", async ({
      browser,
    }, testInfo) => {
      test.skip(
        !choPhepGhiTKM(),
        `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
      );
      // Mỗi bị cáo phải mở 2 popup hình phạt (ý kiến VKS + Quyết định), thực đo ~4,5 phút/bị cáo →
      // ngân sách theo số bị cáo, vụ 4–5 bị cáo trước đây chạm trần 15 phút rồi bị đóng giữa chừng
      testInfo.setTimeout(Math.max(15, 10 * VU.biCan.length) * 60_000);
      const ghi = (type: string, description: string) => {
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
        console.log(`    · ${type}: ${description}`);
      };
      const tt = trangThai(VU);
      expect(
        tt.daXong,
        "Chưa ký quyết định đưa vụ án ra xét xử (chạy B11 trước)",
      ).toContain("kyQuyetDinhXetXu");
      // Cột "Kết quả sơ thẩm" khác XET_XU (chuyển hồ sơ, đình chỉ, tạm đình chỉ…) thì vụ án không
      // kết thúc bằng bản án — dựng bản án cho nó là ghi sai kết quả tố tụng
      test.skip(
        !!VU.ketQuaST && VU.ketQuaST !== "XET_XU",
        `Kết quả sơ thẩm là ${VU.ketQuaST}, vụ án không ra bản án`,
      );
      // Đã lập bản án rồi thì mục "Kết quả xét xử" hiện bản án đó chứ không còn thẻ chọn "Bản án"
      // → chạy lại sẽ chết ở chỗ tìm thẻ. B13 đã có chốt này, B12 thì chưa (mỗi vụ chỉ một bản án).
      test.skip(
        !!tt.daXong?.includes("banAn"),
        `Vụ án ${tt.maVuAn} đã có bản án ${tt.soBanAn || ""} từ lần chạy trước`,
      );
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_CAN_BO,
      );

      // Bước 9 · tìm vụ án theo mã đã lưu
      await page.goto("vu-an/so-tham/danh-sach");
      await page
        .waitForLoadState("networkidle", { timeout: 60_000 })
        .catch(() => {});
      await choHetSpin(page, 60_000);
      const oTim = page
        .getByPlaceholder(/tìm kiếm|từ khóa|từ khoá|mã vụ án/i)
        .first();
      await go(oTim, tt.maVuAn!);
      await oTim.press("Enter");
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
      await choHetSpin(page);
      const dong = page
        .locator(".ant-table-row")
        .filter({ hasText: tt.maVuAn! })
        .first();
      await expect(dong, `Không tìm thấy vụ án ${tt.maVuAn}`).toBeVisible({
        timeout: 60_000,
      });
      await dong.locator("td").nth(1).click();
      await page.waitForURL(/so-tham\/chi-tiet\?id=/, { timeout: 60_000 });
      expect(new URL(page.url()).searchParams.get("id"), "Mở nhầm vụ án").toBe(
        tt.idVuAn,
      );
      await choHetSpin(page, 60_000);

      const ngayKetQua = VU.ngayKetQua || congNgay(VU.ngayThuLyST, 120);
      const biCanDauVu = VU.biCan[0];

      // Bước 10 · tab Xét xử › Kết quả xét xử › Bản án › "Tạo bản án"
      // "Chuẩn bị xét xử" cũng kết thúc bằng "xét xử" → lọc tab có đúng chữ "Xét xử"
      await page
        .getByRole("tab")
        .filter({ hasText: /^\s*Xét xử\s*$/ })
        .first()
        .click();
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      // Liệt kê các mục trong tab Xét xử (mục 'Kết quả xét xử' đang thu gọn)
      const tieuDeMuc = await page
        .locator(".ant-collapse-header, .ant-pro-card-title, h4, h5")
        .evaluateAll((es) => [
          ...new Set(
            es
              .map((e) => (e.textContent || "").replace(/s+/g, " ").trim())
              .filter((t) => t && t.length < 60),
          ),
        ]);
      console.log("    · mục trong tab Xét xử:", tieuDeMuc.join(" | "));
      const mucKq = page
        .locator(".ant-collapse-header, .ant-pro-card-title, h4, h5")
        .filter({ hasText: /Kết quả xét xử/i })
        .first();
      if (await mucKq.count()) {
        await mucKq.scrollIntoViewIfNeeded();
        await mucKq.click();
        await choHetSpin(page);
        await nghi(page, 2000, 3000);
        // Cuộn hết mục để thấy phần 'Bản án' và nút 'Tạo bản án'
        await page.mouse.wheel(0, 2500);
        await nghi(page, 1200, 2000);
        await page.mouse.wheel(0, 2500);
        await nghi(page, 1200, 2000);
        // Chạy lại khi bản án đã tạo: "Dự thảo — chưa ký số" → mở "Chỉnh sửa dự thảo" để Lấy số + Trình ký;
        // đã Chờ ký / Đã ký → xong. Không tạo thêm bản án (đào tạo 15/10/2026: lần trước lưu nháp rồi hỏng ở trình ký)
        const dongBanAn = page.locator(".ant-table-row").filter({ hasText: /Bản án sơ thẩm/ }).first();
        if (await dongBanAn.count()) {
          const tt0 = (await dongBanAn.innerText()).replace(/\s+/g, " ");
          if (/Chờ ký|Đã ký|Có hiệu lực/i.test(tt0) && !/Dự thảo/i.test(tt0)) {
            ghi("bỏ qua", `bản án đã trình ký: ${tt0.slice(0, 160)}`);
            ghiTrangThai(VU, { xong: "banAn" });
            await context.close();
            return;
          }
          if (/Dự thảo/i.test(tt0)) {
            await dongBanAn.getByText(/Chỉnh sửa dự thảo/).first().click();
            await choHetSpin(page);
            await nghi(page, 2500, 3500);
            await hoanThienBanAn(page, VU, ghi);
            await laySoBanAn(page, ghi);
            await trinhKy(page, testInfo);
            ghi("bản án", "mở lại dự thảo → lấy số → trình ký");
            ghiTrangThai(VU, { xong: "banAn" });
            await context.close();
            return;
          }
        }
        // Mục 'Kết quả xét xử' có hai thẻ: 'Bản án' và 'Quyết định' → chọn 'Bản án'
        const theBanAn = page
          .getByText("Tòa xét xử xong nội dung vụ án", { exact: false })
          .first();
        await expect(
          theBanAn,
          "Không thấy thẻ 'Bản án' trong mục Kết quả xét xử",
        ).toBeVisible({ timeout: 30_000 });
        await theBanAn.click();
        await choHetSpin(page);
        await nghi(page, 2000, 3000);
        await page
          .getByRole("button", { name: /Tạo bản án$/ })
          .first()
          .click();
        await choHetSpin(page);
        await nghi(page, 2500, 3500);
        // Neo vào ô #ngayBanAn của chính popup "Thêm bản án": antd giữ modal đã đóng lại trong DOM,
        // nên .last() sau mỗi popup hình phạt sẽ trỏ vào modal vừa đóng và không thấy dòng nào.
        const pop = page
          .locator(".ant-modal, .ant-drawer-open")
          .filter({ has: page.locator("#ngayBanAn") })
          .last();
        await expect(
          pop.locator("#ngayBanAn"),
          'Không mở được popup "Thêm bản án"',
        ).toBeVisible({ timeout: 60_000 });

        // 10.1 · Ngày lấy số bản án = "Ngày kết quả" (sheet 03); người ký = Nguyễn Mậu Trường
        // Đào tạo 15/10/2026: ô ngày bản án KHOÁ, hệ thống tự điền theo lịch xét xử → không gõ đè
        const oNgayBA = pop.locator("#ngayBanAn");
        if (await oNgayBA.isEditable().catch(() => false)) await chonNgay(oNgayBA, ngayKetQua);
        else ghi("ngày bản án (hệ thống tự điền, ô khoá)", (await oNgayBA.inputValue().catch(() => "")) || "(trống)");
        const oNguoiKyBA = pop.locator("#nguoiKy");
        const khungNguoiKy = oNguoiKyBA.locator(
          'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]',
        );
        if (
          !(await khungNguoiKy.locator(".ant-select-selection-item").count())
        ) {
          await chonSelect(page, oNguoiKyBA, NGUOI_KY_PHAN_CONG);
        }
        ghi(
          "bản án",
          `ngày lấy số ${ngayKetQua}, người ký ${NGUOI_KY_PHAN_CONG}`,
        );

        // 10.2 · "Áp dụng án lệ": Có khi cột "Đặc điểm vụ án" (sheet 03) ghi Áp dụng án lệ
        const coAnLe = /áp dụng án lệ/i.test(VU.dacDiemVuAn);
        await pop
          .locator(".ant-radio-wrapper")
          .filter({
            hasText: new RegExp(`^\\s*${coAnLe ? "Có" : "Không"}\\s*$`),
          })
          .first()
          .click();
        ghi("áp dụng án lệ", coAnLe ? "Có" : "Không");
        await choHetSpin(page);
        await nghi(page, 800, 1400);

        // 10.3 · Nội dung vụ án
        const oNoiDung = pop.locator("#noiDungVuAn");
        if (!(await oNoiDung.inputValue().catch(() => ""))) {
          // Tóm tắt như phần "NỘI DUNG VỤ ÁN" của bản án thật (theo cáo trạng + diễn biến phiên tòa)
          const bcDau = VU.biCan[0];
          const maTuyND = /ma túy/i.test(VU.toiDanh);
          await oNoiDung.fill(
            maTuyND
              ? `Theo các tài liệu có trong hồ sơ vụ án và diễn biến tại phiên tòa, nội dung vụ án được tóm tắt như sau: Khoảng 20 giờ ngày ${congNgay(VU.ngayThuLyST, -125)}, tại khu vực đầu ngõ thuộc phường Hoàng Mai, thành phố Hà Nội, ` +
                  `Tổ công tác Phòng Cảnh sát điều tra tội phạm về ma túy Công an thành phố Hà Nội bắt quả tang ${bcDau.hoTen} đang giao cho người mua 02 bánh hêrôin và 01 túi ni lông chứa ma túy tổng hợp dạng tinh thể. ` +
                  `Khám xét khẩn cấp nơi ở của bị cáo thu giữ thêm 03 bánh hêrôin, cân điện tử và số tiền 85.000.000 đồng. Kết luận giám định xác định tổng khối lượng hêrôin là 1.742,6 gam, methamphetamine là 312,4 gam. ` +
                  `Bị cáo khai nhận mua số ma túy trên của một người không rõ lai lịch ở khu vực biên giới để bán lại kiếm lời. Cáo trạng của Viện kiểm sát nhân dân khu vực 9 - Hà Nội truy tố bị cáo về tội "Mua bán trái phép chất ma túy" theo điểm b khoản 4 Điều 251 Bộ luật Hình sự.`
              : `Theo các tài liệu có trong hồ sơ vụ án và diễn biến tại phiên tòa, nội dung vụ án được tóm tắt như sau: Giữa ${bcDau.hoTen} và anh Nguyễn Văn T (sinh năm 1985, cùng trú tại phường Hoàng Mai, thành phố Hà Nội) có mâu thuẫn từ việc vay mượn tiền. ` +
                  `Khoảng 21 giờ 30 phút ngày ${congNgay(VU.ngayThuLyST, -125)}, sau khi uống rượu, bị cáo mang theo con dao nhọn dài khoảng 30 cm đến nhà anh T đòi nợ; hai bên lời qua tiếng lại, bị cáo dùng dao đâm liên tiếp nhiều nhát vào vùng ngực, bụng anh T. ` +
                  `Anh T được đưa đi cấp cứu nhưng đã tử vong. Kết luận giám định pháp y xác định nguyên nhân chết do sốc mất máu cấp không hồi phục do vết thương thấu ngực đứt động mạch chủ. ` +
                  `Cáo trạng của Viện kiểm sát nhân dân khu vực 9 - Hà Nội truy tố bị cáo về tội "Giết người" theo điểm n khoản 1 Điều 123 Bộ luật Hình sự.`,
          );
          await oNoiDung.blur();
        }

        // Bị cáo bị trả hồ sơ / chuyển hồ sơ thì không có hình phạt nào để tuyên — đó là kết quả tố
        // tụng khác, không phải mức án. Ép nhập hình phạt cho họ là ghi sai dữ liệu.
        const coHinhPhat = VU.biCan.filter(
          (b) =>
            !/^(TRA_HO_SO|CHUYEN_HO_SO)$/i.test(
              (b.hinhPhatChinhST || "").trim(),
            ),
        );
        for (const bc of VU.biCan) {
          if (!coHinhPhat.includes(bc))
            ghi(
              "không nhập hình phạt",
              `${bc.hoTen}: ${bc.hinhPhatChinhST} — ${bc.mucHinhPhat}`,
            );
        }

        // 10.4–10.10 · Ý kiến VKS: mỗi bị cáo một dòng "Về tội danh và hình phạt" → Sửa → thêm hình phạt
        for (const bc of coHinhPhat) {
          await nhapHinhPhatChoBiCao(page, pop, VU, bc, "vks", ghi);
        }

        // 10.11–10.17 · mục "Quyết định" › "Quyết định hình phạt" cho từng bị cáo
        for (const bc of coHinhPhat) {
          await nhapHinhPhatChoBiCao(
            page,
            pop,
            VU,
            bc,
            "quyetDinh",
            ghi,
            ngayKetQua,
          );
        }

        // 10.18 · "Lưu nháp" rồi "Trình ký"
        await hoanThienBanAn(page, VU, ghi);
        await pop
          .getByRole("button", { name: /Lưu nháp$/ })
          .first()
          .click();
        await toastDaHien(
          page,
          /thành công|Đã lưu/i,
          90_000,
          /thất bại|Vui lòng|Không thể|lỗi/i,
        );
        await choHetSpin(page);
        await nghi(page, 2000, 3000);
        ghi("bản án", "đã lưu nháp");
        await laySoBanAn(page, ghi);
        await trinhKy(page, testInfo);
        ghiTrangThai(VU, { xong: "banAn" });
      }
      await context.close();
    });

    // Bước 11 tài liệu: Nguyễn Mậu Trường ký logic bản án vừa trình ký
    test("B13 · Nguyễn Mậu Trường: ký logic bản án sơ thẩm", async ({
      browser,
    }, testInfo) => {
      test.skip(
        !choPhepGhiTKM(),
        `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`,
      );
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) =>
        (console.log(`    · ${type}: ${description}`), testInfo.annotations.push({ type, description }));
      const tt = trangThai(VU);
      test.skip(
        !!VU.ketQuaST && VU.ketQuaST !== "XET_XU",
        `Kết quả sơ thẩm là ${VU.ketQuaST}, vụ án không ra bản án`,
      );
      expect(tt.daXong, "Chưa trình ký bản án (chạy B12 trước)").toContain(
        "banAn",
      );
      if (tt.daXong?.includes("kyBanAn")) {
        ghi("bỏ qua", `Vụ án ${tt.maVuAn} đã ký logic bản án`);
        return;
      }
      const { page, context } = await moTrangVaiCauHinh(
        browser,
        testInfo,
        VAI_LANH_DAO,
      );

      await page.goto("lanh-dao/phe-duyet-de-xuat/danh-sach");
      await page
        .waitForLoadState("networkidle", { timeout: 60_000 })
        .catch(() => {});
      await choHetSpin(page, 60_000);
      await page
        .getByRole("tab", { name: /^Chờ duyệt/ })
        .first()
        .click();
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
      await choHetSpin(page);

      const dong = page
        .locator(".ant-table-row")
        .filter({ hasText: `Vụ án ${tt.tenBiCan} -` })
        .filter({ hasText: /bản án/i })
        .first();
      await expect(
        dong,
        `Không thấy bản án của ${tt.maVuAn} ở tab Chờ duyệt`,
      ).toBeVisible({ timeout: 60_000 });
      await dong
        .locator('a, .ant-typography-link, [class*="link"]')
        .first()
        .click();
      await page.waitForURL(/y-kien-lanh-dao/, { timeout: 60_000 });
      await expect(
        page.getByText("Ký số văn bản").first(),
        "Không mở được màn Ký số văn bản",
      ).toBeVisible({ timeout: 60_000 });
      await choHetSpin(page, 60_000);
      await nghi(page, 1500, 2000);

      const choApi = page
        .waitForResponse(
          (r) =>
            r.request().method() === "POST" &&
            /phe-duyet-de-xuat/.test(r.url()),
          { timeout: 90_000 },
        )
        .catch(() => null);
      await page
        .getByRole("button", { name: /Ký logic$/ })
        .first()
        .click();
      const xacNhan = page
        .locator(".ant-modal")
        .filter({
          has: page.getByRole("button", {
            name: /^(Đồng ý|Xác nhận|Ký|Ký logic)$/,
          }),
        })
        .last();
      if (
        await xacNhan.waitFor({ state: "visible", timeout: 5_000 }).then(
          () => true,
          () => false,
        )
      ) {
        await xacNhan
          .getByRole("button", { name: /^(Đồng ý|Xác nhận|Ký|Ký logic)$/ })
          .last()
          .click();
      }
      const res = await choApi;
      expect(
        res,
        "Không thấy API ký được gọi khi Ký logic bản án",
      ).toBeTruthy();
      const kq = await res!.json().catch(() => ({ success: res!.ok() }));
      expect(
        kq?.success,
        `Ký logic bản án lỗi: ${kq?.message || res!.status()}`,
      ).not.toBe(false);
      ghiTrangThai(VU, { xong: "kyBanAn" });
      await context.close();
    });
  });
}

/**
 * Sau khi Lưu văn bản: "Trình ký" → popup "Nhập thông tin trình duyệt ký" → "Gửi" → "Đóng".
 * Gửi xong không có toast; kết quả kiểm ở nơi gọi (quyết định chuyển "Chờ ký").
 */
/**
 * Hoàn thiện bản án trước khi "Lưu" — FE chặn Lưu khi thiếu (đào tạo 15/10/2026, danhSachThieuKhiLuu.ts):
 *   - "Nhận định của Hội đồng xét xử" (field nhanDinh)
 *   - "Nơi nhận" (≥ 1 dòng, field noiNhan)
 *   - Thông tin bị cáo: Trình độ văn hóa, Tôn giáo, Họ tên cha/mẹ, Tiền án, Tiền sự, Nhân thân, Nơi sinh,
 *     Nơi cư trú (truongBatBuocBiCao.ts) → nạp qua nút "Nhập từ Excel" (CSV, khớp theo họ tên —
 *     KetQuaBanAn.tsx nhapExcelBiCao / nhapExcelBiCao.ts COT_IMPORT_BI_CAO)
 * Nội dung viết như bản án thật; mọi giá trị suy từ dữ liệu vụ (không ngẫu nhiên → chạy lại ra y nguyên).
 */
async function hoanThienBanAn(page: Page, vu: VuAnHinhSu, ghi: (type: string, description: string) => unknown) {
  const idx = Number(vu.maVuAn.replace(/\D/g, '')) || 1;
  const maTuy = /ma túy/i.test(vu.toiDanh);
  const bc = vu.biCan[0];
  const ho = bc.hoTen.split(' ')[0];

  // 1. Nhận định của Hội đồng xét xử
  const oNhanDinh = page.getByPlaceholder(/Nhận định của Hội đồng xét xử về từng vấn đề/).first();
  if (!(await oNhanDinh.isVisible().catch(() => false))) {
    await page.getByText('Nhận định của Hội đồng xét xử', { exact: true }).first().click().catch(() => {});
    await nghi(page, 600, 900);
  }
  if ((await oNhanDinh.isVisible().catch(() => false)) && !(await oNhanDinh.inputValue()).trim()) {
    const nhanDinh = maTuy
      ? `[1] Tại phiên tòa, bị cáo ${bc.hoTen} khai nhận toàn bộ hành vi phạm tội như cáo trạng đã truy tố. Lời khai của bị cáo phù hợp với biên bản bắt người phạm tội quả tang, kết luận giám định chất ma túy và các tài liệu, chứng cứ khác có trong hồ sơ vụ án. ` +
        `Đủ cơ sở kết luận bị cáo phạm tội "Mua bán trái phép chất ma túy" theo điểm b khoản 4 Điều 251 Bộ luật Hình sự. ` +
        `[2] Hành vi của bị cáo là đặc biệt nguy hiểm cho xã hội, khối lượng ma túy đặc biệt lớn, gây mất trật tự trị an tại địa phương; cần xử phạt nghiêm, loại bỏ vĩnh viễn bị cáo khỏi đời sống xã hội mới đủ tác dụng răn đe, phòng ngừa chung.`
      : `[1] Tại phiên tòa, bị cáo ${bc.hoTen} khai nhận: do mâu thuẫn từ trước, bị cáo đã dùng dao nhọn đâm nhiều nhát vào vùng ngực bị hại, hậu quả bị hại tử vong. Lời khai của bị cáo phù hợp với biên bản khám nghiệm hiện trường, kết luận giám định pháp y và lời khai người làm chứng. ` +
        `Đủ cơ sở kết luận bị cáo phạm tội "Giết người" với tình tiết định khung "có tính chất côn đồ" theo điểm n khoản 1 Điều 123 Bộ luật Hình sự. ` +
        `[2] Hành vi của bị cáo đặc biệt nghiêm trọng, xâm phạm tính mạng con người là khách thể được pháp luật bảo vệ đặc biệt; bị cáo không có tình tiết giảm nhẹ đáng kể, cần áp dụng hình phạt cao nhất mới đủ tác dụng giáo dục, phòng ngừa chung.`;
    await oNhanDinh.fill(nhanDinh);
    ghi('nhận định HĐXX', `${nhanDinh.slice(0, 90)}…`);
  }

  // 2. Nơi nhận — mỗi nơi một dòng
  const NOI_NHAN = [
    `Bị cáo ${bc.hoTen}`,
    'Viện kiểm sát nhân dân khu vực 9 - Hà Nội',
    'Cơ quan Cảnh sát điều tra Công an thành phố Hà Nội',
    'Trại tạm giam số 1 Công an thành phố Hà Nội',
    'Sở Tư pháp thành phố Hà Nội',
    'Lưu hồ sơ vụ án',
  ];
  const oNoiNhan = () => page.getByPlaceholder(/^Nơi nhận \d+$/);
  if ((await oNoiNhan().count()) && !(await oNoiNhan().first().inputValue()).trim()) {
    for (let i = 0; i < NOI_NHAN.length; i++) {
      if ((await oNoiNhan().count()) <= i) {
        await page.locator('button').filter({ hasText: /Thêm nơi nhận/ }).first().click();
        await nghi(page, 300, 500);
      }
      await oNoiNhan().nth(i).fill(NOI_NHAN[i]);
    }
    ghi('nơi nhận', NOI_NHAN.join(' · '));
  }

  // 3. Thông tin bị cáo qua CSV
  const NOI_SINH = ['Xã Mường Bon, Tỉnh Sơn La', 'Xã Tủa Chùa, Tỉnh Điện Biên', 'Phường Hồng Gai, Tỉnh Quảng Ninh', 'Xã Hải Hậu, Tỉnh Ninh Bình',
    'Phường Ngọc Hà, Thành phố Hà Nội', 'Xã Quỳnh Lưu, Tỉnh Nghệ An'];
  const NOI_CU_TRU = ['Phường Đống Đa, Thành phố Hà Nội', 'Phường Cầu Giấy, Thành phố Hà Nội', 'Phường Hoàng Mai, Thành phố Hà Nội',
    'Xã Sóc Sơn, Thành phố Hà Nội', 'Phường Long Biên, Thành phố Hà Nội', 'Phường Thanh Xuân, Thành phố Hà Nội'];
  const TEN = ['Hùng', 'Thịnh', 'Bảo', 'Quang', 'Đức', 'Tín', 'Hòa', 'Nghĩa'];
  const TEN_ME = ['Lan', 'Hoa', 'Mai', 'Hằng', 'Thu', 'Nga', 'Liên', 'Thơm'];
  const HO_ME = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ'];
  const taiPham = bc.dacDiemNhanThan.includes('tai_pham');
  const dong = {
    STT: '1',
    'Họ và tên': bc.hoTen,
    'Tên gọi khác': 'Không',
    'Sinh năm': String(bc.namSinh),
    'Nơi sinh': NOI_SINH[idx % NOI_SINH.length],
    'Nơi cư trú': NOI_CU_TRU[idx % NOI_CU_TRU.length],
    'Nghề nghiệp': bc.ngheNghiep || 'Lao động tự do',
    'Trình độ văn hóa': ['7/12', '9/12', '12/12'][idx % 3],
    'Dân tộc': bc.danToc || 'Kinh',
    'Giới tính': bc.gioiTinh || 'Nam',
    'Quốc tịch': bc.quocTich || 'Việt Nam',
    'Tôn giáo': 'Không',
    'Họ tên cha': `${ho} Văn ${TEN[idx % TEN.length]}`,
    'Họ tên mẹ': `${HO_ME[idx % HO_ME.length]} Thị ${TEN_ME[idx % TEN_ME.length]}`,
    'Tiền án': taiPham ? `01 tiền án: Bản án số ${40 + idx}/2019/HS-ST ngày 12/6/2019 xử phạt 03 năm tù về tội Cố ý gây thương tích, chưa được xóa án tích` : 'Không',
    'Tiền sự': 'Không',
    'Nhân thân': `Bị cáo bị bắt tạm giữ, tạm giam từ ngày ${congNgay(vu.ngayThuLyST, -110)}, hiện đang bị tạm giam tại Trại tạm giam số 1 Công an thành phố Hà Nội`,
  } as Record<string, string>;
  const boc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const cot = Object.keys(dong);
  const csv = '﻿' + [cot.map(boc).join(','), cot.map(c => boc(dong[c])).join(',')].join('\r\n');
  const tep = path.join(require('os').tmpdir(), `bi-cao-${vu.maVuAn}.csv`);
  fs.writeFileSync(tep, csv, 'utf8');
  const oFile = page.locator('.ant-upload').filter({ hasText: /Nhập từ Excel/ }).locator('input[type="file"]').first();
  if (await oFile.count()) {
    await oFile.setInputFiles(tep);
    await toastDaHien(page, /Đã đọc \d+ dòng/i, 20_000, /không đọc|không có dữ liệu/i, 0).catch(() => {});
    await choHetSpin(page);
    ghi('thông tin bị cáo (CSV)', `${bc.hoTen} · cha ${dong['Họ tên cha']} · mẹ ${dong['Họ tên mẹ']} · ${dong['Trình độ văn hóa']} · tiền án: ${dong['Tiền án'].slice(0, 40)}`);
  } else {
    ghi('thông tin bị cáo (CSV)', 'không thấy nút "Nhập từ Excel"');
  }
}

/**
 * "Lấy số" bản án trên trang soạn thảo (nút góc phải, cạnh "Trình ký") — số bản án do hệ thống cấp,
 * dạng đầy đủ (R1b). Không thấy nút (đã có số) thì bỏ qua.
 */
async function laySoBanAn(page: Page, ghi: (type: string, description: string) => unknown) {
  // Ngăn kéo "Chỉnh sửa bản án (dự thảo)": chân có Lưu nháp | Lưu | Lấy số | Trình ký. Ô số bản án ghi rõ
  // "chỉ mở sau khi đã bấm Lưu" (đào tạo 15/10/2026) → Lưu trước rồi mới Lấy số.
  const khung = page.locator(".ant-drawer-open, .ant-modal-wrap:visible").filter({ has: page.getByText(/Lấy số/) }).last();
  const pham = (await khung.count()) ? khung : page.locator("body");
  await expect(pham.locator("button").filter({ hasText: /Lấy số/ }).first()).toBeVisible({ timeout: 30_000 }).catch(() => {});
  const oSoBA = pham.getByPlaceholder(/Hệ thống cấp khi bấm Lấy số/).last();
  const chuaCoSo = (await oSoBA.count()) && !(await oSoBA.inputValue().catch(() => ""));
  const nutLuu = pham.locator("button").filter({ hasText: /^\s*\S*\s*Lưu\s*$/ }).last();
  if (chuaCoSo && (await nutLuu.isVisible().catch(() => false))) {
    await nutLuu.click();
    // Lưu xong tiêu đề ngăn kéo đổi thành "Bản án (dự thảo đã lưu)" — toast không cố định chữ
    // (đào tạo 15/10/2026: đã lưu nhưng không có toast "thành công") → chấp nhận một trong hai dấu hiệu
    const daLuu = await Promise.any([
      toastDaHien(page, /thành công|Đã lưu/i, 60_000, /thất bại|Vui lòng|Không thể|lỗi|Chưa thể lưu/i, 0),
      page.getByText(/dự thảo đã lưu/i).first().waitFor({ state: "visible", timeout: 60_000 }),
      // Đào tạo 15/10/2026 (TH06, TH18…): Lưu xong trang chuyển hẳn sang màn soạn thảo "Bản án hình sự sơ thẩm - Vụ án …"
      // (nút Lấy số | Trình ký ở góc trên), không toast, không chữ "dự thảo đã lưu"
      page.getByText(/^Bản án hình sự sơ thẩm - /).first().waitFor({ state: "visible", timeout: 60_000 }),
    ]).then(() => true, (e: AggregateError) => { throw e.errors?.[0] || e; });
    await choHetSpin(page);
    await nghi(page, 1500, 2500);
    ghi("bản án", daLuu ? "đã Lưu (mở ô số)" : "Lưu chưa rõ kết quả");
  }
  // Sau Lưu ngăn kéo có thể đã đóng (sang màn soạn thảo) → tìm lại nút trên toàn trang
  const phamSau = (await khung.count()) ? khung : page.locator("body");
  const nut = phamSau.locator("button").filter({ hasText: /Lấy số/ }).last();
  await nut.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
  if (!(await nut.isVisible().catch(() => false)) || !(await nut.isEnabled().catch(() => false))) {
    ghi("lấy số bản án", "không thấy nút Lấy số (có thể đã có số)");
    return;
  }
  await nut.click();
  // Có thể hiện hộp xác nhận
  const xacNhan = page.locator(".ant-modal-confirm:visible, .ant-popconfirm:visible").first();
  if (await xacNhan.isVisible().catch(() => false)) {
    await xacNhan.getByRole("button", { name: /^(Đồng ý|Xác nhận|OK|Lấy số|Có)$/ }).last().click();
  }
  await toastDaHien(page, /thành công/i, 60_000, /Không thể cấp số|thất bại|lỗi/i, 0);
  await choHetSpin(page);
  await nghi(page, 1500, 2500);
  ghi("lấy số bản án", "đã cấp số");
}

async function trinhKy(
  page: Page,
  testInfo: import("@playwright/test").TestInfo,
) {
  const nutTrinhKy = page.getByRole("button", { name: /Trình ký/ }).last();
  await expect(nutTrinhKy, 'Không thấy nút "Trình ký" sau khi Lưu').toBeVisible(
    { timeout: 60_000 },
  );
  await nutTrinhKy.click();
  const popup = page
    .locator(".ant-modal")
    .filter({ hasText: /Nhập thông tin trình duyệt ký/ })
    .last();
  await expect(
    popup,
    'Không mở được popup "Nhập thông tin trình duyệt ký"',
  ).toBeVisible({ timeout: 30_000 });
  await choHetSpin(page);
  await nghi(page, 800, 1200);
  await popup.getByRole("button", { name: /Gửi/ }).last().click();
  const daDong = await popup.waitFor({ state: "hidden", timeout: 60_000 }).then(() => true, () => false);
  if (!daDong) {
    // Nêu đúng lý do hệ thống trả về (vd. lỗi Document Server khi sinh file văn bản)
    const toasts = await page
      .evaluate(() => ((window as any).__toasts || []).slice(-5).map((x: any) => x.t))
      .catch(() => [] as string[]);
    throw new Error(`Popup trình duyệt ký chưa đóng sau khi Gửi · thông báo gần nhất: ${toasts.join(" | ") || "(không có)"}`);
  }
  testInfo.annotations.push({
    type: "trình ký",
    description: "Đã gửi trình duyệt ký",
  });
  // Popup biểu mẫu vẫn mở → "Đóng"
  const nutDong = page
    .locator(".ant-modal-wrap:visible")
    .getByRole("button", { name: /^Đóng$/ })
    .last();
  if (await nutDong.isVisible().catch(() => false)) await nutDong.click();
  await choHetSpin(page);
}

/** Mở chi tiết vụ án sơ thẩm và chuyển sang tab */
async function moTabVuAn(page: Page, idVuAn: string, tab: string) {
  await page.goto(`vu-an/so-tham/chi-tiet?id=${idVuAn}`);
  await page
    .waitForLoadState("networkidle", { timeout: 60_000 })
    .catch(() => {});
  await choHetSpin(page, 60_000);
  // Tên tab gồm cả nhãn icon, vd "file-done Thụ lý"
  await page
    .getByRole("tab", { name: new RegExp(`(^|\\s)${tab}\\s*$`, "i") })
    .first()
    .click();
  await page
    .waitForLoadState("networkidle", { timeout: 30_000 })
    .catch(() => {});
  await choHetSpin(page, 60_000);
  await nghi(page, 1000, 1500);
}

/** Mã mức độ (danh mục MucDoNghiemTrong) theo thứ tự tăng dần và nhãn ô Phân loại tội phạm */
const MUC_DO_TANG_DAN = ["002", "001", "004", "003"];
const TEN_MUC_DO: Record<string, string> = {
  "002": "Ít nghiêm trọng",
  "001": "Nghiêm trọng",
  "004": "Rất nghiêm trọng",
  "003": "Đặc biệt nghiêm trọng",
};

/** Màn "Chỉnh sửa vụ án" (Vụ án sơ thẩm › Thông tin chung › Cập nhật thông tin vụ án) */
async function moChinhSuaVuAn(page: Page, idVuAn: string) {
  await page.goto(`vu-an/so-tham/chi-tiet?id=${idVuAn}`);
  await page
    .waitForLoadState("networkidle", { timeout: 60_000 })
    .catch(() => {});
  await choHetSpin(page, 60_000);
  await page
    .getByRole("button", { name: /Cập nhật thông tin vụ án/ })
    .first()
    .click();
  await expect(
    page.getByText(/Chỉnh sửa vụ án/).first(),
    "Không mở được màn Chỉnh sửa vụ án",
  ).toBeVisible({ timeout: 60_000 });
  await choHetSpin(page, 60_000);
  await nghi(page, 1000, 1500);
}

/** Ô form (antd Form.Item) trong khung theo đúng nhãn */
const oTheoNhan = (khung: Locator, nhan: string) =>
  khung
    .locator(".ant-form-item")
    .filter({
      has: khung.page().locator(".ant-form-item-label label", {
        hasText: new RegExp(`^\\s*${nhan}\\s*$`),
      }),
    })
    .first();

/** Chọn Có/Không của nhóm radio theo nhãn */
async function chonCoKhong(khung: Locator, nhan: string, co: boolean) {
  const o = oTheoNhan(khung, nhan);
  await o.scrollIntoViewIfNeeded();
  const r = o
    .locator(".ant-radio-wrapper")
    .filter({ hasText: new RegExp(`^\\s*${co ? "Có" : "Không"}\\s*$`) })
    .first();
  await r.click();
  await expect(r).toHaveClass(/ant-radio-wrapper-checked/, { timeout: 10_000 });
}

/**
 * Điền drawer bị can (đang mở: "Chi tiết bị can" khi sửa, "Thêm mới bị can" khi tạo đồng phạm) rồi Lưu:
 * thông tin nhân thân → "Không có thông tin" (địa chỉ) → 4. Địa bàn phạm tội → 5. Điều luật áp dụng.
 */
async function dienBiCan(
  page: Page,
  VU: VuAnHinhSu,
  bc: BiCanHinhSu,
): Promise<string> {
  const dr = page
    .locator(".ant-drawer-open")
    .filter({ hasText: /Chi tiết bị can|Thêm mới bị can/ })
    .last();
  await expect(dr, "Không mở được drawer bị can").toBeVisible({
    timeout: 60_000,
  });
  await choHetSpin(page);
  await nghi(page, 1000, 1500);

  const oTen = dr.locator("#conNguoi_hoTen");
  if ((await oTen.inputValue()) !== bc.hoTen) await go(oTen, bc.hoTen);
  // Dữ liệu không có số định danh → tích "Không có" (bị can đầu vụ hệ thống đã tích sẵn)
  const oCccd = dr.locator("#conNguoi_soCccd");
  if (
    (await oCccd.count()) &&
    (await oCccd.isVisible()) &&
    !(await oCccd.inputValue())
  ) {
    const khongCo = dr
      .locator("label.ant-checkbox-wrapper")
      .filter({ hasText: /^\s*Không có\s*$/ })
      .first();
    await khongCo.click();
    await expect(khongCo).toHaveClass(/ant-checkbox-wrapper-checked/, {
      timeout: 10_000,
    });
  }
  // Sheet 04 chỉ có Năm sinh; ô nhận "dd/mm/yyyy hoặc yyyy" nên nhập đúng năm
  await go(dr.locator("#conNguoi_ngaySinh"), String(bc.namSinh));
  await dr.locator("#conNguoi_ngaySinh").press("Tab");
  await chonSelect(page, dr.locator("#conNguoi_maGioiTinh"), bc.gioiTinh);
  await chonSelect(
    page,
    dr.locator("#conNguoiChiTiet_danhSachQuocTich"),
    bc.quocTich,
  );
  await page.keyboard.press("Escape").catch(() => {});
  await chonSelect(page, dr.locator("#conNguoiChiTiet_maDanToc"), bc.danToc);
  const ngheNghiep = await chonSelect(
    page,
    dr.locator("#conNguoiChiTiet_maNgheNghiep"),
    bc.ngheNghiep,
  ).catch(() =>
    chonNgauNhien(page, dr.locator("#conNguoiChiTiet_maNgheNghiep"), 0.3),
  );
  await chonCoKhong(dr, "Nghiện ma túy", bc.dacDiemNhanThan.includes("nghien"));
  await chonCoKhong(
    dr,
    "Công chức, viên chức",
    bc.dacDiemNhanThan.includes("cong_chuc"),
  );
  const dangVien = bc.dacDiemNhanThan.includes("dang_vien");
  await chonCoKhong(dr, "Đảng viên", dangVien);
  if (dangVien)
    await chonSelect(
      page,
      oTheoNhan(dr, "Phân loại đảng viên").locator("input").first(),
      "Đảng viên",
    );

  // Địa chỉ: tích "Không có thông tin"
  const khongCoDiaChi = dr.locator("#conNguoiChiTiet_khongCoDiaChi");
  if (!(await khongCoDiaChi.isChecked())) await khongCoDiaChi.check();

  // 4. Thông tin tố tụng › Địa bàn phạm tội (cột Địa bàn sheet 03)
  await chonSelect(
    page,
    dr.locator("#thongTinToTung_diaBanPhamToi"),
    VU.diaBan,
    { goDeLoc: false },
  );

  // 5. Điều luật áp dụng cho bị can
  const bang = dr
    .locator(".ant-table")
    .filter({ hasText: "Năm/Bộ luật" })
    .last();
  await bang.scrollIntoViewIfNeeded();
  // Bảng trống vẫn có một dòng thông báo "Chưa có tội danh…" → không tính là dòng dữ liệu
  const dongDuLieu = bang
    .locator(".ant-table-row")
    .filter({ hasNotText: /Chưa có tội danh/ });
  let boLuat = "";
  let toiDanh = "";
  let khoan = "";
  let diem = "";
  if (!(await dongDuLieu.count())) {
    // Bị can mới: "+ Chọn tội danh" mở popup "Chọn điều luật áp dụng"
    ({ boLuat, toiDanh, khoan, diem } = await chonDieuLuatMoi(
      page,
      dr,
      VU,
      bc,
    ));
  } else {
    // Bị can có sẵn dòng điều luật: sửa ngay trên dòng
    const dong = dongDuLieu.first();
    if (!(await dong.locator(".ant-select").count()))
      await dong.locator(".anticon-edit").first().click();
    const o = (i: number) =>
      dong.locator(".ant-select").nth(i).locator("input").first();
    boLuat = await chonSelect(page, o(0), nhanBoLuat(VU.boLuat), {
      goDeLoc: false,
    });
    toiDanh = await chonSelect(page, o(1), `${VU.dieuLuat} - `);
    // Khoản lấy đúng cột "Khoản" của bị can trong sheet 04
    khoan = await chonSelect(
      page,
      o(2),
      bc.khoan ? `Khoản ${bc.khoan}` : "Khoản 1",
      { goDeLoc: false },
    );
    // Điểm: có mục thì chọn, không có thì bỏ trống
    const khungDiem = dong.locator(".ant-select").nth(3);
    await khungDiem.click();
    const dsDiem = page.locator(
      ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option",
    );
    if (
      await dsDiem
        .first()
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(
          () => true,
          () => false,
        )
    ) {
      diem = (
        (await dsDiem.first().getAttribute("title")) ||
        (await dsDiem.first().innerText())
      ).trim();
      await dsDiem.first().click();
    } else await page.keyboard.press("Escape");
    await dong.locator(".anticon-save").first().click();
    await nghi(page, 800, 1200);
    await expect(
      dong.locator(".ant-select"),
      "Dòng điều luật chưa lưu",
    ).toHaveCount(0, { timeout: 15_000 });
  }

  await dr.getByRole("button", { name: /^Lưu$/ }).last().click();
  const daDong = await dr.waitFor({ state: "hidden", timeout: 60_000 }).then(
    () => true,
    () => false,
  );
  // Drawer còn mở nghĩa là form chặn Lưu → nêu đúng trường/thông báo bị chặn thay vì báo chung chung
  if (!daDong)
    throw new Error(
      `Drawer Chi tiết bị can chưa đóng sau khi Lưu — ${await nguyenNhanLoi(page, dr)}`,
    );
  return `${bc.hoTen} · ${bc.namSinh} · ${bc.gioiTinh} · ${ngheNghiep} · ${bc.dacDiemNhanThan.join(",") || "không đặc điểm"} · ${VU.diaBan} · ${boLuat} / ${toiDanh} / ${khoan}${diem ? ` / ${diem}` : ""}`;
}

/**
 * Popup "Chọn điều luật áp dụng" (drawer Thêm mới bị can): Bộ luật → tìm số điều → chọn Điều →
 * tích Khoản 1 → có điểm thì tích điểm đầu tiên → "Thêm vào danh sách".
 */
async function chonDieuLuatMoi(
  page: Page,
  dr: Locator,
  VU: VuAnHinhSu,
  bc: BiCanHinhSu,
) {
  await dr.getByText("+ Chọn tội danh").click();
  const hop = page.getByRole("dialog", { name: "Chọn điều luật áp dụng" });
  await expect(hop, 'Không mở được popup "Chọn điều luật áp dụng"').toBeVisible(
    { timeout: 30_000 },
  );
  await choHetSpin(page);
  const boLuat = await chonSelect(
    page,
    hop.getByRole("combobox").first(),
    nhanBoLuat(VU.boLuat),
    { goDeLoc: false },
  );
  await go(
    hop.getByPlaceholder("Tìm theo số điều hoặc tên tội danh"),
    VU.dieuLuat,
  );
  const dieu = hop.getByText(`Điều ${VU.dieuLuat}`, { exact: true }).first();
  await expect(
    dieu,
    `Bộ luật "${boLuat}" không có Điều ${VU.dieuLuat}`,
  ).toBeVisible({ timeout: 30_000 });
  // Ô điều gồm 2 dòng: "Điều 360" / "<tên tội danh>"
  const toiDanh = (
    (await dieu.locator("xpath=..").innerText())
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)[1] || ""
  ).trim();
  await dieu.click();
  await nghi(page, 800, 1200);
  // Khoản lấy đúng cột "Khoản" của bị can trong sheet 04_MASTER_BI_CAO
  const nhanKhoan = `Khoản ${bc.khoan || 1}`;
  const oKhoan = hop
    .locator("label.ant-checkbox-wrapper")
    .filter({ hasText: new RegExp(`^\\s*${nhanKhoan}\\s*$`) })
    .first();
  await expect(
    oKhoan,
    `Điều ${VU.dieuLuat} không có "${nhanKhoan}"`,
  ).toBeVisible({ timeout: 15_000 });
  await oKhoan.click();
  await expect(oKhoan).toHaveClass(/ant-checkbox-wrapper-checked/, {
    timeout: 10_000,
  });
  await nghi(page, 600, 1000);
  // Điểm hiện ra dưới khoản vừa tích (nếu điều luật có điểm) → tích điểm đầu tiên
  let diem = "";
  const oDiem = hop
    .locator("label.ant-checkbox-wrapper")
    .filter({ hasText: /^\s*Điểm\s/ })
    .first();
  if (await oDiem.isVisible().catch(() => false)) {
    diem = (await oDiem.innerText()).trim();
    await oDiem.click();
  }
  await hop.getByRole("button", { name: /Thêm vào danh sách/ }).click();
  await expect(hop).toBeHidden({ timeout: 15_000 });
  await expect(
    dr
      .locator(".ant-table")
      .filter({ hasText: "Năm/Bộ luật" })
      .last()
      .locator(".ant-table-row")
      .filter({ hasText: `${VU.dieuLuat}` })
      .first(),
    "Chưa thêm được điều luật vào danh sách",
  ).toBeVisible({ timeout: 15_000 });
  return { boLuat, toiDanh, khoan: nhanKhoan, diem };
}

/** Khung ProCard có tiêu đề đúng chữ */
const theCo = (page: Page, tieuDe: string) =>
  page
    .locator(".ant-pro-card")
    .filter({
      has: page
        .locator(".ant-pro-card-title")
        .getByText(tieuDe, { exact: true }),
    })
    .first();

/** Token Bearer mà trang đang dùng gọi API (API không nhận cookie phiên) */
const TOKEN = new WeakMap<Page, string>();
function batToken(page: Page) {
  page.on("request", (r) => {
    const a = r.headers()["authorization"];
    if (a && r.url().includes("/qla/api/")) TOKEN.set(page, a);
  });
}

/** Gọi API GET của QLA (chỉ đọc) bằng token của trang */
async function apiGet(page: Page, duongDan: string): Promise<any> {
  const token = TOKEN.get(page);
  if (!token) return undefined;
  const r = await page.request.get(
    `${new URL(page.url()).origin}/qla/api/v1/${duongDan}`,
    {
      headers: { accept: "application/json", authorization: token },
    },
  );
  return r.ok()
    ? r.json()
    : { loi: r.status(), noiDung: (await r.text()).slice(0, 500) };
}

/** Mở màn chi tiết hồ sơ tiếp nhận */
async function moChiTietHoSo(page: Page, idHoSo: string) {
  await page.goto(`vu-an/so-tham/hinh-su/ho-so-tiep-nhan/chi-tiet/${idHoSo}`);
  await page
    .waitForLoadState("networkidle", { timeout: 60_000 })
    .catch(() => {});
  await choHetSpin(page, 60_000);
}

/** Kiểm sát viên bên giao — cố định theo mã vụ án để chạy lại ra cùng người */
function nguoiBenGiao(ma: string) {
  const ds = [
    "Nguyễn Thị Minh Hằng",
    "Trần Quốc Việt",
    "Lê Thị Thanh Huyền",
    "Phạm Văn Lợi",
    "Đỗ Mạnh Cường",
    "Vũ Thị Kim Oanh",
  ];
  return ds[Number(ma.replace(/\D/g, "") || 0) % ds.length];
}

/** "05 năm tù" → 5; "18 năm tù" → 18; "Tù chung thân" → 0 (không nhập mức) */
const soNamTu = (o: string) =>
  Number((String(o || "").match(/(\d+)\s*năm/i) || [])[1] || 0);

/**
 * Bước 10 (10.4–10.17): nhập hình phạt cho MỘT bị cáo, dùng chung cho hai mục của bản án.
 *  - `vks`      : mục "Ý kiến của Viện kiểm sát" → hình phạt theo cột "Hình phạt chính ST"
 *  - `quyetDinh`: mục "Quyết định" → hình phạt theo cột "Mức hình phạt"
 * Danh mục hệ thống chỉ có LOẠI hình phạt ("Tù có thời hạn"…), còn Excel ghi khung/mức cụ thể, nên
 * tra theo tên trước rồi lùi về "Tù có thời hạn" và nhập số năm vào ô mức.
 */
/**
 * Dòng của một bị can trong bảng. Sau khi bỏ phần chú thích trong ngoặc, một vụ có thể có nhiều bị
 * can trùng họ tên (VA035 có hai "Trần Văn Oánh", VA124 có ba "Trần Văn Thẩm"). Lọc thêm theo năm
 * sinh, vẫn trùng thì lấy theo đúng thứ tự bị can trong Excel — cứ .first() thì hình phạt của mọi
 * người dồn hết vào bị can đầu tiên mà test vẫn xanh.
 */
async function dongCuaBiCan(
  khung: Locator,
  vu: VuAnHinhSu,
  bc: BiCanHinhSu,
): Promise<Locator> {
  const theoTen = khung.filter({ hasText: bc.hoTen });
  if ((await theoTen.count()) <= 1) return theoTen.first();
  if (bc.namSinh) {
    const theoNam = theoTen.filter({ hasText: String(bc.namSinh) });
    if ((await theoNam.count()) === 1) return theoNam.first();
  }
  const trungTen = vu.biCan.filter((x) => x.hoTen === bc.hoTen);
  return theoTen.nth(Math.max(0, trungTen.indexOf(bc)));
}

async function nhapHinhPhatChoBiCao(
  page: Page,
  pop: Locator,
  vu: VuAnHinhSu,
  bc: BiCanHinhSu,
  muc: "vks" | "quyetDinh",
  ghi: (type: string, description: string) => void,
  ngayNhanBanAn?: string,
) {
  const nguon = muc === "vks" ? bc.hinhPhatChinhST : bc.mucHinhPhat;
  // Tên bị cáo xuất hiện ở nhiều bảng trong popup bản án → khoanh đúng bảng theo thao tác của mục
  const dong = await dongCuaBiCan(
    pop
      .locator(".ant-table-row")
      .filter({
        hasText: muc === "quyetDinh" ? /Quyết định hình phạt/i : /.*/,
      }),
    vu,
    bc,
  );
  await dong.scrollIntoViewIfNeeded();
  await expect(
    dong,
    `Không thấy dòng ${muc} của bị cáo ${bc.hoTen}`,
  ).toBeVisible({ timeout: 30_000 });
  // Mục VKS mở bằng icon sửa trên dòng; mục Quyết định mở bằng nút "Quyết định hình phạt"
  if (muc === "vks") await dong.locator("button, .anticon-edit").last().click();
  else
    await dong
      .getByText("Quyết định hình phạt", { exact: false })
      .first()
      .click();
  await choHetSpin(page);
  await nghi(page, 2000, 3000);

  // Popup hình phạt là modal đang mở, neo theo nút "Thêm hình phạt" của chính nó — .last() có thể
  // trúng một modal đã đóng nhưng còn nằm trong DOM
  const hop = page
    .locator(".ant-modal, .ant-drawer-open")
    .filter({ has: page.getByRole("button", { name: /Thêm hình phạt$/ }) })
    .last();
  // 10.12 · mục Quyết định có thêm "Ngày nhận bản án" = Ngày kết quả
  if (muc === "quyetDinh" && ngayNhanBanAn) {
    const oNgay = hop
      .locator('input[placeholder*="ngày"], .ant-picker input')
      .first();
    if (await oNgay.count())
      await chonNgay(oNgay, ngayNhanBanAn).catch(() => {});
  }

  await hop
    .getByRole("button", { name: /Thêm hình phạt$/ })
    .first()
    .click();
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  const dongHp = hop
    .locator(".ant-table-row")
    .filter({ has: page.locator(".ant-select") })
    .last();
  await expect(dongHp, "Không thêm được dòng hình phạt").toBeVisible({
    timeout: 30_000,
  });
  const oSelect = (i: number) => dongHp.locator(".ant-select input").nth(i);
  // Danh mục chia 4 nhóm (constants/hinhPhatHinhSu.ts): "Hình phạt chính", "Hình phạt bổ sung",
  // "Hình phạt khác" (khiển trách, xin lỗi, hòa giải…), "Không áp dụng hình phạt" (không có tội,
  // miễn TNHS…). Excel ghi bằng lời nên phải dò từ khoá ra ĐÚNG nhóm rồi mới chọn được hình phạt —
  // chọn nhầm nhóm thì mục cần tìm không hề có trong danh sách.
  const loi = `${nguon || ""} ${bc.mucHinhPhat || ""}`.toLowerCase();
  const theoTuKhoa: [RegExp, string, string][] = [
    [/chung thân/, "Hình phạt chính", "Tù chung thân"],
    [/tử hình/, "Hình phạt chính", "Tử hình"],
    [/khiển trách/, "Hình phạt khác", "Khiển trách"],
    [/xin lỗi/, "Hình phạt khác", "Buộc công khai xin lỗi"],
    [/hòa giải|hoà giải/, "Hình phạt khác", "Hòa giải cộng đồng"],
    [
      /giáo dục tại (xã|địa phương)/,
      "Hình phạt khác",
      "Giáo dục tại địa phương",
    ],
    [
      /trường giáo dưỡng/,
      "Hình phạt bổ sung",
      "Giáo dục tại trường giáo dưỡng",
    ],
    [
      /không có sự việc phạm tội/,
      "Không áp dụng hình phạt",
      "Không có sự việc phạm tội",
    ],
    [/không có tội/, "Không áp dụng hình phạt", "Không có tội"],
    [
      /miễn trách nhiệm hình sự/,
      "Không áp dụng hình phạt",
      "Miễn trách nhiệm hình sự",
    ],
    [/miễn hình phạt/, "Không áp dụng hình phạt", "Miễn hình phạt"],
    [/cảnh cáo/, "Hình phạt chính", "Cảnh cáo"],
    [/phạt tiền/, "Hình phạt chính", "Phạt tiền"],
    [/cải tạo không giam giữ/, "Hình phạt chính", "Cải tạo không giam giữ"],
    [/trục xuất/, "Hình phạt chính", "Trục xuất"],
    [/tù/, "Hình phạt chính", "Tù có thời hạn"],
  ];
  const khop = theoTuKhoa.find(([mau]) => mau.test(loi));
  const nhom = khop?.[1] || "Hình phạt chính";
  await chonSelect(page, oSelect(0), nhom, { goDeLoc: false });
  await choHetSpin(page);
  let hinhPhat = nguon
    ? await chonSelect(page, oSelect(1), nguon).catch(() => "")
    : "";
  if (!hinhPhat && khop)
    hinhPhat = await chonSelect(page, oSelect(1), khop[2]).catch(() => "");
  expect(
    hinhPhat,
    `Không chọn được hình phạt cho ${bc.hoTen} trong nhóm "${nhom}" (Excel: "${nguon}" / "${bc.mucHinhPhat}")`,
  ).toBeTruthy();
  await choHetSpin(page);
  await nghi(page, 1000, 1600);

  // Mức: cột "Mức đề nghị từ" có ô Năm/Tháng/Ngày — chỉ nhập khi là tù có thời hạn
  // Form bắt buộc nhập ĐỦ mức "từ" và "đến". Excel ghi khung ("Tù từ trên 3 năm đến 7 năm") →
  // lấy hai số năm; chỉ có một số ("05 năm tù") thì từ = đến = số đó.
  const dsNam = [
    ...String(nguon || bc.mucHinhPhat || "").matchAll(/(\d+)\s*năm/gi),
  ].map((m) => Number(m[1]));
  const namTu = dsNam[0] || 0;
  const namDen = dsNam[1] || namTu;
  // "Phạt tiền" bắt buộc có số tiền ("Vui lòng nhập số tiền"), lấy từ cột Mức hình phạt
  if (/phạt tiền/i.test(hinhPhat)) {
    const soTien = (String(bc.mucHinhPhat || "").match(
      /([\d.,]{4,})\s*(đồng|vnđ|vnd)?/i,
    ) || [])[1]?.replace(/[.,]/g, "");
    const oTien = dongHp.getByPlaceholder("Số tiền").first();
    expect(
      await oTien.count(),
      `Không thấy ô "Số tiền" trên dòng hình phạt của ${bc.hoTen}`,
    ).toBeGreaterThan(0);
    expect(
      soTien,
      `Không đọc được số tiền phạt từ "${bc.mucHinhPhat}"`,
    ).toBeTruthy();
    await oTien.fill(soTien!);
    await oTien.blur();
    ghi(
      `${muc} · ${bc.hoTen} · số tiền`,
      `${soTien} (Excel: "${bc.mucHinhPhat}")`,
    );
  }
  if (namTu && /thời hạn/i.test(hinhPhat)) {
    const oNam = dongHp.getByPlaceholder("Năm");
    await oNam.nth(0).fill(String(namTu));
    await oNam.nth(0).blur();
    if ((await oNam.count()) > 1) {
      await oNam.nth(1).fill(String(namDen));
      await oNam.nth(1).blur();
    }
  }
  ghi(
    `${muc} · ${bc.hoTen}`,
    `${hinhPhat}${namTu ? ` từ ${namTu} đến ${namDen} năm` : ""} (Excel: "${nguon || "(trống)"}")`,
  );

  // Thao tác trên dòng là link "Lưu". Dòng phải thoát chế độ sửa (hết ô select) thì mới thực sự
  // ghi nhận; còn ô select nghĩa là form chặn — nêu rõ trường nào thay vì để hỏng ở bước sau.
  await dongHp.getByText("Lưu", { exact: true }).first().click();
  await choHetSpin(page);
  await nghi(page, 1200, 2000);
  const daGhiDong = await dongHp
    .locator(".ant-select")
    .waitFor({ state: "detached", timeout: 15_000 })
    .then(
      () => true,
      () => false,
    );
  if (!daGhiDong)
    throw new Error(
      `Không lưu được dòng hình phạt (${muc}) cho ${bc.hoTen} — ${await nguyenNhanLoi(page, hop)}`,
    );
  // Lưu popup
  await hop.getByRole("button", { name: /^Lưu$/ }).last().click();
  await choHetSpin(page);
  await nghi(page, 2000, 3000);
  // Kiểm chứng bằng chính dữ liệu đã lưu: dòng của bị cáo trong bảng phải hiện mức hình phạt.
  // (Không assert popup ẩn: '.last()' sau khi popup con đóng lại trỏ sang popup 'Thêm bản án'.)
  await expect(
    await dongCuaBiCan(pop.locator(".ant-table-row"), vu, bc),
    `Chưa lưu được hình phạt (${muc}) cho ${bc.hoTen}`,
  ).not.toContainText(/Chưa có mức hình phạt/i, { timeout: 60_000 });
}
