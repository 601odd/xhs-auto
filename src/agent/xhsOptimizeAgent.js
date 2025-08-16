#!/usr/bin/env node

import 'dotenv/config';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const HEADLESS = String(process.env.HEADLESS ?? "true").toLowerCase() === "true";

function parseJsonSafe(s) {
	try { return JSON.parse(s); } catch { return null; }
}

async function callTool(client, name, args = {}) {
	const res = await client.callTool({ name, arguments: args });
	const item = res?.content?.[0];
	return item && item.type === "text" ? item.text : JSON.stringify(res);
}

function extractLinksFromHtml(html, limit = 10) {
	const re = /href=\"(https?:\/\/www\.xiaohongshu\.com\/explore\/[^\"\s]+)\"/g;
	const seen = new Set();
	let m; const out = [];
	while ((m = re.exec(html)) && out.length < limit) {
		const url = m[1];
		if (!seen.has(url)) { seen.add(url); out.push(url); }
	}
	return out;
}

function pickTopTags(texts, topN = 8) {
	const counts = new Map();
	for (const t of texts) {
		if (!t) continue;
		const words = t
			.replace(/[\p{P}]/gu, ' ')
			.split(/\s+/)
			.filter(x => x && x.length <= 10 && x.length >= 2);
		for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
	}
	return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0, topN).map(x=>x[0]);
}

function synthesizeContent(idea, notes) {
	const titles = notes.map(n=>n.title).filter(Boolean);
	const bodies = notes.map(n=>n.body).filter(Boolean);
	const tags = pickTopTags(titles.concat(bodies), 10);
	const title = `【${idea}】实用避坑与高效指南（收藏版）`;
	const body = [
		`这篇笔记围绕“${idea}”，汇总近期热门内容的可操作要点，力求更利他、更接地气。`,
		``,
		`- 真实可复制：从热门帖子中提炼可落地做法，避免空话。`,
		`- 常见误区：结合评论与踩坑经验，提醒易忽视的问题。`,
		`- 快速起步：给出清晰步骤/清单，便于你直接照着做。`,
		``,
		`如果你正准备上手，先收藏再实践，遇到问题评论区交流，我会根据反馈继续补充。`
	].join('\n');
	return { title, body, tags: tags.slice(0,8) };
}

async function run() {
	const idea = process.argv.slice(2).join(' ').trim();
	if (!idea) {
		console.error('Usage: npm run agent:optimize -- <你的想法>');
		process.exit(1);
	}

	const transport = new StdioClientTransport({ command: 'npx', args: ['-y', '@executeautomation/playwright-mcp-server'], env: process.env });
	const client = new Client({ name: 'xhs-optimize-agent', version: '1.0.0' });
	await client.connect(transport);

	// 1) 打开搜索页
	await callTool(client, 'playwright_navigate', { url: 'https://www.xiaohongshu.com/explore', headless: HEADLESS, width: 1280, height: 900 });

	// 2) 输入搜索词并回车（如果页面有搜索框）
	await callTool(client, 'playwright_evaluate', {
		script: `(() => {
			const setVal=(el,v)=>{ if(!el) return; el.focus(); el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
			const box = document.querySelector('input[placeholder*="搜索"],input[type="search"],input[name*="search" i]');
			if (!box) return 'search-box-not-found';
			setVal(box, ${JSON.stringify(idea)});
			const form = box.form; if (form) form.submit(); else box.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
			return 'ok';
		})();`
	});

	// 3) 等待并读取结果页 HTML（截取前 n 个链接）
	const html = await callTool(client, 'playwright_get_visible_html', { maxLength: 200000, cleanHtml: true });
	const linkHtml = html.includes('\n') ? html.split('\n').slice(1).join('\n') : html; // 去掉前缀文本
	const links = extractLinksFromHtml(linkHtml, 10);

	const notes = [];
	for (const url of links) {
		await callTool(client, 'playwright_navigate', { url, headless: HEADLESS, width: 1280, height: 900 });
		const text = await callTool(client, 'playwright_get_visible_text', {});
		const content = text.includes('\n') ? text.split('\n').slice(1).join('\n') : text;
		// 简单从文本中分离标题/正文（启发式）
		const lines = content.split('\n').map(s=>s.trim()).filter(Boolean);
		const title = lines[0] || '';
		const body = lines.slice(1, 80).join('\n');
		notes.push({ url, title, body });
		if (notes.length >= 10) break;
	}

	const proposal = synthesizeContent(idea, notes);
	console.log(JSON.stringify({ idea, links, notes, proposal }, null, 2));
	process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });