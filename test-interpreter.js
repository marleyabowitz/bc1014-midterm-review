const { run } = require("./interpreter.js");
const { samples } = require("./samples.js");

let failed = 0;

function check(name, source, input, expect) {
  const r = run(source, input || "");
  if (expect instanceof RegExp) {
    if (!r.error || !expect.test(r.error)) {
      failed++;
      console.log("FAIL", name);
      console.log("  error:", r.error);
      console.log("  output:", JSON.stringify(r.output));
    } else {
      console.log("ok", name);
    }
    return;
  }
  if (r.error) {
    failed++;
    console.log("FAIL", name, r.error);
    return;
  }
  if (r.output !== expect) {
    failed++;
    console.log("FAIL", name);
    console.log("GOT ", JSON.stringify(r.output));
    console.log("WANT", JSON.stringify(expect));
    return;
  }
  console.log("ok", name);
}

Object.keys(samples).forEach((id) => {
  const s = samples[id];
  if (s.error) check(id, s.code, s.input, s.error);
  else check(id, s.code, s.input, s.output);
});

check(
  "odds negative start",
  samples.oddsWhile.code,
  "-2",
  ""
);

check(
  "odds fixed",
  samples.oddsWhile.code.replace("i % 2 == 1", "i % 2 != 0"),
  "4",
  ["3", "1", "-1", "-3", "-5", ""].join("\n")
);

check(
  "increases equal",
  samples.increases.code,
  "4 4 4 -1",
  "0\n"
);

check(
  "grades separate ifs",
  samples.gradeWrong.code,
  "85",
  "B\nC\n"
);

check(
  "gcd with zero does not stop",
  samples.gcd.code.replace("gcd(9, 4)", "gcd(5, 0)"),
  "",
  /stopped after/
);

check(
  "Main is not main",
  samples.averageBroken.code.replace("+ 10\n", "+ 10;\n"),
  "",
  /no main/
);

check(
  "missing return value",
  "public class T { public static int f() { int x = 1; } public static void main(String[] args) { System.out.println(f()); } }",
  "",
  /return/
);

check(
  "int condition",
  "public class T { public static void main(String[] args) { if (1) { System.out.println(1); } } }",
  "",
  /boolean/
);

check(
  "scope of for",
  "public class T { public static void main(String[] args) { for (int i = 0; i < 2; i++) { System.out.print(i); } System.out.println(i); } }",
  "",
  /no variable named i/
);

check(
  "div zero",
  "public class T { public static void main(String[] args) { System.out.println(1 / 0); } }",
  "",
  /zero/
);

check(
  "cast truncates toward zero",
  "public class T { public static void main(String[] args) { System.out.println((int) -1.9); System.out.println((int) 1.9); } }",
  "",
  "-1\n1\n"
);

check(
  "wrap min",
  "public class T { public static void main(String[] args) { System.out.println(Integer.MIN_VALUE - 1); } }",
  "",
  "2147483647\n"
);

check(
  "continue",
  "public class T { public static void main(String[] args) { int i = 0; int s = 0; while (i < 5) { i++; if (i % 2 == 0) { continue; } s = s + i; } System.out.println(s); } }",
  "",
  "9\n"
);

const traced = run(samples.digits.code, "", { trace: true });
if (traced.error || traced.trace.length < 3) {
  failed++;
  console.log("FAIL trace", traced);
} else {
  console.log("ok trace", traced.trace.length, "lines");
}

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
