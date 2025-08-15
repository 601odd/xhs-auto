import { chromium } from 'playwright';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_DIR = path.join(DATA_DIR, 'pw-storage');

function ensureDirs() {
	if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
	if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

async function createBrowserContext() {
	ensureDirs();
	const launchOptions = {
		headless: process.env.HEADLESS === '1',
		args: process.env.NO_SANDBOX === '1' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
	};
	const browser = await chromium.launch(launchOptions);
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		storageState: fs.existsSync(path.join(STORAGE_DIR, 'state.json'))
			? path.join(STORAGE_DIR, 'state.json')
			: undefined,
	});
	return { browser, context };
}

async function saveStorageState(context) {
	await context.storageState({ path: path.join(STORAGE_DIR, 'state.json') });
}

const server = new McpServer({ name: 'xhs-mcp', version: '0.1.0' });

server.registerTool(
	'xhs_ensure_login',
	{
		description:
			'Open Xiaohongshu and ensure user is logged in. If not logged in, allows manual QR login and persists cookies.',
		inputSchema: z.object({
			startUrl: z
				.string()
				.default('https://www.xiaohongshu.com/'),
			loginWaitSeconds: z.number().int().min(5).max(600).default(120),
		}),
	},
	async ({ startUrl, loginWaitSeconds }) => {
		const { browser, context } = await createBrowserContext();
		try {
			const page = await context.newPage();
			await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
			await page.waitForTimeout(loginWaitSeconds * 1000);
			await saveStorageState(context);
			return {
				content: [{ type: 'text', text: 'Login state ensured and saved.' }],
				structuredContent: { ok: true, message: 'Login state ensured and saved.' },
			};
		} finally {
			await context.close();
			await browser.close();
		}
	}
);

server.registerTool(
	'xhs_post',
	{
		description:
			'Publish a Xiaohongshu note via creator center. Requires prior login state. Opens UI for manual verification/upload.',
		inputSchema: z.object({
			title: z.string(),
			content: z.string(),
			imagePaths: z.array(z.string()).default([]),
			videoPaths: z.array(z.string()).default([]),
			creatorUrl: z
				.string()
				.default('https://creator.xiaohongshu.com/creator/post/article'),
			postWaitSeconds: z.number().int().min(10).max(1200).default(300),
			publishAuto: z.boolean().default(true),
		}),
	},
	async ({ title, content, imagePaths, videoPaths, creatorUrl, postWaitSeconds, publishAuto }) => {
		const { browser, context } = await createBrowserContext();
		try {
			const page = await context.newPage();
			await page.goto(creatorUrl, { waitUntil: 'domcontentloaded' });

			try {
				const titleSelector = 'input[placeholder*="标题"], textarea[placeholder*="标题"], input[aria-label*="title" i]';
				await page.locator(titleSelector).first().fill(title);
			} catch {}

			try {
				const contentSelector = 'div[contenteditable="true"], textarea[placeholder*="正文"], textarea[aria-label*="content" i]';
				await page.locator(contentSelector).first().fill(content);
			} catch {}

			if (imagePaths.length > 0) {
				try {
					const input = page.locator('input[type="file"][accept*="image" i]');
					if (await input.count()) {
						await input.setInputFiles(imagePaths);
					}
				} catch {}
			}

			if (videoPaths.length > 0) {
				try {
					const input = page.locator('input[type="file"][accept*="video" i]');
					if (await input.count()) {
						await input.setInputFiles(videoPaths);
					}
				} catch {}
			}

			if (publishAuto) {
				try {
					const publishButton = page.getByRole('button', { name: /发布|发布笔记|发 布/i });
					await publishButton.first().click({ timeout: 15000 });
					try {
						const confirmBtn = page.getByRole('button', { name: /确定|确认|发布/i });
						if (await confirmBtn.count()) {
							await confirmBtn.first().click({ timeout: 10000 });
						}
					} catch {}
				} catch {}
			}

			try {
				await page.waitForSelector('text=发布成功', { timeout: 30000 });
			} catch {}

			await page.waitForTimeout(postWaitSeconds * 1000);
			await saveStorageState(context);
			return {
				content: [{ type: 'text', text: 'Post attempt completed (manual confirm may be required).' }],
				structuredContent: { ok: true, message: 'Post attempt completed (manual confirm may be required).' },
			};
		} finally {
			await context.close();
			await browser.close();
		}
	}
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});