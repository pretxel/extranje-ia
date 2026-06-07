## ADDED Requirements

### Requirement: Chat surface uses the brand visual system
The chat surface SHALL render in the application brand language — the deep-navy editorial theme, Plus Jakarta Sans body / Playfair Display display fonts, and warm orange/amber accents defined in the existing CSS variables — and SHALL NOT use stock light/gray/blue Tailwind styling. The conversation area SHALL carry the brand atmosphere (gradient-mesh and/or grain) consistent with the rest of the app.

#### Scenario: Chat renders on brand
- **WHEN** the chat surface is displayed
- **THEN** its background, text, surfaces, and accents derive from the brand CSS variables (e.g. `--bg`, `--surface`, `--accent`, `--text`) and no `bg-white` / `bg-gray-*` / `bg-blue-*` stock styles remain on the chat components

#### Scenario: Visual cohesion with the shell
- **WHEN** the chat is viewed inside the dashboard shell
- **THEN** the conversation area, composer, and usage banner read as one cohesive branded surface with the sidebar, not a light panel inside a dark frame

### Requirement: Distinct user and assistant message styling
User and assistant messages SHALL be visually distinct and immediately attributable. User messages SHALL use a warm accent treatment; assistant messages SHALL use a calm surface treatment with an editorial accent. Assistant answers SHALL remain text-only with no sources/"Fuentes" block.

#### Scenario: A turn is rendered
- **WHEN** a user message and an assistant answer are shown
- **THEN** the user message is visually marked with the warm accent and the assistant message with the surface treatment, the two are clearly differentiated, and the assistant message contains no "Fuentes" heading or source cards

### Requirement: Branded empty state with suggested prompts
When the conversation is empty, the chat SHALL show a branded empty state with a Playfair headline and at least three suggested starter prompts relevant to Spanish immigration (e.g. NIE, TIE, visado, arraigo). Selecting a suggested prompt SHALL send it as the user's first message.

#### Scenario: New conversation
- **WHEN** the chat opens with no messages
- **THEN** a branded empty state with a display-font headline and ≥3 suggested prompt chips is shown

#### Scenario: Suggested prompt selected
- **WHEN** the user clicks a suggested prompt
- **THEN** that prompt is submitted as the first user message and the empty state is replaced by the conversation

### Requirement: Copy action on assistant messages
Each assistant answer SHALL offer a control to copy its text to the clipboard, with a brief confirmation after a successful copy.

#### Scenario: Copy an answer
- **WHEN** the user activates the copy control on an assistant message
- **THEN** the message's text is written to the clipboard and a transient "copied" confirmation is shown

### Requirement: Refined streaming and entrance motion
The chat SHALL present a branded typing indicator while the assistant response is pending and SHALL animate message entrance. All non-essential motion SHALL be disabled when the user requests reduced motion.

#### Scenario: Answer is streaming
- **WHEN** the assistant response is pending or streaming with no text yet
- **THEN** a branded typing indicator in the accent treatment is shown

#### Scenario: Reduced motion
- **WHEN** the user's system requests reduced motion (`prefers-reduced-motion: reduce`)
- **THEN** entrance and decorative animations are suppressed and content appears without motion

### Requirement: Responsive chat layout
The chat SHALL be usable on small screens. On narrow viewports the dashboard sidebar SHALL collapse (e.g. to a toggle/drawer) and the conversation and composer SHALL occupy the full width with the composer remaining reachable.

#### Scenario: Mobile viewport
- **WHEN** the chat is viewed on a narrow (mobile) viewport
- **THEN** the sidebar is collapsed/toggleable, the conversation uses the full width, and the composer stays usable (not overlapped or off-screen)

### Requirement: Accessible chat affordances
The redesigned chat SHALL meet baseline accessibility: interactive controls (composer, send, suggested prompts, copy) SHALL have visible focus states and accessible names, text SHALL meet WCAG AA contrast against its background, and dynamic states (typing, error, limit-reached) SHALL be conveyed to assistive technology.

#### Scenario: Keyboard and screen-reader use
- **WHEN** a user navigates the chat by keyboard or screen reader
- **THEN** the composer, send button, suggested prompts, and copy control are focusable with visible focus and accessible names, and typing/error/limit states are announced (e.g. via appropriate ARIA roles/live regions)

#### Scenario: Text contrast
- **WHEN** any message, label, or control text is rendered on the brand surfaces
- **THEN** its contrast ratio meets WCAG AA (≥ 4.5:1 for body text)
