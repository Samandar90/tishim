"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";

export function RevokeAccessButton({
  accessId,
  dentistName,
}: {
  accessId: string;
  dentistName: string;
}) {
  const t = useTranslations("access");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);

  async function revoke() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("patient_access")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", accessId);

      if (error) {
        console.error("revoke access failed", error);
        setToast({ msg: t("revokeError"), tone: "error" });
        return;
      }
      setConfirming(false);
      setToast({ msg: t("revoked"), tone: "success" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        {t("revoke")}
      </Button>

      <ConfirmDialog
        open={confirming}
        title={t("revokeConfirmTitle")}
        description={t("revokeConfirmText", { name: dentistName })}
        confirmLabel={t("revoke")}
        danger
        loading={loading}
        onConfirm={revoke}
        onCancel={() => setConfirming(false)}
      />

      <Toast
        message={toast?.msg ?? null}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
