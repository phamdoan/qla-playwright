import java.sql.*;
import java.util.*;

/**
 * Truy vấn CHỈ ĐỌC, in kết quả dạng JSON (mảng đối tượng) ra stdout — cho tools/chay-luong-don-gdt.js.
 * Chỉ nhận SELECT/WITH; kết nối setReadOnly + rollback. Thông tin kết nối qua biến môi trường:
 *   QLA_DB_URL (jdbc:oracle:thin:@host:1521/service), QLA_DB_USER, QLA_DB_PASS — không ghi vào mã.
 * Biên dịch: javac -encoding UTF-8 DbChiDoc.java (nguồn có tiếng Việt).
 */
public class DbChiDoc {
    public static void main(String[] a) throws Exception {
        String sql = a[0].trim();
        String thap = sql.toLowerCase();
        if (!(thap.startsWith("select") || thap.startsWith("with")) || thap.contains("for update")) {
            System.err.println("Chỉ cho phép SELECT");
            System.exit(2);
        }
        try (Connection c = DriverManager.getConnection(System.getenv("QLA_DB_URL"), System.getenv("QLA_DB_USER"), System.getenv("QLA_DB_PASS"))) {
            c.setAutoCommit(false);
            c.setReadOnly(true);
            StringBuilder out = new StringBuilder("[");
            try (Statement s = c.createStatement()) {
                s.setQueryTimeout(120);
                try (ResultSet rs = s.executeQuery(sql)) {
                    ResultSetMetaData md = rs.getMetaData();
                    int n = md.getColumnCount();
                    boolean dau = true;
                    while (rs.next()) {
                        out.append(dau ? "" : ",").append("{");
                        dau = false;
                        for (int i = 1; i <= n; i++) {
                            Object o = rs.getObject(i);
                            if (o instanceof Clob cl) o = cl.getSubString(1, (int) Math.min(cl.length(), 20000));
                            out.append(i > 1 ? "," : "").append(q(md.getColumnLabel(i))).append(":").append(o == null ? "null" : q(o.toString()));
                        }
                        out.append("}");
                    }
                }
            }
            c.rollback();
            System.out.println(out.append("]"));
        }
    }

    private static String q(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char ch : s.toCharArray()) {
            switch (ch) {
                case '"' -> b.append("\\\"");
                case '\\' -> b.append("\\\\");
                case '\n' -> b.append("\\n");
                case '\r' -> b.append("\\r");
                case '\t' -> b.append("\\t");
                default -> {
                    if (ch < 0x20) b.append(String.format("\\u%04x", (int) ch));
                    else b.append(ch);
                }
            }
        }
        return b.append("\"").toString();
    }
}
