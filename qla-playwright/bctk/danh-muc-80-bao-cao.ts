/**
 * 81 BIỂU MẪU BÁO CÁO THỐNG KÊ — danh mục chính thức.
 *
 * TỆP NÀY SINH TỰ ĐỘNG, đừng sửa tay: `node tools/bctk/sinh-danh-muc.js`.
 * Nguồn: sheet "Báo cáo tổng hợp" của `80 báo cáo.xlsx` (tài liệu của BA), chụp 04/10/2026.
 *
 * Dùng để làm gì: đây là TRỤC để đo độ phủ dữ liệu. Một luồng Playwright chạy xanh chỉ có nghĩa
 * khi số liệu nó sinh ra rơi vào một ô của một trong các biểu mẫu này — xem `bctk/ban-do-luong.ts`.
 *
 * Số biểu mẫu theo nhóm:
 *   Hình sự: 26 (1A, 1A1, 1B, 1B1, 1C, 1C1, 1D, 1D1, 1E, 1F, 1G, 1H, 1I, 1K, 1L, 1M, 1N, 1O, 1P, 1Q, 1R, 1S, 1T, 1U, 1V, 1X)
 *   Dân sự: 5 (2A, 2B, 2C, 2D, 2E)
 *   HNGD: 4 (3A, 3B, 3C, 3D)
 *   KDTM: 8 (4A, 4B, 4C, 4D, 4E, 4F, 4G, 4H)
 *   Lao động: 4 (5A, 5B, 5C, 5D)
 *   Hành chính: 5 (6A, 6B, 6C, 6D, 6E)
 *   ADBPXLHC: 4 (7A, 7B, 7C, 7D)
 *   Đơn tư pháp: 5 (8A, 8B, 8C, 8D, 8E)
 *   Quốc hội: 10 (9A, 9B, 9C, 9D, 9E, 9F, 9G, 9H, 9I, 9K)
 *   HGDT: 10 (10A, 10B, 10C, 10D, 10E, 10F, 10G, 10H, 10I, 10K)
 */

export type MaBaoCao = '1A' | '1A1' | '1B' | '1B1' | '1C' | '1C1' | '1D' | '1D1' | '1E' | '1F' | '1G' | '1H' | '1I' | '1K' | '1L' | '1M' | '1N' | '1O' | '1P' | '1Q' | '1R' | '1S' | '1T' | '1U' | '1V' | '1X' | '2A' | '2B' | '2C' | '2D' | '2E' | '3A' | '3B' | '3C' | '3D' | '4A' | '4B' | '4C' | '4D' | '4E' | '4F' | '4G' | '4H' | '5A' | '5B' | '5C' | '5D' | '6A' | '6B' | '6C' | '6D' | '6E' | '7A' | '7B' | '7C' | '7D' | '8A' | '8B' | '8C' | '8D' | '8E' | '9A' | '9B' | '9C' | '9D' | '9E' | '9F' | '9G' | '9H' | '9I' | '9K' | '10A' | '10B' | '10C' | '10D' | '10E' | '10F' | '10G' | '10H' | '10I' | '10K';

/** Giai đoạn tố tụng mà biểu mẫu thống kê; "Chung" = không chia theo giai đoạn */
export type GiaiDoanBaoCao = 'Sơ thẩm' | 'Phúc thẩm' | 'Giám đốc thẩm / Tái thẩm' | 'Chung';

export type BaoCaoThongKe = {
  /** Nhóm biểu mẫu (loại án / lĩnh vực) */
  nhom: string;
  ma: MaBaoCao;
  giaiDoan: GiaiDoanBaoCao;
  ten: string;
};

export const DS_BAO_CAO: BaoCaoThongKe[] = [
  { nhom: 'Hình sự', ma: '1A', giaiDoan: 'Sơ thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự sơ thẩm do cá nhân phạm tội' },
  { nhom: 'Hình sự', ma: '1A1', giaiDoan: 'Sơ thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự sơ thẩm do pháp nhân thương mại phạm tội' },
  { nhom: 'Hình sự', ma: '1B', giaiDoan: 'Phúc thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự phúc thẩm do cá nhân phạm tội' },
  { nhom: 'Hình sự', ma: '1B1', giaiDoan: 'Phúc thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự phúc thẩm do pháp nhân thương mại phạm tội' },
  { nhom: 'Hình sự', ma: '1C', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự giám đốc thẩm do cá nhân phạm tội' },
  { nhom: 'Hình sự', ma: '1C1', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự giám đốc thẩm do pháp nhân thương mại phạm tội' },
  { nhom: 'Hình sự', ma: '1D', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự tái thẩm do cá nhân phạm tội' },
  { nhom: 'Hình sự', ma: '1D1', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự tái thẩm do pháp nhân thương mại phạm tội' },
  { nhom: 'Hình sự', ma: '1E', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự theo thủ tục xem xét lại quyết định của HĐTP TANDTC' },
  { nhom: 'Hình sự', ma: '1F', giaiDoan: 'Chung', ten: 'Thống kê kết quả thi hành án hình sự' },
  { nhom: 'Hình sự', ma: '1G', giaiDoan: 'Sơ thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự sơ thẩm do cá nhân phạm tội đối với người chưa thành niên' },
  { nhom: 'Hình sự', ma: '1H', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết các vụ án hình sự và áp dụng biện pháp xử lý chuyển hướng do người chưa thành niên phạm tội' },
  { nhom: 'Hình sự', ma: '1I', giaiDoan: 'Sơ thẩm', ten: 'Thống kê các bị cáo Tòa án cấp sơ thẩm cho hưởng án treo và cải tạo không giam giữ bị kháng cáo, kháng nghị' },
  { nhom: 'Hình sự', ma: '1K', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê các bị cáo Tòa án cấp phúc thẩm cho hưởng án treo và cải tạo không giam giữ bị kháng nghị giám đốc thẩm' },
  { nhom: 'Hình sự', ma: '1L', giaiDoan: 'Sơ thẩm', ten: 'Thống kê các bị cáo Tòa án cấp sơ thẩm áp dụng các tình tiết giảm nhẹ TNHS và quyết định hình phạt nhẹ hơn quy định' },
  { nhom: 'Hình sự', ma: '1M', giaiDoan: 'Chung', ten: 'Thống kê các vụ án Tòa án trả hồ sơ cho Viện kiểm sát theo quy định tại Khoản 1 Điều 280 và Khoản 3 Điều 298 BLTTHS' },
  { nhom: 'Hình sự', ma: '1N', giaiDoan: 'Sơ thẩm', ten: 'Danh sách các bị cáo Tòa án cấp sơ thẩm tuyên không phạm tội' },
  { nhom: 'Hình sự', ma: '1O', giaiDoan: 'Phúc thẩm', ten: 'Danh sách các bị cáo Tòa án cấp phúc thẩm tuyên không phạm tội' },
  { nhom: 'Hình sự', ma: '1P', giaiDoan: 'Chung', ten: 'Danh sách các bị cáo Tòa án tuyên có tội nhưng sau đó bị kháng nghị theo hướng không có tội' },
  { nhom: 'Hình sự', ma: '1Q', giaiDoan: 'Chung', ten: 'Danh sách trường hợp hủy bản án để điều tra lại, sau đó có quyết định đình chỉ vì không thực hiện hành vi phạm tội' },
  { nhom: 'Hình sự', ma: '1R', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết án Ban chỉ đạo về phòng, chống tham nhũng, tiêu cực' },
  { nhom: 'Hình sự', ma: '1S', giaiDoan: 'Chung', ten: 'Thống kê các vụ án Tòa án áp dụng biện pháp đặt tiền để bảo đảm' },
  { nhom: 'Hình sự', ma: '1T', giaiDoan: 'Chung', ten: 'Thống kê thiệt hại và kết quả thu hồi tài sản trong các vụ án kinh tế, tham nhũng' },
  { nhom: 'Hình sự', ma: '1U', giaiDoan: 'Sơ thẩm', ten: 'Thống kê tình hình giải quyết các vụ án mua bán người theo trình tự sơ thẩm' },
  { nhom: 'Hình sự', ma: '1V', giaiDoan: 'Chung', ten: 'Danh sách các vụ án mua bán người được giải quyết tại Tòa án' },
  { nhom: 'Hình sự', ma: '1X', giaiDoan: 'Sơ thẩm', ten: 'Thống kê tình hình giải quyết các vụ án hình sự về bạo lực gia đình theo trình tự sơ thẩm' },
  { nhom: 'Dân sự', ma: '2A', giaiDoan: 'Sơ thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc dân sự sơ thẩm' },
  { nhom: 'Dân sự', ma: '2B', giaiDoan: 'Phúc thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc dân sự phúc thẩm' },
  { nhom: 'Dân sự', ma: '2C', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc dân sự giám đốc thẩm' },
  { nhom: 'Dân sự', ma: '2D', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc dân sự tái thẩm' },
  { nhom: 'Dân sự', ma: '2E', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết các vụ, việc dân sự theo thủ tục đặc biệt' },
  { nhom: 'HNGD', ma: '3A', giaiDoan: 'Sơ thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc hôn nhân và gia đình sơ thẩm' },
  { nhom: 'HNGD', ma: '3B', giaiDoan: 'Phúc thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc hôn nhân và gia đình phúc thẩm' },
  { nhom: 'HNGD', ma: '3C', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc hôn nhân và gia đình giám đốc thẩm' },
  { nhom: 'HNGD', ma: '3D', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc hôn nhân và gia đình tái thẩm' },
  { nhom: 'KDTM', ma: '4A', giaiDoan: 'Sơ thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc kinh doanh thương mại sơ thẩm' },
  { nhom: 'KDTM', ma: '4B', giaiDoan: 'Phúc thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc kinh doanh thương mại phúc thẩm' },
  { nhom: 'KDTM', ma: '4C', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc kinh doanh thương mại giám đốc thẩm' },
  { nhom: 'KDTM', ma: '4D', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc kinh doanh thương mại tái thẩm' },
  { nhom: 'KDTM', ma: '4E', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết yêu cầu áp dụng thủ tục phục hồi' },
  { nhom: 'KDTM', ma: '4F', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết yêu cầu áp dụng thủ tục phá sản' },
  { nhom: 'KDTM', ma: '4G', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết yêu cầu công nhận và cho thi hành bản án, quyết định về phục hồi, phá sản của tòa án, cơ quan có thẩm quyền của nước ngoài' },
  { nhom: 'KDTM', ma: '4H', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết đề nghị, kháng nghị quyết định tuyên bố phá sản và quyết định của tòa án công nhận và cho thi hành bản án, quyết định của tòa án, cơ quan có thẩm quyền của nước ngoài về phục hồi, phá sản; xem xét lại quyết định giải quyết đề nghị, kháng nghị đối với quyết định tuyên bố phá sản' },
  { nhom: 'Lao động', ma: '5A', giaiDoan: 'Sơ thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc lao động sơ thẩm' },
  { nhom: 'Lao động', ma: '5B', giaiDoan: 'Phúc thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc lao động phúc thẩm' },
  { nhom: 'Lao động', ma: '5C', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc lao động giám đốc thẩm' },
  { nhom: 'Lao động', ma: '5D', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ, việc lao động tái thẩm' },
  { nhom: 'Hành chính', ma: '6A', giaiDoan: 'Sơ thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hành chính sơ thẩm' },
  { nhom: 'Hành chính', ma: '6B', giaiDoan: 'Phúc thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hành chính phúc thẩm' },
  { nhom: 'Hành chính', ma: '6C', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hành chính giám đốc thẩm' },
  { nhom: 'Hành chính', ma: '6D', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết các vụ án hành chính tái thẩm' },
  { nhom: 'Hành chính', ma: '6E', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết các vụ án hành chính theo thủ tục đặc biệt' },
  { nhom: 'ADBPXLHC', ma: '7A', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết việc áp dụng các biện pháp xử lý hành chính tại Tòa án nhân dân' },
  { nhom: 'ADBPXLHC', ma: '7B', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết việc áp dụng các BPXLHC đưa vào trường giáo dưỡng và cai nghiện bắt buộc (12-18 tuổi)' },
  { nhom: 'ADBPXLHC', ma: '7C', giaiDoan: 'Chung', ten: 'Thống kê giải quyết đơn đề nghị hoãn, miễn, giảm, tạm đình chỉ việc áp dụng BPXLHC và cai nghiện bắt buộc' },
  { nhom: 'ADBPXLHC', ma: '7D', giaiDoan: 'Chung', ten: 'Thống kê giải quyết khiếu nại, kiến nghị, kháng nghị quyết định Tòa án trong việc áp dụng BPXLHC và cai nghiện' },
  { nhom: 'Đơn tư pháp', ma: '8A', giaiDoan: 'Giám đốc thẩm / Tái thẩm', ten: 'Thống kê thụ lý và giải quyết đơn đề nghị giám đốc thẩm, tái thẩm' },
  { nhom: 'Đơn tư pháp', ma: '8B', giaiDoan: 'Chung', ten: 'Thống kê thụ lý, giải quyết đơn khiếu nại quyết định tố tụng, hành vi tố tụng' },
  { nhom: 'Đơn tư pháp', ma: '8C', giaiDoan: 'Chung', ten: 'Thống kê thụ lý, giải quyết đơn tố cáo hành vi vi phạm pháp luật của người có thẩm quyền tiến hành tố tụng' },
  { nhom: 'Đơn tư pháp', ma: '8D', giaiDoan: 'Chung', ten: 'Danh sách các vụ án Tòa án đã trả lời không có căn cứ kháng nghị nhưng sau đó Chánh án lại kháng nghị' },
  { nhom: 'Đơn tư pháp', ma: '8E', giaiDoan: 'Chung', ten: 'Thống kê giải quyết các vụ việc cơ quan thi hành án yêu cầu sửa chữa, giải thích, kiến nghị bản án' },
  { nhom: 'Quốc hội', ma: '9A', giaiDoan: 'Chung', ten: 'Thống kê các hồ sơ ủy thác tư pháp về dân sự vào Việt Nam' },
  { nhom: 'Quốc hội', ma: '9B', giaiDoan: 'Chung', ten: 'Thống kê các hồ sơ ủy thác tư pháp về dân sự ra nước ngoài' },
  { nhom: 'Quốc hội', ma: '9C', giaiDoan: 'Chung', ten: 'Thống kê các văn bản kiến nghị của Viện kiểm sát yêu cầu khắc phục vi phạm trong hoạt động xét xử' },
  { nhom: 'Quốc hội', ma: '9D', giaiDoan: 'Chung', ten: 'Thống kê quyết định về án phí và việc xét miễn, giảm các khoản thu nộp ngân sách nhà nước' },
  { nhom: 'Quốc hội', ma: '9E', giaiDoan: 'Chung', ten: 'Thống kê việc Tòa án trưng cầu giám định trong quá trình giải quyết, xét xử' },
  { nhom: 'Quốc hội', ma: '9F', giaiDoan: 'Chung', ten: 'Thống kê số vụ việc áp dụng, thay đổi, hủy bỏ biện pháp khẩn cấp tạm thời' },
  { nhom: 'Quốc hội', ma: '9G', giaiDoan: 'Chung', ten: 'Thống kê các bản án, quyết định đã có hiệu lực pháp luật đã được công bố trên Cổng thông tin điện tử' },
  { nhom: 'Quốc hội', ma: '9H', giaiDoan: 'Chung', ten: 'Danh sách giải quyết yêu cầu bồi thường theo Luật Trách nhiệm bồi thường của Nhà nước tại TAND' },
  { nhom: 'Quốc hội', ma: '9I', giaiDoan: 'Chung', ten: 'Thống kê bản án, quyết định cung cấp cho Cơ quan công an' },
  { nhom: 'Quốc hội', ma: '9K', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết các trường hợp xử phạt VPHC đối với hành vi cản trở hoạt động tố tụng' },
  { nhom: 'HGDT', ma: '10A', giaiDoan: 'Chung', ten: 'Thống kê thụ lý, giải quyết các tranh chấp dân sự được hòa giải tại Tòa án' },
  { nhom: 'HGDT', ma: '10B', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết đề nghị, kiến nghị xem xét lại quyết định công nhận kết quả hòa giải dân sự' },
  { nhom: 'HGDT', ma: '10C', giaiDoan: 'Chung', ten: 'Thống kê thụ lý, giải quyết các tranh chấp, việc hôn nhân và gia đình được hòa giải tại Tòa án' },
  { nhom: 'HGDT', ma: '10D', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết đề nghị, kiến nghị xem xét lại quyết định công nhận hòa giải hôn nhân gia đình' },
  { nhom: 'HGDT', ma: '10E', giaiDoan: 'Chung', ten: 'Thống kê thụ lý, giải quyết các tranh chấp kinh doanh thương mại được hòa giải tại Tòa án' },
  { nhom: 'HGDT', ma: '10F', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết đề nghị, kiến nghị xem xét lại quyết định công nhận hòa giải kinh doanh thương mại' },
  { nhom: 'HGDT', ma: '10G', giaiDoan: 'Chung', ten: 'Thống kê thụ lý, giải quyết các tranh chấp lao động được hòa giải tại Tòa án' },
  { nhom: 'HGDT', ma: '10H', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết đề nghị, kiến nghị xem xét lại quyết định công nhận kết quả hòa giải lao động' },
  { nhom: 'HGDT', ma: '10I', giaiDoan: 'Chung', ten: 'Thống kê thụ lý, giải quyết các khiếu kiện hành chính được tổ chức đối thoại tại Tòa án' },
  { nhom: 'HGDT', ma: '10K', giaiDoan: 'Chung', ten: 'Thống kê thụ lý và giải quyết đề nghị, kiến nghị xem xét lại quyết định công nhận kết quả đối thoại hành chính' },
];

/** Tra một biểu mẫu theo mã; ném lỗi nếu không có để sai mã lộ ngay khi nạp */
export function baoCao(ma: MaBaoCao): BaoCaoThongKe {
  const b = DS_BAO_CAO.find(x => x.ma === ma);
  if (!b) throw new Error(`Không có biểu mẫu báo cáo thống kê mã "${ma}"`);
  return b;
}
