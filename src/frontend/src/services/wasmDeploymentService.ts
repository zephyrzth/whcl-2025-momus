import { agentic_backend } from "../../../declarations/agentic-backend";
import { authService } from "./authService";

export interface DeploymentResult {
  success: boolean;
  canisterId?: string;
  error?: string;
}

export interface ChunkUploadProgress {
  currentChunk: number;
  totalChunks: number;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
}

export type ProgressCallback = (progress: ChunkUploadProgress) => void;

const CHUNK_SIZE = 500 * 1024; // 500KB chunks

export const wasmDeploymentService = {
  async deployGzippedWasm(
    file: File,
    onProgress?: ProgressCallback,
  ): Promise<DeploymentResult> {
    try {
      // Check authentication first
      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error("User not authenticated. Please sign in first.");
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Calculate number of chunks needed
      const totalChunks = Math.ceil(uint8Array.length / CHUNK_SIZE);

      console.log(
        "[DEBUG] Starting chunked upload:",
        "Total size:",
        uint8Array.length,
        "bytes,",
        "Chunks:",
        totalChunks,
      );

      // Start upload session
      const sessionId = await agentic_backend.start_chunk_upload(
        BigInt(uint8Array.length),
        BigInt(totalChunks),
      );

      console.log("[DEBUG] Upload session created:", sessionId);

      // Upload chunks
      let uploadedBytes = 0;
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, uint8Array.length);
        const chunk = uint8Array.slice(start, end);

        const uploadResult = await agentic_backend.upload_chunk(
          sessionId,
          BigInt(i),
          chunk,
        );

        if ("Err" in uploadResult) {
          throw new Error(`Chunk upload failed: ${uploadResult.Err}`);
        }

        uploadedBytes += chunk.length;

        if (onProgress) {
          onProgress({
            currentChunk: i + 1,
            totalChunks,
            uploadedBytes,
            totalBytes: uint8Array.length,
            percentage: (uploadedBytes / uint8Array.length) * 100,
          });
        }

        console.log(
          "[DEBUG] Uploaded chunk",
          i + 1,
          "of",
          totalChunks,
          "- Size:",
          chunk.length,
          "bytes",
        );
      }

      // Deploy from chunks
      console.log("[DEBUG] Starting deployment from chunks");
      const result = await agentic_backend.deploy_from_chunks(sessionId);

      if ("Ok" in result) {
        console.log("[DEBUG] Deployment successful:", result.Ok);
        return {
          success: true,
          canisterId: result.Ok.canister_id,
        };
      }

      console.error("[DEBUG] Deployment error from backend:", result.Err);
      return {
        success: false,
        error: result.Err,
      };
    } catch (error) {
      console.error("[DEBUG] Deployment error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
};
