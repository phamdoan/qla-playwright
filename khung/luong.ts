/**
 * KHUNG LUỒNG — MỘT FILE SPEC = MỘT LUỒNG, chạy từ đầu đến cuối.
 *
 * Vì sao không phải "một bước một file": một luồng có ~44 bước và dự án có HÀNG NGHÌN case.
 * 44 file × nghìn case là không quản được. Nên:
 *
 *   BƯỚC  = khai trong `flows/<phan-he>/<flow>/flow.ts`      (bản đồ luồng, một chỗ duy nhất)
 *   CÀI ĐẶT = `flows/<phan-he>/<flow>/cai-dat.ts`             (mã bước → thân nghiệp vụ)
 *   CASE  = dữ liệu trong `data/<phan-he>/<flow>/...`         (thêm case là thêm dữ liệu, không thêm file spec)
 *   SPEC  = MỘT file `tests/<phan-he>/flows/<flow>/<flow>.spec.ts` gọi `khaiLuong(...)`
 *
 * Khung này gánh phần lặp lại của mọi bước:
 *   · chặn ghi dữ liệu thật khi môi trường không cho (QLA_TKM_CHO_PHEP_GHI ≠ 1)
 *   · CHẶN bước sau khi bước bắt buộc trước chưa xong (state.canXong) — không "pass giả"
 *   · bỏ qua bước đã xong khi chạy lại (QLA_BO_QUA_DA_XONG=1)
 *   · mở phiên trình duyệt đúng vai, mở thẳng màn hình của bước bằng route, đóng phiên khi hết bước
 *   · CHECKPOINT: chỉ ghi PASSED khi thân bước trả về bằng chứng do hệ thống cấp
 *   · bước chưa cài đặt thì đánh `fixme` kèm trích dẫn tài liệu — KHÔNG báo xanh giả
 *
 * Chọn case / bước lúc chạy (không sửa code):
 *   QLA_CASE=case-001,case-007   chỉ chạy các case này
 *   QLA_SO_CASE=5                chỉ chạy 5 case đầu trong danh sách
 *   -g "buoc (01|02|03)-"        chỉ chạy bước 01–03 (mọi test đặt tên "buoc <mã bước> · …")
 */
import { BrowserContext, Page, test } from '@playwright/test';
import { choHetSpin } from '../common/antd';
import { batDauChupLienTuc } from '../common/anh';
import { choPhepGhiTKM } from '../account';
import { moTrangVaiCauHinh } from '../common/luong-tkm';
import { taiKhoan } from '../common/cau-hinh-luong';
import { DinhDanhCase, moCase } from './case-state';
import { DinhNghiaBuoc, DinhNghiaFlow, bangPhuThuoc, routeCuaBuoc } from './flow';

export interface BoiCanhBuoc<I> {
  page: Page;
  context: BrowserContext;
  /** dữ liệu gieo của case đang chạy */
  input: I;
  /** định danh case đang chạy */
  dd: DinhDanhCase;
  /** ghi chú vào báo cáo Playwright + console (dấu vết để đối chiếu với hệ thống) */
  ghi: (nhan: string, mo: string) => void;
  /** dữ liệu bàn giao từ các bước trước (idDon, maVuAn, soBanAnSoTham…) */
  duLieu: Record<string, string>;
  /** lấy một khoá bàn giao; thiếu thì ném lỗi nói rõ bước nào phải chạy lại */
  can: (khoa: string) => string;
}

/**
 * Thân một bước. Trả về BẰNG CHỨNG (id/số do hệ thống cấp) — trả object rỗng là lỗi, vì bước
 * không có bằng chứng thì không được ghi là xong.
 */
export type CaiDatBuoc<I> = (bc: BoiCanhBuoc<I>) => Promise<Record<string, string>>;

/** Bảng cài đặt: mã bước → thân. Bước thiếu trong bảng = chưa cài đặt → `fixme`. */
export type BangCaiDat<I> = Partial<Record<string, CaiDatBuoc<I>>>;

export interface CaseChay<I> {
  dd: DinhDanhCase;
  input: I;
}

export interface ThamSoLuong<I> {
  flow: DinhNghiaFlow;
  /** Danh sách case chạy qua luồng. Thêm case = thêm phần tử ở đây, KHÔNG thêm file spec. */
  dsCase: CaseChay<I>[];
  caiDat: BangCaiDat<I>;
  /** Đổi vai theo case (vd. case ở tòa khác cấp). Mặc định lấy `vai` khai trong flow. */
  vai?: (buoc: DinhNghiaBuoc, input: I) => string;
  /** Hạn giờ mỗi bước, phút (mặc định 10) */
  phut?: number | ((buoc: DinhNghiaBuoc) => number);
}

/** Lọc case theo biến môi trường — để chạy lại một case mà không sửa code */
export function locCase<I>(dsCase: CaseChay<I>[]): CaseChay<I>[] {
  const chon = (process.env.QLA_CASE || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  let ra = chon.length ? dsCase.filter(c => chon.includes(c.dd.caseId)) : dsCase;
  if (chon.length) {
    const thieu = chon.filter(m => !dsCase.some(c => c.dd.caseId === m));
    /**
     * KHÔNG ném lỗi khi case không thuộc luồng NÀY.
     *
     * `QLA_CASE` là biến toàn cục mà mỗi file spec gọi `khaiLuong` một lần, nên chạy không lọc
     * `--file` là mọi luồng đều đọc biến đó: `QLA_CASE=case-002` (của KDTM) làm luồng HÌNH SỰ ném
     * lỗi "case không khai trong danh sách" và GIẾT CẢ LƯỢT ngay lúc nạp — người chạy tưởng sai dữ
     * liệu, thật ra chỉ là thiếu `--` trước `--file` nên npm nuốt mất cờ lọc (đo 03/10/2026).
     *
     * Luồng không có case nào được chọn thì bỏ qua luồng đó và NÓI RÕ trên log; gõ sai tên case vẫn
     * thấy ngay vì mọi luồng đều in dòng này và không test nào chạy.
     */
    if (thieu.length) {
      console.log(
        `    · bỏ qua luồng "${dsCase[0]?.dd.flow ?? '(không rõ)'}": QLA_CASE=${chon.join(',')} không có ` +
          `trong danh sách case của luồng (${dsCase.map(c => c.dd.caseId).join(', ') || 'rỗng'})`,
      );
    }
  }
  const soCase = Number(process.env.QLA_SO_CASE || '');
  if (Number.isFinite(soCase) && soCase > 0) ra = ra.slice(0, soCase);
  return ra;
}

export function khaiLuong<I>({ flow, dsCase, caiDat, vai, phut = 10 }: ThamSoLuong<I>) {
  const phuThuoc = bangPhuThuoc(flow);

  for (const { dd, input } of locCase(dsCase)) {
    const state = moCase(dd, phuThuoc);

    // Tên describe CHỈ là mã case: tên flow ("flow-001-st-pt-…") có chứa "01-" nên để vào tiêu đề
    // là `-g "buoc (01|02)-"` khớp mọi bước. Tên flow đã nằm ở tên file spec.
    test.describe(dd.caseId, () => {
      // Cả luồng của MỘT case chạy tuần tự: bước sau dùng dữ liệu bước trước sinh ra
      test.describe.configure({ mode: 'serial' });

      /**
       * DÙNG LẠI PHIÊN THEO VAI — chỗ tốn thời gian lớn nhất của luồng.
       *
       * Mỗi bước mở một BrowserContext mới rồi về trang chủ (và đăng nhập lại nếu phiên hết hạn)
       * mất ~15–20s. Cả luồng 44 bước là 11–15 phút chỉ để mở trình duyệt. Một case thực chất chỉ
       * cần vài phiên: Tòa sơ thẩm, Tòa phúc thẩm, các vai GĐT. Giữ phiên trong `phienTheoVai`
       * và đóng ở `afterAll` (workers=1 + serial nên phiên không lẫn giữa các case).
       */
      const phienTheoVai = new Map<string, { page: Page; context: BrowserContext }>();

      test.afterAll(async () => {
        for (const { context } of phienTheoVai.values()) await context.close().catch(() => {});
        phienTheoVai.clear();
      });

      for (const dn of flow.buoc) {
        const than = caiDat[dn.ma];

        /**
         * MỘT CHỖ KHAI DUY NHẤT cho mọi bước — kể cả bước chưa cài đặt.
         *
         * Playwright UI sắp xếp test theo VỊ TRÍ KHAI BÁO (file:dòng). Bản trước khai bước chưa cài
         * đặt ở một `test(...)` riêng NẰM TRÊN, nên nó luôn nhảy lên đầu danh sách: UI hiện "bước 46"
         * trước "bước 01" (người dùng chỉ ra 03/10/2026). Gộp về một chỗ thì thứ tự trên màn đúng
         * bằng thứ tự khai trong flow.ts.
         */
        test(`buoc ${dn.ma} · ${dn.ten}`, async ({ browser }, testInfo) => {
          // Bước đã khai trong flow nhưng chưa cài đặt: vẫn hiện trong `--list` để thấy luồng còn
          // thiếu gì, và KHÔNG bao giờ báo xanh.
          if (!than) {
            testInfo.annotations.push({ type: 'chưa cài đặt', description: `Nguồn: ${dn.nguon}` });
            testInfo.annotations.push({ type: 'màn hình', description: dn.manHinh });
            test.fixme(true, `Chưa cài đặt — đặc tả: ${dn.nguon} (${flow.nguon})`);
            return;
          }
          test.skip(!choPhepGhiTKM(), 'Môi trường không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)');
          test.skip(
            process.env.QLA_BO_QUA_DA_XONG === '1' && state.daXong(dn.ma),
            `Đã xong ở lượt trước (${state.duongDan})`,
          );
          testInfo.setTimeout((typeof phut === 'function' ? phut(dn) : phut) * 60_000);

          // Chặn trước khi mở trình duyệt: bước trước chưa xong thì không tốn một phiên đăng nhập
          state.canXong(dn.ma);

          const ghi = (type: string, mo: string) => {
            testInfo.annotations.push({ type, description: mo });
            console.log(`    · ${type}: ${mo}`);
          };
          ghi('màn hình', dn.manHinh);
          ghi('nguồn đặc tả', `${dn.nguon} [${dn.xacMinh}]`);

          const duLieu = state.doc().duLieu;
          const can = (khoa: string) => {
            const v = duLieu[khoa];
            if (!v) {
              const daXong = Object.entries(state.doc().buoc)
                .filter(([, t]) => t.status === 'PASSED')
                .map(([k]) => k);
              throw new Error(
                `Thiếu khoá bàn giao "${khoa}" trong state của ${dd.caseId}. Bước đã xong: ` +
                  `${daXong.join(', ') || '(chưa có bước nào)'} → chạy lại bước sinh ra "${khoa}".`,
              );
            }
            return v;
          };

          const vaiChay = vai?.(dn, input) || dn.vai;
          /**
           * PHIÊN GIỮ THEO TÀI KHOẢN, KHÔNG THEO TÊN VAI.
           *
           * Nhiều vai dùng CHUNG một tài khoản (config/tai-khoan.local.json: vuTruongDanSu và
           * thuKyVuDanSu cùng một CCCD; vuTruong và thuKyVuHoSoKhangNghi cũng vậy). Giữ phiên theo
           * tên vai thì khi sang vai thứ hai, khung mở thêm một context NỮA rồi đăng nhập lại CHÍNH
           * tài khoản đang mở — WSO2 chỉ cho một phiên nên nó quay vòng về /sso/login và bước chết
           * dù nghiệp vụ không có gì sai (đo 03/10/2026: bước 27 rồi bước 31 hỏng đúng kiểu đó, thử
           * 5 vòng + dọn cookie vẫn không qua).
           *
           * Khoá theo CCCD: hai vai cùng tài khoản dùng chung một phiên — hết quay vòng, và đỡ luôn
           * 15–20 giây mở phiên.
           */
          const khoaPhien = (() => {
            try {
              return taiKhoan(vaiChay).cccd || vaiChay;
            } catch {
              return vaiChay;
            }
          })();
          let phien = phienTheoVai.get(khoaPhien);
          if (!phien) {
            phien = await moTrangVaiCauHinh(browser, testInfo, vaiChay);
            phienTheoVai.set(khoaPhien, phien);
            ghi('phiên', `mở phiên mới cho vai ${vaiChay}`);
          }
          const { page, context } = phien;
          try {
            // Mở thẳng màn hình của bước bằng URL (R1: điều hướng bằng KHOÁ, không đi lại chuỗi
            // click của các bước trước). Route khai trong flow.ts, {khoa} lấy từ state — thiếu thì
            // ném lỗi chỉ rõ bước phải chạy lại. Bước không có route riêng thì bỏ qua.
            if (dn.route) {
              const duongDan = routeCuaBuoc(dn, duLieu);
              ghi('mở màn hình', duongDan);
              // domcontentloaded + chờ spin tan, KHÔNG chờ networkidle: app có polling nền nên
              // networkidle hay chờ tới hết 60s mà không thêm gì cho việc thao tác.
              const traVe = await page.goto(duongDan, { waitUntil: 'domcontentloaded' });
              // Máy chủ chết thì NÓI THẲNG. Không có kiểm tra này, mọi bước đều báo "không thấy
              // phần tử X" và trông như lỗi selector — đo 30/09/2026: STG trả 503 nginx, bước 09
              // báo 'Màn hình không có tab "Chuẩn bị xét xử"'.
              const ma = traVe?.status() ?? 0;
              if (ma >= 500) {
                throw new Error(
                  `Máy chủ trả ${ma} khi mở ${duongDan} — KHÔNG phải lỗi kịch bản. ` +
                    `Kiểm tra môi trường ${process.env.QLA_ENV || 'stg'} rồi chạy lại.`,
                );
              }
              await choHetSpin(page);
              /**
               * TRANG 404 CỦA SPA: HTTP vẫn 200 (index.html trả bình thường) nhưng router không dựng
               * được màn — vùng nội dung là "Rất tiếc! Không tìm thấy trang!". Gặp lúc chunk JS của màn
               * tải lỗi, mở lại là qua; tải lại (reload) KHÔNG gỡ được vì vẫn đúng URL đang hỏng.
               * Đo 03/10/2026: bước 14 chết ở đây và báo nhầm thành "màn hình không có tab".
               */
              const la404 = async () =>
                page
                  .getByText(/Rất tiếc! Không tìm thấy trang|Không tìm thấy trang/i)
                  .first()
                  .isVisible()
                  .catch(() => false);
              if (await la404()) {
                ghi('mở màn hình', `gặp trang 404 → mở lại ${duongDan}`);
                await page.goto('dashboard', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
                await page.goto(duongDan, { waitUntil: 'domcontentloaded' });
                await choHetSpin(page);
                if (await la404()) {
                  throw new Error(
                    `Màn hình trả về trang 404 "Không tìm thấy trang" khi mở ${duongDan} (đã thử lại 1 lần). ` +
                      `Kiểm tra khoá trong sổ cái còn đúng không, hoặc chờ môi trường rồi chạy lại bước này.`,
                  );
                }
              }
            }
            /**
             * Tiền tố đường dẫn ảnh của BƯỚC NÀY — `common/bieu-mau.ts · chupAnhNhapLieu` dùng nó để
             * chụp biểu mẫu lúc đã điền xong, ngay trước khi bấm Lưu.
             */
            if (process.env.QLA_ANH === '1') {
              process.env.QLA_ANH_TIEN_TO = `${process.env.QLA_THU_MUC_ANH || 'anh-buoc'}/${dd.caseId}/${dn.ma}`;
            }
            // Chụp theo nhịp suốt bước (cờ --anh-tat-ca) — dừng ngay khi bước xong hoặc hỏng
            const dungChup = batDauChupLienTuc(page, process.env.QLA_ANH_TIEN_TO || '');
            let bangChung: Record<string, string>;
            try {
              bangChung = await than({ page, context, input, dd, ghi, duLieu, can });
            } finally {
              await dungChup();
            }
            // CHECKPOINT — chỉ ghi PASSED khi có bằng chứng do hệ thống cấp
            state.xongBuoc(dn.ma, bangChung);
            for (const [k, v] of Object.entries(bangChung)) if (v) ghi(`bằng chứng · ${k}`, v);
            /**
             * ẢNH BẰNG CHỨNG CỦA BƯỚC (chỉ khi QLA_ANH=1, tức chạy với cờ `--anh`).
             *
             * Chụp NGAY SAU KHI BƯỚC XONG: đó là trạng thái màn đáng chụp. Ảnh cỡ thật 1920×1080,
             * tên tệp mang mã bước nên xếp theo tên là đúng thứ tự — khỏi phải rút khung hình từ
             * trace (khung trace bị thu nhỏ ~800px, phóng lên là vỡ).
             *
             * Không quay video: mỗi bước một .webm tốc độ thật, 45 bước thành hàng GB và chậm hẳn
             * (người dùng chốt 03/10/2026 — tự dựng video từ ảnh).
             */
            if (process.env.QLA_ANH === '1') {
              const thuMuc = process.env.QLA_THU_MUC_ANH || 'anh-buoc';
              const tep = `${thuMuc}/${dd.caseId}/${dn.ma}.png`;
              await page.screenshot({ path: tep }).catch(() => undefined);
              ghi('ảnh bước', tep);
            }
          } catch (e) {
            state.hongBuoc(dn.ma, e instanceof Error ? e.message : String(e));
            throw e;
          }
          // KHÔNG đóng phiên ở đây: bước sau cùng vai dùng lại (xem phienTheoVai)
        });
      }
    });
  }
}
