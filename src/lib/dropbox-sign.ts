type DropboxSigner = {
  role: string;
  name: string;
  emailAddress: string;
};

type SendTemplateRequest = {
  templateId: string;
  subject: string;
  message: string;
  signers: DropboxSigner[];
  metadata?: Record<string, string>;
};

export async function sendDropboxTemplateSignatureRequest(input: SendTemplateRequest) {
  const apiKey = process.env.DROPBOX_SIGN_API_KEY;
  if (!apiKey) {
    throw new Error("DROPBOX_SIGN_API_KEY is not configured");
  }

  const payload = {
    template_ids: [input.templateId],
    subject: input.subject,
    message: input.message,
    test_mode: process.env.DROPBOX_SIGN_TEST_MODE !== "false",
    signers: input.signers.map((signer) => ({
      role: signer.role,
      name: signer.name,
      email_address: signer.emailAddress,
    })),
    metadata: input.metadata ?? {},
  };

  const response = await fetch("https://api.hellosign.com/v3/signature_request/send_with_template", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dropbox Sign request failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<{
    signature_request: {
      signature_request_id: string;
      is_complete: boolean;
      signatures?: Array<{ status_code?: string }>;
    };
  }>;
}

export async function getDropboxSignedFile(signatureRequestId: string) {
  const apiKey = process.env.DROPBOX_SIGN_API_KEY;
  if (!apiKey) {
    throw new Error("DROPBOX_SIGN_API_KEY is not configured");
  }

  const response = await fetch(
    `https://api.hellosign.com/v3/signature_request/files/${signatureRequestId}?file_type=pdf`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        Accept: "application/pdf",
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dropbox Sign file download failed: ${response.status} ${text}`);
  }

  return response.arrayBuffer();
}

export function parseDropboxWebhookPayload(formDataText: string) {
  const params = new URLSearchParams(formDataText);
  const json = params.get("json");
  if (!json) return null;
  return JSON.parse(json) as {
    event?: { event_type?: string; event_time?: string; event_hash?: string };
    signature_request?: {
      signature_request_id?: string;
      is_complete?: boolean;
      signatures?: Array<{ status_code?: string; signer_email_address?: string }>;
    };
  };
}
