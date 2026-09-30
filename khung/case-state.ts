/**
 * KHUNG CASE/STEP — trạng thái một CASE chạy xuyên suốt các bước của một FLOW.
 *
 * Khác sổ cái cũ (`common/so-cai-*.ts`) ở ba điểm, đều là bài học đo được trên STG:
 *  1. Khoá là `rootCaseKey` do TEST GIEO, biết trước và bất biến — không phải số bản án (số bản án
 *     do hệ thống cấp ở bước "Lấy số", lúc tạo case chưa tồn tại).
 *  2. Đọc GỘP LIÊN THƯ MỤC (`toa-an`, `toa-an-chay-rieng-*`): mỗi bản sao một thư mục state nên
 *     lượt chạy ở thư mục B không thấy việc thư mục A đã làm → tạo trùng dữ liệu.
 *  3. Bước chỉ được đánh dấu xong khi có BẰNG CHỨNG (id/số hệ thống cấp), và bước sau chỉ chạy khi
 *     bước bắt buộc trước nó đã xong — chặn "pass giả" (đo 30/09/2026: sổ cái ghi 20/23 bước xong
 *     cho vụ thực tế chưa thụ lý).
 *
 * VỊ TRÍ FILE: `state/<phan-he>/<flow>/<case-id>.<env>[.<hau-to>].state.json`
 * (tách khỏi `seed-output/` — nơi đó là log + báo cáo của các spec cũ, lẫn lộn khó tra).
 */
import fs from 'fs';
import path from 'path';

export type TrangThaiCase = 'NEW' | 'IN_PROGRESS' | 'PASSED' | 'FAILED';
export type TrangThaiBuoc = 'NOT_RUN' | 'PASSED' | 'FAILED';

/** Định danh một case trong cây PHÂN HỆ → FLOW → CASE */
export interface DinhDanhCase {
  /** thư mục phân hệ, vd. 'kinh-doanh-thuong-mai' */
  phanHe: string;
  /** thư mục flow, vd. 'flow-001-st-pt-gdt-bao-cao' */
  flow: string;
  /** thư mục case, vd. 'case-001' */
  caseId: string;
  /** mã nghiệp vụ của phân hệ, vd. 'KINH_DOANH_THUONG_MAI' */
  module: string;
  /** khoá gieo bất biến của case, vd. 'KINH_DOANH_THUONG_MAI|flow-001|case-001' */
  rootCaseKey: string;
}

export interface CaseState {
  module: string;
  phanHe: string;
  flow: string;
  caseId: string;
  rootCaseKey: string;
  status: TrangThaiCase;
  lastPassedStep?: string;
  /** Khoá bàn giao giữa các bước — đều là OUTPUT do hệ thống cấp, không khai tay */
  duLieu: Record<string, string>;
  buoc: Record<string, { status: TrangThaiBuoc; luc?: string; loi?: string }>;
}

/** Bước bắt buộc phải xong trước mỗi bước (STEP N+1 chỉ chạy khi STEP N đã PASS) */
export type BangPhuThuoc = Record<string, string | undefined>;

export function moCase(dd: DinhDanhCase, phuThuoc: BangPhuThuoc = {}) {
  const env = process.env.QLA_ENV || 'stg';
  const hauTo = (process.env.QLA_SO_CAI_HAU_TO || '').trim();
  const tenFile = `${dd.caseId}.${env}`;
  const thuMucGoc = path.resolve(__dirname, '..', 'state', dd.phanHe, dd.flow);
  const fileGhi = path.join(thuMucGoc, `${tenFile}${hauTo ? `.${hauTo}` : ''}.state.json`);

  /** Mọi file state của case này trong MỌI thư mục chạy (chỉ để ĐỌC) */
  const dsFile = (): string[] => {
    const thuMuc = [thuMucGoc];
    // e2e/state/<phan-he>/<flow> → lùi 4 cấp là thư mục chứa các bản sao toa-an*
    const cha = path.resolve(thuMucGoc, '..', '..', '..', '..');
    try {
      for (const t of fs.readdirSync(cha).filter(t => /^toa-an(-chay-rieng-.+)?$/.test(t))) {
        const tm = path.join(cha, t, 'e2e', 'state', dd.phanHe, dd.flow);
        if (tm !== thuMucGoc && fs.existsSync(tm)) thuMuc.push(tm);
      }
    } catch {
      /* không đọc được thư mục cha thì chỉ dùng state của chính mình */
    }
    const ra: string[] = [];
    for (const tm of thuMuc) {
      if (!fs.existsSync(tm)) continue;
      for (const t of fs.readdirSync(tm).filter(t => t.startsWith(tenFile) && t.endsWith('.state.json'))) {
        ra.push(path.join(tm, t));
      }
    }
    // file của thư mục đang chạy đọc SAU CÙNG để nó ghi đè các bản sao
    return ra.sort(a => (path.dirname(a) === thuMucGoc ? 1 : -1));
  };

  const docMot = (f: string): Partial<CaseState> => {
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch {
      return {};
    }
  };

  /**
   * Gộp state của mọi thư mục chạy theo THỜI ĐIỂM, không theo thư mục.
   *
   * Trước đây thư mục đang chạy được ghi đè sau cùng, nên một bản ghi FAILED CŨ ở thư mục này che
   * mất bản PASSED MỚI ở thư mục chạy song song — đúng cái bẫy "chạy song song, mỗi bản sao một sổ".
   * Đo 30/09/2026: `toa-an` ghi bước 01 FAILED lúc 04:10, `toa-an-chay-rieng-a` ghi PASSED lúc
   * 04:31; gộp theo thư mục thì bước 01 hoá ra chưa xong, bước 02 bị chặn oan.
   *
   * Quy tắc: mỗi BƯỚC lấy bản ghi có `luc` mới nhất; `duLieu` gộp theo thứ tự file cũ → mới.
   */
  const doc = (): CaseState => {
    const goc: CaseState = { ...dd, status: 'NEW', duLieu: {}, buoc: {} };
    const moiNhat = (j: Partial<CaseState>) =>
      Math.max(0, ...Object.values(j.buoc || {}).map(b => Date.parse(b.luc || '') || 0));

    const ds = dsFile()
      .map(f => ({ f, j: docMot(f) }))
      .sort((a, b) => moiNhat(a.j) - moiNhat(b.j));

    for (const { j } of ds) {
      Object.assign(goc.duLieu, j.duLieu || {});
      for (const [ma, ban] of Object.entries(j.buoc || {})) {
        const cu = goc.buoc[ma];
        const lucCu = Date.parse(cu?.luc || '') || 0;
        const lucMoi = Date.parse(ban.luc || '') || 0;
        if (!cu || lucMoi >= lucCu) goc.buoc[ma] = ban;
      }
      if (j.lastPassedStep) goc.lastPassedStep = j.lastPassedStep;
      if (j.status) goc.status = j.status;
    }
    return goc;
  };

  const ghi = (sua: (s: CaseState) => void) => {
    const s = docMot(fileGhi) as CaseState;
    const day: CaseState = { ...dd, status: 'IN_PROGRESS', duLieu: {}, buoc: {}, ...s };
    sua(day);
    fs.mkdirSync(path.dirname(fileGhi), { recursive: true });
    fs.writeFileSync(fileGhi, JSON.stringify(day, null, 2), 'utf8');
  };

  /**
   * Bước đã xong chưa. Ném lỗi nếu state ghi xong mà bước bắt buộc trước nó chưa xong —
   * đánh dấu đó không đáng tin, không được bỏ qua.
   */
  const daXong = (ma: string): boolean => {
    const s = doc();
    if (s.buoc[ma]?.status !== 'PASSED') return false;
    const truoc = phuThuoc[ma];
    if (truoc && s.buoc[truoc]?.status !== 'PASSED') {
      throw new Error(
        `State mâu thuẫn: ${dd.caseId} ghi đã xong "${ma}" nhưng bước bắt buộc trước "${truoc}" chưa xong ` +
          `→ đánh dấu không đáng tin, không bỏ qua. Kiểm tra trên hệ thống rồi chạy lại "${truoc}".`,
      );
    }
    return true;
  };

  /** Chặn chạy bước khi bước trước chưa xong */
  const canXong = (ma: string) => {
    const truoc = phuThuoc[ma];
    if (!truoc) return;
    const s = doc();
    if (s.buoc[truoc]?.status !== 'PASSED') {
      throw new Error(
        `${dd.caseId} chưa chạy được "${ma}". Bước bắt buộc: "${truoc}" — trạng thái hiện tại: ` +
          `${s.buoc[truoc]?.status || 'NOT_RUN'}.`,
      );
    }
  };

  /** Đánh dấu xong KÈM bằng chứng (id/số do hệ thống cấp). Không có bằng chứng thì không cho ghi. */
  const xongBuoc = (ma: string, bangChung: Record<string, string>) => {
    const co = Object.entries(bangChung).filter(([, v]) => v && v.trim());
    if (!co.length) {
      throw new Error(`Bước "${ma}" không có bằng chứng nào (id/số hệ thống cấp) → không được ghi là xong.`);
    }
    ghi(s => {
      for (const [k, v] of co) s.duLieu[k] = v;
      s.buoc[ma] = { status: 'PASSED', luc: new Date().toISOString() };
      s.lastPassedStep = ma;
      s.status = 'IN_PROGRESS';
    });
  };

  const hongBuoc = (ma: string, loi: string) =>
    ghi(s => {
      s.buoc[ma] = { status: 'FAILED', luc: new Date().toISOString(), loi: loi.slice(0, 500) };
      s.status = 'FAILED';
    });

  return { doc, daXong, canXong, xongBuoc, hongBuoc, duongDan: fileGhi };
}
