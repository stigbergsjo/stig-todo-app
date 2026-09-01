# Minato Workspace

Welcome to your remote development workspace. Your files live on a persistent
volume — they survive pauses and restarts.

---

## Get your code

Sign in to GitHub once, then clone or create whatever you need:

```bash
gh auth login          # follow the device-code flow
gh repo clone intility/your-repo
# or start fresh:
gh repo create my-idea --private --clone
code your-repo
```

`git` is authenticated through `gh`, so pushes and private clones just work
after login.

Start Claude Code:

```bash
claude
# or just: c
```

---

## Port forwarding

When a process listens on a port, it appears in the **PORTS** panel (bottom
bar) with an "Open in Browser" link — dev servers get a URL under your
workspace's domain, proxied and SSO-protected. No VPN needed.

---

## Claude Code login

Log in from the terminal (not the extension button):

```bash
claude auth login
```

Follow the link, authorize, then paste the code back.

---

## Minato MCP server

Let Claude Code drive the Minato platform through the hosted MCP server.
The server is already registered in your workspace. Sign in once:

```bash
claude mcp login minato --no-browser
```

Open the printed URL on your laptop and complete the sign-in. The browser
then shows a connection error for a `localhost` address. This is expected:
your browser runs on your laptop, and only this pod listens on that port.
Copy the full URL from the address bar and paste it at the prompt in Claude
Code.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `` Ctrl+` `` | New terminal |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+P` | Quick open file |
| `Ctrl+B` | Toggle sidebar |
