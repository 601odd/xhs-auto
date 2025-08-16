#!/usr/bin/env node

import 'dotenv/config';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Basic env/config
const XHS_USERNAME = process.env.XHS_USERNAME || "";
const XHS_PASSWORD = process.env.XHS_PASSWORD || "";
const HEADLESS = String(process.env.HEADLESS ?? "true").toLowerCase() === "true"; // default true in server env

if (!XHS_USERNAME || !XHS_PASSWORD) {
	console.error("Missing XHS_USERNAME or XHS_PASSWORD in env.");
	process.exit(1);
}

async function callTool(client, name, args = {}) {
	const res = await client.callTool({ name, arguments: args });
	const item = res?.content?.[0];
	const text = item && item.type === "text" ? item.text : JSON.stringify(res);
	return text || "";
}

async function run() {
	// Connect to the Playwright MCP server using npx package name
	const transport = new StdioClientTransport({
		command: "npx",
		args: ["-y", "@executeautomation/playwright-mcp-server"],
		env: process.env,
	});

	const client = new Client({ name: "xhs-agent", version: "1.0.0" });
	await client.connect(transport);

	// 1) Set UA early (optional)
	await callTool(client, "playwright_custom_user_agent", {
		userAgent:
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
	});

	// 2) Navigate to XHS portal
	await callTool(client, "playwright_navigate", {
		url: "https://www.xiaohongshu.com/",
		headless: HEADLESS,
		width: 1280,
		height: 800,
	});

	// 3) Try to click Login
	await callTool(client, "playwright_evaluate", {
		script: `(() => { const el=[...document.querySelectorAll('a,button,div[role="button"]')].find(e=>/登录|登入|登录注册|登录\/注册/.test(e.innerText)); if(el){el.click(); return 'clicked';} return 'not-found'; })();`
	});

	// 4) Fill credentials
	await callTool(client, "playwright_evaluate", {
		script:
			`(() => { const setVal=(el,v)=>{ if(!el) return; el.focus(); el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }; const phone=document.querySelector('input[placeholder*="手机号"],input[type="tel"],input[name*="phone" i]'); const user=document.querySelector('input[placeholder*="邮箱"],input[type="text"],input[name*="user" i]'); const pass=document.querySelector('input[type="password"],input[name*="pass" i]'); setVal(phone||user, ${JSON.stringify(
				XHS_USERNAME
			)}); setVal(pass, ${JSON.stringify(XHS_PASSWORD)}); return !!(pass && (phone||user)); })();`,
	});

	// 5) Submit login
	await callTool(client, "playwright_evaluate", {
		script: `(() => { const btn=[...document.querySelectorAll('button,a,div[role="button"]')].find(e=>/登录|登入/.test(e.innerText)); if(btn){btn.click(); return 'clicked-login';} return 'login-button-not-found'; })();`
	});

	// 6) Optional: wait specific API response pattern (adjust URL)
	// await callTool(client, "playwright_expect_response", { id: "login_api", url: "https://example.com/api/login" });
	// const assertRes = await callTool(client, "playwright_assert_response", { id: "login_api", value: "success" });

	// 7) Screenshot after login
	await callTool(client, "playwright_screenshot", { name: "after-login", fullPage: true });

	console.log("Agent flow done. You can continue with posting steps similarly.");
	// For posting: navigate to creator portal, fill title/body, upload file, and click publish via evaluate and upload_file tools.

	// Close browser if desired
	// await callTool(client, "playwright_close", {});
	process.exit(0);
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});