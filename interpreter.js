/* A small runner for the Java used in BC1014 before the midterm.
   One class, static methods, int / double / boolean / String,
   if, while, for, do-while, Scanner.nextInt, System.out.print/println.
   int arithmetic is 32-bit, division truncates toward zero, and % keeps
   the sign of the left operand, matching Java. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JavaRun = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TWO_CHAR = ["==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%="];
  const ONE_CHAR = new Set("+-*/%<>(){}[];,.=!?:".split(""));
  const TYPES = new Set(["int", "double", "boolean", "String", "void", "Scanner"]);

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    let line = 1;
    const push = (type, extra) => tokens.push(Object.assign({ type: type, line: line }, extra || {}));

    while (i < src.length) {
      const c = src[i];
      if (c === "\n") { line++; i++; continue; }
      if (c === " " || c === "\t" || c === "\r") { i++; continue; }
      if (c === "/" && src[i + 1] === "/") {
        while (i < src.length && src[i] !== "\n") i++;
        continue;
      }
      if (c === "/" && src[i + 1] === "*") {
        const start = line;
        i += 2;
        while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
          if (src[i] === "\n") line++;
          i++;
        }
        if (i >= src.length) failAt(start, "a comment starting with /* was never closed");
        i += 2;
        continue;
      }
      const two = src.slice(i, i + 2);
      if (TWO_CHAR.indexOf(two) !== -1) { push(two); i += 2; continue; }
      if (ONE_CHAR.has(c)) { push(c); i++; continue; }
      if (c === '"') {
        const start = line;
        i++;
        let s = "";
        while (i < src.length && src[i] !== '"' && src[i] !== "\n") {
          if (src[i] === "\\") {
            i++;
            const e = src[i] || "";
            if (e === "n") s += "\n";
            else if (e === "t") s += "\t";
            else s += e;
            i++;
          } else {
            s += src[i++];
          }
        }
        if (i >= src.length || src[i] !== '"') {
          failAt(start, "a string is missing its closing quote");
        }
        i++;
        push("string", { value: s });
        continue;
      }
      if (c >= "0" && c <= "9") {
        const startLine = line;
        let raw = "";
        while (i < src.length && src[i] >= "0" && src[i] <= "9") raw += src[i++];
        let isDouble = false;
        if (src[i] === "." && src[i + 1] >= "0" && src[i + 1] <= "9") {
          isDouble = true;
          raw += src[i++];
          while (i < src.length && src[i] >= "0" && src[i] <= "9") raw += src[i++];
        }
        if (src[i] === "f" || src[i] === "F" || src[i] === "d" || src[i] === "D") {
          isDouble = true;
          i++;
        } else if (src[i] === "l" || src[i] === "L") {
          failAt(startLine, "this runner uses int, not long");
        }
        const num = isDouble ? parseFloat(raw) : parseInt(raw, 10);
        if (!isDouble && num > 2147483647) {
          failAt(startLine, raw + " does not fit in a Java int");
        }
        push("number", { kind: isDouble ? "double" : "int", value: num });
        continue;
      }
      if (/[A-Za-z_$]/.test(c)) {
        let s = "";
        while (i < src.length && /[A-Za-z0-9_$]/.test(src[i])) s += src[i++];
        push("ident", { value: s });
        continue;
      }
      failAt(line, "unexpected character " + c);
    }
    push("eof");
    return tokens;
  }

  function failAt(line, msg) {
    const err = new Error("Line " + line + ": " + msg);
    err.line = line;
    throw err;
  }

  function Parser(tokens) {
    this.tokens = tokens;
    this.i = 0;
  }
  Parser.prototype.peek = function () { return this.tokens[this.i]; };
  Parser.prototype.prev = function () { return this.tokens[this.i - 1]; };
  Parser.prototype.eat = function (type) {
    if (this.peek().type === type) { this.i++; return true; }
    return false;
  };
  Parser.prototype.eatKw = function (word) {
    const t = this.peek();
    if (t.type === "ident" && t.value === word) { this.i++; return true; }
    return false;
  };
  Parser.prototype.expect = function (type) {
    if (!this.eat(type)) {
      failAt(this.peek().line, "expected '" + type + "' but found " + showTok(this.peek()));
    }
    return this.prev();
  };
  Parser.prototype.expectIdent = function () {
    const t = this.peek();
    if (t.type !== "ident") failAt(t.line, "expected a name but found " + showTok(t));
    if (TYPES.has(t.value) || isKeyword(t.value)) {
      failAt(t.line, "'" + t.value + "' is a keyword and cannot be a name");
    }
    this.i++;
    return t.value;
  };
  Parser.prototype.isType = function () {
    const t = this.peek();
    return t.type === "ident" && TYPES.has(t.value) && t.value !== "void";
  };
  Parser.prototype.node = function (type, line, extra) {
    return Object.assign({ type: type, line: line }, extra || {});
  };

  function showTok(t) {
    if (t.type === "ident") return t.value;
    if (t.type === "number") return String(t.value);
    if (t.type === "string") return "a string";
    if (t.type === "eof") return "the end of the program";
    return "'" + t.type + "'";
  }
  function isKeyword(w) {
    return {
      public: 1, static: 1, class: 1, if: 1, else: 1, while: 1, for: 1, do: 1,
      return: 1, break: 1, continue: 1, new: 1, true: 1, false: 1, void: 1
    }[w] === 1 || TYPES.has(w);
  }

  Parser.prototype.parseProgram = function () {
    while (this.eatKw("import")) {
      while (!this.eat(";") && this.peek().type !== "eof") this.i++;
    }
    if (this.eatKw("public")) {
      if (!this.eatKw("class")) failAt(this.peek().line, "expected class after public");
      return this.parseClass(this.prev().line);
    }
    if (this.eatKw("class")) return this.parseClass(this.prev().line);
    const line = this.peek().line;
    const stmts = [];
    while (this.peek().type !== "eof") stmts.push(this.parseStmt());
    return this.node("script", line, { stmts: stmts });
  };

  Parser.prototype.parseClass = function (line) {
    const name = this.expectIdent();
    this.expect("{");
    const methods = [];
    while (!this.eat("}")) {
      if (this.peek().type === "eof") failAt(this.peek().line, "the class is missing its closing }");
      methods.push(this.parseMethod());
    }
    if (this.peek().type !== "eof") {
      failAt(this.peek().line, "extra code after the class. One file has one class.");
    }
    return this.node("class", line, { name: name, methods: methods });
  };

  Parser.prototype.parseMethod = function () {
    const line = this.peek().line;
    this.eatKw("public");
    this.eatKw("static");
    let ret = null;
    if (this.eatKw("void")) ret = "void";
    else if (this.isType()) { ret = this.peek().value; this.i++; }
    else failAt(this.peek().line, "expected a return type such as void or int");
    if (this.peek().type === "[") {
      failAt(this.peek().line, "this runner does not include arrays. Flowchart lists are not Java arrays.");
    }
    const name = this.expectIdent();
    this.expect("(");
    const params = [];
    if (!this.eat(")")) {
      while (true) {
        params.push(this.parseParam());
        if (this.eat(",")) continue;
        this.expect(")");
        break;
      }
    }
    const body = this.parseBlock();
    return this.node("method", line, { ret: ret, name: name, params: params, body: body });
  };

  Parser.prototype.parseParam = function () {
    const line = this.peek().line;
    if (!this.isType() && !(this.peek().type === "ident" && this.peek().value === "String")) {
      failAt(line, "expected a parameter type");
    }
    const vartype = this.peek().value;
    this.i++;
    if (this.eat("[")) {
      this.expect("]");
      const name = this.expectIdent();
      return this.node("param", line, { vartype: "String[]", name: name, array: true });
    }
    const name = this.expectIdent();
    if (this.eat("[")) {
      this.expect("]");
      return this.node("param", line, { vartype: "String[]", name: name, array: true });
    }
    return this.node("param", line, { vartype: vartype, name: name, array: false });
  };

  Parser.prototype.parseBlock = function () {
    const line = this.expect("{").line;
    const stmts = [];
    while (!this.eat("}")) {
      if (this.peek().type === "eof") failAt(this.peek().line, "a block is missing its closing }");
      stmts.push(this.parseStmt());
    }
    return this.node("block", line, { stmts: stmts });
  };

  Parser.prototype.parseStmt = function () {
    const t = this.peek();
    if (t.type === "{") return this.parseBlock();
    if (this.eatKw("if")) return this.parseIf(t.line);
    if (this.eatKw("while")) return this.parseWhile(t.line);
    if (this.eatKw("for")) return this.parseFor(t.line);
    if (this.eatKw("do")) return this.parseDo(t.line);
    if (this.eatKw("return")) return this.parseReturn(t.line);
    if (this.eatKw("break")) { this.expect(";"); return this.node("break", t.line); }
    if (this.eatKw("continue")) { this.expect(";"); return this.node("continue", t.line); }
    if (this.eat(";")) return this.node("empty", t.line);
    if (this.isType() && this.looksLikeDecl()) return this.parseDecl(true);
    const expr = this.parseExpr();
    this.expect(";");
    return this.node("expr", expr.line, { expr: expr });
  };

  Parser.prototype.looksLikeDecl = function () {
    const next = this.tokens[this.i + 1];
    return next && next.type === "ident";
  };

  Parser.prototype.parseDecl = function (withSemi) {
    const line = this.peek().line;
    const vartype = this.peek().value;
    this.i++;
    if (this.peek().type === "[") {
      failAt(this.peek().line, "this runner does not include arrays");
    }
    const names = [];
    while (true) {
      const name = this.expectIdent();
      let init = null;
      if (this.eat("=")) init = this.parseExpr();
      names.push({ name: name, init: init });
      if (this.eat(",")) continue;
      break;
    }
    if (withSemi) this.expect(";");
    return this.node("decl", line, { vartype: vartype, names: names });
  };

  Parser.prototype.parseIf = function (line) {
    this.expect("(");
    const cond = this.parseExpr();
    this.expect(")");
    const then = this.parseStmt();
    let els = null;
    if (this.eatKw("else")) els = this.parseStmt();
    return this.node("if", line, { cond: cond, then: then, else: els });
  };

  Parser.prototype.parseWhile = function (line) {
    this.expect("(");
    const cond = this.parseExpr();
    this.expect(")");
    const body = this.parseStmt();
    return this.node("while", line, { cond: cond, body: body });
  };

  Parser.prototype.parseDo = function (line) {
    const body = this.parseStmt();
    if (!this.eatKw("while")) failAt(this.peek().line, "do needs a while after the body");
    this.expect("(");
    const cond = this.parseExpr();
    this.expect(")");
    this.expect(";");
    return this.node("do", line, { body: body, cond: cond });
  };

  Parser.prototype.parseFor = function (line) {
    this.expect("(");
    let init = null;
    if (!this.eat(";")) {
      if (this.isType() && this.looksLikeDecl()) init = this.parseDecl(false);
      else init = this.parseExpr();
      this.expect(";");
    }
    let cond = null;
    if (!this.eat(";")) {
      cond = this.parseExpr();
      this.expect(";");
    }
    let update = null;
    if (this.peek().type !== ")") update = this.parseExpr();
    this.expect(")");
    const body = this.parseStmt();
    return this.node("for", line, { init: init, cond: cond, update: update, body: body });
  };

  Parser.prototype.parseReturn = function (line) {
    if (this.eat(";")) return this.node("return", line, { expr: null });
    const expr = this.parseExpr();
    this.expect(";");
    return this.node("return", line, { expr: expr });
  };

  Parser.prototype.parseExpr = function () { return this.parseAssign(); };

  Parser.prototype.parseAssign = function () {
    const left = this.parseTernary();
    const ops = ["=", "+=", "-=", "*=", "/=", "%="];
    if (ops.indexOf(this.peek().type) !== -1) {
      const op = this.peek().type;
      const line = this.peek().line;
      this.i++;
      if (left.type !== "var") failAt(line, "the left side of an assignment must be a variable");
      const right = this.parseAssign();
      return this.node("assign", line, { op: op, name: left.name, right: right });
    }
    return left;
  };

  Parser.prototype.parseTernary = function () {
    const cond = this.parseOr();
    if (this.eat("?")) {
      const line = this.prev().line;
      const yes = this.parseExpr();
      this.expect(":");
      const no = this.parseTernary();
      return this.node("ternary", line, { cond: cond, yes: yes, no: no });
    }
    return cond;
  };

  Parser.prototype.parseOr = function () { return this.bin(this.parseAnd, ["||"]); };
  Parser.prototype.parseAnd = function () { return this.bin(this.parseEq, ["&&"]); };
  Parser.prototype.parseEq = function () { return this.bin(this.parseRel, ["==", "!="]); };
  Parser.prototype.parseRel = function () { return this.bin(this.parseAdd, ["<", "<=", ">", ">="]); };
  Parser.prototype.parseAdd = function () { return this.bin(this.parseMul, ["+", "-"]); };
  Parser.prototype.parseMul = function () { return this.bin(this.parseUnary, ["*", "/", "%"]); };

  Parser.prototype.bin = function (next, ops) {
    let left = next.call(this);
    while (ops.indexOf(this.peek().type) !== -1) {
      const op = this.peek().type;
      const line = this.peek().line;
      this.i++;
      const right = next.call(this);
      left = this.node("binary", line, { op: op, left: left, right: right });
    }
    return left;
  };

  Parser.prototype.parseUnary = function () {
    if (this.isCastAhead()) {
      const line = this.peek().line;
      this.expect("(");
      const to = this.peek().value;
      this.i++;
      this.expect(")");
      const expr = this.parseUnary();
      return this.node("cast", line, { to: to, expr: expr });
    }
    const ops = ["!", "-", "+", "++", "--"];
    if (ops.indexOf(this.peek().type) !== -1) {
      const op = this.peek().type;
      const line = this.peek().line;
      this.i++;
      const expr = this.parseUnary();
      return this.node("unary", line, { op: op, expr: expr });
    }
    return this.parsePostfix();
  };

  Parser.prototype.isCastAhead = function () {
    if (this.peek().type !== "(") return false;
    const a = this.tokens[this.i + 1];
    const b = this.tokens[this.i + 2];
    if (!a || !b) return false;
    return a.type === "ident" && (a.value === "int" || a.value === "double") && b.type === ")";
  };

  Parser.prototype.parsePostfix = function () {
    let expr = this.parsePrimary();
    while (true) {
      if (this.eat("(")) {
        const line = this.prev().line;
        const args = [];
        if (!this.eat(")")) {
          while (true) {
            args.push(this.parseExpr());
            if (this.eat(",")) continue;
            this.expect(")");
            break;
          }
        }
        expr = this.node("call", line, { callee: expr, args: args });
      } else if (this.peek().type === "++" || this.peek().type === "--") {
        const op = this.peek().type;
        const line = this.peek().line;
        this.i++;
        expr = this.node("postfix", line, { op: op, expr: expr });
      } else if (this.eat(".")) {
        const line = this.prev().line;
        const t = this.peek();
        if (t.type !== "ident") failAt(t.line, "expected a name after '.'");
        this.i++;
        expr = this.node("member", line, { object: expr, name: t.value });
      } else break;
    }
    return expr;
  };

  Parser.prototype.parsePrimary = function () {
    const t = this.peek();
    if (t.type === "number") {
      this.i++;
      return this.node("literal", t.line, { kind: t.kind, value: t.value });
    }
    if (t.type === "string") {
      this.i++;
      return this.node("literal", t.line, { kind: "string", value: t.value });
    }
    if (t.type === "ident" && (t.value === "true" || t.value === "false")) {
      this.i++;
      return this.node("literal", t.line, { kind: "boolean", value: t.value === "true" });
    }
    if (this.eatKw("new")) {
      const line = this.prev().line;
      const nameTok = this.peek();
      if (nameTok.type !== "ident") failAt(nameTok.line, "expected a class name after new");
      this.i++;
      this.expect("(");
      const args = [];
      if (!this.eat(")")) {
        while (true) {
          args.push(this.parseExpr());
          if (this.eat(",")) continue;
          this.expect(")");
          break;
        }
      }
      return this.node("new", line, { name: nameTok.value, args: args });
    }
    if (t.type === "ident") {
      this.i++;
      return this.node("var", t.line, { name: t.value });
    }
    if (this.eat("(")) {
      const expr = this.parseExpr();
      this.expect(")");
      return expr;
    }
    failAt(t.line, "expected an expression but found " + showTok(t));
  };

  function ReturnSignal(value) { this.value = value; }
  function BreakSignal() {}
  function ContinueSignal() {}

  function Scope(parent) {
    this.parent = parent;
    this.vars = new Map();
  }
  Scope.prototype.declare = function (name, value, line) {
    if (this.vars.has(name)) failAt(line, name + " is already declared in this block");
    this.vars.set(name, value);
  };
  Scope.prototype.get = function (name, line) {
    if (this.vars.has(name)) {
      const cell = this.vars.get(name);
      if (!cell.ready) failAt(line, name + " has been declared but not given a value yet");
      return cell.value;
    }
    if (this.parent) return this.parent.get(name, line);
    failAt(line, "there is no variable named " + name);
  };
  Scope.prototype.set = function (name, value, line) {
    if (this.vars.has(name)) {
      const cell = this.vars.get(name);
      cell.ready = true;
      cell.value = value;
      return;
    }
    if (this.parent) return this.parent.set(name, value, line);
    failAt(line, "there is no variable named " + name);
  };

  function Interpreter(inputText, options) {
    this.reader = { text: inputText || "", i: 0 };
    this.output = "";
    this.notes = [];
    this.tracing = !!(options && options.trace);
    this.steps = 0;
    this.maxSteps = (options && options.maxSteps) || 200000;
    this.scope = new Scope(null);
    this.methods = new Map();
    this.loopDepth = 0;
    this.currentRet = "void";
  }

  Interpreter.prototype.note = function (s) {
    if (!this.tracing) return;
    if (this.notes.length < 80) this.notes.push(s);
    else if (this.notes.length === 80) this.notes.push("… trace stopped here so the page stays responsive");
  };

  Interpreter.prototype.tick = function (line) {
    this.steps++;
    if (this.steps > this.maxSteps) {
      failAt(line || 1, "stopped after " + this.maxSteps + " steps. The loop has not finished. Check the condition and what changes inside the body.");
    }
  };

  Interpreter.prototype.fmt = function (v) {
    if (v.k === "int") return String(v.v);
    if (v.k === "boolean") return v.v ? "true" : "false";
    if (v.k === "string") return '"' + v.v + '"';
    if (v.k === "double") return formatDouble(v.v);
    return "?";
  };

  Interpreter.prototype.printValue = function (v) {
    if (v.k === "int") return String(v.v);
    if (v.k === "boolean") return v.v ? "true" : "false";
    if (v.k === "string") return v.v;
    if (v.k === "double") return formatDouble(v.v);
    failAt(1, "that value cannot be printed");
  };

  function formatDouble(n) {
    if (Number.isNaN(n)) return "NaN";
    if (n === Infinity) return "Infinity";
    if (n === -Infinity) return "-Infinity";
    let s = String(n);
    if (!/[.eE]/.test(s)) s += ".0";
    return s;
  }

  function valInt(n) { return { k: "int", v: n | 0 }; }
  function valDouble(n) { return { k: "double", v: n }; }
  function valBool(b) { return { k: "boolean", v: !!b }; }
  function valStr(s) { return { k: "string", v: String(s) }; }

  Interpreter.prototype.execProgram = function (ast) {
    if (ast.type === "script") {
      this.currentRet = "void";
      this.execBlockStmts(ast.stmts);
      return;
    }
    ast.methods.forEach((m) => {
      if (this.methods.has(m.name)) failAt(m.line, "the method " + m.name + " is declared twice");
      this.methods.set(m.name, m);
    });
    const main = this.methods.get("main");
    if (!main) {
      const names = Array.from(this.methods.keys());
      const have = names.length ? " This class has: " + names.join(", ") + "." : "";
      failAt(ast.line, "there is no main method, so there is nothing to run." + have + " Running starts at public static void main(String[] args).");
    }
    const args = main.params.map((p) => {
      if (p.array) return { k: "unused-array" };
      failAt(main.line, "this runner starts main without extra arguments. Use Scanner for input, as in class.");
      return null;
    });
    this.callMethod(main, args, main.line);
  };

  Interpreter.prototype.callMethod = function (method, args, line) {
    if (args.length !== method.params.length) {
      failAt(line, method.name + " expects " + method.params.length + " argument(s), got " + args.length);
    }
    const savedScope = this.scope;
    const savedRet = this.currentRet;
    this.scope = new Scope(null);
    this.currentRet = method.ret;
    try {
      for (let i = 0; i < method.params.length; i++) {
        const p = method.params[i];
        if (p.array) {
          this.scope.declare(p.name, { ready: true, value: { k: "unused-array" } }, p.line);
        } else {
          this.checkAssign(p.vartype, args[i], line);
          this.scope.declare(p.name, { ready: true, value: args[i], declType: p.vartype }, p.line);
        }
      }
      try {
        this.exec(method.body);
      } catch (e) {
        if (e instanceof ReturnSignal) {
          if (method.ret === "void") {
            if (e.value !== null) failAt(line, "void method " + method.name + " cannot return a value");
            return { k: "void" };
          }
          if (e.value === null) failAt(line, method.name + " has to return a " + method.ret);
          this.checkAssign(method.ret, e.value, line);
          return e.value;
        }
        throw e;
      }
      if (method.ret !== "void") {
        failAt(method.body.line, method.name + " ended without a return. Every path through a " + method.ret + " method needs a return.");
      }
      return { k: "void" };
    } finally {
      this.scope = savedScope;
      this.currentRet = savedRet;
    }
  };

  Interpreter.prototype.exec = function (stmt) {
    this.tick(stmt.line);
    if (stmt.type === "block") {
      const saved = this.scope;
      this.scope = new Scope(saved);
      try { this.execBlockStmts(stmt.stmts); }
      finally { this.scope = saved; }
      return;
    }
    if (stmt.type === "empty") return;
    if (stmt.type === "decl") return this.execDecl(stmt);
    if (stmt.type === "expr") { this.eval(stmt.expr); return; }
    if (stmt.type === "if") return this.execIf(stmt);
    if (stmt.type === "while") return this.execWhile(stmt);
    if (stmt.type === "do") return this.execDo(stmt);
    if (stmt.type === "for") return this.execFor(stmt);
    if (stmt.type === "return") {
      const v = stmt.expr ? this.eval(stmt.expr) : null;
      if (v && v.k === "unused-array") failAt(stmt.line, "that value cannot be returned");
      this.note("return " + (v ? this.fmt(v) : ""));
      throw new ReturnSignal(v);
    }
    if (stmt.type === "break") {
      if (this.loopDepth === 0) failAt(stmt.line, "break only makes sense inside a loop");
      throw new BreakSignal();
    }
    if (stmt.type === "continue") {
      if (this.loopDepth === 0) failAt(stmt.line, "continue only makes sense inside a loop");
      throw new ContinueSignal();
    }
    failAt(stmt.line, "that statement is not supported in this runner");
  };

  Interpreter.prototype.execBlockStmts = function (stmts) {
    for (let i = 0; i < stmts.length; i++) this.exec(stmts[i]);
  };

  Interpreter.prototype.execDecl = function (stmt) {
    stmt.names.forEach((d) => {
      let value = null;
      let ready = false;
      if (d.init) {
        value = this.eval(d.init);
        this.checkAssign(stmt.vartype, value, stmt.line);
        ready = true;
        this.note(d.name + " = " + this.fmt(value));
      }
      this.scope.declare(d.name, { ready: ready, value: value }, stmt.line);
    });
  };

  Interpreter.prototype.checkAssign = function (vartype, value, line) {
    if (vartype === "Scanner") {
      if (value.k !== "scanner") failAt(line, "Scanner variables are created with new Scanner(System.in)");
      return;
    }
    if (vartype === "int") {
      if (value.k !== "int") failAt(line, "expected an int" + (value.k === "double" ? ". A double needs an (int) cast, and the fraction is dropped toward zero." : "."));
      return;
    }
    if (vartype === "double") {
      if (value.k === "int") return;
      if (value.k === "double") return;
      failAt(line, "expected a number");
    }
    if (vartype === "boolean") {
      if (value.k !== "boolean") failAt(line, "expected a boolean (true or false)");
      return;
    }
    if (vartype === "String") {
      if (value.k !== "string") failAt(line, "expected a String");
      return;
    }
    failAt(line, "the type " + vartype + " is not available in this runner");
  };

  Interpreter.prototype.widen = function (vartype, value) {
    if (vartype === "double" && value.k === "int") return valDouble(value.v);
    return value;
  };

  Interpreter.prototype.execIf = function (stmt) {
    const c = this.eval(stmt.cond);
    if (c.k !== "boolean") failAt(stmt.cond.line, "an if condition has to be a boolean. An int is not true or false.");
    this.note("if → " + (c.v ? "true" : "false"));
    if (c.v) this.exec(stmt.then);
    else if (stmt.else) this.exec(stmt.else);
  };

  Interpreter.prototype.execWhile = function (stmt) {
    this.loopDepth++;
    try {
      while (true) {
        this.tick(stmt.line);
        const c = this.eval(stmt.cond);
        if (c.k !== "boolean") failAt(stmt.cond.line, "a while condition has to be a boolean");
        this.note("while → " + (c.v ? "true" : "false"));
        if (!c.v) break;
        try { this.exec(stmt.body); }
        catch (e) {
          if (e instanceof ContinueSignal) continue;
          throw e;
        }
      }
    } catch (e) {
      if (e instanceof BreakSignal) return;
      throw e;
    } finally {
      this.loopDepth--;
    }
  };

  Interpreter.prototype.execDo = function (stmt) {
    this.loopDepth++;
    try {
      while (true) {
        this.tick(stmt.line);
        try { this.exec(stmt.body); }
        catch (e) {
          if (e instanceof ContinueSignal) { /* still test the condition */ }
          else throw e;
        }
        const c = this.eval(stmt.cond);
        if (c.k !== "boolean") failAt(stmt.cond.line, "a do-while condition has to be a boolean");
        this.note("do-while → " + (c.v ? "true" : "false"));
        if (!c.v) break;
      }
    } catch (e) {
      if (e instanceof BreakSignal) return;
      throw e;
    } finally {
      this.loopDepth--;
    }
  };

  Interpreter.prototype.execFor = function (stmt) {
    const saved = this.scope;
    this.scope = new Scope(saved);
    this.loopDepth++;
    try {
      if (stmt.init) {
        if (stmt.init.type === "decl") this.execDecl(stmt.init);
        else this.eval(stmt.init);
      }
      while (true) {
        this.tick(stmt.line);
        if (stmt.cond) {
          const c = this.eval(stmt.cond);
          if (c.k !== "boolean") failAt(stmt.cond.line, "a for condition has to be a boolean");
          this.note("for → " + (c.v ? "true" : "false"));
          if (!c.v) break;
        }
        try { this.exec(stmt.body); }
        catch (e) {
          if (e instanceof ContinueSignal) {
            if (stmt.update) this.eval(stmt.update);
            continue;
          }
          throw e;
        }
        if (stmt.update) this.eval(stmt.update);
      }
    } catch (e) {
      if (e instanceof BreakSignal) return;
      throw e;
    } finally {
      this.loopDepth--;
      this.scope = saved;
    }
  };

  Interpreter.prototype.eval = function (expr) {
    this.tick(expr.line);
    switch (expr.type) {
      case "literal":
        if (expr.kind === "int") return valInt(expr.value | 0);
        if (expr.kind === "double") return valDouble(expr.value);
        if (expr.kind === "boolean") return valBool(expr.value);
        if (expr.kind === "string") return valStr(expr.value);
        break;
      case "var":
        if (expr.name === "System") return { k: "system" };
        if (expr.name === "Integer") return { k: "integer" };
        return this.scope.get(expr.name, expr.line);
      case "member":
        return this.evalMember(expr);
      case "call":
        return this.evalCall(expr);
      case "new":
        return this.evalNew(expr);
      case "assign":
        return this.evalAssign(expr);
      case "unary":
        return this.evalUnary(expr);
      case "postfix":
        return this.evalPostfix(expr);
      case "cast":
        return this.evalCast(expr);
      case "ternary": {
        const c = this.eval(expr.cond);
        if (c.k !== "boolean") failAt(expr.cond.line, "the ? : condition has to be a boolean");
        return c.v ? this.eval(expr.yes) : this.eval(expr.no);
      }
      case "binary":
        return this.evalBinary(expr);
      default:
        failAt(expr.line, "that expression is not supported");
    }
  };

  Interpreter.prototype.evalMember = function (expr) {
    const obj = this.eval(expr.object);
    if (obj.k === "system" && expr.name === "out") return { k: "sysout" };
    if (obj.k === "system" && expr.name === "in") return { k: "sysin" };
    if (obj.k === "sysout" && (expr.name === "println" || expr.name === "print")) {
      return { k: "printer", name: expr.name };
    }
    if (obj.k === "integer" && expr.name === "MAX_VALUE") return valInt(2147483647);
    if (obj.k === "integer" && expr.name === "MIN_VALUE") return valInt(-2147483648);
    if (obj.k === "scanner" && expr.name === "nextInt") return { k: "nextInt" };
    if (obj.k === "string") {
      failAt(expr.line, "this runner does String with +, which is what class used. It does not call methods like length or charAt.");
    }
    if (obj.k === "unused-array") {
      failAt(expr.line, "main's String[] args is not used in the programs from class");
    }
    failAt(expr.line, "there is no ." + expr.name + " on that value");
  };

  Interpreter.prototype.evalCall = function (expr) {
    const callee = expr.callee;
    if (callee.type === "member") {
      const obj = this.eval(callee.object);
      if (obj.k === "sysout" && (callee.name === "println" || callee.name === "print")) {
        if (expr.args.length > 1) failAt(expr.line, "println takes one value");
        if (expr.args.length === 1) {
          const v = this.eval(expr.args[0]);
          this.output += this.printValue(v);
        }
        if (callee.name === "println") this.output += "\n";
        return { k: "void" };
      }
      if (obj.k === "scanner" && callee.name === "nextInt") {
        if (expr.args.length !== 0) failAt(expr.line, "nextInt takes no arguments");
        return valInt(this.readInt(expr.line));
      }
    }
    if (callee.type === "var") {
      const method = this.methods.get(callee.name);
      if (!method) failAt(expr.line, "there is no method named " + callee.name);
      const args = expr.args.map((a) => this.eval(a));
      const result = this.callMethod(method, args, expr.line);
      if (method.ret === "void") return result;
      return result;
    }
    failAt(expr.line, "that call is not supported");
  };

  Interpreter.prototype.readInt = function (line) {
    const text = this.reader.text;
    let i = this.reader.i;
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i >= text.length) {
      failAt(line, "the program asked for another int, but the input box has no more numbers. Type them separated by spaces.");
    }
    let s = "";
    if (text[i] === "+" || text[i] === "-") s += text[i++];
    const start = i;
    while (i < text.length && text[i] >= "0" && text[i] <= "9") s += text[i++];
    if (i === start) failAt(line, "expected an int in the input box, found '" + text.slice(this.reader.i).trim().split(/\s/)[0] + "'");
    this.reader.i = i;
    const n = Number(s);
    if (!Number.isSafeInteger(n) || n > 2147483647 || n < -2147483648) {
      failAt(line, s + " does not fit in a Java int");
    }
    return n | 0;
  };

  Interpreter.prototype.evalNew = function (expr) {
    if (expr.name !== "Scanner" || expr.args.length !== 1) {
      failAt(expr.line, "the only construction from class is new Scanner(System.in)");
    }
    const arg = this.eval(expr.args[0]);
    if (arg.k !== "sysin") failAt(expr.line, "write new Scanner(System.in), as in class");
    return { k: "scanner" };
  };

  Interpreter.prototype.evalAssign = function (expr) {
    const cur = this.scope.get(expr.name, expr.line);
    let right = this.eval(expr.right);
    if (expr.op !== "=") {
      right = this.numericOp(expr.op[0], cur, right, expr.line);
    }
    const cell = this.lookupCell(expr.name);
    if (cell.declType) this.checkAssign(cell.declType, right.k === "int" && cell.declType === "double" ? valDouble(right.v) : right, expr.line);
    if (cell.declType === "double" && right.k === "int") right = valDouble(right.v);
    cell.ready = true;
    cell.value = right;
    this.note(expr.name + " = " + this.fmt(right));
    return right;
  };

  Interpreter.prototype.lookupCell = function (name) {
    let s = this.scope;
    while (s) {
      if (s.vars.has(name)) return s.vars.get(name);
      s = s.parent;
    }
    return null;
  };

  Interpreter.prototype.evalUnary = function (expr) {
    if (expr.op === "!") {
      const v = this.eval(expr.expr);
      if (v.k !== "boolean") failAt(expr.line, "! applies to a boolean");
      return valBool(!v.v);
    }
    if (expr.op === "+" || expr.op === "-") {
      const v = this.eval(expr.expr);
      if (v.k === "int") return valInt(expr.op === "-" ? (-v.v) | 0 : v.v);
      if (v.k === "double") return valDouble(expr.op === "-" ? -v.v : v.v);
      failAt(expr.line, "unary " + expr.op + " applies to a number");
    }
    if (expr.expr.type !== "var") failAt(expr.line, expr.op + " applies to a variable");
    const cur = this.scope.get(expr.expr.name, expr.line);
    if (cur.k !== "int") failAt(expr.line, expr.op + " in this runner applies to an int");
    const next = valInt(expr.op === "++" ? (cur.v + 1) | 0 : (cur.v - 1) | 0);
    const cell = this.lookupCell(expr.expr.name);
    cell.value = next;
    this.note(expr.expr.name + " = " + this.fmt(next));
    return next;
  };

  Interpreter.prototype.evalPostfix = function (expr) {
    if (expr.expr.type !== "var") failAt(expr.line, expr.op + " applies to a variable");
    const cur = this.scope.get(expr.expr.name, expr.line);
    if (cur.k !== "int") failAt(expr.line, expr.op + " in this runner applies to an int");
    const next = valInt(expr.op === "++" ? (cur.v + 1) | 0 : (cur.v - 1) | 0);
    const cell = this.lookupCell(expr.expr.name);
    cell.value = next;
    this.note(expr.expr.name + " = " + this.fmt(next));
    return cur;
  };

  Interpreter.prototype.evalCast = function (expr) {
    const v = this.eval(expr.expr);
    if (expr.to === "int") {
      if (v.k === "int") return v;
      if (v.k === "double") return valInt(Math.trunc(v.v) | 0);
      failAt(expr.line, "cannot cast that to int");
    }
    if (expr.to === "double") {
      if (v.k === "double") return v;
      if (v.k === "int") return valDouble(v.v);
      failAt(expr.line, "cannot cast that to double");
    }
    failAt(expr.line, "that cast is not supported");
  };

  Interpreter.prototype.evalBinary = function (expr) {
    if (expr.op === "&&" || expr.op === "||") {
      const left = this.eval(expr.left);
      if (left.k !== "boolean") failAt(expr.left.line, expr.op + " applies to booleans");
      if (expr.op === "&&" && !left.v) return valBool(false);
      if (expr.op === "||" && left.v) return valBool(true);
      const right = this.eval(expr.right);
      if (right.k !== "boolean") failAt(expr.right.line, expr.op + " applies to booleans");
      return valBool(right.v);
    }
    if (expr.op === "+") {
      const left = this.eval(expr.left);
      const right = this.eval(expr.right);
      if (left.k === "string" || right.k === "string") {
        return valStr(this.printValue(left) + this.printValue(right));
      }
      return this.numericOp("+", left, right, expr.line);
    }
    const left = this.eval(expr.left);
    const right = this.eval(expr.right);
    if (expr.op === "==" || expr.op === "!=") {
      return this.evalEq(expr.op, left, right, expr.line);
    }
    return this.numericOp(expr.op, left, right, expr.line);
  };

  Interpreter.prototype.evalEq = function (op, left, right, line) {
    if (left.k === "string" || right.k === "string") {
      failAt(line, "class compared numbers with ==. This runner does not compare Strings with ==.");
    }
    if (left.k === "boolean" || right.k === "boolean") {
      if (left.k !== "boolean" || right.k !== "boolean") failAt(line, "== needs two booleans or two numbers");
      const same = left.v === right.v;
      return valBool(op === "==" ? same : !same);
    }
    const pair = this.asNumbers(left, right, line);
    const same = pair[1] === pair[2];
    return valBool(op === "==" ? same : !same);
  };

  Interpreter.prototype.asNumbers = function (left, right, line) {
    if ((left.k !== "int" && left.k !== "double") || (right.k !== "int" && right.k !== "double")) {
      failAt(line, "that operator applies to numbers");
    }
    if (left.k === "double" || right.k === "double") {
      return ["double", left.k === "int" ? left.v : left.v, right.k === "int" ? right.v : right.v];
    }
    return ["int", left.v, right.v];
  };

  Interpreter.prototype.numericOp = function (op, left, right, line) {
    const pair = this.asNumbers(left, right, line);
    const kind = pair[0];
    const a = pair[1];
    const b = pair[2];
    if (kind === "double") {
      let n;
      if (op === "+") n = a + b;
      else if (op === "-") n = a - b;
      else if (op === "*") n = a * b;
      else if (op === "/") {
        if (b === 0) failAt(line, "division by zero");
        n = a / b;
      } else if (op === "%") {
        if (b === 0) failAt(line, "remainder by zero");
        n = a - Math.trunc(a / b) * b;
      } else if (op === "<") return valBool(a < b);
      else if (op === "<=") return valBool(a <= b);
      else if (op === ">") return valBool(a > b);
      else if (op === ">=") return valBool(a >= b);
      else failAt(line, "unknown operator");
      return valDouble(n);
    }
    if (op === "+") return valInt((a + b) | 0);
    if (op === "-") return valInt((a - b) | 0);
    if (op === "*") return valInt(Math.imul(a, b));
    if (op === "/") return valInt(idiv(a, b, line));
    if (op === "%") return valInt(imod(a, b, line));
    if (op === "<") return valBool(a < b);
    if (op === "<=") return valBool(a <= b);
    if (op === ">") return valBool(a > b);
    if (op === ">=") return valBool(a >= b);
    failAt(line, "unknown operator");
  };

  function idiv(a, b, line) {
    if (b === 0) failAt(line, "division by zero");
    return Number(BigInt(a) / BigInt(b)) | 0;
  }
  function imod(a, b, line) {
    if (b === 0) failAt(line, "remainder by zero");
    return Number(BigInt(a) % BigInt(b)) | 0;
  }

  // Remember declared types so int x = 1.5 is rejected and double x = 1 is allowed.
  const _declare = Scope.prototype.declare;
  Scope.prototype.declare = function (name, cell, line, declType) {
    if (declType) cell.declType = declType;
    _declare.call(this, name, cell, line);
  };

  const _execDecl = Interpreter.prototype.execDecl;
  Interpreter.prototype.execDecl = function (stmt) {
    stmt.names.forEach((d) => {
      let value = null;
      let ready = false;
      if (d.init) {
        value = this.eval(d.init);
        if (stmt.vartype === "double" && value.k === "int") value = valDouble(value.v);
        this.checkAssign(stmt.vartype, value, stmt.line);
        ready = true;
        this.note(d.name + " = " + this.fmt(value));
      } else if (stmt.vartype === "Scanner") {
        failAt(stmt.line, "create the Scanner with new Scanner(System.in)");
      }
      this.scope.declare(d.name, { ready: ready, value: value, declType: stmt.vartype }, stmt.line);
    });
  };

  function run(source, inputText, options) {
    try {
      const tokens = tokenize(source);
      const parser = new Parser(tokens);
      const ast = parser.parseProgram();
      const interp = new Interpreter(inputText, options || {});
      interp.execProgram(ast);
      return { output: interp.output, error: null, trace: interp.notes };
    } catch (e) {
      return { output: "", error: e.message || String(e), trace: [] };
    }
  }

  return { run: run };
});
