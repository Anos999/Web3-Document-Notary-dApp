import express, { Router, type Request } from "express";

type MultipartFile = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

function findFilePart(req: Request): MultipartFile | null {
  const contentType = req.headers["content-type"] ?? "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  const body = Buffer.isBuffer(req.body) ? req.body : null;

  if (!boundary || !body) {
    return null;
  }

  const delimiter = Buffer.from(`--${boundary}`);
  let cursor = body.indexOf(delimiter);

  while (cursor !== -1) {
    const partStart = cursor + delimiter.length;
    if (body.subarray(partStart, partStart + 2).toString() === "--") {
      break;
    }

    const nextDelimiter = body.indexOf(delimiter, partStart);
    if (nextDelimiter === -1) {
      break;
    }

    const part = body.subarray(partStart, nextDelimiter);
    const separator = Buffer.from("\r\n\r\n");
    const headersEnd = part.indexOf(separator);
    if (headersEnd === -1) {
      cursor = nextDelimiter;
      continue;
    }

    const headers = part.subarray(0, headersEnd).toString("utf8");
    const disposition = headers.match(
      /content-disposition:[^\r\n]*name="([^"]+)"[^\r\n]*filename="([^"]*)"/i,
    );

    if (disposition?.[1] === "file") {
      const headerContentType =
        headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() ||
        "application/octet-stream";
      const contentStart = headersEnd + separator.length;
      const content = part.subarray(contentStart, part.length - 2);
      return {
        buffer: content,
        filename: disposition[2] || "document",
        contentType: headerContentType,
      };
    }

    cursor = nextDelimiter;
  }

  return null;
}

const router = Router();

router.post(
  "/upload",
  express.raw({
    type: () => true,
    limit: "50mb",
  }),
  async (req, res) => {
    const file = findFilePart(req);
    const pinataJwt = process.env.PINATA_JWT;
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

    if (!file || (!pinataJwt && !(pinataApiKey && pinataSecretApiKey))) {
      res.status(200).json({
        success: false,
        cid: "",
        error: "IPFS unavailable",
      });
      return;
    }

    try {
      const form = new FormData();
      form.append(
        "file",
        new Blob(
          [
            new Uint8Array(file.buffer).buffer as ArrayBuffer,
          ],
          { type: file.contentType },
        ),
        file.filename,
      );

      const headers: Record<string, string> = {};
      if (pinataJwt) {
        headers.Authorization = `Bearer ${pinataJwt}`;
      } else {
        headers.pinata_api_key = pinataApiKey!;
        headers.pinata_secret_api_key = pinataSecretApiKey!;
      }

      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers,
          body: form,
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) {
        res.status(200).json({
          success: false,
          cid: "",
          error: "IPFS unavailable",
        });
        return;
      }

      const payload = (await response.json()) as { IpfsHash?: string };
      if (!payload.IpfsHash) {
        res.status(200).json({
          success: false,
          cid: "",
          error: "IPFS unavailable",
        });
        return;
      }

      res.status(200).json({
        success: true,
        cid: payload.IpfsHash,
        error: null,
      });
    } catch (error) {
      req.log.warn({ err: error }, "Pinata upload unavailable");
      res.status(200).json({
        success: false,
        cid: "",
        error: "IPFS unavailable",
      });
    }
  },
);

export default router;