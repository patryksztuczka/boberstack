# Identity

Who is calling. Identity owns the people who can sign in, how they prove who they are, and how long that proof lasts. Other contexts reference a User by id and learn the caller from Identity's middleware.

## Language

**User**:
A person who can sign in. Every other context refers to a User by id only.
_Avoid_: Account, member, customer, profile

**Sign-in**:
Proving to the system that you are a User, which starts a Session. The starter offers email and password (Identity ADR 0001) and Social sign-in.
_Avoid_: Login, log in, authenticate (as a noun)

**Sign-up**:
Becoming a User. It ends with a Verification link sent to the User's email; the User is signed in once they open it.
_Avoid_: Register, create account

**Verified email**:
An email address the User proved they read by opening a Verification link. Sign-in with email and password refuses a User whose email is not verified and sends a new link.
_Avoid_: Confirmed, activated

**Verification link**:
The link in the confirmation mail that verifies the email and signs the User in. It works for 24 hours.
_Avoid_: Activation link, magic link

**Password reset**:
Choosing a new password through a link sent by mail. The link works for one hour and once; the old password keeps working until the new one is set.
_Avoid_: Password recovery, forgot password (as a noun)

**Social sign-in**:
Sign-in through GitHub or Google instead of a password, offered only when the deployment configures that provider.
_Avoid_: OAuth login, SSO

**Session**:
The period during which the system accepts a signed-in User's requests without asking again. It ends at sign-out or when it expires.
_Avoid_: Token, cookie, login

**Current User**:
The User a request acts for, known only after Identity has checked the Session. A request without one is refused before any other context sees it.
_Avoid_: Viewer, me, principal
