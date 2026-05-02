"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toKebab, toSnake, toPascal, toBundleId } from "@create-saas/core/identifiers";
import type {
  DataStack,
  BackendChoice,
  WebsiteChoice,
  AdminChoice,
  MobileChoice,
} from "@create-saas/core/schemas";
import { encodeShareable, decodeShareable } from "@/lib/share-codec";

interface FormState {
  projectName: string;
  description: string;
  bundleVendor: string;
  dataStack: DataStack;
  backend: BackendChoice;
  website: WebsiteChoice;
  adminPanel: AdminChoice;
  mobile: MobileChoice;
  includeInfra: boolean;
}

const DEFAULT_FORM: FormState = {
  projectName: "",
  description: "A new SaaS project",
  bundleVendor: "com.example",
  dataStack: "supabase",
  backend: "fastapi",
  website: "nextjs",
  adminPanel: "nextjs",
  mobile: "none",
  includeInfra: true,
};

const DATA_STACKS: ReadonlyArray<{ value: DataStack; label: string }> = [
  { value: "supabase", label: "Supabase (Postgres + Auth + Storage)" },
  { value: "firebase", label: "Firebase (Firestore + Auth + FCM)" },
];
const BACKENDS: ReadonlyArray<{ value: BackendChoice; label: string }> = [
  { value: "fastapi", label: "FastAPI (Python)" },
  { value: "nextjs-api", label: "Next.js API routes" },
  { value: "none", label: "None — clients talk to the data stack directly" },
];
const WEBSITES: ReadonlyArray<{ value: WebsiteChoice; label: string }> = [
  { value: "nextjs", label: "Next.js (App Router)" },
  { value: "reactjs", label: "React + Vite (SPA)" },
  { value: "none", label: "None" },
];

interface TreeEntry {
  path: string;
  bytes: number;
  kind: "file" | "dir";
}

interface PreviewResponse {
  tree: TreeEntry[];
  durationMs: number;
  apps: Array<{ name: string; displayName: string; folder: string }>;
}

interface DownloadSuccess {
  filename: string;
  bytes: number;
  durationMs: number;
  apps: number;
}

function buildPreviewConfig(form: FormState) {
  const projectKebab = toKebab(form.projectName) || "my-app";
  return {
    projectName: form.projectName.trim() || "My App",
    projectKebab,
    projectSnake: toSnake(form.projectName) || "my_app",
    projectPascal: toPascal(form.projectName) || "MyApp",
    bundleId: toBundleId(projectKebab, form.bundleVendor || "com.example"),
    description: form.description,
    dataStack: form.dataStack,
    backend: form.backend,
    website: form.website,
    adminPanel: form.adminPanel,
    mobile: form.mobile,
    includeInfra: form.includeInfra,
  };
}

export default function Configurator() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [download, setDownload] = useState<DownloadSuccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingKind, setLoadingKind] = useState<"preview" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from a `?share=<token>` (full-config deep-link) or from
  // recommender-style `?dataStack=…&backend=…` query params.
  useEffect(() => {
    const share = searchParams.get("share");
    if (share) {
      const decoded = decodeShareable(share);
      if (decoded) {
        setForm({
          projectName: decoded.projectName,
          description: decoded.description,
          bundleVendor: decoded.bundleVendor,
          dataStack: decoded.dataStack,
          backend: decoded.backend,
          website: decoded.website,
          adminPanel: decoded.adminPanel,
          mobile: decoded.mobile,
          includeInfra: decoded.includeInfra,
        });
        return;
      }
    }
    const next: Partial<FormState> = {};
    const ds = searchParams.get("dataStack");
    if (ds === "supabase" || ds === "firebase") next.dataStack = ds;
    const be = searchParams.get("backend");
    if (be === "fastapi" || be === "nextjs-api" || be === "none") next.backend = be;
    const ws = searchParams.get("website");
    if (ws === "nextjs" || ws === "reactjs" || ws === "none") next.website = ws;
    const ap = searchParams.get("adminPanel");
    if (ap === "nextjs" || ap === "none") next.adminPanel = ap;
    const mb = searchParams.get("mobile");
    if (mb === "flutter" || mb === "none") next.mobile = mb;
    const name = searchParams.get("name");
    if (name) next.projectName = name;
    if (Object.keys(next).length) setForm((prev) => ({ ...prev, ...next }));
  }, [searchParams]);

  const [shareCopied, setShareCopied] = useState(false);
  const onShare = async () => {
    const token = encodeShareable(form);
    const url = `${window.location.origin}/configure?share=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      // Fallback: drop the URL into the address bar so the user can copy manually.
      window.history.replaceState(null, "", `/configure?share=${token}`);
    }
  };

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const derived = useMemo(() => buildPreviewConfig(form), [form]);

  const validateName = (): boolean => {
    if (!form.projectName.trim() || form.projectName.trim().length < 2) {
      setError("Project name needs at least 2 characters.");
      return false;
    }
    return true;
  };

  const onPreview = async () => {
    if (!validateName()) return;
    setError(null);
    setDownload(null);
    setLoading(true);
    setLoadingKind("preview");
    try {
      const res = await fetch("/api/scaffold/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(derived),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Preview failed");
        setPreview(null);
      } else {
        setPreview(json as PreviewResponse);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setLoadingKind(null);
    }
  };

  const onDownload = async () => {
    if (!validateName()) return;
    setError(null);
    setDownload(null);
    setLoading(true);
    setLoadingKind("download");
    const start = performance.now();
    try {
      const res = await fetch("/api/scaffold/zip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(derived),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? `Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${derived.projectKebab}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Best-effort app count from the most recent preview, otherwise from the
      // composition. Used for the success card copy.
      const appsFromPreview = preview?.apps.length;
      const appsFromForm = [
        form.backend !== "none",
        form.website !== "none",
        form.adminPanel !== "none",
        form.mobile !== "none",
      ].filter(Boolean).length;

      setDownload({
        filename: `${derived.projectKebab}.zip`,
        bytes: blob.size,
        durationMs: Math.round(performance.now() - start),
        apps: appsFromPreview ?? appsFromForm,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setLoadingKind(null);
    }
  };

  const showFlutterBanner = form.mobile === "flutter";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr,1fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onPreview();
        }}
        className="space-y-6"
      >
        <div>
          <label htmlFor="projectName" className="mb-1 block font-medium">
            Project name
          </label>
          <input
            id="projectName"
            type="text"
            value={form.projectName}
            onChange={(e) => update("projectName", e.target.value)}
            placeholder="My Cool App"
            className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            kebab: <code className="font-mono">{derived.projectKebab}</code> · snake:{" "}
            <code className="font-mono">{derived.projectSnake}</code> · bundle:{" "}
            <code className="font-mono">{derived.bundleId}</code>
          </p>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block font-medium">
            One-line description
          </label>
          <input
            id="description"
            type="text"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="bundleVendor" className="mb-1 block font-medium">
            Mobile bundle prefix
          </label>
          <input
            id="bundleVendor"
            type="text"
            value={form.bundleVendor}
            onChange={(e) => update("bundleVendor", e.target.value)}
            placeholder="com.you"
            className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Used only when Mobile = Flutter. Final bundle id becomes{" "}
            <code className="font-mono">{derived.bundleId}</code>.
          </p>
        </div>

        <div>
          <label htmlFor="dataStack" className="mb-1 block font-medium">
            Data / Auth stack
          </label>
          <select
            id="dataStack"
            value={form.dataStack}
            onChange={(e) => update("dataStack", e.target.value as DataStack)}
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          >
            {DATA_STACKS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="backend" className="mb-1 block font-medium">
            Backend
          </label>
          <select
            id="backend"
            value={form.backend}
            onChange={(e) => update("backend", e.target.value as BackendChoice)}
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          >
            {BACKENDS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="website" className="mb-1 block font-medium">
            Website
          </label>
          <select
            id="website"
            value={form.website}
            onChange={(e) => update("website", e.target.value as WebsiteChoice)}
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          >
            {WEBSITES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="adminPanel"
            type="checkbox"
            checked={form.adminPanel === "nextjs"}
            onChange={(e) => update("adminPanel", e.target.checked ? "nextjs" : "none")}
          />
          <label htmlFor="adminPanel" className="font-medium">
            Include admin panel (Next.js, separate port)
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="mobile"
            type="checkbox"
            checked={form.mobile === "flutter"}
            onChange={(e) => update("mobile", e.target.checked ? "flutter" : "none")}
          />
          <label htmlFor="mobile" className="font-medium">
            Include Flutter mobile app (prerendered shell — no SDK needed at scaffold time)
          </label>
        </div>

        {showFlutterBanner && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <strong className="text-foreground">Flutter note.</strong> The ZIP contains a prerendered Flutter shell — bundle id, Kotlin package, and iOS identifiers are all already substituted to <code className="font-mono">{derived.bundleId}</code>. Install the Flutter SDK locally before running the app, or use the CLI's live <code className="font-mono">flutter create</code> path.
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            id="includeInfra"
            type="checkbox"
            checked={form.includeInfra}
            onChange={(e) => update("includeInfra", e.target.checked)}
          />
          <label htmlFor="includeInfra" className="font-medium">
            Include infra folder (migrations / rules)
          </label>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPreview}
            disabled={loading}
            className="rounded-md border border-border px-4 py-2 font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {loadingKind === "preview" ? "Scaffolding to a temp dir…" : "Preview folder tree"}
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={loading}
            className="rounded-md bg-accent px-5 py-3 font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loadingKind === "download" ? "Building zip…" : "Download .zip"}
          </button>
          <button
            type="button"
            onClick={onShare}
            disabled={loading}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {shareCopied ? "Link copied ✓" : "Copy share link"}
          </button>
        </div>
      </form>

      <aside className="space-y-4">
        {download && <DownloadSuccessCard download={download} projectKebab={derived.projectKebab} />}

        <div className="rounded-md border border-border bg-muted/30 p-4">
          <h2 className="mb-3 font-medium">Folder tree</h2>
          {!preview && !loading && !download && (
            <p className="text-sm text-muted-foreground">
              Hit <em>Preview folder tree</em> to scaffold to a temp dir and see what gets generated. Nothing is persisted; the temp dir is deleted right after.
            </p>
          )}
          {loading && (
            <div className="space-y-2" role="status" aria-busy="true">
              <p className="text-sm text-muted-foreground">
                {loadingKind === "preview"
                  ? "Scaffolding to a temp dir on the server…"
                  : "Scaffolding + zipping (~1–5s for typical scaffolds, longer with Flutter)…"}
              </p>
              <div className="h-2 w-full overflow-hidden rounded bg-muted">
                <div className="h-full w-1/3 animate-pulse rounded bg-muted-foreground/40" />
              </div>
            </div>
          )}
          {preview && !loading && (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Generated in {preview.durationMs}ms · {preview.tree.filter((t) => t.kind === "file").length} files across {preview.apps.length} apps
              </p>
              <div className="max-h-96 overflow-auto rounded border border-border bg-background p-3 font-mono text-xs">
                {preview.tree.map((entry) => (
                  <div key={entry.path} className={entry.kind === "dir" ? "text-muted-foreground" : ""}>
                    {entry.path}
                    {entry.kind === "dir" ? "/" : ""}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function DownloadSuccessCard({
  download,
  projectKebab,
}: {
  download: DownloadSuccess;
  projectKebab: string;
}) {
  const cmdUnzip = `unzip ${download.filename}`;
  const cmdCd = `cd ${projectKebab}`;
  const cmdInit = `for d in */ ; do (cd "$d" && git init -q && git add . && git commit -q -m "chore: initial scaffold"); done`;

  return (
    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 dark:border-emerald-400/40 dark:bg-emerald-400/10">
      <p className="mb-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        ✓ Downloaded {download.filename}
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        {formatBytes(download.bytes)} · {download.apps} app{download.apps === 1 ? "" : "s"} · built in {download.durationMs}ms
      </p>
      <p className="mb-2 text-sm font-medium">Next steps</p>
      <ol className="space-y-2 text-sm">
        <li>
          <span className="text-muted-foreground">1. Unzip</span>
          <pre className="mt-1 overflow-x-auto rounded bg-background p-2 font-mono text-xs">{cmdUnzip}</pre>
        </li>
        <li>
          <span className="text-muted-foreground">2. Step into the project</span>
          <pre className="mt-1 overflow-x-auto rounded bg-background p-2 font-mono text-xs">{cmdCd}</pre>
        </li>
        <li>
          <span className="text-muted-foreground">
            3. Initialise per-app git repos (matches the CLI's <code className="font-mono">--create-github-repos</code> shape)
          </span>
          <pre className="mt-1 overflow-x-auto rounded bg-background p-2 font-mono text-xs">{cmdInit}</pre>
        </li>
        <li>
          <span className="text-muted-foreground">
            4. Open the per-app <code className="font-mono">README.md</code> in each subfolder for setup steps and required env vars.
          </span>
        </li>
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Need GitHub push or accounts? Use the CLI:{" "}
        <code className="font-mono">npx create-saas {projectKebab} --create-github-repos</code>.
      </p>
    </div>
  );
}
