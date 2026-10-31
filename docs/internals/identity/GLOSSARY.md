# Identity

Who is calling. Identity owns the people who can sign in, how they prove who they are, and how long that proof lasts. Other contexts reference a User by id and learn the caller from Identity's middleware.

## Language

**User**:
A person who can sign in. Every other context refers to a User by id only.
_Avoid_: Account, member, customer, profile

**Sign-in**:
Proving to the system that you are a User, which starts a Session. The starter offers email and password (Identity ADR 0001).
_Avoid_: Login, log in, authenticate (as a noun)

**Sign-up**:
Becoming a User. It ends with the new User signed in.
_Avoid_: Register, create account

**Session**:
The period during which the system accepts a signed-in User's requests without asking again. It ends at sign-out or when it expires.
_Avoid_: Token, cookie, login

**Current User**:
The User a request acts for, known only after Identity has checked the Session. A request without one is refused before any other context sees it.
_Avoid_: Viewer, me, principal
