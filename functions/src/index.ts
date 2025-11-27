import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https"; // Import from v2
import * as fs from "fs-extra";
import OpenAI from "openai";
import * as os from "os";
import * as path from "path";

admin.initializeApp();

export const transcribeAudio = onCall({
  timeoutSeconds: 300,
  memory: "1GiB", // Note: v2 uses 'GiB', not 'GB'
  secrets: ["OPENAI_API_KEY"], // Secrets are defined here
}, async (request) => {
  // 1. Check authentication
  // In v2, context is part of the 'request' object
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  // 2. Get data from request
  const { audioBase64 } = request.data;
  
  if (!audioBase64) {
    throw new HttpsError("invalid-argument", "Missing audio data.");
  }

  // 3. Access the secret
  // Secrets are injected into process.env at runtime
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
     throw new HttpsError("internal", "OpenAI API Key is missing.");
  }

  const openai = new OpenAI({ apiKey: apiKey });

  // 4. Create a temp file path
  const tempFilePath = path.join(os.tmpdir(), `audio_${request.auth.uid}_${Date.now()}.m4a`);

  try {
    // 5. Write Base64 to temp file
    const buffer = Buffer.from(audioBase64, "base64");
    await fs.writeFile(tempFilePath, buffer);

    // 6. Send to OpenAI
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
    });

    return { text: response.text };

  } catch (error: any) {
    console.error("Transcription error:", error);
    throw new HttpsError("internal", error.message || "Transcription failed");
  } finally {
    // 7. Cleanup temp file
    if (await fs.pathExists(tempFilePath)) {
      await fs.unlink(tempFilePath);
    }
  }
});