# Connecting an AI assistant

You can let an AI assistant that supports MCP, such as Claude or Cursor, read and change your todos for you.

## Connect

1. In your assistant, add a remote MCP server with the address of the app followed by `/api/mcp`, for example `https://app.example.com/api/mcp`.
2. The assistant opens the app in your browser. Sign in if you are not signed in yet.
3. The app shows which assistant is asking and what it will be able to do. Choose **Allow**.

Your browser then goes back to the assistant, and it can list, add, change and remove your todos. It acts as you and sees only your todos.

For a task that takes several steps, such as "mark every todo about the trip as done", the assistant can write a short program and run it with the `execute` tool instead of calling each tool in turn. The program runs in a sandbox with no access to anything but your todos, and stops after 10 seconds.

## Say no

Choose **Deny** on the same screen. The assistant gets nothing and goes back to where it started.

## Good to know

- The request to connect works for 10 minutes. If the app says it expired, start again from your assistant.
- Removing a todo through the assistant is as permanent as removing it in the app.
- Start from **Sign in**, not from **Create an account**. If you sign up during the connection, confirm your email and then connect again from the assistant.
