# Todos

The example context: a User's list of things to do. It exists to show a full slice through the starter, from a form to a table and back, and is meant to be replaced.

## Language

**Todo**:
One thing a User intends to do, with a Title and whether it is Done. A Todo belongs to exactly one User and is visible only to them (Todos ADR 0001).
_Avoid_: Task, item, entry

**Title**:
The text that says what a Todo is about: trimmed, never empty, with an upper length the contract sets.
_Avoid_: Name, label, description

**Done**:
Whether the User has marked a Todo as finished. A Done Todo stays in the list until it is Removed.
_Avoid_: Completed, checked, closed

**Remove**:
Delete a Todo for good. There is no archive and no undo.
_Avoid_: Archive, hide, cancel

**User**:
Owned by Identity. For Todos, the owner of a Todo, referenced by id. See [Identity](../identity/GLOSSARY.md).
