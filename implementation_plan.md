# Admin Interactive AI Assistant Bot

This document outlines the architecture and implementation plan for building a real-time, interactive AI chatbot specifically designed for School Admins. This bot will serve as a dynamic responder to answer questions, clear doubts about platform usage, and fetch real-time data from the website without relying on pre-defined static questions.

## User Review Required

> [!IMPORTANT]
> **LLM Provider Selection:** To power this interactive bot, we need to integrate a Large Language Model (LLM). Please confirm which provider you prefer to use (e.g., OpenAI/ChatGPT, Google Gemini, or Anthropic Claude). You will need to provide an API key for the chosen service.

> [!WARNING]
> **Data Access Level:** The bot can be designed to answer general "How-To" questions about the platform, AND it can be given tools to query your actual database (e.g., "How many students are in Class 10?", "Show me recent exam results"). Please confirm if you want the bot to have secure read-only access to your school's data to answer data-specific queries.

## Open Questions

1. **Placement:** Should the bot be a floating widget (always available in the bottom-right corner of the admin dashboard) or a dedicated "AI Assistant" page?
2. **Context / Knowledge Base:** Do we currently have a user manual or documentation text that we should feed to the bot so it understands how the website works?

---

## Proposed Architecture

We will implement an AI-powered conversational agent using a **Retrieval-Augmented Generation (RAG)** and **Tool Calling** approach.

### 1. Frontend: Interactive Chat UI

We will build a modern, animated chat interface.

#### [NEW] `frontend/src/components/AdminAIBot.jsx`
* A floating action button (FAB) that opens a sleek chat window.
* Features:
    * Message history (User vs. AI bubbles).
    * "Typing..." indicators while the AI processes.
    * Suggested quick actions (e.g., "Get Student Stats", "How do I create an exam?").
    * Built using standard React state, MUI components, and framer-motion for smooth sliding animations.

#### [MODIFY] `frontend/src/components/Dashboard.jsx` (or Admin Layout)
* Inject the `<AdminAIBot />` component so it is available across all admin pages.

### 2. Backend: AI Orchestration Layer

We will create a secure backend endpoint to handle the conversation, pass it to the LLM, and execute any necessary data retrieval tools.

#### [NEW] `backend/routes/ai_routes.py` (or add to existing routes)
* **Endpoint:** `POST /api/admin/chat`
* **Security:** Secured using `@role_required('school_admin', 'admin')`. The bot will strictly use the logged-in admin's `school_id` to ensure data privacy.
* **Logic Flow:**
    1. Receive user's message.
    2. Inject system prompt: *"You are an expert platform assistant for School Admins. You help answer questions and fetch data..."*
    3. Pass the query to the chosen LLM API.
    4. **Tool Calling (Data Retrieval):** If the user asks for data (e.g., "How many students?"), the LLM will trigger a Python function. The backend will execute `Student.query.filter_by(school_id=current_user.school_id).count()` and return the number to the LLM, which will then format a human-readable response.
    5. Return the final AI response to the frontend.

### 3. Core Capabilities

* **General Q&A (RAG):** We will provide the AI with a system prompt outlining the platform's features (Exams, Question Banks, Student Management) so it can answer "How do I..." questions accurately.
* **Real-time Data Fetching:** We will define a set of safe, read-only Python functions that the LLM can call:
    * `get_total_students(school_id)`
    * `get_recent_exams(school_id)`
    * `get_exam_average_score(exam_id)`
    * The LLM decides when to use these tools based on the admin's question.

---

## Verification Plan

### Automated Tests
* Create unit tests for the backend tool-calling functions to ensure they strictly respect the `school_id` boundaries (an admin from School A cannot query School B's stats).

### Manual Verification
* **UI Test:** Ensure the floating bot opens, closes, and scrolls correctly on desktop and mobile views.
* **Q&A Test:** Ask the bot "How do I create an exam?" and verify it provides instructions based on our system prompt.
* **Data Test:** Ask the bot "How many students are in my school?" and verify it triggers the database function, fetches the correct count, and replies naturally (e.g., "You currently have 150 students registered in your school.").
