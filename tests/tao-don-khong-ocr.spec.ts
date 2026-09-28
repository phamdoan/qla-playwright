/**
 * ███ SEED DATA – NGUY HIỂM: TẠO ĐƠN THẬT TRÊN MÔI TRƯỜNG ███  (KHÔNG phải test regression)
 *
 * Tạo 20 "Đơn đề nghị GĐT/TT" KHÔNG QUA OCR, NHẬP ĐẦY ĐỦ mọi khối, đi hoàn toàn bằng giao diện như cán bộ HCTP:
 *   Đăng nhập → menu Quản lý đơn › Danh sách đơn → "Thêm mới" → tải file đơn PDF (bắt buộc)
 *   → popup "Xác nhận xử lý OCR" bấm "Quay lại" (nhập thủ công, không OCR) → nhập form, địa chỉ bì thư, người đứng đơn
 *   đầy đủ, bản án sơ thẩm, kết quả giải quyết, đơn thụ lý kèm, đương sự (cá nhân / UBND / doanh nghiệp) → "Lưu thông tin"
 *   4 luồng song song: mỗi test là một lô 4 đơn, 4 trình duyệt cùng tài khoản; điền ngay (không gõ từng ký tự).
 *   → xác nhận: API luu-don-nhap-dong-thoi success + toast "Lưu thông tin thành công"
 *     + mở lại đơn (/them-moi/<id>) thấy "Mã đơn" và giá trị các trường khớp.
 *
 * ĐANG TẮT: đuôi .seed.ts không khớp testMatch (*.spec.ts) nên `npx playwright test` / UI mode không nhìn thấy file này.
 * Muốn chạy: đổi tên thành tao-don-khong-ocr.spec.ts, chạy xong đổi lại .seed.ts.
 *   npm run dev -- tao-don-khong-ocr --project=chromium   (số hồ sơ: sửa hằng SO_LUONG bên dưới, mặc định 20)
 * Script tự chặn nếu môi trường không phải dev/stg/uat/local (production & host lạ → dừng ngay).
 *
 * Dữ liệu ghi vào hệ thống trông như đơn thật: KHÔNG ghi marker hay chữ "demo" vào bất kỳ trường / file đính kèm nào.
 * Idempotency: marker PW_DEMO_NO_OCR_20260922_<nnn> chỉ dùng nội bộ (tên test, log, sổ cái local).
 * Mỗi đơn tạo thành công được ghi NGAY vào sổ cái seed-output/<...>.<host>.ledger.json (khi API lưu trả id);
 * chạy lại → hồ sơ đã có trong sổ cái được đánh dấu SKIPPED_EXISTING. Xoá sổ cái = chạy lại sẽ tạo trùng.
 */
import { Browser, BrowserContext, Page, TestInfo, chromium, expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { Vai, authFileVai, credentialsVai } from '../account';
import { datTocDoGo, toastDaHien } from '../common/antd';
import { DiaChiDayDu, NguoiDayDu, PhapNhanDayDu } from '../common/form-nguoi';
import { loginSSO } from '../common/login';
import { moTrangVai, veTrangChu } from '../common/vai';
import { ThemMoiDonPage } from '../pages/them-moi-don.page';
import { ORIGIN } from '../playwright.config';
import {
  DiaChiSeed, HoSoSeed, NguoiSeed, PhapNhanSeed, SEED, bienDiaDanh, chonTheoSo, htmlDon,
  taoDanhSachHoSo, tenFileDon, thayDiaDanh, thongTinDon,
} from '../seed/du-lieu-don-khong-ocr';

// ───────────────────────────── Cổng an toàn ─────────────────────────────

/** Số hồ sơ cần tạo (1..3000); chạy thử thì sửa thành 4 */
const SO_LUONG = 20;
/** Số trình duyệt nhập đơn song song (mỗi lô = số đơn này) */
const SO_LUONG_SONG_SONG = 4;
const TAGS = ['@seed', '@seed-don', '@no-ocr'];

/**
 * Host được phép seed (theo playwright.config.ts MOI_TRUONG + chạy local). Mọi host khác → FAIL CLOSED.
 * Production thật (qla-webapp/.env.production) là e-qlta.toaan.gov.vn, pre-prod (.env.pre-prod) là e-qlta-uat.toaan.gov.vn;
 * qla-cd.toaan.gov.vn là môi trường DB chuyển đổi dùng đo hiệu năng — đều KHÔNG nằm trong danh sách.
 */
const HOST_CHO_PHEP: Record<string, string> = {
  'qla-dev.toaan.gov.vn': 'dev',
  'qla-stg.toaan.gov.vn': 'stg',
  'qla-uat.toaan.gov.vn': 'uat',
  localhost: 'local',
  '127.0.0.1': 'local',
};
const HOST_PRODUCTION = ['e-qlta.toaan.gov.vn', 'e-qlta-uat.toaan.gov.vn', 'qla.toaan.gov.vn'];

/** Trả về tên môi trường nếu host an toàn; ngược lại ném lỗi (fail closed) */
function moiTruongAnToan(url: string | undefined, noi: string): string {
  let host: string;
  try {
    host = new URL(url || '').hostname.toLowerCase();
  } catch {
    throw new Error(`[SEED] Không xác định được môi trường từ ${noi} ("${url}") → DỪNG (fail closed).`);
  }
  if (HOST_PRODUCTION.includes(host) || host.startsWith('e-qlta')) {
    throw new Error(`[SEED] ${noi} trỏ tới PRODUCTION/PRE-PROD (${host}) → TUYỆT ĐỐI KHÔNG SEED.`);
  }
  const env = HOST_CHO_PHEP[host];
  if (!env) {
    throw new Error(
      `[SEED] Host "${host}" (${noi}) không nằm trong danh sách môi trường được phép seed ` +
        `(${Object.keys(HOST_CHO_PHEP).join(', ')}) → DỪNG (fail closed).`,
    );
  }
  return env;
}

// ───────────────────────────── Sổ cái & kết quả ─────────────────────────────

const HOST = (() => {
  try {
    return new URL(ORIGIN).hostname;
  } catch {
    return 'khong-ro-host';
  }
})();
const THU_MUC_KQ = path.resolve(__dirname, '../seed-output');
const FILE_SO_CAI = path.join(THU_MUC_KQ, `don-no-ocr-${SEED}.${HOST}.ledger.json`);
/** Kết quả theo ngày chạy (worker khởi động lại sau lỗi vẫn ghi chung file) */
const FILE_LAN_CHAY = path.join(THU_MUC_KQ, `don-no-ocr-${SEED}.${HOST}.run-${new Date().toLocaleDateString('sv-SE')}.json`);

interface DongSoCai {
  index: number;
  marker: string;
  idDon: string;
  maDon?: string;
  nguoiDungDon: string;
  origin: string;
  luc: string;
}
type TrangThai = 'CREATED' | 'SKIPPED_EXISTING' | 'FAILED';
interface KetQua {
  index: number;
  marker: string;
  nguoiDungDon: string;
  trangThai: TrangThai;
  idDon?: string;
  maDon?: string;
  buoc?: string;
  giaTri?: string;
  url?: string;
  loi?: string;
  canhBao?: string[];
}

const docJson = <T>(file: string): T => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : ({} as T));
function ghiJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tam = `${file}.tmp`;
  fs.writeFileSync(tam, JSON.stringify(data, null, 2));
  fs.renameSync(tam, file);
}
const docSoCai = () => docJson<Record<string, DongSoCai>>(FILE_SO_CAI);
function ghiSoCai(d: DongSoCai) {
  ghiJson(FILE_SO_CAI, { ...docSoCai(), [d.marker]: { ...docSoCai()[d.marker], ...d } });
}
function ghiKetQua(k: KetQua) {
  ghiJson(FILE_LAN_CHAY, { ...docJson<Record<string, KetQua>>(FILE_LAN_CHAY), [k.index]: k });
}

// ───────────────────────────── Danh mục thật ─────────────────────────────

interface DanhMuc {
  ma: string;
  ten: string;
}
/** Mã quốc gia Việt Nam trong QTDM (qla-webapp .env*: VITE_MA_QUOC_GIA_VIET_NAM=250) */
const MA_VIET_NAM = '250';

/**
 * Danh mục địa danh sau sáp nhập — đúng API mà AddressSelector của màn Thêm mới đơn gọi
 * (qla-webapp services/danhmuc getDanhMucTheoCha: GET {qtdm}/danh-muc?maDanhMucCha=..&size=999&ngayHieuLuc=2025-07-02).
 * Chỉ ĐỌC; sắp theo mã để lựa chọn tất định.
 */
async function docDanhMuc(page: Page, maCha: string): Promise<DanhMuc[]> {
  const url = `${ORIGIN}/qtdm/api/v1/danh-muc?maDanhMucCha=${encodeURIComponent(maCha)}&size=999&ngayHieuLuc=2025-07-02`;
  const res = await page.request.get(url);
  expect(res.ok(), `Đọc danh mục ${maCha} lỗi HTTP ${res.status()} (${url})`).toBeTruthy();
  const body = await res.json();
  const ds: DanhMuc[] = (body?.data?.data ?? []).filter((x: DanhMuc) => x?.ma && x?.ten);
  if (!ds.length) throw new Error(`Danh mục con của "${maCha}" rỗng (${url})`);
  return ds.sort((a, b) => a.ma.localeCompare(b.ma));
}


// ───────────────────────────── Chuyển dữ liệu seed → giá trị danh mục thật ─────────────────────────────

let dsTinh: DanhMuc[] = [];
const xaTheoTinh = new Map<string, Promise<DanhMuc[]>>();
const xaCua = (page: Page, maTinh: string) => {
  if (!xaTheoTinh.has(maTinh)) xaTheoTinh.set(maTinh, docDanhMuc(page, maTinh));
  return xaTheoTinh.get(maTinh)!;
};

/** Chọn Tỉnh / Phường-Xã thật theo số [0,1); `giongHienTai` → dùng tỉnh/xã của nơi ở hiện tại, giữ số nhà riêng */
async function giaiDiaChi(page: Page, ds: DiaChiSeed, hienTai?: DiaChiDayDu): Promise<DiaChiDayDu> {
  if (ds.giongHienTai && hienTai) return { tinh: hienTai.tinh, xa: hienTai.xa, soNha: ds.soNha };
  const tinh = chonTheoSo(dsTinh, ds.uTinh);
  const xa = chonTheoSo(await xaCua(page, tinh.ma), ds.uXa);
  return { tinh: tinh.ten, xa: xa.ten, soNha: ds.soNha };
}

async function giaiNguoi(page: Page, n: NguoiSeed): Promise<NguoiDayDu> {
  const hienTai = await giaiDiaChi(page, n.hienTai);
  const bien = bienDiaDanh(hienTai.tinh, hienTai.xa);
  return {
    ...n,
    noiLamViec: thayDiaDanh(n.noiLamViec, bien),
    noiSinh: await giaiDiaChi(page, n.noiSinh, hienTai),
    queQuan: await giaiDiaChi(page, n.queQuan, hienTai),
    hktt: await giaiDiaChi(page, n.hktt, hienTai),
    tamTru: await giaiDiaChi(page, n.tamTru, hienTai),
    hienTai,
  };
}

async function giaiPhapNhan(page: Page, pn: PhapNhanSeed, hienTaiDungDon: DiaChiDayDu): Promise<PhapNhanDayDu> {
  const truSo = await giaiDiaChi(page, pn.truSo, hienTaiDungDon);
  const bien = bienDiaDanh(truSo.tinh, truSo.xa);
  const thay = (s?: string) => (s === undefined ? undefined : thayDiaDanh(s, bien));
  return {
    ...pn,
    ten: thay(pn.ten)!,
    tenEn: thay(pn.tenEn)!,
    tenVietTat: thay(pn.tenVietTat)!,
    coQuanCapChungNhan: thay(pn.coQuanCapChungNhan),
    truSo,
    lienLac: truSo,
  };
}

// ───────────────────────────── Suite ─────────────────────────────

const DS_HO_SO = taoDanhSachHoSo(SO_LUONG); // ném lỗi rõ ràng nếu SO_LUONG sai
const VAI_SEED: Vai = 'CANBO'; // Cán bộ HCTP – tài khoản QLA_CANBO_USER trong file env
const DO_DAI = String(SO_LUONG).length;
const nhan = (h: HoSoSeed) => `[${String(h.index).padStart(DO_DAI, '0')}/${SO_LUONG}]`;
const SO_LO = Math.ceil(DS_HO_SO.length / SO_LUONG_SONG_SONG);

/** Một "cán bộ" nhập đơn: trình duyệt (context) riêng, đăng nhập cùng tài khoản */
interface LuongNhap {
  so: number;
  context: BrowserContext;
  page: Page;
}

test.describe(`[SEED DATA] Tạo ${SO_LUONG} đơn không qua OCR`, { tag: TAGS }, () => {
  // Các lô chạy tuần tự trong MỘT worker (mỗi lô 4 đơn song song trên 4 trình duyệt); không retry (tránh tạo trùng)
  test.describe.configure({ mode: 'default', retries: 0 });

  const luong: LuongNhap[] = [];
  let trinhDuyetPdf: Browser;

  test.beforeAll(async ({ browser }, testInfo) => {
    test.setTimeout(10 * 60_000);
    // Kiểm tra môi trường TRƯỚC khi mở trình duyệt / đăng nhập
    moiTruongAnToan(ORIGIN, 'QLA_ENV/ORIGIN');
    moiTruongAnToan(testInfo.project.use.baseURL, 'baseURL');
    datTocDoGo(0); // điền ngay (vẫn thao tác trên UI), không gõ từng ký tự
    for (let so = 1; so <= SO_LUONG_SONG_SONG; so++) {
      const { context, page } = await moTrangVai(browser, testInfo, VAI_SEED);
      moiTruongAnToan(page.url(), `URL sau đăng nhập (luồng ${so})`);
      // Trace theo từng hồ sơ, chỉ lưu khi hồ sơ lỗi (context tự tạo nên không có trace/screenshot tự động).
      // Chạy bằng Playwright UI thì UI đã bật trace sẵn cho mọi context → start lần nữa sẽ lỗi
      // "Tracing has been already started"; bỏ qua và dùng luôn trace của UI.
      await context.tracing
        .start({ screenshots: true, snapshots: true })
        .catch(e => console.warn(`[SEED] Trace đã bật sẵn (đang chạy bằng UI?), dùng tiếp: ${e}`));
      luong.push({ so, context, page });
    }
    trinhDuyetPdf = await chromium.launch(); // luôn headless để in PDF đơn, kể cả khi chạy --headed
    dsTinh = await docDanhMuc(luong[0].page, MA_VIET_NAM);
    console.log(
      `[SEED] Môi trường ${moiTruongAnToan(ORIGIN, 'ORIGIN')} (${ORIGIN}), vai ${VAI_SEED}, ${SO_LUONG} hồ sơ, ` +
        `${SO_LUONG_SONG_SONG} luồng, ${dsTinh.length} tỉnh/thành. Sổ cái: ${FILE_SO_CAI}`,
    );
  });

  test.afterAll(async () => {
    for (const l of luong) {
      await l.context.tracing.stop().catch(() => {}); // UI tự quản trace thì không dừng được, bỏ qua
      await l.context.close();
    }
    luong.length = 0;
    await trinhDuyetPdf?.close();
  });

  for (let lo = 0; lo < SO_LO; lo++) {
    const hsLo = DS_HO_SO.slice(lo * SO_LUONG_SONG_SONG, (lo + 1) * SO_LUONG_SONG_SONG);
    const tieuDe = `[Lô ${String(lo + 1).padStart(String(SO_LO).length, '0')}/${SO_LO}] đơn ${hsLo[0].index}–${hsLo[hsLo.length - 1].index}: ${hsLo.map(h => h.nguoi.hoTen).join(', ')}`;
    test(tieuDe, async ({}, testInfo) => {
      test.setTimeout(40 * 60_000);
      const kq = await Promise.all(hsLo.map((hs, k) => taoMotDon(luong[k], hs, testInfo)));
      for (const k of kq) testInfo.annotations.push({ type: `${k.index} ${k.trangThai}`, description: `${k.nguoiDungDon}${k.maDon ? ` – mã đơn ${k.maDon}` : ''}${k.loi ? ` – ${k.loi}` : ''}` });
      const loi = kq.filter(k => k.trangThai === 'FAILED');
      if (loi.length) throw new Error(loi.map(k => k.chiTietLoi).join('\n\n'));
      test.skip(kq.every(k => k.trangThai === 'SKIPPED_EXISTING'), 'SKIPPED_EXISTING: cả lô đã tạo trước đó');
    });
  }

  test(`[SEED DATA] Tổng hợp kết quả`, async ({}, testInfo) => {
    const kq = docJson<Record<string, KetQua>>(FILE_LAN_CHAY);
    const ds = DS_HO_SO.map(h => kq[h.index]);
    const dem = (t: TrangThai) => ds.filter(k => k?.trangThai === t).length;
    const loi = ds.filter((k): k is KetQua => k?.trangThai === 'FAILED');
    const chuaChay = DS_HO_SO.filter(h => !kq[h.index]);
    const lech = ds.filter(k => k?.trangThai === 'CREATED' && k.canhBao?.length);
    const baoCao = [
      `===== [SEED DATA] Tạo đơn không qua OCR – ${ORIGIN} =====`,
      `Requested: ${SO_LUONG}`,
      `Created: ${dem('CREATED')}${lech.length ? ` (trong đó ${lech.length} có cảnh báo khi kiểm tra lại)` : ''}`,
      `Skipped: ${dem('SKIPPED_EXISTING')}`,
      `Failed: ${loi.length}`,
      ...(chuaChay.length ? [`Chưa chạy trong ngày: ${chuaChay.length}`] : []),
      ...loi.map(k => `  - [${k.index}] ${k.marker} | Bước: ${k.buoc} | Giá trị: ${k.giaTri} | ${k.loi}${k.idDon ? ` | ĐƠN ĐÃ LƯU id=${k.idDon}` : ''}`),
      ...lech.map(k => `  ! [${k.index}] ${k.marker} mã đơn ${k.maDon}: ${k.canhBao!.join('; ')}`),
      `Chi tiết: ${FILE_LAN_CHAY}`,
      `Sổ cái (idempotency): ${FILE_SO_CAI}`,
    ].join('\n');
    console.log(baoCao);
    fs.writeFileSync(FILE_LAN_CHAY.replace(/\.json$/, '.summary.txt'), baoCao);
    await testInfo.attach('tong-hop.txt', { body: baoCao, contentType: 'text/plain' });
    await testInfo.attach('ket-qua.json', { body: JSON.stringify(ds, null, 2), contentType: 'application/json' });
    expect(loi.length, `Có ${loi.length} hồ sơ lỗi – xem danh sách ở trên`).toBe(0);
  });

  // ───────────────────────────── Một hồ sơ (không ném lỗi: trả KetQua để lô vẫn chạy đủ 4 đơn) ─────────────────────────────

  async function taoMotDon(l: LuongNhap, hs: HoSoSeed, testInfo: TestInfo): Promise<KetQua & { chiTietLoi?: string }> {
    const { page, context } = l;
    const kq: KetQua & { chiTietLoi?: string } = { index: hs.index, marker: hs.marker, nguoiDungDon: hs.nguoi.hoTen, trangThai: 'FAILED', canhBao: [] };
    const daCo = docSoCai()[hs.marker];
    if (daCo) {
      Object.assign(kq, { trangThai: 'SKIPPED_EXISTING', idDon: daCo.idDon, maDon: daCo.maDon });
      ghiKetQua(kq);
      console.log(`${nhan(hs)} SKIPPED_EXISTING ${hs.marker} (mã đơn ${daCo.maDon ?? '?'}, id ${daCo.idDon})`);
      return kq;
    }
    const trang = new ThemMoiDonPage(page); // mới cho từng đơn: danh sách kiểm tra bảng không dồn từ đơn trước
    const nk = { buoc: '', giaTri: '' };
    const buoc = <T>(ten: string, giaTri: string, fn: () => Promise<T>) => {
      nk.buoc = ten;
      nk.giaTri = giaTri;
      return test.step(`${nhan(hs)} ${ten}`, fn);
    };

    // Ghi sổ cái NGAY khi backend trả id (trước mọi bước kiểm tra sau) → lỗi phía sau vẫn không tạo trùng khi chạy lại
    const khiLuu = async (res: import('@playwright/test').Response) => {
      if (!res.url().includes('/don/luu-don-nhap-dong-thoi') || res.request().method() !== 'POST') return;
      const body = await res.json().catch(() => undefined);
      if (!body?.success || !body?.data?.id) return;
      kq.idDon = body.data.id;
      kq.maDon = body.data.maDon;
      ghiSoCai({ index: hs.index, marker: hs.marker, idDon: body.data.id, maDon: body.data.maDon, nguoiDungDon: hs.nguoi.hoTen, origin: ORIGIN, luc: new Date().toISOString() });
    };
    page.on('response', khiLuu);
    await context.tracing.startChunk({ title: hs.marker }).catch(() => {}); // UI tự quản trace thì bỏ qua

    try {
      // Địa danh, đương sự: chọn trên danh mục thật
      const ct = hs.chiTiet;
      const dd = await buoc('Chọn địa danh thật cho các địa chỉ', hs.nguoi.hoTen, () => giaiNguoi(page, ct.nguoiDungDon));
      const lienQuan = await giaiNguoi(page, ct.nguoiLienQuan);
      const khac: Ai = 'nguoi' in ct.benKhac ? { nguoi: await giaiNguoi(page, ct.benKhac.nguoi) } : { phapNhan: await giaiPhapNhan(page, ct.benKhac.phapNhan, dd.hienTai) };
      const d = thongTinDon(hs, dd.hienTai.tinh, dd.hienTai.xa);

      await buoc('Mở Quản lý đơn › Danh sách đơn → Thêm mới', 'menu', async () => {
        // Về trang chủ (tải lại trang) để không bị modal/form dở của hồ sơ trước chặn; phiên SSO hết hạn thì đăng nhập lại
        await veTrangChu(page);
        if (/sso/.test(page.url())) {
          const cred = credentialsVai(VAI_SEED)!;
          await loginSSO(page, cred.user, { pass: cred.pass });
          await context.storageState({ path: authFileVai(VAI_SEED) });
        }
        await trang.moTuDanhSachDon({ quaMenu: true });
        moiTruongAnToan(page.url(), 'URL màn Thêm mới'); // chặn lần cuối trước khi nhập/lưu
      });

      const pdf = await buoc('Sinh file đơn PDF', tenFileDon(hs), async () => {
        const p = await trinhDuyetPdf.newPage();
        try {
          await p.setContent(htmlDon(hs, `${dd.hienTai.soNha}, ${dd.hienTai.xa}, ${dd.hienTai.tinh}`, `Tòa án nhân dân ${d.toaAn}`));
          return await p.pdf({ format: 'A4', margin: { top: '18mm', bottom: '18mm' } });
        } finally {
          await p.close();
        }
      });
      await buoc('Tải lên file đơn (tên, số, ngày văn bản)', tenFileDon(hs), () =>
        trang.taiLenFileDon(
          { name: tenFileDon(hs), mimeType: 'application/pdf', buffer: pdf },
          `Đơn đề nghị giám đốc thẩm - ${hs.nguoi.hoTen}`,
          { so: hs.soDen, ngay: hs.ngayGhiTrenDon },
        ),
      );
      await buoc('Xác nhận xử lý OCR → Quay lại (nhập thủ công, KHÔNG OCR)', 'Quay lại', () => trang.boQuaOcr());

      await buoc('Chọn Hình thức nhận', hs.hinhThucNhan, () => trang.datHinhThucNhan(hs.hinhThucNhan));
      await buoc('Chọn Loại án', d.loaiAn, () => trang.datLoaiAn(d));
      await buoc('Chọn Cấp xét xử', d.capXetXu, () => trang.datCapXetXu(d));
      await buoc('Địa chỉ liên lạc', `${dd.hienTai.tinh} / ${dd.hienTai.xa}`, () => trang.datDiaChiLienLac(d));
      await buoc('Địa chỉ bì thư', `${dd.hienTai.tinh} / ${dd.hienTai.xa}`, () => trang.datDiaChiBiThu(dd.hienTai));
      const daDien = await buoc('Nhập thông tin đơn, người đứng đơn, nội dung', hs.nguoi.hoTen, () => trang.dienTruongThieu(d));
      testInfo.annotations.push({ type: `${hs.index} trường đã nhập`, description: daDien.join(', ') });
      await buoc('Sửa người đứng đơn: nhập đầy đủ thông tin cá nhân', hs.nguoi.hoTen, () => trang.suaNguoiDungDonDayDu(dd, hs.tuCach));
      await buoc('Chọn Tư cách tố tụng, Đơn vị chuyển đến', `${d.tuCach} / Vụ GĐKT về ${d.donViChuyenDen}`, () => trang.datTuCachVaDonViNhan(d));

      await buoc('Tra cứu bản án', d.soBanAn, () => trang.traCuuBanAn());
      const banAn = await buoc('Thêm bản án sơ thẩm liên quan', d.banAnSoTham.so, () => trang.themBanAnLienQuan(d));
      if (banAn !== 'đã thêm') kq.canhBao!.push(`Bản án liên quan: ${banAn}`);
      await buoc('Thêm kết quả giải quyết liên quan', d.ketQua.so, () => trang.themKetQuaGiaiQuyet(d));
      await buoc('Thêm đơn thụ lý kèm', d.donThuLyKem.soDen, () => trang.themDonThuLyKem(d));
      // Ô chỉ hiện khi đơn có cờ đề nghị xem xét thông báo (điều kiện nghiệp vụ); không hiện thì bỏ qua
      await buoc('Chọn Chuyển đến Vụ trưởng (nếu có)', 'Vụ trưởng theo danh sách', () => trang.chonVuTruongNhan());

      for (const v of phanVai(hs, dd, khac, lienQuan)) {
        const ten = 'nguoi' in v.ai ? v.ai.nguoi.hoTen : v.ai.phapNhan.ten;
        await buoc(`Người tham gia tố tụng: ${v.bang}`, ten, () => trang.themDuongSuDayDu(v.bang, v.drawer, v.ai, v.tuCach, v.toiDanh));
      }
      if (hs.loaiAn === 'Hình sự') {
        const biCao = hs.tuCach === 'Bị cáo' ? dd.hoTen : 'nguoi' in khac ? khac.nguoi.hoTen : '';
        await buoc('Thêm thông tin khiếu nại', `${dd.hoTen} → ${biCao}`, () => trang.themThongTinKhieuNai(dd.hoTen, biCao, ct.noiDungKhieuNai));
      }

      const idDon = await buoc('Lưu thông tin', 'Lưu thông tin', () => trang.luu(d));
      await buoc('Xác nhận API lưu thành công', idDon, async () => {
        await expect.poll(() => kq.idDon, { message: 'Không thấy response thành công của /don/luu-don-nhap-dong-thoi', timeout: 15_000 }).toBe(idDon);
      });
      // File đơn lưu vào hồ sơ số hoá sau khi lưu đơn; lỗi thì FE báo warning nhưng đơn vẫn tạo
      await toastDaHien(page, 'chưa lưu được file đơn vào hồ sơ số hóa', 3_000, undefined, 60_000)
        .then(() => kq.canhBao!.push('File đơn chưa lưu được vào hồ sơ số hóa'))
        .catch(() => {});

      const { maDon, ketQua } = await buoc('Mở lại đơn, kiểm tra mã đơn, các trường và các bảng', idDon, () => trang.kiemTraSauLuu());
      expect(maDon, 'Mở lại đơn nhưng không đọc được Mã đơn').toBeTruthy();
      kq.maDon = maDon;
      for (const t of ketQua.truong) if (t.sau !== t.truoc) kq.canhBao!.push(`${t.ten}: "${t.truoc}" → "${t.sau}"`);
      for (const b of ketQua.bang) if (!b.co) kq.canhBao!.push(`Bảng "${b.ten}" không thấy "${b.canCo}" khi mở lại`);
      ghiSoCai({ index: hs.index, marker: hs.marker, idDon, maDon, nguoiDungDon: hs.nguoi.hoTen, origin: ORIGIN, luc: new Date().toISOString() });

      kq.trangThai = 'CREATED';
      ghiKetQua(kq);
      const toa = ketQua.truong.find(t => t.ten === 'Tòa án ra bản án')?.sau ?? '';
      console.log(`${nhan(hs)} CREATED ${hs.marker} → mã đơn ${maDon} | ${hs.nguoi.hoTen} | ${d.loaiAn} | ${dd.hienTai.tinh} / ${dd.hienTai.xa} | ${toa}${kq.canhBao!.length ? ` | cảnh báo: ${kq.canhBao!.join('; ')}` : ''}`);
      await context.tracing.stopChunk().catch(() => {}); // thành công: bỏ trace
    } catch (e) {
      const loi = e instanceof Error ? e.message.split('\n')[0] : String(e);
      Object.assign(kq, { trangThai: 'FAILED', buoc: nk.buoc, giaTri: nk.giaTri, url: page.url(), loi });
      ghiKetQua(kq);
      const traceFile = testInfo.outputPath(`trace-${hs.index}.zip`);
      await context.tracing.stopChunk({ path: traceFile }).then(
        () => testInfo.attachments.push({ name: `trace-${hs.index}`, path: traceFile, contentType: 'application/zip' }),
        t => console.warn(`[SEED] Không lưu được trace: ${t}`),
      );
      await testInfo.attach(`screenshot-${hs.index}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' }).catch(s =>
        console.warn(`[SEED] Không chụp được màn hình: ${s}`),
      );
      kq.chiTietLoi = [
        `${nhan(hs)} FAILED (luồng ${l.so})`,
        `Marker: ${hs.marker}`,
        `Người đứng đơn: ${hs.nguoi.hoTen}`,
        `Step: ${nk.buoc}`,
        `Value: ${nk.giaTri}`,
        `URL: ${page.url()}`,
        `Reason: ${loi}`,
        ...(kq.idDon ? [`LƯU Ý: đơn ĐÃ được lưu (id ${kq.idDon}, mã ${kq.maDon ?? '?'}) và đã ghi sổ cái → chạy lại sẽ SKIPPED_EXISTING`] : []),
      ].join('\n');
      console.error(kq.chiTietLoi);
    } finally {
      page.off('response', khiLuu);
    }
    return kq;
  }
});

// ───────────────────────────── Vai trò các bên theo loại án ─────────────────────────────

type Ai = { nguoi: NguoiDayDu } | { phapNhan: PhapNhanDayDu };
const BANG = {
  NGUYEN_DON: ['Nguyên đơn/Người khởi kiện', 'Thêm nguyên đơn/người khởi kiện'],
  BI_DON: ['Bị đơn/Người bị kiện', 'Thêm bị đơn/người bị kiện'],
  LIEN_QUAN: ['Người có quyền lợi, nghĩa vụ liên quan', 'Thêm người có quyền lợi, nghĩa vụ liên quan'],
  BI_CAO: ['Danh sách bị cáo', 'Thêm bị cáo'],
} as const;
/**
 * Từ khoá tìm tội danh trong ô "Tội danh" (lọc theo tên hành vi của bộ luật đang chọn): dùng phần cốt lõi để khớp
 * cách viết của từng bộ luật (vd. BLHS cũ: "vi phạm quy định về điều khiển phương tiện giao thông đường bộ").
 */
const TU_KHOA_TOI_DANH: Record<string, string> = {
  'Lừa đảo chiếm đoạt tài sản': 'Lừa đảo',
  'Cố ý gây thương tích': 'Cố ý gây thương tích',
  'Trộm cắp tài sản': 'Trộm cắp tài sản',
  'Vi phạm quy định về tham gia giao thông đường bộ': 'giao thông đường bộ',
  'Lạm dụng tín nhiệm chiếm đoạt tài sản': 'Lạm dụng tín nhiệm',
  'Tàng trữ trái phép chất ma túy': 'Tàng trữ trái phép chất ma',
};
const TU_CACH_LIEN_QUAN = 'Người có quyền lợi, nghĩa vụ liên quan';

/**
 * Xếp người đứng đơn / bên kia / người liên quan vào đúng bảng:
 * - Hình sự: bị cáo = người đứng đơn (nếu là bị cáo) hoặc bên kia (khi người đứng đơn là bị hại), kèm tội danh.
 * - Còn lại: theo tư cách của người đứng đơn; bên kia là UBND (hành chính) / doanh nghiệp (KDTM, lao động) / cá nhân.
 */
function phanVai(hs: HoSoSeed, dd: NguoiDayDu, khac: Ai, lienQuan: NguoiDayDu) {
  const dong = (b: readonly [string, string], ai: Ai, tuCach?: string, toiDanh?: string) => ({ bang: b[0], drawer: b[1], ai, tuCach, toiDanh });
  if (hs.loaiAn === 'Hình sự') return [dong(BANG.BI_CAO, hs.tuCach === 'Bị cáo' ? { nguoi: dd } : khac, 'Bị cáo', TU_KHOA_TOI_DANH[hs.quanHePhapLuat] ?? hs.quanHePhapLuat)];
  const toi: Ai = { nguoi: dd };
  const lq: Ai = { nguoi: lienQuan };
  if (hs.tuCach === 'Nguyên đơn') return [dong(BANG.NGUYEN_DON, toi), dong(BANG.BI_DON, khac), dong(BANG.LIEN_QUAN, lq, TU_CACH_LIEN_QUAN)];
  if (hs.tuCach === 'Bị đơn') return [dong(BANG.NGUYEN_DON, khac), dong(BANG.BI_DON, toi), dong(BANG.LIEN_QUAN, lq, TU_CACH_LIEN_QUAN)];
  // Người đứng đơn là người có quyền lợi, nghĩa vụ liên quan
  return 'phapNhan' in khac
    ? [dong(BANG.NGUYEN_DON, lq), dong(BANG.BI_DON, khac), dong(BANG.LIEN_QUAN, toi, TU_CACH_LIEN_QUAN)]
    : [dong(BANG.NGUYEN_DON, khac), dong(BANG.BI_DON, lq), dong(BANG.LIEN_QUAN, toi, TU_CACH_LIEN_QUAN)];
}
