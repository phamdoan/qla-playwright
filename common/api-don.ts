/**
 * Gọi API QLA bằng phiên đã đăng nhập — CHỈ ĐỌC (GET), không tạo/sửa dữ liệu.
 * Dùng để kiểm chứng dữ liệu bản án trên môi trường chỉ được phép đọc (STG) mà không phát sinh đơn rác.
 *
 * Token: app giữ access token trong bộ nhớ (không nằm ở localStorage), nên lấy bằng cách mở một trang
 * rồi bắt header Authorization của request đầu tiên.
 */
import { APIRequestContext, Page, expect } from '@playwright/test';
import { ORIGIN } from '../playwright.config';

export const API = `${ORIGIN}/qla/api/v1`;

/** Mở dashboard và bắt Bearer token mà FE gắn vào request */
export async function layToken(page: Page): Promise<string> {
  let token: string | undefined;
  page.on('request', r => {
    const a = r.headers()['authorization'];
    if (a && !token) token = a;
  });
  await page.goto('dashboard');
  await expect.poll(() => token, { timeout: 60_000, message: 'Không bắt được token của phiên đăng nhập' }).toBeTruthy();
  return token!;
}

const headers = (token: string) => ({ authorization: token, accept: 'application/json' });

/** "01/08/2024" → "2024-08-01" (API nhận LocalDate) */
export const ngayApi = (ddmmyyyy: string) => {
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ddmmyyyy;
};

/** Mã đơn vị của tòa theo tên (GET /don-vi?tenDonVi=…); không tìm thấy → undefined */
export async function maToaTheoTen(req: APIRequestContext, token: string, tenToa: string): Promise<string | undefined> {
  const r = await req.get(`${API}/don-vi?tenDonVi=${encodeURIComponent(tenToa)}&page=0&size=50`, { headers: headers(token) });
  if (!r.ok()) return undefined;
  const j = await r.json().catch(() => null);
  const ds: any[] = j?.data?.data || j?.data?.content || [];
  const khop = ds.find(d => (d.tenDonVi || '').trim() === tenToa.trim()) || ds[0];
  // API /don-vi trả mã ở trường "ma" (không phải "maDonVi")
  return khop?.ma || khop?.maDonVi;
}

export interface BanAnTraCuu {
  idBanAn?: string;
  idVuAn?: string;
  soBanAn?: string;
  ngayBanAn?: string;
  maDonVi?: string;
  tenDonViRaBanAn?: string;
  maVuAn?: string;
  tenVuAn?: string;
  loaiAn?: string;
  giaiDoan?: string;
  trangThaiBanAn?: string;
}

/** Tra cứu bản án cũ đúng như nút kính lúp trên màn Thêm mới đơn; không có → null */
export async function traCuuBanAnCu(
  req: APIRequestContext,
  token: string,
  t: { soBanAn: string; ngayBanAn: string; maDonVi: string; giaiDoan?: string },
): Promise<BanAnTraCuu | null> {
  const qs = new URLSearchParams({
    soBanAn: t.soBanAn,
    ngayBanAn: ngayApi(t.ngayBanAn),
    maDonVi: t.maDonVi,
    quyetDinhBanAn: 'BAN_AN',
    ...(t.giaiDoan ? { giaiDoan: t.giaiDoan } : {}),
  });
  const r = await req.get(`${API}/don/tra-cuu-ban-an-cu?${qs}`, { headers: headers(token) });
  if (!r.ok()) return null;
  return (await r.json().catch(() => null))?.data ?? null;
}

/** Người của vụ án cũ — đúng danh sách mà ô "Chọn người từ bản án cũ" đổ ra */
export async function nguoiVuAnCu(req: APIRequestContext, token: string, idVuAn: string, idBanAn?: string): Promise<string[]> {
  const r = await req.get(`${API}/don/vu-an-cu/${idVuAn}/ds-nguoi${idBanAn ? `?idBanAn=${idBanAn}` : ''}`, { headers: headers(token) });
  if (!r.ok()) return [];
  const ds: any[] = (await r.json().catch(() => null))?.data || [];
  return ds.map(x => (x.tenDoiTuongLienQuan || x.conNguoi?.conNguoi?.hoTen || '').trim()).filter(Boolean);
}

/** Cấp xét xử → giai đoạn vụ án (CAP_XET_XU_GIAI_DOAN_MAP của FE) */
export const giaiDoanTheoCap = (capXetXu: string) =>
  ({ 'Sơ thẩm': 'SO_THAM', 'Phúc thẩm': 'PHUC_THAM', 'Giám đốc thẩm': 'GIAM_DOC_THAM', 'Tái thẩm': 'GIAM_DOC_THAM' } as Record<string, string>)[capXetXu];

export interface VanBanCuaDon {
  id?: string;
  tenVanBan?: string;
  maBieuMau?: string;
  soVanBan?: string;
  trangThai?: string;
  trangThaiHienThi?: string;
  idDon?: string;
  maDon?: string;
}

/**
 * Văn bản của một đơn (tờ trình, thông báo…) — dùng để kiểm chứng kết quả cuối mà không phải
 * lọc tay trên màn Danh sách văn bản.
 * Lưu ý: API trả cả văn bản của đơn khác khi bộ lọc không được áp dụng → lọc lại theo idDon/maDon.
 */
export async function vanBanCuaDon(
  req: APIRequestContext,
  token: string,
  don: { idDon?: string; maDon?: string },
): Promise<VanBanCuaDon[]> {
  const qs = don.idDon ? `idDon=${don.idDon}` : `maDon=${encodeURIComponent(don.maDon || '')}`;
  const r = await req.get(`${API}/van-ban-trinh-ky/v2?${qs}&page=0&size=100`, { headers: { authorization: token, accept: 'application/json' } });
  if (!r.ok()) return [];
  const j = await r.json().catch(() => null);
  const ds: VanBanCuaDon[] = j?.data?.content || j?.data?.data || j?.data || [];
  if (!Array.isArray(ds)) return [];
  return ds.filter(v => (don.idDon && v.idDon === don.idDon) || (don.maDon && String(v.maDon || '') === String(don.maDon)));
}

export interface DonViVuAn {
  maDonVi?: string;
  tenDonVi?: string;
}

/**
 * Đơn vị (Tòa) của một vụ án — GET /vu-an/{id}, CHỈ ĐỌC.
 *
 * Vì sao cần: tên Tòa đọc từ đầu bản án là CHỮ HOA ("TÒA ÁN NHÂN DÂN THÀNH PHỐ HÀ NỘI" — template
 * bản án tự viết hoa), còn API tra cứu lại khớp tên/mã dạng chuẩn: `GET /don-vi?tenDonVi=<CHỮ HOA>`
 * trả rỗng (đo 02/10/2026). Lấy từ vụ án là lấy đúng dạng hệ thống lưu.
 */
export async function donViCuaVuAn(req: APIRequestContext, token: string, idVuAn: string): Promise<DonViVuAn> {
  const r = await req.get(`${API}/vu-an/${idVuAn}`, { headers: headers(token) });
  if (!r.ok()) return {};
  const d = (await r.json().catch(() => null))?.data || {};
  return {
    maDonVi: d.maDonVi || d.maDonViThuLy || d.maToaAn,
    tenDonVi: d.tenToaAn || d.tenDonViThuly || d.tenDonViThuLy || d.tenDonVi,
  };
}

/**
 * Bản án dân sự của một vụ án — GET /ban-an/dan-su/so-tham/vu-an/{idVuAn}, CHỈ ĐỌC.
 *
 * Dùng để biết CHÍNH XÁC bộ ba mà API tra cứu đòi khớp (số, ngày, mã đơn vị) + giai đoạn, thay vì
 * đoán theo chữ hiện trên lưới.
 */
export async function banAnCuaVuAn(req: APIRequestContext, token: string, idVuAn: string): Promise<Record<string, unknown>> {
  for (const duong of [`${API}/ban-an/dan-su/so-tham/vu-an/${idVuAn}`, `${API}/ban-an/dan-su/vu-an/${idVuAn}`]) {
    const r = await req.get(duong, { headers: headers(token) });
    if (!r.ok()) continue;
    const d = (await r.json().catch(() => null))?.data;
    if (d) return d as Record<string, unknown>;
  }
  return {};
}
