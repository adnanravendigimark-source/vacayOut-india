/**
 * Creates the first admin (or resets a password).
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 * The password is read from ADMIN_PASSWORD, or prompted for (input hidden).
 */
import { stdin, stdout } from "node:process";
import readline from "node:readline";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes(question)) write.call(rl, s);
    };
    rl.question(question, (answer) => {
      rl.close();
      stdout.write("\n");
      resolve(answer);
    });
  });
}

const email = (arg("email") ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase();
const name = (arg("name") ?? process.env.ADMIN_NAME)?.trim() || "Admin";
const reset = process.argv.includes("--reset-password");
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- --email you@example.com --name "Your Name" [--reset-password]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (put it in .env or .env.local).");
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD ?? (await askHidden("Password (12+ characters): "));
if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  const hash = await bcrypt.hash(password, 12);
  const existing = await pool.query("select id from users where lower(email) = $1", [email]);
  if (existing.rowCount) {
    if (!reset) {
      console.error("That user already exists. Add --reset-password to set a new password.");
      process.exitCode = 1;
    } else {
      await pool.query("update users set password_hash = $1, active = true, updated_at = now() where id = $2", [hash, existing.rows[0].id]);
      console.log("Password reset.");
    }
  } else {
    await pool.query("insert into users (email, name, role, password_hash) values ($1, $2, 'admin', $3)", [email, name, hash]);
    console.log(`Admin ${email} created. Sign in at /admin/login.`);
  }
} finally {
  await pool.end();
}
