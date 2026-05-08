import type { Role } from "../../../services/user/types"; 
import type { EditorRole } from "./editorExtensions";

export function toEditorRole(role: Role | undefined): EditorRole {
  if (role === "DOSEN" || role === "ADMIN") return "DOSEN";
  return "MAHASISWA";
}
