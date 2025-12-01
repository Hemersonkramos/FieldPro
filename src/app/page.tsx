"use client";

import dynamic from "next/dynamic";

const FieldPro = dynamic(() => import("@/components/FieldPro"), {
  ssr: false, // IMPORTANTÍSSIMO!
});

export default function Page() {
  return <FieldPro />;
}
