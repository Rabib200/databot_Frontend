# AI Data Analysis System - Frontend

A Next.js application that connects to a FastAPI backend to analyze Excel/CSV data using Azure OpenAI.

## Features

- Modern UI with Shadcn components
- Upload Excel files for analysis
- Chat with an AI assistant about your data
- View data previews and summaries
- Real-time conversation with context memory

## Tech Stack

- **Frontend**:
  - Next.js 15
  - TypeScript
  - Tailwind CSS
  - Shadcn UI
  - Sonner toast notifications

- **Backend** (connects to):
  - FastAPI
  - Azure OpenAI
  - Pandas for data processing

## Getting Started

### Prerequisites

- Node.js 18+ and Yarn
- FastAPI backend running (see backend setup below)

### Installation

1. Install dependencies:

```bash
yarn install
```

2. Start the development server:

```bash
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Backend Setup

Make sure the FastAPI backend is running. The backend should be set up with:

1. FastAPI server running on `http://localhost:8000`
2. Azure OpenAI configured with appropriate API keys
3. Three main endpoints implemented:
   - `/upload/excel/` - Upload and process Excel files
   - `/chat/` - Interact with Azure OpenAI about the data
   - `/conversations/{file_id}` - Retrieve conversation history

You can test the API connection using the API Test tab in the application.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx  # Main layout with toaster
│   └── page.tsx    # Main page with tabs
├── components/
│   ├── data-analysis-interface.tsx  # Main data analysis UI
│   ├── api-test.tsx                # API connection test component
│   └── ui/                         # Shadcn UI components
├── services/
│   └── api.ts      # API service functions
└── lib/
    └── utils.ts    # Utility functions
```

## Usage

1. Go to the Data Analysis tab
2. Upload an Excel file (.xlsx or .xls)
3. Wait for the file to be processed
4. Ask questions about your data in the chat
5. Receive AI-powered analysis and insights

## Development

- Use the API Test tab to verify backend connectivity
- Check for TypeScript errors with `yarn type-check`
- Format code with `yarn format`

## Environment Variables

Configure API endpoints in `src/services/api.ts` to match your backend setup.
