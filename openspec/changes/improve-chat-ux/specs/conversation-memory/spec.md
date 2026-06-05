## ADDED Requirements

### Requirement: Chat turns are persisted per user
The `/api/chat` route SHALL persist each completed turn (the user message and the assistant answer) to the `Conversation`/`Message` tables, associated with the authenticated user. A conversation record SHALL be created on the first turn and reused for subsequent turns of the same thread.

#### Scenario: First message in a new thread
- **WHEN** an authenticated user sends their first message and the assistant answer completes
- **THEN** a `Conversation` row owned by that user is created and two `Message` rows (user, assistant) are written under it

#### Scenario: Follow-up message in an existing thread
- **WHEN** the user sends a follow-up in the same thread and the answer completes
- **THEN** the new user and assistant `Message` rows are appended to the existing `Conversation` rather than creating a new conversation

#### Scenario: Generation fails
- **WHEN** answer generation does not complete successfully
- **THEN** no partial assistant message is persisted and the usage counter is not incremented

### Requirement: Most recent conversation is restored on return
The chat SHALL load the authenticated user's most recent conversation when the chat view mounts, so an existing thread survives a page reload.

#### Scenario: Returning user with prior history
- **WHEN** a user who has a prior conversation opens the chat
- **THEN** the messages from their most recent conversation are loaded and rendered in order

#### Scenario: New user with no history
- **WHEN** a user with no prior conversation opens the chat
- **THEN** the chat shows the empty state with no errors

### Requirement: Conversation history is supplied to the model
The model SHALL receive prior turns of the active conversation as context so it can answer follow-up questions coherently, while continuing to answer only from retrieved corpus context.

#### Scenario: Follow-up references earlier turn
- **WHEN** the user asks a follow-up that depends on an earlier message in the thread
- **THEN** the request to the model includes the prior turns as history

### Requirement: Persistence is scoped to the owning user
A user SHALL only ever load or append to conversations they own.

#### Scenario: Conversation lookup is user-scoped
- **WHEN** the latest-conversation read or any append occurs
- **THEN** the query is filtered by the authenticated user's id and never returns or mutates another user's conversation
