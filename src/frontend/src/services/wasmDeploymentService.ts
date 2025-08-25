import { backend } from "../../../declarations/backend";
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

const CHUNK_SIZE = 500 * 1024; // 500KB chunks (<= 2MB backend limit)

export const wasmDeploymentService = {
  // Deploy raw WASM by chunking and invoking backend canister
  async deployRawWasm(
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
  const backendAny = backend as any;
  const sessionId = await backendAny.start_chunk_upload(
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

  const uploadResult = await backendAny.upload_chunk(
          sessionId,
          BigInt(i),
          chunk,
        );

        if ("err" in uploadResult) {
          throw new Error(`Chunk upload failed: ${uploadResult.err}`);
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
  const result = await backendAny.deploy_from_chunks(sessionId);

      if ("ok" in result) {
        console.log("[DEBUG] Deployment successful:", result.ok);
        return {
          success: true,
          canisterId: result.ok.canister_id,
        };
      }

      console.error("[DEBUG] Deployment error from backend:", (result as any).err);
      return {
        success: false,
        error: (result as any).err,
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
