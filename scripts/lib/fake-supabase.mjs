/**
 * An in-memory stand-in for the PostgREST query builder, faithful enough to
 * prove queue behaviour.
 *
 * ==================== WHY THIS EXISTS ====================
 * The agent-queue verifiers were static: they read the query modules as text
 * and asserted that certain substrings appeared in a certain order. That
 * caught shape regressions and missed a production outage — a pull query that
 * ordered and limited GLOBALLY and let the route filter afterwards reads
 * exactly like a company-scoped query when you are grepping for
 * `company_id`. Only running it against rows belonging to two companies shows
 * that one starves the other.
 *
 * So this executes the REAL query modules. Nothing here is a re-implementation
 * of the code under test: the modules are loaded with only their Supabase
 * client and `server-only` marker replaced, and every filter, order, limit and
 * affected-row count they rely on is evaluated here the way PostgREST
 * evaluates it.
 *
 * ==================== WHAT IT MODELS, AND WHAT IT DOES NOT ====================
 * Models: eq/is/gt/in filters, ordering, limit, projection, single/maybeSingle
 * cardinality, insert with unique-constraint violation (23505), guarded UPDATE
 * returning affected rows via `.select()`, upsert-on-conflict (replace in
 * place or insert), and injectable failures.
 *
 * Does NOT model: RLS (the service role bypasses it anyway), CHECK
 * constraints (asserted against the migrations by the static verifier),
 * transactions, or concurrent visibility. A test that would only pass because
 * one of those is missing is noted where it matters rather than left implied.
 */

/** Unique constraints per table, as the migrations declare them. */
const UNIQUE_CONSTRAINTS = {
  agent_chief_messages: [["company_id", "request_key"]],
  agent_work_requests: [["company_id", "request_key"]],
};

const MATCHERS = {
  eq: (rowValue, value) => rowValue === value,
  is: (rowValue, value) => (value === null ? rowValue === null || rowValue === undefined : rowValue === value),
  gt: (rowValue, value) => rowValue > value,
  neq: (rowValue, value) => rowValue !== value,
  in: (rowValue, value) => Array.isArray(value) && value.includes(rowValue),
};

class FakeQuery {
  constructor(store, table, op, payload, opUpsertOptions) {
    this.store = store;
    this.table = table;
    this.op = op;
    this.payload = payload;
    this.upsertOptions = opUpsertOptions ?? null;
    this.filters = [];
    this.projection = null;
    this.orderBy = null;
    this.limitTo = null;
    this.cardinality = null;
    this.returning = false;
  }

  select(columns) {
    this.projection = typeof columns === "string" ? columns : null;
    // On insert/update, calling .select() is what makes PostgREST return the
    // affected rows — the distinction the settlement fix depends on.
    this.returning = true;
    return this;
  }

  eq(column, value) {
    this.filters.push(["eq", column, value]);
    return this;
  }

  is(column, value) {
    this.filters.push(["is", column, value]);
    return this;
  }

  gt(column, value) {
    this.filters.push(["gt", column, value]);
    return this;
  }

  neq(column, value) {
    this.filters.push(["neq", column, value]);
    return this;
  }

  in(column, values) {
    this.filters.push(["in", column, values]);
    return this;
  }

  order(column, options) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count) {
    this.limitTo = count;
    return this;
  }

  single() {
    this.cardinality = "single";
    this.returning = true;
    return this;
  }

  maybeSingle() {
    this.cardinality = "maybe";
    this.returning = true;
    return this;
  }

  /** Thenable: awaiting the builder is what runs it, as with PostgREST. */
  then(onFulfilled, onRejected) {
    let result;
    try {
      result = this.run();
    } catch (error) {
      return Promise.resolve().then(() => onRejected?.(error));
    }
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }

  matches(row) {
    return this.filters.every(([kind, column, value]) =>
      MATCHERS[kind](row[column], value),
    );
  }

  project(row) {
    if (!this.projection || this.projection === "*") return { ...row };
    const columns = this.projection.split(",").map((c) => c.trim());
    const out = {};
    for (const column of columns) out[column] = row[column];
    return out;
  }

  shape(rows) {
    if (this.cardinality === "single") {
      if (rows.length !== 1) {
        return {
          data: null,
          error: {
            code: "PGRST116",
            message: `expected 1 row, got ${rows.length}`,
          },
        };
      }
      return { data: rows[0], error: null };
    }
    if (this.cardinality === "maybe") {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  run() {
    const failure = this.store.takeFailure(this.table, this.op);
    if (failure) return { data: null, error: failure };

    const rows = this.store.rows(this.table);

    if (this.op === "select") {
      let found = rows.filter((row) => this.matches(row));
      if (this.orderBy) {
        const { column, ascending } = this.orderBy;
        found = [...found].sort((a, b) => {
          if (a[column] === b[column]) return 0;
          const less = a[column] < b[column] ? -1 : 1;
          return ascending ? less : -less;
        });
      }
      // Ordering and limiting happen AFTER filtering, exactly as SQL does.
      // A query that filters in the route instead of here is what this
      // ordering makes visible.
      if (this.limitTo !== null) found = found.slice(0, this.limitTo);
      return this.shape(found.map((row) => this.project(row)));
    }

    if (this.op === "insert") {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = [];
      for (const candidate of incoming) {
        const row = this.store.buildRow(this.table, candidate);
        const violated = (UNIQUE_CONSTRAINTS[this.table] ?? []).some((columns) =>
          rows.some((existing) =>
            columns.every((column) => existing[column] === row[column]),
          ),
        );
        if (violated) {
          return {
            data: null,
            error: {
              code: "23505",
              message: `duplicate key value violates unique constraint on ${this.table}`,
            },
          };
        }
        rows.push(row);
        inserted.push(row);
      }
      if (!this.returning) return { data: null, error: null };
      return this.shape(inserted.map((row) => this.project(row)));
    }

    if (this.op === "update") {
      const affected = rows.filter((row) => this.matches(row));
      for (const row of affected) Object.assign(row, this.payload);
      if (!this.returning) return { data: null, error: null };
      return this.shape(affected.map((row) => this.project(row)));
    }

    if (this.op === "upsert") {
      // `INSERT ... ON CONFLICT (conflictColumns) DO UPDATE SET ...` — one
      // atomic statement in real Postgres. The fake models the OUTCOME (a
      // matching row is replaced in place, a non-matching one is created)
      // rather than the SQL, which is enough to prove upsert semantics: a
      // second heartbeat REPLACES the first rather than accumulating.
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload];
      const conflictColumns = (this.upsertOptions?.onConflict ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const upserted = [];
      for (const candidate of incoming) {
        const existing =
          conflictColumns.length > 0
            ? rows.find((row) => conflictColumns.every((column) => row[column] === candidate[column]))
            : undefined;
        if (existing) {
          Object.assign(existing, candidate);
          upserted.push(existing);
        } else {
          const row = this.store.buildRow(this.table, candidate);
          rows.push(row);
          upserted.push(row);
        }
      }
      if (!this.returning) return { data: null, error: null };
      return this.shape(upserted.map((row) => this.project(row)));
    }

    throw new Error(`unsupported operation: ${this.op}`);
  }
}

class FakeStore {
  constructor() {
    this.tables = new Map();
    this.sequences = new Map();
    this.failures = [];
    this.idCounter = 0;
  }

  rows(table) {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table);
  }

  buildRow(table, candidate) {
    const next = (this.sequences.get(table) ?? 0) + 1;
    this.sequences.set(table, next);
    this.idCounter += 1;
    return {
      // Defaults the migrations declare, so the code under test sees the row
      // shape it would see in Postgres rather than only what it wrote.
      id: candidate.id ?? `row-${this.idCounter}`,
      seq: candidate.seq ?? next,
      status: "queued",
      applied_at: null,
      outcome: null,
      outcome_detail: null,
      answered_at: null,
      error_detail: null,
      in_reply_to: null,
      note: null,
      params: null,
      created_at: candidate.created_at ?? `2026-09-02T00:00:${String(next).padStart(2, "0")}.000Z`,
      requested_at: candidate.requested_at ?? `2026-09-02T00:00:${String(next).padStart(2, "0")}.000Z`,
      ...candidate,
    };
  }

  /** Seed a row directly, bypassing the code under test. */
  seed(table, row) {
    const built = this.buildRow(table, row);
    this.rows(table).push(built);
    return built;
  }

  /** Make the NEXT matching operation fail with a database error. */
  failNext(table, op, error) {
    this.failures.push({ table, op, error, used: false });
  }

  takeFailure(table, op) {
    const found = this.failures.find(
      (f) => !f.used && f.table === table && f.op === op,
    );
    if (!found) return null;
    found.used = true;
    return found.error;
  }

  reset() {
    this.tables.clear();
    this.sequences.clear();
    this.failures = [];
  }
}

/**
 * A fake client plus the store behind it.
 *
 * `client.from(table)` returns a builder whose `insert`/`update`/`select`
 * behave as the real one does for the operations these modules perform.
 */
export function createFakeSupabase() {
  const store = new FakeStore();
  const client = {
    from(table) {
      return {
        select: (columns) => new FakeQuery(store, table, "select", null).select(columns),
        insert: (payload) => new FakeQuery(store, table, "insert", payload),
        update: (payload) => new FakeQuery(store, table, "update", payload),
        upsert: (payload, options) => new FakeQuery(store, table, "upsert", payload, options),
      };
    },
  };
  return { client, store };
}
