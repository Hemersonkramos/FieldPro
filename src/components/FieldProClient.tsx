// src/components/FieldProClient.tsx
"use client";

import dynamic from "next/dynamic";

const FieldPro = dynamic(() => import("@/components/FieldPro"), {
  ssr: false,         // NÃO renderiza no servidor, só no navegador
});

export default function FieldProClient() {
  return <FieldPro />;
}
