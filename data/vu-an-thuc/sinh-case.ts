/**
 * SINH CASE TỪ BẢN ÁN THẬT — biến mỗi bản ghi của `ban-an-cong-bo.ts` thành một case của luồng
 * sơ thẩm → phúc thẩm, để một lượt chạy sinh ra nhiều bản án thuộc nhiều quan hệ pháp luật.
 *
 * Khuôn mẫu lấy đúng case-ds-003 / case-ds-004 (hai case đã chạy xanh 23/23 ngày 03/10/2026):
 * GIỮ TOÀN BỘ seed của tòa KDTM (tài khoản, người ký, Viện kiểm sát, chủ toạ — chúng nhất quán với
 * nhau), chỉ thay phần nghiệp vụ: loại đơn, quan hệ pháp luật, đương sự, nội dung yêu cầu.
 *
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 * THẤY ĐỦ CẢ BỘ, KHÔNG CẦN BẬT GÌ. Mặc định danh sách case gồm cả 81 case sinh từ bản án thật
 * (dân sự/HNGĐ/lao động) và 30 case KDTM, nên `--list` và Playwright UI luôn phơi ra toàn bộ.
 *
 *   (không khai gì)                     THẤY và chạy được TẤT CẢ
 *   QLA_VU_AN_THUC=bacb-010,bacb-034    HẸP danh sách còn các bản án này
 *   QLA_VU_AN_THUC=1 | all              như không khai — giữ lại cho các lệnh cũ
 *
 * TRƯỚC 05/10/2026 biến này là CỔNG CHẶN: không khai thì trả về mảng rỗng. Hệ quả là mở UI ra chỉ
 * thấy 13 case gieo tay, còn 111 case đã dựng thì vô hình — người chạy không có cách nào biết bộ
 * này có những gì. Nay đổi: THẤY là mặc định, CHỌN CHẠY CASE NÀO là quyền của người chạy
 * (bấm trong UI, hoặc `--case=...` ở dòng lệnh).
 *
 * ⚠ ĐÁNH ĐỔI, nói thẳng: một case dân sự là 23 bước (~9 phút), KDTM 45 bước. Chạy CLI mà KHÔNG
 * khai `--case` thì giờ sẽ khởi động cả bộ — hàng chục giờ. Không còn cổng chặn nào cản việc đó,
 * vì cổng nào cản được lượt chạy cả bộ thì cũng cản luôn việc bấm chạy một case trong UI.
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 *
 * CHỈ SINH CHO LUỒNG DÂN SỰ (`flow-001-st-pt`). Luồng này nhận cả ba loại đơn "Dân sự",
 * "Hôn nhân và gia đình", "Lao động" — ba loại cùng một bộ bước (Step3–8 sơ thẩm, Step1–4 phúc
 * thẩm), chỉ khác loại đơn và quan hệ pháp luật. ĐÃ CHẠY THẬT: chỉ loại "Dân sự" (case-ds-002/003/004).
 * Hai loại còn lại đi cùng đường theo đặc tả nhưng CHƯA có lượt chạy nào chứng minh — case đầu tiên
 * của mỗi loại nên chạy riêng trước khi chạy cả bộ.
 *
 * 30 bản ghi KDTM đi đường riêng: `caseVuAnThucKdtm()` ở cuối tệp, cắm vào luồng KDTM 45 bước.
 */
import type { CaseChay } from '../../khung/luong';
import type { DinhDanhCase } from '../../khung/case-state';
import { tenDuongSu } from '../../khung/ten-viet';
import { FLOW_DS_001 } from '../../flows/dan-su/flow-001-st-pt/flow';
import { FLOW_001 as FLOW_KDTM } from '../../flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/flow';
import { INPUT as INPUT_KDTM } from '../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';
import { DS_BAN_AN_CONG_BO, type BanAnCongBo } from './ban-an-cong-bo';

/** Loại đơn mà luồng dân sự `flow-001-st-pt` nhận được */
const LOAI_DON_LUONG_DAN_SU = ['Dân sự', 'Hôn nhân và gia đình', 'Lao động'];

/** Mã case của một bản án — tất định theo id bản ghi, nên tên đương sự cũng tất định */
export function maCaseTuBanAn(ba: BanAnCongBo): string {
  return `case-${ba.id}`;
}

export function caseTuBanAn(ba: BanAnCongBo): CaseChay<typeof INPUT_KDTM> {
  const caseId = maCaseTuBanAn(ba);
  const dd: DinhDanhCase = {
    phanHe: FLOW_DS_001.phanHe,
    flow: FLOW_DS_001.flow,
    caseId,
    module: FLOW_DS_001.module,
    rootCaseKey: `${FLOW_DS_001.module}|${FLOW_DS_001.flow}|${caseId}`,
  };

  const tenNguyenDon = tenDuongSu(caseId, 'nguyenDon');
  const tenBiDon = tenDuongSu(caseId, 'biDon', 'nu');
  /** Chữ đầu viết thường để câu "Đề nghị Tòa án giải quyết …" đọc được, trừ khi tên lá bắt đầu bằng tên riêng */
  const viecKien = ba.tenQhpl.charAt(0).toLowerCase() + ba.tenQhpl.slice(1);

  const input = {
    ...INPUT_KDTM,

    // ───────── Nghiệp vụ: lấy từ bản án thật + danh mục máy chủ ─────────
    loaiDon: ba.loaiDon,
    /** Có tên nhánh cha thì `chonQhplThongKe` MỞ NHÁNH rồi bấm lá (cây nạp lười, lọc chữ ra rỗng) */
    qhplChaThongKe: ba.qhplCha,
    maQhplThongKe: ba.maQhpl,
    tenQhplThongKe: ba.tenQhpl,
    quanHePhapLuatChiTiet: ba.tenQhpl,
    quanHePhapLuatThongKe: ba.locQhpl,

    // ───────── Đương sự: tên SINH TẤT ĐỊNH, không dùng tên thật (cổng đã che tên) ─────────
    nguyenDon: { ...INPUT_KDTM.nguyenDon, nguyenVan: tenNguyenDon, hoTen: tenNguyenDon },
    biDon: { ...INPUT_KDTM.biDon, nguyenVan: tenBiDon, hoTen: tenBiDon },

    /**
     * Nội dung yêu cầu: câu việc kiện đứng TRƯỚC, phần tham chiếu nguồn đứng sau, để nếu ô có giới
     * hạn độ dài thì phần bị cắt là phần tham chiếu chứ không phải nội dung nghiệp vụ.
     */
    noiDungYeuCau:
      `Đề nghị Tòa án giải quyết ${viecKien} giữa ${tenNguyenDon} và ${tenBiDon}. ` +
      `Tham chiếu bản án số ${ba.soBanAn} ngày ${ba.ngay} của ${ba.toaAn}.`,

    tenNguoiKhangCao: tenBiDon,
    tieuDeLichXetXu: `Phiên tòa sơ thẩm ${ba.loaiDon.toLowerCase()} — ${tenNguyenDon}`,
  };

  return { dd, input };
}

/**
 * Các case sinh từ bản án thật, theo biến `QLA_VU_AN_THUC`. Không bật thì trả về mảng rỗng.
 *
 * MÃ KHÔNG THUỘC LUỒNG NÀY THÌ BỎ QUA ÊM, chỉ mã KHÔNG TỒN TẠI mới ném lỗi.
 *
 * Đúng cái bẫy mà `khung/luong.ts · locCase` đã gặp với `QLA_CASE`: một biến môi trường toàn cục,
 * mà mỗi file spec nạp danh sách case của luồng mình — nên `QLA_VU_AN_THUC=bacb-001` (một bản ghi
 * KDTM) làm luồng DÂN SỰ ném lỗi ngay lúc nạp và GIẾT CẢ LƯỢT, kể cả lượt chạy KDTM mà người dùng
 * đang muốn (đo 04/10/2026, sau khi cắm thêm `caseVuAnThucKdtm`).
 *
 * Gõ sai mã vẫn thấy ngay, vì không luồng nào nhận nó và không test nào chạy.
 */
export function caseVuAnThuc(): CaseChay<typeof INPUT_KDTM>[] {
  const bat = (process.env.QLA_VU_AN_THUC || '').trim();
  const dungLuong = DS_BAN_AN_CONG_BO.filter(b => LOAI_DON_LUONG_DAN_SU.includes(b.loaiDon));
  // Không khai gì = THẤY ĐỦ CẢ BỘ. Xem khối chú thích đầu tệp về việc THẤY khác với CHẠY.
  if (!bat || bat === '1' || bat.toLowerCase() === 'all') return dungLuong.map(caseTuBanAn);

  const chon = bat.split(',').map(s => s.trim()).filter(Boolean);
  const laMaThat = chon.filter(id => DS_BAN_AN_CONG_BO.some(b => b.id === id));
  const khongCo = chon.filter(id => !laMaThat.includes(id));
  if (khongCo.length) {
    throw new Error(
      `QLA_VU_AN_THUC: không có bản án nào mang mã ${khongCo.map(s => `"${s}"`).join(', ')}. ` +
        `Mã hợp lệ là bacb-001…bacb-${String(DS_BAN_AN_CONG_BO.length).padStart(3, '0')} ` +
        `(xem data/vu-an-thuc/ban-an-cong-bo.ts).`,
    );
  }

  const ra = dungLuong.filter(b => laMaThat.includes(b.id));
  const khacLuong = laMaThat.length - ra.length;
  if (khacLuong > 0 && ra.length === 0) {
    console.log(
      `    · bỏ qua luồng "${FLOW_DS_001.flow}": ${khacLuong} mã QLA_VU_AN_THUC đã chọn đều thuộc ` +
        `loại đơn khác (luồng này nhận ${LOAI_DON_LUONG_DAN_SU.join(' / ')})`,
    );
  }
  return ra.map(caseTuBanAn);
}

// ──────────────────────────── LUỒNG KDTM (45 bước, có cụm GĐT/TT) ────────────────────────────

/**
 * Case cho LUỒNG KDTM từ 30 bản ghi "Kinh doanh, thương mại" của bộ bản án thật.
 *
 * Vì sao tách khỏi `caseVuAnThuc()`: luồng KDTM là 45 bước và có cụm GĐT/TT (bước 24→45), khác
 * `rootCaseKey` nên phải khai theo `FLOW_KDTM`. Phần dữ liệu gieo thì giống hệt — vẫn chồng lên
 * `INPUT_KDTM`, chỉ thay loại đơn và quan hệ pháp luật.
 *
 * Luồng KDTM là luồng DUY NHẤT hiện nuôi được 4C/4D (giám đốc thẩm / tái thẩm), vì chỉ nó đi qua
 * cụm GĐT. Mã case mang hậu tố `-kdtm` để không đụng mã case của luồng dân sự.
 *
 * Bật bằng chính `QLA_VU_AN_THUC`, dùng mã bacb của bản ghi KDTM:
 *   QLA_VU_AN_THUC=bacb-001   npm run kdtm:flow-001:stg
 */
export function caseVuAnThucKdtm(): CaseChay<typeof INPUT_KDTM>[] {
  const bat = (process.env.QLA_VU_AN_THUC || '').trim();
  const cua = DS_BAN_AN_CONG_BO.filter(b => b.loaiDon === 'Kinh doanh, thương mại');
  const chon =
    !bat || bat === '1' || bat.toLowerCase() === 'all'
      ? cua
      : bat
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          // KHÔNG ném lỗi với mã không thuộc KDTM: cùng một biến môi trường nuôi cả hai luồng, nên
          // `QLA_VU_AN_THUC=bacb-022` (HNGĐ) phải lọt qua đây êm chứ không giết lượt chạy KDTM.
          .map(id => cua.find(x => x.id === id))
          .filter((b): b is BanAnCongBo => !!b);

  return chon.map(ba => {
    const caseId = `${maCaseTuBanAn(ba)}-kdtm`;
    const g = caseTuBanAn(ba);
    const tenNguyenDon = tenDuongSu(caseId, 'nguyenDon');
    const tenBiDon = tenDuongSu(caseId, 'biDon', 'nu');
    return {
      dd: {
        phanHe: FLOW_KDTM.phanHe,
        flow: FLOW_KDTM.flow,
        caseId,
        module: FLOW_KDTM.module,
        rootCaseKey: `${FLOW_KDTM.module}|${FLOW_KDTM.flow}|${caseId}`,
      },
      input: {
        ...g.input,
        nguyenDon: { ...INPUT_KDTM.nguyenDon, nguyenVan: tenNguyenDon, hoTen: tenNguyenDon },
        biDon: { ...INPUT_KDTM.biDon, nguyenVan: tenBiDon, hoTen: tenBiDon },
        noiDungYeuCau:
          `Đề nghị Tòa án giải quyết ${ba.tenQhpl.charAt(0).toLowerCase() + ba.tenQhpl.slice(1)} ` +
          `giữa ${tenNguyenDon} và ${tenBiDon}. ` +
          `Tham chiếu bản án số ${ba.soBanAn} ngày ${ba.ngay} của ${ba.toaAn}.`,
        tenNguoiKhangCao: tenBiDon,
        tieuDeLichXetXu: `Phiên tòa sơ thẩm kinh doanh, thương mại — ${tenNguyenDon}`,
      },
    };
  });
}
