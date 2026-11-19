/**
 * Reads a JSON object as it streams in and hands out the decoded text of one
 * top-level string field (e.g. "reply") chunk by chunk, so the answer can be
 * shown while the rest of the object is still being written. It also reports
 * short string fields that come before it (e.g. "scope").
 */
export class StringFieldStream {
  private buf = "";
  private pos = 0;
  private state: "seek" | "in" | "done" = "seek";
  private pendingEscape = "";

  constructor(
    private field: string,
    private onText: (chunk: string) => void,
  ) {}

  /** Value of a short string field that has fully arrived, e.g. peek("scope"). */
  peek(name: string): string | null {
    const m = new RegExp(`"${name}"\\s*:\\s*"([^"\\\\]{0,40})"`).exec(this.buf);
    return m ? m[1] : null;
  }

  get finished() {
    return this.state === "done";
  }

  push(delta: string) {
    this.buf += delta;
    if (this.state === "seek") {
      const m = new RegExp(`"${this.field}"\\s*:\\s*"`).exec(this.buf);
      if (!m) return;
      this.state = "in";
      this.pos = m.index + m[0].length;
    }
    if (this.state !== "in") return;
    let out = "";
    let i = this.pos;
    const s = this.buf;
    while (i < s.length) {
      const c = s[i];
      if (this.pendingEscape || c === "\\") {
        // An escape needs 2 chars (\n) or 6 (é); wait until it is complete.
        const esc = s.slice(i, i + (s[i + 1] === "u" ? 6 : 2));
        if (esc.length < 2 || (esc[1] === "u" && esc.length < 6)) break;
        out += decodeEscape(esc);
        i += esc.length;
        continue;
      }
      if (c === '"') {
        this.state = "done";
        i++;
        break;
      }
      out += c;
      i++;
    }
    this.pos = i;
    if (out) this.onText(out);
  }
}

function decodeEscape(esc: string): string {
  switch (esc[1]) {
    case "n":
      return "\n";
    case "t":
      return "\t";
    case "r":
      return "";
    case "b":
    case "f":
      return "";
    case "u":
      return String.fromCharCode(parseInt(esc.slice(2), 16) || 32);
    default:
      return esc[1]; // \" \\ \/
  }
}
