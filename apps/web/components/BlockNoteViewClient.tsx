// Create a new file named BlockNoteViewClient.tsx
"use client";

import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

export default function BlockNoteViewClient({ editor, theme }: { editor: any; theme: any }) {
  return <BlockNoteView editor={editor} theme={theme} />;
}