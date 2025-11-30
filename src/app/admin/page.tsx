'use client';

import dynamic from "next/dynamic";

const AdminPage = dynamic(() => import("../../components/pages/AdminPage").then(mod => ({ default: mod.AdminPage })), {
  ssr: false,
});

export default function Admin() {
  return <AdminPage />;
}

