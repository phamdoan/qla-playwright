import java.sql.*;
public class Sql {
  public static void main(String[] a) throws Exception {
    String url = System.getenv("ORA_URL"), u = System.getenv("ORA_USER"), p = System.getenv("ORA_PASS");
    try (Connection c = DriverManager.getConnection(url, u, p)) {
      c.setAutoCommit(false);
      try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(a[0])) {
        ResultSetMetaData m = r.getMetaData();
        int n = m.getColumnCount();
        while (r.next()) {
          StringBuilder b = new StringBuilder();
          for (int i = 1; i <= n; i++) { if (i > 1) b.append(" | "); b.append(r.getString(i)); }
          System.out.println(b);
        }
      }
      c.rollback();
      System.err.println("ROLLED BACK (dry-run)");
    }
  }
}
