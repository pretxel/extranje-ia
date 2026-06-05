# chat-experience Specification

## Purpose
TBD - created by archiving change improve-chat-ux. Update Purpose after archive.
## Requirements
### Requirement: Answers render without a sources block
The RAG chat SHALL render assistant answers as text only, without a "Fuentes" heading or source-card list inside the message bubble. The `/api/chat` route SHALL NOT emit `source-url` stream parts.

#### Scenario: Assistant answer is displayed
- **WHEN** an assistant answer finishes streaming in the chat
- **THEN** the message bubble shows the answer text and contains no "Fuentes" heading and no source cards

#### Scenario: Route streams a response
- **WHEN** `/api/chat` produces a streamed answer
- **THEN** the stream contains text parts only and no `source-url` parts

### Requirement: Message list auto-scrolls during streaming
The chat view SHALL keep the latest content in view as messages are added and as the assistant answer streams in, not only on initial mount.

#### Scenario: New message arrives
- **WHEN** a new user or assistant message is appended to the list
- **THEN** the scroll container scrolls to the bottom so the newest message is visible

#### Scenario: Assistant answer streams token by token
- **WHEN** the assistant answer is streaming and the user has not scrolled up
- **THEN** the scroll container stays pinned to the bottom as new tokens render

### Requirement: Limit-reached state is surfaced in the UI
When the server rejects a query because the user has reached their plan limit (HTTP 402), the chat SHALL show a visible, non-silent state prompting the user to upgrade, and SHALL NOT leave the input in a stuck loading state.

#### Scenario: Free user hits the limit while chatting
- **WHEN** the user sends a message and `/api/chat` responds with HTTP 402 `{ "error": "limit_reached" }`
- **THEN** the UI shows a limit-reached message with an upgrade affordance and re-enables the input

### Requirement: Stream errors are surfaced in the UI
When answer generation fails, the chat SHALL display an error indication to the user rather than silently dropping the response.

#### Scenario: Generation fails mid-stream
- **WHEN** `/api/chat` returns the stream error fallback text
- **THEN** the UI shows an error state for that turn and the input is usable again

