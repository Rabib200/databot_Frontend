// API service to handle interactions with the backend

const API_BASE_URL = "http://52.230.98.48";

export interface UploadResponse {
  file_id: string;
  filename: string;
  summary: {
    rows: number;
    columns: string[];
    data_types: Record<string, string>;
  };
  data_preview: Record<string, unknown>[];
}

export interface ChatResponse {
  file_id: string;
  filename: string;
  analysis: string;
  conversation_length?: number;
  // Chart data will be embedded in the analysis string and parsed on the frontend
}

export interface ConversationResponse {
  file_id: string;
  messages: {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }[];
  created_at: string;
  updated_at: string;
}

/**
 * Upload a file (Excel or CSV) to the server
 */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload/file/`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Upload failed with status: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Upload an Excel file to the server (legacy method - use uploadFile instead)
 */
export async function uploadExcelFile(file: File): Promise<UploadResponse> {
  // Forward to the new universal upload endpoint
  return uploadFile(file);
}

/**
 * Send a message to chat with the AI about a file
 */
export async function sendChatMessage(
  fileId: string,
  message: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_id: fileId,
      message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Chat failed with status: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Get the conversation history for a file
 */
export async function getConversationHistory(
  fileId: string
): Promise<ConversationResponse> {
  const response = await fetch(`${API_BASE_URL}/conversations/${fileId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail ||
        `Failed to fetch conversation history with status: ${response.status}`
    );
  }

  return response.json();
}
