export type DataStack = "supabase" | "firebase";

export type BackendChoice = "fastapi" | "nextjs-api" | "none";
export type WebsiteChoice = "nextjs" | "reactjs" | "none";
export type AdminChoice = "nextjs" | "none";
export type MobileChoice = "flutter" | "none";

export interface ScaffoldConfig {
  projectName: string;
  projectKebab: string;
  projectSnake: string;
  projectPascal: string;
  bundleId: string;
  description: string;
  destDir: string;
  dataStack: DataStack;
  backend: BackendChoice;
  website: WebsiteChoice;
  adminPanel: AdminChoice;
  mobile: MobileChoice;
  includeInfra: boolean;
  initGit: boolean;
  createGithubRepos: boolean;
  githubVisibility: "private" | "public";
}

export interface TemplateMeta {
  name: string;
  role: "backend" | "website" | "adminpanel" | "mobileapp";
  displayName: string;
  language: "typescript" | "python" | "dart";
  supports: DataStack[];
  folderSuffix: string;
}
