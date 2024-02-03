import { SaveElementType } from "./SaveElementType.js";

export type SaveOptions = {
  mimeType: SaveElementType;
  deleteExisting?: boolean;
  baseFolderId?: string;
  ignore?: string[];
};
